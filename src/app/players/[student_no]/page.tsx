import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, getCurrentUser, isAdmin, isStaff } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { AbilityBars } from '@/components/ability-bars';
import { VideoPlayer, type Cue } from '@/components/video-player';
import { parseVideoSource } from '@/lib/video-source';
import { PitchBoard, type PitchMarker } from '@/components/pitch-board';
import { thirdOf } from '@/lib/pitch';
import { getFeatures } from '@/lib/features';
import { formatDateTime } from '@/lib/format';
import {
  ABILITY_KEYS,
  ABILITY_LABEL,
  POSITIONS,
  POSITION_LABEL,
  type AbilityChangeRequest,
  type PlayerAbilities,
  type PlayerSeasonStats,
  type PlayerWithTeam,
  type Team,
} from '@/lib/types';
import { requestAbilityChange, saveCoachNote, saveSeasonStats, updatePlayer } from './actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ student_no: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { student_no } = await params;
  return { title: `선수 ${decodeURIComponent(student_no)}` };
}

export default async function PlayerDetailPage({ params }: { params: Params }) {
  const { student_no } = await params;
  const studentNo = decodeURIComponent(student_no);

  const features = getFeatures();
  const admin = await isAdmin();
  const user = await getCurrentUser();
  const staff = user ? await isStaff() : false;

  if (!features.publicPlayerDirectory && !admin) notFound();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('players')
    .select('*, teams(id, name)')
    .eq('student_no', studentNo)
    .maybeSingle();

  const player = data as PlayerWithTeam | null;
  if (!player) notFound();

  const { data: teams } = await supabase.from('teams').select('id, name').order('name');

  // 2단계 기능이 꺼져 있으면 능력치/기록 관련 조회 자체를 하지 않는다.
  const [abilitiesResult, statsResult, requestsResult] = features.playerAbilities
    ? await Promise.all([
        supabase.from('player_abilities').select('*').eq('player_id', player.id).maybeSingle(),
        supabase.from('player_season_stats').select('*').eq('player_id', player.id).maybeSingle(),
        staff
          ? supabase
              .from('ability_change_requests')
              .select('*')
              .eq('player_id', player.id)
              .order('requested_at', { ascending: false })
              .limit(5)
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const abilities = abilitiesResult.data as PlayerAbilities | null;
  const stats = statsResult.data as PlayerSeasonStats | null;
  const requests = (requestsResult.data as AbilityChangeRequest[] | null) ?? [];

  // 3단계: 이 선수가 태그된 영상과 분석 메모.
  // RLS 가 학생에게는 본인 메모만 돌려주므로, 다른 학생의 화면에서는 비어 있다.
  const videoData =
    features.videos && user
      ? await supabase
          .from('video_annotations')
          .select('id, timestamp_seconds, note, created_by, video_id, pitch_x, pitch_y, videos(id, title, source_url)')
          .eq('player_id', player.id)
          .order('timestamp_seconds')
      : { data: null };

  type AnnotationRow = {
    id: string;
    timestamp_seconds: number;
    note: string | null;
    created_by: string | null;
    video_id: string;
    pitch_x: number | null;
    pitch_y: number | null;
    videos: { id: string; title: string | null; source_url: string } | null;
  };

  const annotations = (videoData.data as AnnotationRow[] | null) ?? [];

  // 영상별로 묶는다. 첫 영상은 화면에 바로 띄우고 나머지는 링크로 안내한다.
  const byVideo = new Map<string, { title: string; sourceUrl: string; cues: Cue[] }>();
  for (const annotation of annotations) {
    if (!annotation.videos) continue;
    const entry = byVideo.get(annotation.video_id) ?? {
      title: annotation.videos.title || '제목 없는 영상',
      sourceUrl: annotation.videos.source_url,
      cues: [],
    };
    entry.cues.push({
      id: annotation.id,
      seconds: annotation.timestamp_seconds,
      note: annotation.note ?? '(메모 없음)',
      byline: annotation.created_by,
    });
    byVideo.set(annotation.video_id, entry);
  }

  // 이 선수의 활동 위치. 영상이 여러 개여도 한 장의 전술판에 모은다.
  const pitchMarkers: PitchMarker[] = annotations
    .filter((a) => a.pitch_x !== null && a.pitch_y !== null)
    .map((a) => ({
      id: a.id,
      x: Number(a.pitch_x),
      y: Number(a.pitch_y),
      note: a.note ?? '(메모 없음)',
      seconds: a.timestamp_seconds,
      byline: a.videos?.title ?? null,
    }));

  // 수비/중원/공격 구역별 건수 — 전술판 옆에 두는 요약.
  const thirds = { '수비 진영': 0, 중원: 0, '공격 진영': 0 } as Record<string, number>;
  for (const marker of pitchMarkers) thirds[thirdOf(marker)] += 1;

  const videoGroups = [...byVideo.entries()];
  const [featuredId, featured] = videoGroups[0] ?? [];
  const featuredSource = featured ? parseVideoSource(featured.sourceUrl) : null;

  const teamList = (teams as Pick<Team, 'id' | 'name'>[] | null) ?? [];

  return (
    <>
      <PageHeader
        title={player.name}
        description={`${player.admission_year}년 입학 · 졸업 예정 ${player.graduation_year}년`}
        action={
          <Link href="/players" className="btn-secondary">
            목록으로
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Card title="기본 정보">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="muted text-xs">학번</dt>
                <dd className="mt-0.5 font-mono font-semibold tabular-nums">{player.student_no}</dd>
              </div>
              <div>
                <dt className="muted text-xs">상태</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={player.status} />
                </dd>
              </div>
              <div>
                <dt className="muted text-xs">팀</dt>
                <dd className="mt-0.5 font-medium">{player.teams?.name ?? '미배정'}</dd>
              </div>
              <div>
                <dt className="muted text-xs">학년/반/번호</dt>
                <dd className="mt-0.5 font-medium">
                  {[player.grade && `${player.grade}학년`, player.class_no && `${player.class_no}반`, player.number && `${player.number}번`]
                    .filter(Boolean)
                    .join(' ') || '-'}
                </dd>
              </div>
              <div>
                <dt className="muted text-xs">포지션</dt>
                <dd className="mt-0.5 font-medium">
                  {player.position ? `${player.position} · ${POSITION_LABEL[player.position]}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="muted text-xs">승인일</dt>
                <dd className="mt-0.5 font-medium">{formatDateTime(player.approved_at)}</dd>
              </div>
            </dl>

            <p className="muted mt-4 text-xs leading-relaxed">
              학번은 승인 시점에 발급되어 변경되지 않습니다. 학년·반이 바뀌어도 모든 기록은 이 학번
              아래에 누적됩니다.
            </p>
          </Card>

          {admin ? (
            <Card title="선수 정보 수정" description="학번과 입학년도는 변경할 수 없습니다.">
              <ActionForm action={updatePlayer} className="space-y-3">
                <input type="hidden" name="id" value={player.id} />
                <input type="hidden" name="student_no" value={player.student_no ?? ''} />

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label" htmlFor="grade">학년</label>
                    <input id="grade" name="grade" className="field" defaultValue={player.grade ?? ''} maxLength={2} />
                  </div>
                  <div>
                    <label className="label" htmlFor="class_no">반</label>
                    <input id="class_no" name="class_no" className="field" defaultValue={player.class_no ?? ''} maxLength={3} />
                  </div>
                  <div>
                    <label className="label" htmlFor="number">번호</label>
                    <input id="number" name="number" className="field" defaultValue={player.number ?? ''} maxLength={3} />
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="position">포지션</label>
                    <select id="position" name="position" className="field" defaultValue={player.position ?? ''}>
                      <option value="">선택 안 함</option>
                      {POSITIONS.map((position) => (
                        <option key={position} value={position}>
                          {position} · {POSITION_LABEL[position]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="team_id">팀</label>
                    <select id="team_id" name="team_id" className="field" defaultValue={player.team_id ?? ''}>
                      <option value="">미배정</option>
                      {teamList.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <SubmitButton pendingLabel="저장 중…">저장</SubmitButton>
              </ActionForm>
            </Card>
          ) : null}

          {features.videos && user && pitchMarkers.length > 0 ? (
            <Card title="활동 위치" description="선생님이 메모를 남긴 지점입니다.">
              <PitchBoard markers={pitchMarkers} />

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                {Object.entries(thirds).map(([zone, count]) => (
                  <div key={zone}>
                    <dt className="muted text-xs">{zone}</dt>
                    <dd className="mt-0.5 text-lg font-bold tabular-nums">{count}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {features.videos && user ? (
            <Card
              title="경기 장면"
              description="메모를 누르면 영상이 그 장면부터 재생됩니다."
            >
              {!featured || !featuredSource ? (
                <EmptyState>
                  {staff
                    ? '이 선수에 연결된 분석 메모가 없습니다.'
                    : '아직 회원님과 관련된 장면이 등록되지 않았습니다.'}
                </EmptyState>
              ) : (
                <>
                  <p className="mb-3 text-sm font-medium">{featured.title}</p>
                  <VideoPlayer
                    source={featuredSource}
                    title={featured.title}
                    cues={featured.cues}
                  />

                  {videoGroups.length > 1 ? (
                    <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                      <p className="muted mb-2 text-xs font-semibold">다른 영상</p>
                      <ul className="space-y-1">
                        {videoGroups
                          .filter(([id]) => id !== featuredId)
                          .map(([id, group]) => (
                            <li key={id} className="text-sm">
                              <Link href={`/videos/${id}`} className="underline underline-offset-2">
                                {group.title}
                              </Link>
                              <span className="muted ml-2 text-xs">장면 {group.cues.length}개</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}
        </div>

        {features.playerAbilities ? (
          <div className="space-y-5">
            <Card title="능력치" description="관리자가 승인한 값만 표시됩니다.">
              {abilities ? (
                <>
                  <AbilityBars values={abilities} />
                  <p className="muted mt-3 text-xs">최종 반영: {formatDateTime(abilities.updated_at)}</p>
                </>
              ) : (
                <EmptyState>아직 승인된 능력치가 없습니다.</EmptyState>
              )}
            </Card>

            <Card title="시즌 기록">
              <dl className="grid grid-cols-3 gap-3 text-center">
                {[
                  ['출전', stats?.appearances ?? 0],
                  ['득점', stats?.goals ?? 0],
                  ['도움', stats?.assists ?? 0],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <dt className="muted text-xs">{label}</dt>
                    <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>

              {admin ? (
                <ActionForm action={saveSeasonStats} className="mt-4 space-y-3 border-t pt-4" >
                  <input type="hidden" name="id" value={player.id} />
                  <input type="hidden" name="student_no" value={player.student_no ?? ''} />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['appearances', '출전', stats?.appearances ?? 0],
                      ['goals', '득점', stats?.goals ?? 0],
                      ['assists', '도움', stats?.assists ?? 0],
                    ].map(([name, label, value]) => (
                      <div key={name as string}>
                        <label className="label" htmlFor={`stat-${name}`}>{label}</label>
                        <input
                          id={`stat-${name}`}
                          name={name as string}
                          type="number"
                          min={0}
                          className="field"
                          defaultValue={value as number}
                        />
                      </div>
                    ))}
                  </div>
                  <SubmitButton className="btn-secondary" pendingLabel="저장 중…">기록 저장</SubmitButton>
                </ActionForm>
              ) : null}
            </Card>

            {admin ? (
              <Card title="코치 메모" description="관리자에게만 보입니다.">
                <ActionForm action={saveCoachNote} className="space-y-3">
                  <input type="hidden" name="id" value={player.id} />
                  <input type="hidden" name="student_no" value={player.student_no ?? ''} />
                  <label className="sr-only" htmlFor="coach_note">코치 메모</label>
                  <textarea
                    id="coach_note"
                    name="coach_note"
                    rows={4}
                    className="field"
                    defaultValue={player.coach_note ?? ''}
                    placeholder="지도 내용, 관찰 사항 등"
                  />
                  <SubmitButton className="btn-secondary" pendingLabel="저장 중…">메모 저장</SubmitButton>
                </ActionForm>
              </Card>
            ) : null}

            {staff ? (
              <Card title="능력치 변경 제안" description="제안은 관리자 승인 후에만 반영됩니다.">
                <ActionForm action={requestAbilityChange} className="space-y-3">
                  <input type="hidden" name="id" value={player.id} />
                  <input type="hidden" name="student_no" value={player.student_no ?? ''} />

                  <div className="grid grid-cols-5 gap-2">
                    {ABILITY_KEYS.map((key) => (
                      <div key={key}>
                        <label className="label !text-xs" htmlFor={`ability-${key}`}>
                          {ABILITY_LABEL[key]}
                        </label>
                        <input
                          id={`ability-${key}`}
                          name={key}
                          type="number"
                          min={1}
                          max={5}
                          required
                          className="field !px-2"
                          defaultValue={abilities?.[key] ?? 3}
                        />
                      </div>
                    ))}
                  </div>

                  <SubmitButton pendingLabel="요청 중…">변경 요청</SubmitButton>
                </ActionForm>

                {requests.length > 0 ? (
                  <ul className="muted mt-4 space-y-1.5 border-t pt-3 text-xs">
                    {requests.map((request) => (
                      <li key={request.id} className="flex items-center gap-2">
                        <StatusBadge status={request.status} />
                        <span>
                          {ABILITY_KEYS.map((key) => request.proposed_abilities[key]).join('/')}
                        </span>
                        <span className="ml-auto">{formatDateTime(request.requested_at)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ) : (
              <Alert kind="info">
                능력치 제안은 교직원 계정만 할 수 있습니다.
              </Alert>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}
