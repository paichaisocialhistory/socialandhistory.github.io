import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, getCurrentUser, isAdmin, isStaff } from '@/lib/supabase/server';
import { Alert, Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { VideoPlayer, type Cue } from '@/components/video-player';
import { PitchBoard, type PitchMarker } from '@/components/pitch-board';
import { PitchPositionField } from '@/components/pitch-position-field';
import { getFeatures } from '@/lib/features';
import { parseVideoSource, VIDEO_SOURCE_LABEL } from '@/lib/video-source';
import { formatTimestamp } from '@/lib/format';
import type { Player, Video, VideoAnnotation } from '@/lib/types';
import { addAnnotation, deleteAnnotation } from '../actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ t?: string }>;

export default async function VideoDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  if (!getFeatures().videos) notFound();

  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <PageHeader title="영상" />
        <Alert kind="info">
          영상은 로그인 후에 볼 수 있습니다. <Link href="/login" className="underline">로그인</Link>
        </Alert>
      </>
    );
  }

  const { id } = await params;
  const { t } = await searchParams;
  const [admin, staff] = await Promise.all([isAdmin(), isStaff()]);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
  const video = data as Video | null;
  if (!video) notFound();

  // RLS 가 학생에게는 본인 메모만 돌려준다.
  const [{ data: annotationRows }, { data: playerRows }] = await Promise.all([
    supabase.from('video_annotations').select('*').eq('video_id', video.id).order('timestamp_seconds'),
    staff
      ? supabase.from('players').select('id, name, student_no').eq('status', 'approved').order('name')
      : Promise.resolve({ data: null }),
  ]);

  const annotations = (annotationRows as VideoAnnotation[] | null) ?? [];
  const players = (playerRows as Pick<Player, 'id' | 'name' | 'student_no'>[] | null) ?? [];
  const playerName = new Map(players.map((player) => [player.id, player.name]));

  const source = parseVideoSource(video.source_url);
  const startAt = t && /^\d+$/.test(t) ? Number(t) : 0;

  // 위치를 찍어 둔 메모만 전술판에 올린다.
  const pitchMarkers: PitchMarker[] = annotations
    .filter((a) => a.pitch_x !== null && a.pitch_y !== null)
    .map((a) => ({
      id: a.id,
      x: Number(a.pitch_x),
      y: Number(a.pitch_y),
      note: a.note ?? '(메모 없음)',
      seconds: a.timestamp_seconds,
      byline: a.player_id ? (playerName.get(a.player_id) ?? null) : null,
    }));

  const cues: Cue[] = annotations.map((annotation) => ({
    id: annotation.id,
    seconds: annotation.timestamp_seconds,
    note: annotation.note ?? '(메모 없음)',
    byline: [
      annotation.player_id ? playerName.get(annotation.player_id) : null,
      annotation.created_by,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <>
      <PageHeader
        title={video.title || '제목 없는 영상'}
        description={source ? VIDEO_SOURCE_LABEL[source.kind] : undefined}
        action={
          <Link href="/videos" className="btn-secondary">
            목록으로
          </Link>
        }
      />

      <Card className="mb-5">
        {source ? (
          <VideoPlayer
            source={source}
            title={video.title || '경기 영상'}
            cues={cues}
            startSeconds={startAt}
            emptyMessage={staff ? '아직 분석 메모가 없습니다.' : '이 영상에 회원님과 관련된 메모가 없습니다.'}
          />
        ) : (
          <Alert kind="error">
            재생할 수 없는 링크입니다.{' '}
            <a href={video.source_url} target="_blank" rel="noreferrer noopener" className="underline">
              원본 링크 열기
            </a>
          </Alert>
        )}
      </Card>

      {staff ? (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <Card title="분석 메모 추가" description="남긴 시점은 해당 선수 화면에서도 바로 재생됩니다.">
            <ActionForm action={addAnnotation} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="video_id" value={video.id} />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="timestamp">시점</label>
                  <input id="timestamp" name="timestamp" className="field" required placeholder="1:23" pattern="[0-9:]+" />
                </div>
                <div>
                  <label className="label" htmlFor="player_id">선수</label>
                  <select id="player_id" name="player_id" className="field" defaultValue="">
                    <option value="">선택 안 함</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name} ({player.student_no})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="note">메모</label>
                <textarea id="note" name="note" rows={3} className="field" required maxLength={300} />
              </div>

              <PitchPositionField />

              <p className="muted text-xs leading-relaxed">
                선수를 지정하면 그 학생이 로그인했을 때 자기 화면에서 이 장면을 볼 수 있습니다.
                지정하지 않은 메모는 교직원에게만 보입니다.
              </p>

              <SubmitButton pendingLabel="저장 중…">메모 저장</SubmitButton>
            </ActionForm>
          </Card>

          <Card
            title="위치 분포"
            description="위치를 찍은 메모만 표시됩니다. 점을 가리키면 내용이 보입니다."
          >
            {pitchMarkers.length === 0 ? (
              <p className="muted py-6 text-center text-sm">
                아직 위치를 찍은 메모가 없습니다.
              </p>
            ) : (
              <PitchBoard
                markers={pitchMarkers}
                caption={`${pitchMarkers.length}개 지점 · 아래 목록이 같은 내용의 표입니다.`}
              />
            )}
          </Card>

          <Card title={`메모 목록 ${annotations.length}건`}>
            {annotations.length === 0 ? (
              <p className="muted py-6 text-center text-sm">아직 메모가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {annotations.map((annotation) => (
                  <li key={annotation.id} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0 font-mono text-xs tabular-nums">
                      {formatTimestamp(annotation.timestamp_seconds)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p>{annotation.note}</p>
                      <p className="muted mt-0.5 text-xs">
                        {annotation.player_id ? `${playerName.get(annotation.player_id) ?? '선수'} · ` : '선수 미지정 · '}
                        {annotation.created_by ?? '알 수 없음'}
                      </p>
                    </div>
                    {admin ? (
                      <ActionForm action={deleteAnnotation}>
                        <input type="hidden" name="id" value={annotation.id} />
                        <input type="hidden" name="video_id" value={video.id} />
                        <SubmitButton className="btn-danger !px-2 !py-0.5 !text-xs" pendingLabel="…">
                          삭제
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : (
        <Alert kind="info">
          분석 메모는 담당 선생님이 남깁니다. 회원님과 관련된 장면만 표시됩니다.
        </Alert>
      )}
    </>
  );
}
