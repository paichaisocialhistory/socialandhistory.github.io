import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { getCurrentUser } from '@/lib/supabase/server';
import { readFlag } from '@/lib/env';
import { signInWithGoogle, signInWithStudentNo } from './actions';

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

  // 학교에 구글 워크스페이스가 있을 때만 구글 버튼을 노출한다.
  const googleEnabled = readFlag(process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN, false);

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="로그인" description="선생님께 받은 학번과 비밀번호로 들어옵니다." />

      <Card>
        {error ? (
          <div className="mb-4">
            <Alert kind="error">{ERROR_MESSAGE[error] ?? '로그인에 실패했습니다.'}</Alert>
          </div>
        ) : null}

        <ActionForm action={signInWithStudentNo} className="space-y-4">
          <input type="hidden" name="next" value={next ?? '/'} />

          <div>
            <label className="label" htmlFor="student_no">
              학번
            </label>
            <input
              id="student_no"
              name="student_no"
              className="field"
              required
              autoComplete="username"
              placeholder="2026-0001"
              inputMode="text"
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

        {googleEnabled ? (
          <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <ActionForm action={signInWithGoogle}>
              <input type="hidden" name="next" value={next ?? '/'} />
              <SubmitButton className="btn-secondary" pendingLabel="이동 중…">
                학교 구글 계정으로 로그인
              </SubmitButton>
            </ActionForm>
          </div>
        ) : null}

        <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className="muted text-xs leading-relaxed">
            로그인하면 본인이 태그된 경기 장면을 볼 수 있습니다. 코치 메모와 다른 학생의 기록은
            보이지 않습니다.
          </p>
          <p className="muted text-xs leading-relaxed">
            비밀번호를 잊었으면 담당 선생님께 재설정을 요청하세요. 교사용 로그인은{' '}
            <Link href="/admin/login" className="underline">관리자 로그인</Link>입니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
