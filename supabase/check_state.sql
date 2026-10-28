-- 어느 마이그레이션까지 적용됐는지 확인한다. 아무것도 바꾸지 않는 조회 전용.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
select
  '1. 코어 (팀·선수·경기)'                as 단계,
  to_char(count(*), '9')                  as 결과,
  case when count(*) = 4 then '적용됨' else '안 됨' end as 상태
from information_schema.tables
where table_schema = 'public' and table_name in ('admins','teams','players','matches')
union all
select '2. 능력치·시즌기록', to_char(count(*), '9'),
       case when count(*) = 3 then '적용됨' else '안 됨' end
from information_schema.tables
where table_schema = 'public'
  and table_name in ('player_abilities','player_season_stats','ability_change_requests')
union all
select '3. 영상·분석메모', to_char(count(*), '9'),
       case when count(*) = 2 then '적용됨' else '안 됨' end
from information_schema.tables
where table_schema = 'public' and table_name in ('videos','video_annotations')
union all
select '4. 학생 계정', to_char(count(*), '9'),
       case when count(*) = 1 then '적용됨' else '안 됨' end
from information_schema.tables
where table_schema = 'public' and table_name = 'profiles'
union all
select '5. 메모 경기장 위치', to_char(count(*), '9'),
       case when count(*) = 2 then '적용됨' else '안 됨' end
from information_schema.columns
where table_schema = 'public' and table_name = 'video_annotations'
  and column_name in ('pitch_x','pitch_y')
union all
select '6. 카메라 시간 맞추기', to_char(count(*), '9'),
       case when count(*) = 1 then '적용됨' else '안 됨' end
from information_schema.columns
where table_schema = 'public' and table_name = 'videos'
  and column_name = 'sync_offset_seconds'
union all
select '7. 교직원 전용 등록', to_char(count(*), '9'),
       case when count(*) = 1 then '적용됨' else '안 됨' end
from pg_policies
where schemaname = 'public' and tablename = 'players' and policyname = 'players_insert_staff'
union all
select '8. 비밀번호 직접 설정', to_char(count(*), '9'),
       case when count(*) = 1 then '적용됨' else '안 됨' end
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name = 'must_set_password';
