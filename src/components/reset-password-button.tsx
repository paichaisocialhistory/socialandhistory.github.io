'use client';

import { useActionState } from 'react';
import { SubmitButton } from './submit-button';
import type { IssueResult } from '@/app/admin/accounts/actions';

/** 비밀번호를 잊은 학생에게 새 비밀번호를 발급하고 그 자리에서 보여 준다. */
export function ResetPasswordButton({
  userId,
  action,
}: {
  userId: string;
  action: (formData: FormData) => Promise<IssueResult>;
}) {
  const [state, formAction] = useActionState<IssueResult | null, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );

  const issued = state && 'issued' in state ? state.issued[0] : null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />

      {issued ? (
        <span className="rounded-md border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }}>
          새 비밀번호 <strong className="font-mono text-sm">{issued.password}</strong>
        </span>
      ) : null}

      {state && 'error' in state ? (
        <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>
      ) : null}

      <SubmitButton className="btn-secondary !px-2.5 !py-1 !text-xs" pendingLabel="재설정 중…">
        비밀번호 재설정
      </SubmitButton>
    </form>
  );
}
