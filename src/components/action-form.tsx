'use client';

import { useActionState, useEffect, useId, useRef } from 'react';
import { Alert } from './ui';

export type ActionState = { error?: string; success?: string } | null;
export type FormAction = (formData: FormData) => Promise<ActionState>;

/**
 * 서버 액션을 감싸 오류/성공 메시지를 표시하는 폼.
 * 성공 시 resetOnSuccess 가 true 면 입력값을 비운다(연속 등록용).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    async (_prev, formData) => action(formData),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const statusId = useId();

  useEffect(() => {
    if (resetOnSuccess && state?.success) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className} aria-describedby={statusId}>
      <div id={statusId} aria-live="polite" className="empty:hidden">
        {state?.error ? <Alert kind="error">{state.error}</Alert> : null}
        {state?.success ? <Alert kind="success">{state.success}</Alert> : null}
      </div>
      {children}
    </form>
  );
}
