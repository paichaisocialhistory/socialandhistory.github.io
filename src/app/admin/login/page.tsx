import { redirect } from 'next/navigation';
import { Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { isAdmin } from '@/lib/supabase/server';
import { signIn } from './actions';

export const metadata = { title: '관리자 로그인' };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin/players');

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="관리자 로그인" description="교사용 계정으로만 로그인할 수 있습니다." />

      <Card>
        <ActionForm action={signIn} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="field"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="field"
              required
              autoComplete="current-password"
            />
          </div>

          <SubmitButton pendingLabel="로그인 중…">로그인</SubmitButton>
        </ActionForm>

        <p className="muted mt-4 text-xs leading-relaxed">
          계정은 Supabase Auth 에서 발급합니다. 로그인만으로는 권한이 생기지 않으며,{' '}
          <code>admins</code> 표에 등록된 계정만 관리 기능을 사용할 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
