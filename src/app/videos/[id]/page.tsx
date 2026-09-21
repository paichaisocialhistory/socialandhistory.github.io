import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getFeatures } from '@/lib/features';
import { toDrivePreviewUrl } from '@/lib/drive';
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
          교직원 로그인 후 볼 수 있습니다. <Link href="/admin/login" className="underline">로그인</Link>
        </Alert>
      </>
    );
  }

  const { id } = await params;
  const { t } = await searchParams;
  const admin = await isAdmin();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase.from('videos').select('*').eq('id', id).maybeSingle();
  const video = data as Video | null;
  if (!video) notFound();

  const [{ data: annotationRows }, { data: playerRows }] = await Promise.all([
    supabase
      .from('video_annotations')
      .select('*')
      .eq('video_id', video.id)
      .order('timestamp_seconds'),
    supabase
      .from('players')
      .select('id, name, student_no')
      .eq('status', 'approved')
      .order('name'),
  ]);

  const annotations = (annotationRows as VideoAnnotation[] | null) ?? [];
  const players = (playerRows as Pick<Player, 'id' | 'name' | 'student_no'>[] | null) ?? [];
  const playerName = new Map(players.map((player) => [player.id, player.name]));

  const previewUrl = toDrivePreviewUrl(video.source_url);
  // 딥링크(?t=초)로 들어온 경우 드라이브 미리보기의 시작 지점을 지정한다.
  const startAt = t && /^\d+$/.test(t) ? Number(t) : null;
  const embedUrl = previewUrl && startAt !== null ? `${previewUrl}#t=${startAt}` : previewUrl;

  return (
    <>
      <PageHeader
        title={video.title || '제목 없는 영상'}
        action={
          <Link href="/videos" className="btn-secondary">
            목록으로
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card>
          {embedUrl ? (
            <div className="relative w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={embedUrl}
                title={video.title || '경기 영상'}
                allow="autoplay"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : (
            <Alert kind="error">
              구글 드라이브 미리보기 링크로 변환하지 못했습니다.{' '}
              <a href={video.source_url} target="_blank" rel="noreferrer noopener" className="underline">
                원본 링크 열기
              </a>
            </Alert>
          )}

          <p className="muted mt-3 text-xs leading-relaxed">
            드라이브 공유 범위가 교내 도메인으로 제한되어 있으면, 학교 계정으로 로그인한 브라우저에서만
            재생됩니다.
          </p>
        </Card>

        <div className="space-y-5">
          <Card title="분석 메모 추가" description="재생 중인 시점을 적어 두면 선수 화면에서도 보입니다.">
            <ActionForm action={addAnnotation} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="video_id" value={video.id} />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="timestamp">시점</label>
                  <input
                    id="timestamp"
                    name="timestamp"
                    className="field"
                    required
                    placeholder="1:23"
                    pattern="[0-9:]+"
                  />
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

              <SubmitButton pendingLabel="저장 중…">메모 저장</SubmitButton>
            </ActionForm>
          </Card>

          <Card title={`분석 메모 ${annotations.length}건`}>
            {annotations.length === 0 ? (
              <EmptyState>아직 메모가 없습니다.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {annotations.map((annotation) => (
                  <li key={annotation.id} className="flex gap-3 text-sm">
                    <Link
                      href={`/videos/${video.id}?t=${annotation.timestamp_seconds}`}
                      className="shrink-0 font-mono text-xs tabular-nums underline underline-offset-2"
                    >
                      {formatTimestamp(annotation.timestamp_seconds)}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p>{annotation.note}</p>
                      <p className="muted mt-0.5 text-xs">
                        {annotation.player_id ? `${playerName.get(annotation.player_id) ?? '선수'} · ` : ''}
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
      </div>
    </>
  );
}
