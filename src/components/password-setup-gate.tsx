import { signOut } from '@/lib/auth-actions';
import { ActionForm } from './action-form';
import { SubmitButton } from './submit-button';
import { changePassword } from '@/app/account/password/actions';

/**
 * 임시 비밀번호로 처음 들어온 사람에게만 보이는 화면.
 *
 * 비밀번호를 정하기 전에는 다른 화면으로 갈 수 없다. 레이아웃이 children 대신
 * 이것을 그리므로, 주소를 직접 쳐도 우회할 수 없다.
 */
export function PasswordSetupGate({ loginId }: { loginId: string | null }) {
  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">비밀번호를 정해 주세요</h1>
        <p className="muted mt-1.5 text-sm">
          선생님께 받은 임시 비밀번호는 한 번만 쓰는 것입니다. 본인만 아는 비밀번호로
          바꿔야 사이트를 이용할 수 있습니다.
        </p>
      </header>

      <section className="surface p-4 sm:p-5">
        {loginId ? (
          <p className="muted mb-4 text-xs">
            로그인한 계정 <span className="font-mono">{loginId}</span>
          </p>
        ) : null}

        <ActionForm action={changePassword} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">
              새 비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
            <p className="muted mt-1 text-xs">8자 이상으로 정하세요.</p>
          </div>

          <div>
            <label className="label" htmlFor="password_confirm">
              새 비밀번호 확인
            </label>
            <input
              id="password_confirm"
              name="password_confirm"
              type="password"
              className="field"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <SubmitButton pendingLabel="정하는 중…">비밀번호 정하기</SubmitButton>
        </ActionForm>

        <form action={signOut} className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <button type="submit" className="muted text-xs underline">
            나중에 하기 (로그아웃)
          </button>
        </form>
      </section>
    </div>
  );
}
