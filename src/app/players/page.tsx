import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { getFeatures } from '@/lib/features';
import { POSITION_LABEL, type PlayerWithTeam, type Team } from '@/lib/types';

export const metadata = { title: '선수 데이터베이스' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ team?: string; year?: string; q?: string; status?: string }>;

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const features = getFeatures();
  const admin = await isAdmin();

  // 공개 설정이 꺼져 있으면 관리자 외에는 접근할 수 없다.
  if (!features.publicPlayerDirectory && !admin) notFound();

  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('players').select('*, teams(id, name)');

  // 관리자만 대기/반려 행을 볼 수 있다(RLS 로도 한 번 더 강제된다).
  const statusFilter = admin && params.status ? params.status : 'approved';
  if (statusFilter !== 'all') query = query.eq('status', statusFilter);

  if (params.team) query = query.eq('team_id', params.team);
  if (params.year) query = query.eq('admission_year', Number(params.year));
  if (params.q) query = query.ilike('name', `%${params.q}%`);

  const [{ data, error }, { data: teams }] = await Promise.all([
    query.order('admission_year', { ascending: false }).order('name'),
    supabase.from('teams').select('id, name').order('name'),
  ]);

  const players = (data as PlayerWithTeam[] | null) ?? [];
  const years = [...new Set(players.map((p) => p.admission_year))].sort((a, b) => b - a);
  const thisYear = new Date().getFullYear();

  return (
    <>
      <PageHeader
        title="선수 데이터베이스"
        description="학번은 입학 연도 기준으로 발급되며 재학 3년간 같은 번호로 기록이 누적됩니다."
      />

      {error ? <Alert kind="error">선수 목록을 불러오지 못했습니다: {error.message}</Alert> : null}

      <Card className="mb-5">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="label" htmlFor="q">
              이름 검색
            </label>
            <input id="q" name="q" className="field" defaultValue={params.q ?? ''} placeholder="이름 일부" />
          </div>

          <div>
            <label className="label" htmlFor="team">
              팀
            </label>
            <select id="team" name="team" className="field" defaultValue={params.team ?? ''}>
              <option value="">전체</option>
              {((teams as Pick<Team, 'id' | 'name'>[] | null) ?? []).map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="year">
              입학년도
            </label>
            <select id="year" name="year" className="field" defaultValue={params.year ?? ''}>
              <option value="">전체</option>
              {(years.length ? years : [thisYear]).map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            {admin ? (
              <div>
                <label className="label" htmlFor="status">
                  상태
                </label>
                <select id="status" name="status" className="field" defaultValue={statusFilter}>
                  <option value="approved">승인</option>
                  <option value="pending">대기</option>
                  <option value="rejected">반려</option>
                  <option value="all">전체</option>
                </select>
              </div>
            ) : null}
            <button type="submit" className="btn-primary">
              검색
            </button>
          </div>
        </form>
      </Card>

      <Card title={`선수 ${players.length}명`}>
        {players.length === 0 ? (
          <EmptyState>조건에 맞는 선수가 없습니다.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th>학년/반/번호</th>
                  <th>포지션</th>
                  <th>팀</th>
                  <th>졸업 예정</th>
                  {admin ? <th>상태</th> : null}
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id}>
                    <td className="font-mono text-xs tabular-nums">
                      {player.student_no ? (
                        <Link href={`/players/${player.student_no}`} className="underline underline-offset-2">
                          {player.student_no}
                        </Link>
                      ) : (
                        <span className="muted">미발급</span>
                      )}
                    </td>
                    <td className="font-medium">{player.name}</td>
                    <td className="muted">
                      {[player.grade && `${player.grade}학년`, player.class_no && `${player.class_no}반`, player.number && `${player.number}번`]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </td>
                    <td>{player.position ? `${player.position} · ${POSITION_LABEL[player.position]}` : '-'}</td>
                    <td>{player.teams?.name ?? '미배정'}</td>
                    <td className="tabular-nums">{player.graduation_year}년</td>
                    {admin ? (
                      <td>
                        <StatusBadge status={player.status} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
