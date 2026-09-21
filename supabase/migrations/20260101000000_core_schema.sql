-- =============================================================================
-- 1단계(MVP) 코어 스키마: 관리자, 팀, 선수, 경기
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 관리자(교사) 명단. Supabase Auth 사용자 중 이 표에 있는 계정만 관리자 권한을 가진다.
-- 최초 관리자는 Supabase 대시보드에서 직접 insert 하여 부트스트랩한다.
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS 재귀를 피하기 위해 security definer 로 선언한다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 팀
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists teams_name_key on public.teams (name);

-- -----------------------------------------------------------------------------
-- 선수
-- student_no 는 승인 시점에 발급되며 이후 불변이다(트리거로 강제).
-- 학년/반/번호가 바뀌어도 student_no 로 선수를 계속 식별한다.
-- -----------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  student_no text unique,
  admission_year int not null check (admission_year between 2000 and 2100),
  name text not null,
  grade text,
  class_no text,
  number text,
  position text check (position in ('GK','DF','MF','FW')),
  team_id uuid references public.teams(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  coach_note text,
  reject_reason text,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  -- 입학년도 + 3년 = 졸업 예정 연도. 6장의 보관/삭제 정책 판단 기준.
  graduation_year int generated always as (admission_year + 3) stored
);

create index if not exists players_status_idx on public.players (status);
create index if not exists players_team_idx on public.players (team_id);
create index if not exists players_admission_year_idx on public.players (admission_year);

-- -----------------------------------------------------------------------------
-- 경기
-- -----------------------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  -- 팀을 삭제해도 과거 경기 기록은 남긴다(6장: 누적 데이터 보존).
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  match_date date,
  score_a int check (score_a >= 0),
  score_b int check (score_b >= 0),
  is_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  -- 팀이 삭제되어 null 이 된 경우는 허용하되, 같은 팀끼리의 경기는 막는다.
  constraint matches_distinct_teams check (
    team_a_id is null or team_b_id is null or team_a_id <> team_b_id
  ),
  -- 결과 확정에는 양 팀 점수가 모두 입력되어 있어야 한다.
  constraint matches_confirmed_needs_scores check (
    not is_confirmed or (score_a is not null and score_b is not null)
  )
);

create index if not exists matches_date_idx on public.matches (match_date);
create index if not exists matches_confirmed_idx on public.matches (is_confirmed);

-- =============================================================================
-- 고유번호(학번) 발급
-- =============================================================================

create table if not exists public.student_no_counters (
  admission_year int primary key,
  last_serial int not null default 0
);

-- 같은 admission_year 안에서 1번부터 순차 발급. upsert 로 동시성 안전.
create or replace function public.issue_student_no(p_admission_year int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_serial int;
begin
  insert into public.student_no_counters as c (admission_year, last_serial)
  values (p_admission_year, 1)
  on conflict (admission_year)
  do update set last_serial = c.last_serial + 1
  returning c.last_serial into v_serial;

  return p_admission_year::text || '-' || lpad(v_serial::text, 4, '0');
end;
$$;

-- 발급된 학번은 절대 변경 불가.
create or replace function public.players_guard_student_no()
returns trigger
language plpgsql
as $$
begin
  if old.student_no is not null and new.student_no is distinct from old.student_no then
    raise exception '학번(student_no)은 발급 후 변경할 수 없습니다.' using errcode = '23514';
  end if;

  if old.student_no is not null and new.admission_year is distinct from old.admission_year then
    raise exception '학번 발급 후에는 입학년도를 변경할 수 없습니다.' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists players_guard_student_no on public.players;
create trigger players_guard_student_no
  before update on public.players
  for each row execute function public.players_guard_student_no();

-- =============================================================================
-- 선수 등록 승인 / 반려
-- =============================================================================

create or replace function public.approve_player(p_player_id uuid)
returns public.players
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player public.players;
begin
  if not public.is_admin() then
    raise exception '관리자만 선수 등록을 승인할 수 있습니다.' using errcode = '42501';
  end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found then
    raise exception '선수를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  -- 이미 승인된 선수는 학번을 재발급하지 않는다(멱등).
  if v_player.status = 'approved' then
    return v_player;
  end if;

  update public.players
     set status      = 'approved',
         approved_at = now(),
         reject_reason = null,
         student_no  = coalesce(student_no, public.issue_student_no(admission_year))
   where id = p_player_id
   returning * into v_player;

  return v_player;
end;
$$;

create or replace function public.reject_player(p_player_id uuid, p_reason text default null)
returns public.players
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_player public.players;
begin
  if not public.is_admin() then
    raise exception '관리자만 선수 등록을 반려할 수 있습니다.' using errcode = '42501';
  end if;

  update public.players
     set status = 'rejected',
         reject_reason = p_reason
   where id = p_player_id
   returning * into v_player;

  if not found then
    raise exception '선수를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  return v_player;
end;
$$;

-- =============================================================================
-- RLS 정책
-- =============================================================================

alter table public.admins enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.student_no_counters enable row level security;

-- admins: 본인 행만 확인 가능(로그인 후 관리자 여부 판별용). 쓰기는 service_role 전용.
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- teams: 조회 전체 공개, 쓰기는 관리자만
drop policy if exists teams_select_public on public.teams;
create policy teams_select_public on public.teams
  for select to anon, authenticated using (true);

drop policy if exists teams_write_admin on public.teams;
create policy teams_write_admin on public.teams
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- players: 승인된 선수만 공개 조회, 대기/반려 행은 관리자만
drop policy if exists players_select_approved on public.players;
create policy players_select_approved on public.players
  for select to anon, authenticated
  using (status = 'approved' or public.is_admin());

-- 학생 본인이 로그인 없이 제출하는 신청서. pending 이외 상태나 학번 선점은 막는다.
drop policy if exists players_insert_application on public.players;
create policy players_insert_application on public.players
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and student_no is null
    and approved_at is null
    and coach_note is null
    and reject_reason is null
  );

drop policy if exists players_update_admin on public.players;
create policy players_update_admin on public.players
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists players_delete_admin on public.players;
create policy players_delete_admin on public.players
  for delete to authenticated using (public.is_admin());

-- matches: 조회 전체 공개, 쓰기는 관리자만
drop policy if exists matches_select_public on public.matches;
create policy matches_select_public on public.matches
  for select to anon, authenticated using (true);

drop policy if exists matches_write_admin on public.matches;
create policy matches_write_admin on public.matches
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- student_no_counters: 정책을 만들지 않아 일반 역할은 접근 불가.
-- 발급은 security definer 함수(issue_student_no)를 통해서만 이루어진다.

-- =============================================================================
-- 권한
-- =============================================================================

revoke all on function public.issue_student_no(int) from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.approve_player(uuid) to authenticated;
grant execute on function public.reject_player(uuid, text) to authenticated;
