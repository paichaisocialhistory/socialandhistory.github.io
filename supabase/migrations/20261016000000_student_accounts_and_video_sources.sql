-- =============================================================================
-- 학생 계정 도입 + YouTube 영상 소스 허용
--
-- 배경: 학생이 로그인해 자기 영상 장면을 볼 수 있게 한다. 학생 계정이 생기면
-- 기존 "to authenticated" 정책이 학생에게도 열리므로, 교직원 전용이어야 하는
-- 정책을 이 마이그레이션에서 함께 좁힌다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 역할
--   student : 학생 계정. 본인 관련 자료만 조회.
--   staff   : 교사·코치. 영상/메모/능력치 제안 가능.
--   관리자는 기존 admins 표로 판별하며, 항상 staff 권한을 포함한다.
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'student' check (role in ('student','staff')),
  -- 학생 계정과 선수 기록을 잇는 고리. 관리자가 연결해 준다.
  player_id uuid unique references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- 신규 가입자는 기본적으로 학생으로 들어온다. 승격은 관리자만 할 수 있다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존 계정에도 프로필을 만들어 준다. 관리자는 staff 로 올린다.
insert into public.profiles (user_id, email)
select u.id, u.email from auth.users u
on conflict (user_id) do nothing;

update public.profiles p
   set role = 'staff'
  from public.admins a
 where a.user_id = p.user_id and p.role <> 'staff';

-- -----------------------------------------------------------------------------
-- 판별 함수
-- -----------------------------------------------------------------------------

-- 교직원(교사·코치·관리자) 여부. RLS 재귀를 피하려 security definer 로 둔다.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
     where p.user_id = auth.uid() and p.role = 'staff'
  ) or public.is_admin();
$$;

-- 로그인한 학생 계정에 연결된 선수 id. 연결 전이거나 학생이 아니면 null.
create or replace function public.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.player_id from public.profiles p where p.user_id = auth.uid();
$$;

-- 관리자만 역할을 바꾸거나 학생 계정을 선수와 연결할 수 있다.
create or replace function public.set_profile_role(p_user_id uuid, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception '관리자만 역할을 변경할 수 있습니다.' using errcode = '42501';
  end if;
  if p_role not in ('student','staff') then
    raise exception '알 수 없는 역할입니다.' using errcode = '23514';
  end if;

  update public.profiles set role = p_role where user_id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception '계정을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

create or replace function public.link_profile_to_player(p_user_id uuid, p_player_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception '관리자만 학생 계정을 선수와 연결할 수 있습니다.' using errcode = '42501';
  end if;

  if p_player_id is not null and not exists (
    select 1 from public.players where id = p_player_id and status = 'approved'
  ) then
    raise exception '승인된 선수만 연결할 수 있습니다.' using errcode = '23514';
  end if;

  update public.profiles set player_id = p_player_id where user_id = p_user_id
  returning * into v_profile;

  if not found then
    raise exception '계정을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles RLS: 본인 행만 조회. 관리자는 전체 조회. 쓰기는 함수 경유만.
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- =============================================================================
-- 기존 정책 조이기
-- 학생 계정이 생기면서 "to authenticated ... (true)" 였던 정책들이 학생에게도
-- 열리므로, 교직원 전용으로 좁힌다.
-- =============================================================================

-- 능력치 변경 요청: 학생이 열람하거나 제안할 수 없어야 한다.
drop policy if exists ability_requests_select on public.ability_change_requests;
create policy ability_requests_select on public.ability_change_requests
  for select to authenticated using (public.is_staff());

drop policy if exists ability_requests_insert on public.ability_change_requests;
create policy ability_requests_insert on public.ability_change_requests
  for insert to authenticated
  with check (
    public.is_staff()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

-- 분석 메모: 작성은 교직원만. 조회는 교직원 전체 + 학생은 본인 것만.
drop policy if exists video_annotations_insert_staff on public.video_annotations;
create policy video_annotations_insert_staff on public.video_annotations
  for insert to authenticated with check (public.is_staff());

drop policy if exists video_annotations_select_staff on public.video_annotations;
create policy video_annotations_select_staff on public.video_annotations
  for select to authenticated
  using (
    public.is_staff()
    or (player_id is not null and player_id = public.current_player_id())
  );

-- 영상: 로그인한 교직원과 학생이 조회한다(비로그인 방문자는 여전히 불가).
drop policy if exists videos_select_staff on public.videos;
create policy videos_select_staff on public.videos
  for select to authenticated using (true);

-- =============================================================================
-- YouTube 영상 소스 허용
-- 기존 드라이브 링크는 그대로 두고 YouTube 를 추가한다.
-- =============================================================================

alter table public.videos drop constraint if exists videos_source_url_is_drive;
alter table public.videos drop constraint if exists videos_source_url_allowed;

alter table public.videos add constraint videos_source_url_allowed check (
  source_url ~ '^https://(drive|docs)\.google\.com/'
  or source_url ~ '^https://(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)/'
);

grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.current_player_id() to authenticated;
grant execute on function public.set_profile_role(uuid, text) to authenticated;
grant execute on function public.link_profile_to_player(uuid, uuid) to authenticated;
