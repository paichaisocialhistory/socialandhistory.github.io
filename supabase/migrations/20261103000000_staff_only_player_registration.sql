-- =============================================================================
-- 선수 등록을 교직원 전용으로 바꾸고, 명단 일괄 등록을 더한다.
--
-- 바뀌는 점: 지금까지는 학생이 로그인 없이 신청서를 냈다. 이제 교사가 직접
-- 입력한다. 열람(팀·일정·순위·선수 DB)은 종전대로 로그인 없이 가능하다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) 비로그인 신청서 제출을 막는다.
-- -----------------------------------------------------------------------------
drop policy if exists players_insert_application on public.players;
-- 새 이름도 먼저 지운다. 이 파일을 두 번 실행해도 오류가 나지 않게 한다.
drop policy if exists players_insert_staff on public.players;

create policy players_insert_staff on public.players
  for insert to authenticated
  with check (
    public.is_staff()
    and status = 'pending'
    and student_no is null
    and approved_at is null
  );

-- -----------------------------------------------------------------------------
-- 2) 명단 일괄 등록
--
-- 교사가 직접 넣는 것이므로 승인 단계를 거치지 않고 바로 approved 로 만들고
-- 학번을 발급한다. 같은 입학년도에 학년·반·번호가 같은 선수가 이미 있으면
-- 건너뛴다(두 번 눌러도 중복 생성되지 않는다).
--
-- 입력: [{"grade":"1","class_no":"3","number":"7","name":"김민준","position":"FW"}, ...]
-- 출력: 줄마다 생성 여부와 사유
-- -----------------------------------------------------------------------------
create or replace function public.register_players(
  p_rows jsonb,
  p_admission_year int
)
returns table (
  name text,
  student_no text,
  created boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_name text;
  v_grade text;
  v_class text;
  v_number text;
  v_position text;
  v_existing public.players;
  v_new public.players;
begin
  if not public.is_staff() then
    raise exception '교직원만 선수를 등록할 수 있습니다.' using errcode = '42501';
  end if;

  if p_admission_year is null or p_admission_year not between 2000 and 2100 then
    raise exception '입학년도가 올바르지 않습니다.' using errcode = '23514';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_name := nullif(btrim(v_row ->> 'name'), '');
    v_grade := nullif(btrim(v_row ->> 'grade'), '');
    v_class := nullif(btrim(v_row ->> 'class_no'), '');
    v_number := nullif(btrim(v_row ->> 'number'), '');
    v_position := nullif(btrim(v_row ->> 'position'), '');

    if v_name is null then
      name := '(이름 없음)'; student_no := null; created := false;
      reason := '이름이 비어 있습니다';
      return next;
      continue;
    end if;

    -- 같은 입학년도 + 학년 + 반 + 번호면 같은 학생으로 본다.
    select * into v_existing
      from public.players p
     where p.admission_year = p_admission_year
       and p.grade is not distinct from v_grade
       and p.class_no is not distinct from v_class
       and p.number is not distinct from v_number
     limit 1;

    if found then
      name := v_name; student_no := v_existing.student_no; created := false;
      reason := '이미 등록된 학생입니다 (' || v_existing.name || ')';
      return next;
      continue;
    end if;

    insert into public.players (
      admission_year, name, grade, class_no, number, position,
      status, approved_at, student_no
    )
    values (
      p_admission_year, v_name, v_grade, v_class, v_number, v_position,
      'approved', now(), public.issue_student_no(p_admission_year)
    )
    returning * into v_new;

    name := v_new.name; student_no := v_new.student_no; created := true;
    reason := null;
    return next;
  end loop;
end;
$$;

grant execute on function public.register_players(jsonb, int) to authenticated;
