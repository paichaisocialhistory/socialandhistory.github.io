import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, EmptyState, PageHeader, Stat } from '@/components/ui';
import { calculateStandings } from '@/lib/standings';
import { formatDate } from '@/lib/format';
import type { Match, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: teamRows }, { data: matchRows }, { count: playerCount }] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('matches').select('*'),
    supabase.from('players').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
  ]);

  const teams = (teamRows as Team[] | null) ?? [];
  const matches = (matchRows as Match[] | null) ?? [];

  const standings = calculateStandings(teams, matches).slice(0, 5);
  const confirmed = matches.filter((match) => match.is_confirmed);
  const upcoming = matches
    .filter((match) => !match.is_confirmed && match.match_date && match.match_date >= today)
    .sort((a, b) => (a.match_date ?? '').localeCompare(b.match_date ?? ''))
    .slice(0, 5);

  const teamName = new Map(teams.map((team) => [team.id, team.name]));
  const label = (id: string | null) => (id && teamName.get(id)) || '삭제된 팀';

  return (
    <>
      <PageHeader
        title="교내 축구리그"
        description="팀 현황과 다가오는 경기를 한눈에 확인하세요."
        action={
          <Link href="/register" className="btn-primary">
            선수 등록 신청
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="참가 팀" value={`${teams.length}팀`} />
        <Stat label="등록 선수" value={`${playerCount ?? 0}명`} />
        <Stat label="확정 경기" value={`${confirmed.length}경기`} />
        <Stat label="예정 경기" value={`${upcoming.length}경기`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card
          title="다가오는 경기"
          action={
            <Link href="/schedule" className="muted text-xs underline underline-offset-2">
              전체 일정
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <EmptyState>예정된 경기가 없습니다.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((match) => (
                <li key={match.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {label(match.team_a_id)}
                    <span className="muted mx-2 font-normal">vs</span>
                    {label(match.team_b_id)}
                  </span>
                  <span className="muted shrink-0 text-xs">{formatDate(match.match_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="상위 5팀"
          action={
            <Link href="/standings" className="muted text-xs underline underline-offset-2">
              전체 순위표
            </Link>
          }
        >
          {standings.length === 0 ? (
            <EmptyState>등록된 팀이 없습니다.</EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="data-table !min-w-0">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>팀</th>
                    <th className="text-right">경기</th>
                    <th className="text-right">득실차</th>
                    <th className="text-right">승점</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr key={row.teamId}>
                      <td className="tabular-nums">{index + 1}</td>
                      <td className="font-medium">{row.teamName}</td>
                      <td className="text-right tabular-nums">{row.played}</td>
                      <td className="text-right tabular-nums">
                        {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                      </td>
                      <td className="text-right font-bold tabular-nums">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
