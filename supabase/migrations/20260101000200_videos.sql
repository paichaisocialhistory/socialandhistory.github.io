-- =============================================================================
-- 3단계: 구글 드라이브 영상 연동 + 타임스탬프 분석 메모
--
-- 파일 자체는 저장하지 않는다. 교사가 학교 구글 드라이브(교내 도메인 한정 공유)에
-- 업로드한 뒤 공유 링크만 videos.source_url 에 등록한다.
-- =============================================================================

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text,
  source_url text not null,
  match_id uuid references public.matches(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  -- 구글 드라이브 링크만 허용한다(임의 외부 임베드 차단).
  constraint videos_source_url_is_drive check (
    source_url ~ '^https://(drive|docs)\.google\.com/'
  )
);

create index if not exists videos_match_idx on public.videos (match_id);
create index if not exists videos_player_idx on public.videos (player_id);
create index if not exists videos_team_idx on public.videos (team_id);

create table if not exists public.video_annotations (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  player_id uuid references public.players(id) on delete set null,
  note text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists video_annotations_video_idx
  on public.video_annotations (video_id, timestamp_seconds);
create index if not exists video_annotations_player_idx
  on public.video_annotations (player_id);

-- =============================================================================
-- RLS 정책
-- 영상은 미성년자 얼굴이 포함될 수 있으므로 기본적으로 로그인한 교직원만 조회한다.
-- (6장: 방문자 조회 범위는 운영 중 조정 가능하도록 설계)
-- =============================================================================

alter table public.videos enable row level security;
alter table public.video_annotations enable row level security;

drop policy if exists videos_select_staff on public.videos;
create policy videos_select_staff on public.videos
  for select to authenticated using (true);

drop policy if exists videos_write_admin on public.videos;
create policy videos_write_admin on public.videos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists video_annotations_select_staff on public.video_annotations;
create policy video_annotations_select_staff on public.video_annotations
  for select to authenticated using (true);

-- 분석 메모는 로그인한 교사 누구나 남길 수 있고, 수정/삭제는 관리자만.
drop policy if exists video_annotations_insert_staff on public.video_annotations;
create policy video_annotations_insert_staff on public.video_annotations
  for insert to authenticated with check (true);

drop policy if exists video_annotations_update_admin on public.video_annotations;
create policy video_annotations_update_admin on public.video_annotations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists video_annotations_delete_admin on public.video_annotations;
create policy video_annotations_delete_admin on public.video_annotations
  for delete to authenticated using (public.is_admin());
