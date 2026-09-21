import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { createTeam, deleteTeam } from './actions';
import type { Team } from '@/lib/types';

export const metadata = { title: '팀' };
export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const supabase = await createSupabaseServerClient();
  const admin = await isAdmin();

  const [{ data: teams, error }, { data: playerRows }] = await Promise.all([
    supabase.from('teams').select('*').order('name'),
    supabase.from('players').select('team_id').eq('status', 'approved'),
  ]);

  const counts = new Map<string, number>();
  for (const row of playerRows ?? []) {
    if (row.team_id) counts.set(row.team_id, (counts.get(row.team_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="팀"
        description="리그에 참가하는 팀 목록입니다. 팀 추가·삭제는 관리자만 할 수 있습니다."
      />

      {error ? <Alert kind="error">팀 목록을 불러오지 못했습니다: {error.message}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card title="팀 목록">
          {(teams as Team[] | null)?.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>팀명</th>
                    <th className="text-right">승인 선수</th>
                    {admin ? <th className="w-24" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {(teams as Team[]).map((team) => (
                    <tr key={team.id}>
                      <td className="font-medium">{team.name}</td>
                      <td className="text-right tabular-nums">{counts.get(team.id) ?? 0}명</td>
                      {admin ? (
                        <td className="text-right">
                          <ActionForm action={deleteTeam}>
                            <input type="hidden" name="id" value={team.id} />
                            <SubmitButton className="btn-danger !px-2.5 !py-1 !text-xs" pendingLabel="삭제 중…">
                              삭제
                            </SubmitButton>
                          </ActionForm>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>아직 등록된 팀이 없습니다.</EmptyState>
          )}
        </Card>

        {admin ? (
          <Card title="팀 추가" description="같은 이름의 팀은 중복 등록되지 않습니다.">
            <ActionForm action={createTeam} className="space-y-3" resetOnSuccess>
              <div>
                <label className="label" htmlFor="team-name">
                  팀 이름
                </label>
                <input id="team-name" name="name" className="field" required maxLength={40} placeholder="예: 3학년 1반" />
              </div>
              <SubmitButton pendingLabel="추가 중…">팀 추가</SubmitButton>
            </ActionForm>
          </Card>
        ) : (
          <Card title="안내">
            <p className="muted text-sm leading-relaxed">
              팀을 추가하거나 삭제하려면 관리자(교사) 계정으로 로그인해야 합니다. 팀을 삭제해도 소속
              선수의 기록은 삭제되지 않고 소속만 비워집니다.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
