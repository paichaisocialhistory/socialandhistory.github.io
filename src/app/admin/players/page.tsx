import Link from 'next/link';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { formatDateTime } from '@/lib/format';
import { POSITION_LABEL, type PlayerWithTeam } from '@/lib/types';
import { approvePlayer, rejectPlayer } from './actions';

export const metadata = { title: '승인 대기' };
export const dynamic = 'force-dynamic';

export default async function AdminPlayersPage() {
  const user = await getCurrentUser();
  const admin = await isAdmin();

  if (!user || !admin) {
    return (
      <>
        <PageHeader title="승인 대기" />
        <Alert kind="info">
          관리자 전용 화면입니다. <Link href="/admin/login" className="underline">관리자 로그인</Link> 후
          이용하세요.
        </Alert>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('players')
    .select('*, teams(id, name)')
    .in('status', ['pending', 'rejected'])
    .order('submitted_at', { ascending: true });

  const rows = (data as PlayerWithTeam[] | null) ?? [];
  const pending = rows.filter((row) => row.status === 'pending');
  const rejected = rows.filter((row) => row.status === 'rejected');

  return (
    <>
      <PageHeader
        title="선수 등록 승인"
        description="승인하면 입학년도 기준 고유번호(학번)가 자동 발급되며 이후 변경할 수 없습니다."
      />

      {error ? <Alert kind="error">목록을 불러오지 못했습니다: {error.message}</Alert> : null}

      <Card title={`승인 대기 ${pending.length}건`} className="mb-5">
        {pending.length === 0 ? (
          <EmptyState>승인을 기다리는 신청서가 없습니다.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {pending.map((player) => (
              <li key={player.id} className="rounded-lg border p-3.5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {player.name}
                      <span className="muted ml-2 text-xs font-normal">
                        {player.admission_year}년 입학 · 졸업 예정 {player.graduation_year}년
                      </span>
                    </p>
                    <p className="muted mt-1 text-sm">
                      {[
                        player.grade ? `${player.grade}학년` : null,
                        player.class_no ? `${player.class_no}반` : null,
                        player.number ? `${player.number}번` : null,
                        player.position ? `${player.position} · ${POSITION_LABEL[player.position]}` : null,
                        player.teams?.name ? `희망 팀: ${player.teams.name}` : '희망 팀 없음',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="muted mt-1 text-xs">제출: {formatDateTime(player.submitted_at)}</p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <ActionForm action={approvePlayer}>
                      <input type="hidden" name="id" value={player.id} />
                      <SubmitButton pendingLabel="승인 중…">승인</SubmitButton>
                    </ActionForm>

                    <ActionForm action={rejectPlayer} className="flex items-start gap-2">
                      <input type="hidden" name="id" value={player.id} />
                      <input
                        name="reason"
                        className="field !w-40 !py-1.5 !text-xs"
                        placeholder="반려 사유(선택)"
                        maxLength={100}
                        aria-label={`${player.name} 반려 사유`}
                      />
                      <SubmitButton className="btn-danger" pendingLabel="처리 중…">
                        반려
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={`반려 ${rejected.length}건`} description="반려된 신청서는 승인으로 되돌릴 수 있습니다.">
        {rejected.length === 0 ? (
          <EmptyState>반려된 신청서가 없습니다.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>입학년도</th>
                  <th>사유</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rejected.map((player) => (
                  <tr key={player.id}>
                    <td className="font-medium">{player.name}</td>
                    <td className="tabular-nums">{player.admission_year}</td>
                    <td className="muted">{player.reject_reason ?? '-'}</td>
                    <td>
                      <StatusBadge status={player.status} />
                    </td>
                    <td className="text-right">
                      <ActionForm action={approvePlayer}>
                        <input type="hidden" name="id" value={player.id} />
                        <SubmitButton className="btn-secondary !px-2.5 !py-1 !text-xs" pendingLabel="승인 중…">
                          승인으로 변경
                        </SubmitButton>
                      </ActionForm>
                    </td>
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
