-- =============================================================================
-- 학년의 학생을 반별 팀에 배정한다.
--
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다(이미 있는 팀은 건너뛰고, 이미 맞게 배정된
-- 학생은 건드리지 않습니다).
--
-- ▼ 쓰기 전에 아래 두 줄만 고치세요 ▼
--   입학년도: 2026학년도 기준 3학년=2024, 2학년=2025, 1학년=2026
--   팀 이름 앞머리: 다른 학년과 이름이 겹치지 않도록 학년을 넣습니다
-- =============================================================================

-- 1) 반별 팀 만들기
insert into public.teams (name)
select distinct '3학년 ' || p.class_no || '반'     -- ← 팀 이름 앞머리
  from public.players p
 where p.admission_year = 2024                      -- ← 입학년도
   and p.status = 'approved'
   and p.class_no is not null
on conflict (name) do nothing;

-- 2) 학생을 자기 반 팀으로 배정
update public.players p
   set team_id = t.id
  from public.teams t
 where p.admission_year = 2024                      -- ← 입학년도 (위와 같게)
   and p.status = 'approved'
   and p.class_no is not null
   and t.name = '3학년 ' || p.class_no || '반'      -- ← 팀 이름 앞머리 (위와 같게)
   and p.team_id is distinct from t.id;

-- 3) 결과 확인
select t.name as "팀", count(p.id) as "인원"
  from public.teams t
  left join public.players p on p.team_id = t.id
 group by t.name
 order by t.name;
