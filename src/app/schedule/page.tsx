import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { formatDate } from '@/lib/format';
import type { Match, Team } from '@/lib/types';
import { createMatch, deleteMatch, saveMatchResult } from './actions';

export const metadata = { title: '일정·결과' };
export const dynamic = 'force-dynamic';

export default async function SchedulePage() {
  const supabase = await createSupabaseServerClient();
  const admin = await isAdmin();

  const [{ data: matchRows, error }, { data: teamRows }] = await Promise.all([
    supabase.from('matches').select('*').order('match_date', { ascending: false }),
    supabase.from('teams').select('id, name').order('name'),
  ]);

  const matches = (matchRows as Match[] | null) ?? [];
  const teams = (teamRows as Pick<Team, 'id' | 'name'>[] | null) ?? [];
  const teamName = new Map(teams.map((team) => [team.id, team.name]));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = matches
    .filter((match) => !match.is_confirmed && (!match.match_date || match.match_date >= today))
    .reverse();
  const past = matches.filter((match) => match.is_confirmed || (match.match_date && match.match_date < today));

  function label(id: string | null) {
    return (id && teamName.get(id)) || '삭제된 팀';
  }

  function MatchRow({ match }: { match: Match }) {
    return (
      <li className="rounded-lg border p-3.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="muted text-xs">{formatDate(match.match_date)}</p>
            <p className="mt-0.5 font-semibold">
              {label(match.team_a_id)}
              <span className="muted mx-2 font-normal">vs</span>
              {label(match.team_b_id)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {match.score_a !== null && match.score_b !== null ? (
              <span className="text-lg font-bold tabular-nums">
                {match.score_a} : {match.score_b}
              </span>
            ) : (
              <span className="muted text-sm">경기 전</span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                match.is_confirmed
                  ? 'bg-pitch-100 text-pitch-700 dark:bg-pitch-900 dark:text-pitch-100'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
              }`}
            >
              {match.is_confirmed ? '확정' : '미확정'}
            </span>
          </div>
        </div>

        {admin ? (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <ActionForm action={saveMatchResult} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={match.id} />
              <div>
                <label className="label !text-xs" htmlFor={`sa-${match.id}`}>
                  {label(match.team_a_id)}
                </label>
                <input
                  id={`sa-${match.id}`}
                  name="score_a"
                  type="number"
                  min={0}
                  className="field !w-20"
                  defaultValue={match.score_a ?? ''}
                />
              </div>
              <div>
                <label className="label !text-xs" htmlFor={`sb-${match.id}`}>
                  {label(match.team_b_id)}
                </label>
                <input
                  id={`sb-${match.id}`}
                  name="score_b"
                  type="number"
                  min={0}
                  className="field !w-20"
                  defaultValue={match.score_b ?? ''}
                />
              </div>
              <label className="flex items-center gap-1.5 pb-2 text-sm">
                <input type="checkbox" name="is_confirmed" defaultChecked={match.is_confirmed} />
                결과 확정
              </label>
              <SubmitButton className="btn-secondary" pendingLabel="저장 중…">
                저장
              </SubmitButton>
            </ActionForm>

            <ActionForm action={deleteMatch} className="ml-auto">
              <input type="hidden" name="id" value={match.id} />
              <SubmitButton className="btn-danger !px-2.5 !py-1 !text-xs" pendingLabel="삭제 중…">
                삭제
              </SubmitButton>
            </ActionForm>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <>
      <PageHeader
        title="경기 일정 · 결과"
        description="결과를 확정한 경기만 순위표에 집계됩니다."
      />

      {error ? <Alert kind="error">경기를 불러오지 못했습니다: {error.message}</Alert> : null}

      {admin ? (
        <Card title="경기 등록" className="mb-5">
          <ActionForm action={createMatch} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" resetOnSuccess>
            <div>
              <label className="label" htmlFor="team_a_id">홈 팀</label>
              <select id="team_a_id" name="team_a_id" className="field" required defaultValue="">
                <option value="" disabled>팀 선택</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="team_b_id">원정 팀</label>
              <select id="team_b_id" name="team_b_id" className="field" required defaultValue="">
                <option value="" disabled>팀 선택</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="match_date">경기 날짜</label>
              <input id="match_date" name="match_date" type="date" className="field" required />
            </div>
            <div className="flex items-end">
              <SubmitButton pendingLabel="등록 중…">경기 등록</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card title={`예정된 경기 ${upcoming.length}건`}>
          {upcoming.length === 0 ? (
            <EmptyState>예정된 경기가 없습니다.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </ul>
          )}
        </Card>

        <Card title={`지난 경기 ${past.length}건`}>
          {past.length === 0 ? (
            <EmptyState>기록된 경기가 없습니다.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {past.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
