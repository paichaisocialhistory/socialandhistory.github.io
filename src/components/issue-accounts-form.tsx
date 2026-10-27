'use client';

import { useActionState } from 'react';
import { Alert } from './ui';
import { SubmitButton } from './submit-button';
import type { IssueResult } from '@/app/admin/accounts/actions';

type Player = { id: string; name: string; student_no: string | null };

/**
 * 선수를 골라 계정을 발급한다.
 * 초기 비밀번호는 저장하지 않으므로, 발급 직후 이 화면에서만 볼 수 있다.
 */
export function IssueAccountsForm({
  players,
  action,
}: {
  players: Player[];
  action: (formData: FormData) => Promise<IssueResult>;
}) {
  const [state, formAction] = useActionState<IssueResult | null, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  const issued = state && 'issued' in state ? state.issued : [];
  const skipped = state && 'skipped' in state ? state.skipped : [];

  return (
    <>
      <form action={formAction} className="space-y-3">
        <div aria-live="polite" className="empty:hidden">
          {state && 'error' in state ? <Alert kind="error">{state.error}</Alert> : null}
          {state && 'success' in state ? <Alert kind="success">{state.success}</Alert> : null}
        </div>

        {players.length === 0 ? (
          <p className="muted py-4 text-center text-sm">
            계정을 발급할 수 있는 선수가 없습니다. 선수 등록을 먼저 승인하세요.
          </p>
        ) : (
          <>
            <fieldset
              className="max-h-64 overflow-y-auto rounded-lg border p-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <legend className="label !mb-0 px-1">계정을 발급할 선수</legend>
              <ul className="space-y-1.5">
                {players.map((player) => (
                  <li key={player.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="player_id" value={player.id} />
                      <span className="font-mono text-xs tabular-nums">{player.student_no}</span>
                      <span>{player.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            <SubmitButton pendingLabel="발급 중…">선택한 선수에게 계정 발급</SubmitButton>
          </>
        )}
      </form>

      {issued.length > 0 ? (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              발급 결과 {issued.length}건
              <span className="muted ml-2 font-normal">— 이 화면을 벗어나면 다시 볼 수 없습니다</span>
            </h3>
            <button type="button" onClick={() => window.print()} className="btn-secondary !px-2.5 !py-1 !text-xs">
              인쇄
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>학번</th>
                  <th>이름</th>
                  <th>아이디</th>
                  <th>초기 비밀번호</th>
                </tr>
              </thead>
              <tbody>
                {issued.map((row) => (
                  <tr key={row.loginId}>
                    <td className="font-mono text-xs tabular-nums">{row.studentNo}</td>
                    <td>{row.name}</td>
                    <td className="font-mono text-xs">{row.loginId}</td>
                    <td className="font-mono text-sm font-bold">{row.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="muted mt-2 text-xs leading-relaxed">
            학생에게는 <strong>학번</strong>과 <strong>비밀번호</strong>만 알려 주면 됩니다.
            비밀번호는 암호화되어 저장되므로 선생님도 다시 볼 수 없습니다. 잊어버린 학생은
            아래 목록에서 재설정하세요.
          </p>
        </div>
      ) : null}

      {skipped.length > 0 ? (
        <ul className="muted mt-3 space-y-1 text-xs">
          {skipped.map((reason) => (
            <li key={reason}>건너뜀 — {reason}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
