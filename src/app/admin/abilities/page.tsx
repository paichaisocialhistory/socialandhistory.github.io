import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getFeatures } from '@/lib/features';
import { formatDateTime } from '@/lib/format';
import { ABILITY_KEYS, ABILITY_LABEL, type AbilityChangeRequest } from '@/lib/types';
import { approveAbilityRequest, rejectAbilityRequest } from './actions';

export const metadata = { title: '능력치 승인' };
export const dynamic = 'force-dynamic';

type RequestRow = AbilityChangeRequest & {
  players: { student_no: string | null; name: string } | null;
};

export default async function AdminAbilitiesPage() {
  // 기능 플래그가 꺼져 있으면 라우트 자체가 존재하지 않는 것처럼 동작한다.
  if (!getFeatures().playerAbilities) notFound();

  const user = await getCurrentUser();
  const admin = await isAdmin();

  if (!user || !admin) {
    return (
      <>
        <PageHeader title="능력치 승인" />
        <Alert kind="info">
          관리자 전용 화면입니다. <Link href="/admin/login" className="underline">관리자 로그인</Link> 후
          이용하세요.
        </Alert>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('ability_change_requests')
    .select('*, players(student_no, name)')
    .order('requested_at', { ascending: false })
    .limit(100);

  const rows = (data as RequestRow[] | null) ?? [];
  const pending = rows.filter((row) => row.status === 'pending');
  const history = rows.filter((row) => row.status !== 'pending').slice(0, 30);

  return (
    <>
      <PageHeader
        title="능력치 변경 승인"
        description="승인한 요청만 선수 능력치에 반영됩니다. 반려하면 값은 그대로 유지됩니다."
      />

      {error ? <Alert kind="error">요청 목록을 불러오지 못했습니다: {error.message}</Alert> : null}

      <Card title={`대기 중 ${pending.length}건`} className="mb-5">
        {pending.length === 0 ? (
          <EmptyState>처리할 요청이 없습니다.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => (
              <li key={request.id} className="rounded-lg border p-3.5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {request.players?.student_no ? (
                        <Link href={`/players/${request.players.student_no}`} className="underline underline-offset-2">
                          {request.players.name}
                        </Link>
                      ) : (
                        (request.players?.name ?? '삭제된 선수')
                      )}
                    </p>
                    <ul className="muted mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {ABILITY_KEYS.map((key) => (
                        <li key={key}>
                          {ABILITY_LABEL[key]}{' '}
                          <strong className="text-[color:var(--text)] tabular-nums">
                            {request.proposed_abilities[key]}
                          </strong>
                        </li>
                      ))}
                    </ul>
                    <p className="muted mt-1.5 text-xs">
                      요청: {request.requested_by ?? '알 수 없음'} · {formatDateTime(request.requested_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <ActionForm action={approveAbilityRequest}>
                      <input type="hidden" name="id" value={request.id} />
                      <SubmitButton pendingLabel="승인 중…">승인</SubmitButton>
                    </ActionForm>

                    <ActionForm action={rejectAbilityRequest} className="flex items-start gap-2">
                      <input type="hidden" name="id" value={request.id} />
                      <input
                        name="note"
                        className="field !w-36 !py-1.5 !text-xs"
                        placeholder="사유(선택)"
                        maxLength={100}
                        aria-label="반려 사유"
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

      <Card title="처리 이력">
        {history.length === 0 ? (
          <EmptyState>처리 이력이 없습니다.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>선수</th>
                  <th>제안값</th>
                  <th>상태</th>
                  <th>처리자</th>
                  <th>처리 시각</th>
                </tr>
              </thead>
              <tbody>
                {history.map((request) => (
                  <tr key={request.id}>
                    <td className="font-medium">{request.players?.name ?? '삭제된 선수'}</td>
                    <td className="muted tabular-nums">
                      {ABILITY_KEYS.map((key) => request.proposed_abilities[key]).join(' / ')}
                    </td>
                    <td>
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="muted">{request.reviewed_by ?? '-'}</td>
                    <td className="muted">{formatDateTime(request.reviewed_at)}</td>
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
