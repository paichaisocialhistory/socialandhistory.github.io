import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getCurrentUser } from '@/lib/supabase/server';
import { signInWithGoogle } from './actions';

export const metadata = { title: '로그인' };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ next?: string; error?: string }>;

const ERROR_MESSAGE: Record<string, string> = {
  missing_code: '로그인이 완료되지 않았습니다. 다시 시도해 주세요.',
  exchange_failed: '로그인 처리에 실패했습니다. 학교 계정인지 확인한 뒤 다시 시도해 주세요.',
};

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, error } = await searchParams;
  if (await getCurrentUser()) redirect(next ?? '/');

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="로그인" description="학교 구글 계정으로 로그인합니다." />

      <Card>
        {error ? (
          <div className="mb-4">
            <Alert kind="error">{ERROR_MESSAGE[error] ?? '로그인에 실패했습니다.'}</Alert>
          </div>
        ) : null}

        <ActionForm action={signInWithGoogle} className="space-y-4">
          <input type="hidden" name="next" value={next ?? '/'} />
          <SubmitButton pendingLabel="이동 중…">학교 구글 계정으로 로그인</SubmitButton>
        </ActionForm>

        <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="muted text-xs leading-relaxed">
            학생은 로그인하면 본인이 태그된 경기 장면을 볼 수 있습니다. 코치 메모와 다른 학생의
            기록은 보이지 않습니다.
          </p>
          <p className="muted text-xs leading-relaxed">
            교사용 이메일·비밀번호 로그인은{' '}
            <Link href="/admin/login" className="underline">관리자 로그인</Link>에서 사용하세요.
          </p>
        </div>
      </Card>
    </div>
  );
}
