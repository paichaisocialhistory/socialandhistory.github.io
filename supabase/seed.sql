-- 로컬 개발용 샘플 데이터 (supabase db reset 시 자동 적용)
-- 운영 DB 에는 절대 적용하지 말 것.

insert into public.teams (name) values
  ('청룡'), ('백호'), ('주작'), ('현무')
on conflict (name) do nothing;

-- 승인 대기 신청서 2건
insert into public.players (admission_year, name, grade, class_no, number, position, status)
values
  (2026, '김민준', '1', '3', '7', 'FW', 'pending'),
  (2026, '이서준', '1', '5', '11', 'MF', 'pending');
