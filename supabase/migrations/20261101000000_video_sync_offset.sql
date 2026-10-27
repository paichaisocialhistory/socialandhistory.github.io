-- =============================================================================
-- 여러 카메라 영상의 시간 맞추기
--
-- 한 경기를 카메라 두 대 이상으로 찍으면 녹화 시작 시각이 다르다. 같은 장면이
-- A 영상에서는 12분 30초, B 영상에서는 12분 47초에 나온다. 영상마다 "경기
-- 시작 순간이 이 영상의 몇 초 지점인가"를 기록해 두면 서로 변환할 수 있다.
--
--   경기 시간 = 영상 재생 위치 - sync_offset_seconds
--   영상 재생 위치 = 경기 시간 + sync_offset_seconds
--
-- 예) 킥오프 2분 전부터 녹화를 시작했다면 sync_offset_seconds = 120.
--     녹화를 킥오프 뒤에 시작했다면 음수가 된다.
-- =============================================================================

alter table public.videos
  add column if not exists sync_offset_seconds int not null default 0;

comment on column public.videos.sync_offset_seconds is
  '경기 시작(킥오프) 순간의 이 영상 재생 위치(초). 경기 시간 = 재생 위치 - 이 값.';

-- 하루를 넘는 값은 입력 실수로 본다.
alter table public.videos drop constraint if exists videos_sync_offset_sane;
alter table public.videos add constraint videos_sync_offset_sane
  check (sync_offset_seconds between -86400 and 86400);

-- 같은 경기에 묶인 영상들을 자주 함께 찾는다.
create index if not exists videos_match_idx_for_sync
  on public.videos (match_id)
  where match_id is not null;
