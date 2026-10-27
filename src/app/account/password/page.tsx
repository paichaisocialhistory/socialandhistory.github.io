import Link from 'next/link';
import { Alert, Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getCurrentUser } from '@/lib/supabase/server';
import { changePassword } from './actions';

export const metadata = { title: '비밀번호 변경' };
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <>
        <PageHeader title="비밀번호 변경" />
        <Alert kind="info">
          로그인 후 이용하세요. <Link href="/login" className="underline">로그인</Link>
        </Alert>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHeader
        title="비밀번호 변경"
        description="선생님께 받은 초기 비밀번호는 본인만 아는 것으로 바꿔 주세요."
      />

      <Card>
        <ActionForm action={changePassword} className="space-y-4" resetOnSuccess>
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

          <SubmitButton pendingLabel="변경 중…">비밀번호 바꾸기</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
