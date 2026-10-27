-- =============================================================================
-- 1단계 전술 시각화: 분석 메모에 경기장 위치를 더한다.
--
-- 영상 분석 없이, 교사가 메모를 남길 때 경기장 그림을 클릭해 위치를 찍는다.
-- 좌표는 경기장 크기와 무관하게 0~1 비율로 저장한다.
--   pitch_x : 0 = 자기 진영 골라인, 1 = 상대 진영 골라인 (공격 방향)
--   pitch_y : 0 = 왼쪽 터치라인, 1 = 오른쪽 터치라인
-- 실제 미터로 바꾸려면 경기장 실측값을 곱하면 된다.
-- =============================================================================

alter table public.video_annotations
  add column if not exists pitch_x numeric(5, 4),
  add column if not exists pitch_y numeric(5, 4);

-- 두 좌표는 항상 함께 있거나 함께 비어 있어야 한다(반쪽 좌표 방지).
--
-- 주의: CHECK 제약은 결과가 NULL 이면 통과시킨다. 따라서
--   (x is null and y is null) or (x between 0 and 1 and y between 0 and 1)
-- 처럼 쓰면 x 만 있고 y 가 NULL 일 때 전체가 NULL 이 되어 그냥 통과해 버린다.
-- 아래처럼 IS NULL 비교(항상 true/false)로 짝을 먼저 강제한다.
alter table public.video_annotations
  drop constraint if exists video_annotations_pitch_range;
alter table public.video_annotations
  add constraint video_annotations_pitch_range check (
    (pitch_x is null) = (pitch_y is null)
    and (
      pitch_x is null
      or (pitch_x between 0 and 1 and pitch_y between 0 and 1)
    )
  );

-- 선수별 위치 조회가 잦으므로 좌표가 있는 행만 부분 인덱스로 받는다.
create index if not exists video_annotations_pitch_idx
  on public.video_annotations (player_id)
  where pitch_x is not null;
