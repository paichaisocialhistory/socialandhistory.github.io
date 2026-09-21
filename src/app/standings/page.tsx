import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { calculateStandings } from '@/lib/standings';
import type { Match, Team } from '@/lib/types';

export const metadata = { title: '순위표' };
export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: teams, error: teamError }, { data: matches, error: matchError }] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('matches').select('*').eq('is_confirmed', true),
  ]);

  const rows = calculateStandings((teams as Team[] | null) ?? [], (matches as Match[] | null) ?? []);
  const error = teamError ?? matchError;

  return (
    <>
      <PageHeader
        title="순위표"
        description="확정된 경기만 집계합니다. 승점 3·1·0, 동점 시 득실차 → 득점 → 팀명 순."
      />

      {error ? <Alert kind="error">순위표를 계산하지 못했습니다: {error.message}</Alert> : null}

      <Card>
        {rows.length === 0 ? (
          <EmptyState>등록된 팀이 없습니다.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">교내 축구리그 순위표</caption>
              <thead>
                <tr>
                  <th className="w-10">순위</th>
                  <th>팀</th>
                  <th className="text-right">경기</th>
                  <th className="text-right">승</th>
                  <th className="text-right">무</th>
                  <th className="text-right">패</th>
                  <th className="text-right">득점</th>
                  <th className="text-right">실점</th>
                  <th className="text-right">득실차</th>
                  <th className="text-right">승점</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.teamId}>
                    <td className="tabular-nums">{index + 1}</td>
                    <td className="font-medium">{row.teamName}</td>
                    <td className="text-right tabular-nums">{row.played}</td>
                    <td className="text-right tabular-nums">{row.won}</td>
                    <td className="text-right tabular-nums">{row.drawn}</td>
                    <td className="text-right tabular-nums">{row.lost}</td>
                    <td className="text-right tabular-nums">{row.goalsFor}</td>
                    <td className="text-right tabular-nums">{row.goalsAgainst}</td>
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
    </>
  );
}
