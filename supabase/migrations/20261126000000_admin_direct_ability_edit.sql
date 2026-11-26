-- =============================================================================
-- 관리자가 능력치를 승인 절차 없이 바로 고칠 수 있게 한다.
--
-- 지금까지는 교사가 제안하고 관리자가 승인하는 2단계였다. 관리자가 자기 제안을
-- 스스로 승인하는 건 형식뿐이므로, 관리자는 바로 반영한다.
-- 관리자가 아닌 교직원은 종전대로 제안 → 승인을 거친다.
--
-- 바로 고친 경우에도 ability_change_requests 에 승인된 기록을 남겨,
-- "누가 언제 무엇으로 바꿨는지" 이력이 끊기지 않게 한다.
-- =============================================================================

create or replace function public.set_player_abilities(
  p_player_id uuid,
  p_abilities jsonb
)
returns public.player_abilities
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key text;
  v_value int;
  v_result public.player_abilities;
  v_actor text;
begin
  if not public.is_admin() then
    raise exception '관리자만 능력치를 바로 수정할 수 있습니다.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.players where id = p_player_id) then
    raise exception '선수를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  -- 5개 항목이 모두 1~5 정수인지 확인한다(제안 경로와 같은 기준).
  foreach v_key in array array['shoot','dribble','pass','stamina','defense'] loop
    if p_abilities -> v_key is null or jsonb_typeof(p_abilities -> v_key) <> 'number' then
      raise exception '능력치 "%" 값이 없거나 숫자가 아닙니다.', v_key using errcode = '23514';
    end if;
    v_value := (p_abilities ->> v_key)::int;
    if v_value not between 1 and 5 then
      raise exception '능력치 "%" 는 1~5 사이여야 합니다.', v_key using errcode = '23514';
    end if;
  end loop;

  v_actor := coalesce(auth.email(), auth.uid()::text);

  -- 이력을 남긴다(이미 반영된 것이므로 승인 상태로 기록).
  insert into public.ability_change_requests (
    player_id, proposed_abilities, requested_by, status,
    reviewed_by, reviewed_at, review_note
  )
  values (
    p_player_id, p_abilities, v_actor, 'approved',
    v_actor, now(), '관리자 직접 수정'
  );

  insert into public.player_abilities as pa (
    player_id, shoot, dribble, pass, stamina, defense, updated_at
  )
  values (
    p_player_id,
    (p_abilities ->> 'shoot')::int,
    (p_abilities ->> 'dribble')::int,
    (p_abilities ->> 'pass')::int,
    (p_abilities ->> 'stamina')::int,
    (p_abilities ->> 'defense')::int,
    now()
  )
  on conflict (player_id) do update
    set shoot = excluded.shoot,
        dribble = excluded.dribble,
        pass = excluded.pass,
        stamina = excluded.stamina,
        defense = excluded.defense,
        updated_at = excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.set_player_abilities(uuid, jsonb) from public, anon;
grant execute on function public.set_player_abilities(uuid, jsonb) to authenticated;
