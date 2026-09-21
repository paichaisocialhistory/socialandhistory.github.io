import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getFeatures } from '@/lib/features';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Match, Team, Video } from '@/lib/types';
import { createVideo, deleteVideo } from './actions';

export const metadata = { title: '영상' };
export const dynamic = 'force-dynamic';

export default async function VideosPage() {
  if (!getFeatures().videos) notFound();

  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <PageHeader title="영상" />
        <Alert kind="info">
          영상에는 학생의 얼굴이 포함될 수 있어 교직원 로그인 후에만 볼 수 있습니다.{' '}
          <Link href="/admin/login" className="underline">로그인</Link>
        </Alert>
      </>
    );
  }

  const admin = await isAdmin();
  const supabase = await createSupabaseServerClient();

  const [{ data: videoRows, error }, { data: teamRows }, { data: matchRows }] = await Promise.all([
    supabase.from('videos').select('*').order('created_at', { ascending: false }),
    supabase.from('teams').select('id, name').order('name'),
    supabase.from('matches').select('*').order('match_date', { ascending: false }).limit(50),
  ]);

  const videos = (videoRows as Video[] | null) ?? [];
  const teams = (teamRows as Pick<Team, 'id' | 'name'>[] | null) ?? [];
  const matches = (matchRows as Match[] | null) ?? [];
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <>
      <PageHeader
        title="경기 영상"
        description="파일은 저장하지 않습니다. 학교 구글 드라이브에 올린 뒤 공유 링크만 등록하세요."
      />

      {error ? <Alert kind="error">영상을 불러오지 못했습니다: {error.message}</Alert> : null}

      {admin ? (
        <Card title="영상 등록" className="mb-5">
          <ActionForm action={createVideo} className="grid gap-3 sm:grid-cols-2" resetOnSuccess>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="source_url">
                구글 드라이브 공유 링크 <span className="text-red-600">*</span>
              </label>
              <input
                id="source_url"
                name="source_url"
                type="url"
                className="field"
                required
                placeholder="https://drive.google.com/file/d/.../view"
              />
              <p className="muted mt-1 text-xs">
                드라이브에서 공유 범위를 <strong>교내 도메인 한정</strong>으로 설정한 뒤 링크를
                붙여넣으세요.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="title">제목</label>
              <input id="title" name="title" className="field" maxLength={80} />
            </div>

            <div>
              <label className="label" htmlFor="match_id">연결할 경기</label>
              <select id="match_id" name="match_id" className="field" defaultValue="">
                <option value="">선택 안 함</option>
                {matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    {formatDate(match.match_date)} · {teamName.get(match.team_a_id ?? '') ?? '?'} vs{' '}
                    {teamName.get(match.team_b_id ?? '') ?? '?'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="team_id">연결할 팀</label>
              <select id="team_id" name="team_id" className="field" defaultValue="">
                <option value="">선택 안 함</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <SubmitButton pendingLabel="등록 중…">영상 등록</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      ) : null}

      <Card title={`영상 ${videos.length}건`}>
        {videos.length === 0 ? (
          <EmptyState>등록된 영상이 없습니다.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {videos.map((video) => (
              <li
                key={video.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <Link href={`/videos/${video.id}`} className="font-semibold underline underline-offset-2">
                    {video.title || '제목 없는 영상'}
                  </Link>
                  <p className="muted mt-0.5 text-xs">
                    {video.team_id ? `${teamName.get(video.team_id) ?? '팀'} · ` : ''}
                    등록 {formatDateTime(video.created_at)}
                  </p>
                </div>

                {admin ? (
                  <ActionForm action={deleteVideo}>
                    <input type="hidden" name="id" value={video.id} />
                    <SubmitButton className="btn-danger !px-2.5 !py-1 !text-xs" pendingLabel="삭제 중…">
                      삭제
                    </SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
