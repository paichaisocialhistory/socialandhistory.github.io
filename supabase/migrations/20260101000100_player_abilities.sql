-- =============================================================================
-- 2단계(선택 기능): 능력치 · 시즌 기록 · 능력치 변경 승인 워크플로우
--
-- 이 마이그레이션은 기능 플래그(ENABLE_PLAYER_ABILITIES)와 무관하게 적용해도
-- 안전하다. 플래그를 끄면 애플리케이션이 관련 라우트/메뉴를 노출하지 않을 뿐,
-- 1단계 기능(팀/선수등록/경기/순위)은 그대로 동작한다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 확정된 능력치 (승인된 변경 요청만 반영된다)
-- -----------------------------------------------------------------------------
create table if not exists public.player_abilities (
  player_id uuid primary key references public.players(id) on delete cascade,
  shoot int check (shoot between 1 and 5),
  dribble int check (dribble between 1 and 5),
  pass int check (pass between 1 and 5),
  stamina int check (stamina between 1 and 5),
  defense int check (defense between 1 and 5),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 시즌 누적 기록
-- -----------------------------------------------------------------------------
create table if not exists public.player_season_stats (
  player_id uuid primary key references public.players(id) on delete cascade,
  appearances int not null default 0 check (appearances >= 0),
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0)
);

-- -----------------------------------------------------------------------------
-- 능력치 변경 요청 (2단계 승인)
-- -----------------------------------------------------------------------------
create table if not exists public.ability_change_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  proposed_abilities jsonb not null,
  requested_by text,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text
);

create index if not exists ability_requests_status_idx on public.ability_change_requests (status);
create index if not exists ability_requests_player_idx on public.ability_change_requests (player_id);

-- proposed_abilities 는 5개 항목 모두 1~5 정수여야 한다.
create or replace function public.validate_proposed_abilities()
returns trigger
language plpgsql
as $$
declare
  v_key text;
  v_value jsonb;
begin
  foreach v_key in array array['shoot','dribble','pass','stamina','defense'] loop
    v_value := new.proposed_abilities -> v_key;

    if v_value is null or jsonb_typeof(v_value) <> 'number' then
      raise exception '능력치 "%" 값이 없거나 숫자가 아닙니다.', v_key using errcode = '23514';
    end if;

    if (new.proposed_abilities ->> v_key)::int not between 1 and 5 then
      raise exception '능력치 "%" 는 1~5 사이여야 합니다.', v_key using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists ability_requests_validate on public.ability_change_requests;
create trigger ability_requests_validate
  before insert or update of proposed_abilities on public.ability_change_requests
  for each row execute function public.validate_proposed_abilities();

-- =============================================================================
-- 승인 / 반려 처리
-- 승인 시에만 player_abilities 에 upsert 반영한다.
-- =============================================================================

create or replace function public.review_ability_request(
  p_request_id uuid,
  p_approve boolean,
  p_reviewer text default null,
  p_note text default null
)
returns public.ability_change_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request public.ability_change_requests;
begin
  if not public.is_admin() then
    raise exception '관리자만 능력치 변경 요청을 처리할 수 있습니다.' using errcode = '42501';
  end if;

  select * into v_request
    from public.ability_change_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception '능력치 변경 요청을 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending' then
    raise exception '이미 처리된 요청입니다.' using errcode = '23514';
  end if;

  if p_approve then
    insert into public.player_abilities as pa (
      player_id, shoot, dribble, pass, stamina, defense, updated_at
    )
    values (
      v_request.player_id,
      (v_request.proposed_abilities ->> 'shoot')::int,
      (v_request.proposed_abilities ->> 'dribble')::int,
      (v_request.proposed_abilities ->> 'pass')::int,
      (v_request.proposed_abilities ->> 'stamina')::int,
      (v_request.proposed_abilities ->> 'defense')::int,
      now()
    )
    on conflict (player_id) do update
      set shoot = excluded.shoot,
          dribble = excluded.dribble,
          pass = excluded.pass,
          stamina = excluded.stamina,
          defense = excluded.defense,
          updated_at = excluded.updated_at;
  end if;

  update public.ability_change_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         reviewed_by = coalesce(p_reviewer, auth.email()),
         reviewed_at = now(),
         review_note = p_note
   where id = p_request_id
   returning * into v_request;

  return v_request;
end;
$$;

-- =============================================================================
-- RLS 정책
-- =============================================================================

alter table public.player_abilities enable row level security;
alter table public.player_season_stats enable row level security;
alter table public.ability_change_requests enable row level security;

-- 능력치: 승인된 선수의 능력치만 공개 조회. 직접 쓰기는 불가(승인 함수 경유만 허용).
drop policy if exists player_abilities_select on public.player_abilities;
create policy player_abilities_select on public.player_abilities
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.players p
       where p.id = player_abilities.player_id and p.status = 'approved'
    )
  );

-- 시즌 기록: 승인된 선수만 공개 조회, 쓰기는 관리자만
drop policy if exists player_season_stats_select on public.player_season_stats;
create policy player_season_stats_select on public.player_season_stats
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.players p
       where p.id = player_season_stats.player_id and p.status = 'approved'
    )
  );

drop policy if exists player_season_stats_write_admin on public.player_season_stats;
create policy player_season_stats_write_admin on public.player_season_stats
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 능력치 변경 요청: 로그인한 교사 계정 누구나 생성/조회, 처리(update)는 관리자만
drop policy if exists ability_requests_select on public.ability_change_requests;
create policy ability_requests_select on public.ability_change_requests
  for select to authenticated using (true);

drop policy if exists ability_requests_insert on public.ability_change_requests;
create policy ability_requests_insert on public.ability_change_requests
  for insert to authenticated
  with check (status = 'pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists ability_requests_update_admin on public.ability_change_requests;
create policy ability_requests_update_admin on public.ability_change_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ability_requests_delete_admin on public.ability_change_requests;
create policy ability_requests_delete_admin on public.ability_change_requests
  for delete to authenticated using (public.is_admin());

grant execute on function public.review_ability_request(uuid, boolean, text, text) to authenticated;
