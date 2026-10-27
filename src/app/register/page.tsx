import Link from 'next/link';
import { createSupabaseServerClient, getCurrentUser, isStaff } from '@/lib/supabase/server';
import { Alert, Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { BulkRegisterForm } from '@/components/bulk-register-form';
import { POSITIONS, POSITION_LABEL } from '@/lib/types';
import { registerPlayer, registerPlayersInBulk } from './actions';

export const metadata = { title: '선수 등록' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  const staff = user ? await isStaff() : false;

  if (!user || !staff) {
    return (
      <>
        <PageHeader title="선수 등록" />
        <Alert kind="info">
          선수 등록은 교직원만 할 수 있습니다.{' '}
          {user ? (
            <>관리자에게 교직원 권한을 요청하세요.</>
          ) : (
            <Link href="/admin/login" className="underline">관리자 로그인</Link>
          )}
          {' '}팀·일정·순위와 선수 명단은 로그인 없이 볼 수 있습니다.
        </Alert>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved');

  const thisYear = new Date().getFullYear();
  const admissionYears = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

  return (
    <>
      <PageHeader
        title="선수 등록"
        description={`교사가 직접 등록합니다. 등록 즉시 학번이 발급됩니다. 현재 ${count ?? 0}명.`}
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card
          title="명단 일괄 등록"
          description="학급 명단을 그대로 붙여넣으면 한꺼번에 등록됩니다."
        >
          <BulkRegisterForm
            admissionYears={admissionYears}
            defaultYear={thisYear}
            action={registerPlayersInBulk}
          />
        </Card>

        <div className="space-y-5">
          <Card title="한 명씩 등록" description="전학생처럼 나중에 추가할 때 씁니다.">
            <ActionForm action={registerPlayer} className="space-y-3" resetOnSuccess>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label" htmlFor="name">
                    이름 <span className="text-red-600">*</span>
                  </label>
                  <input id="name" name="name" className="field" required maxLength={20} />
                </div>
                <div>
                  <label className="label" htmlFor="admission_year">
                    입학년도 <span className="text-red-600">*</span>
                  </label>
                  <select id="admission_year" name="admission_year" className="field" defaultValue={thisYear} required>
                    {admissionYears.map((year) => (
                      <option key={year} value={year}>{year}년</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label" htmlFor="grade">학년</label>
                  <input id="grade" name="grade" className="field" inputMode="numeric" maxLength={2} />
                </div>
                <div>
                  <label className="label" htmlFor="class_no">반</label>
                  <input id="class_no" name="class_no" className="field" inputMode="numeric" maxLength={3} />
                </div>
                <div>
                  <label className="label" htmlFor="number">번호</label>
                  <input id="number" name="number" className="field" inputMode="numeric" maxLength={3} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="position">포지션</label>
                <select id="position" name="position" className="field" defaultValue="">
                  <option value="">선택 안 함</option>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {position} · {POSITION_LABEL[position]}
                    </option>
                  ))}
                </select>
              </div>

              <SubmitButton pendingLabel="등록 중…">선수 등록</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="등록하면 생기는 일">
            <ol className="muted space-y-2.5 text-sm leading-relaxed">
              <li>
                <strong className="text-[color:var(--text)]">학번이 바로 발급됩니다</strong>
                <br />
                <code>입학년도-0001</code> 형식이며 이후 변경되지 않습니다.
              </li>
              <li>
                <strong className="text-[color:var(--text)]">같은 학생은 중복되지 않습니다</strong>
                <br />
                입학년도·학년·반·번호가 같으면 건너뜁니다. 같은 명단을 두 번 넣어도 안전합니다.
              </li>
              <li>
                <strong className="text-[color:var(--text)]">3년간 기록이 누적됩니다</strong>
                <br />
                학년·반이 바뀌어도 같은 학번 아래 쌓입니다.
              </li>
            </ol>

            <p className="muted mt-4 border-t pt-3 text-xs leading-relaxed" style={{ borderColor: 'var(--border)' }}>
              이름·학년·반·번호는 개인정보입니다. 리그 운영에 필요한 학생만 등록하고, 졸업
              후에는 학교 정책에 따라 보관·삭제하세요.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
