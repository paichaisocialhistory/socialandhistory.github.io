import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { POSITIONS, POSITION_LABEL, type Team } from '@/lib/types';
import { submitRegistration } from './actions';

export const metadata = { title: '선수 등록 신청' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const supabase = await createSupabaseServerClient();
  const { data: teams } = await supabase.from('teams').select('id, name').order('name');

  const thisYear = new Date().getFullYear();
  // 재학 기간(3년)을 고려해 최근 입학년도 후보를 제시한다.
  const admissionYears = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2, thisYear - 3];

  return (
    <>
      <PageHeader
        title="선수 등록 신청"
        description="로그인 없이 신청할 수 있습니다. 담당 선생님이 승인하면 고유번호(학번)가 발급됩니다."
      />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card title="신청서">
          <ActionForm action={submitRegistration} className="space-y-4" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="name">
                  이름 <span className="text-red-600">*</span>
                </label>
                <input id="name" name="name" className="field" required maxLength={20} autoComplete="off" />
              </div>

              <div>
                <label className="label" htmlFor="admission_year">
                  입학년도 <span className="text-red-600">*</span>
                </label>
                <select id="admission_year" name="admission_year" className="field" defaultValue={thisYear} required>
                  {admissionYears.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <label className="label" htmlFor="grade">
                    학년
                  </label>
                  <input id="grade" name="grade" className="field" inputMode="numeric" maxLength={2} />
                </div>
                <div>
                  <label className="label" htmlFor="class_no">
                    반
                  </label>
                  <input id="class_no" name="class_no" className="field" inputMode="numeric" maxLength={3} />
                </div>
                <div>
                  <label className="label" htmlFor="number">
                    번호
                  </label>
                  <input id="number" name="number" className="field" inputMode="numeric" maxLength={3} />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="position">
                  포지션
                </label>
                <select id="position" name="position" className="field" defaultValue="">
                  <option value="">선택 안 함</option>
                  {POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {position} · {POSITION_LABEL[position]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="team_id">
                  희망 팀
                </label>
                <select id="team_id" name="team_id" className="field" defaultValue="">
                  <option value="">선택 안 함</option>
                  {((teams as Pick<Team, 'id' | 'name'>[] | null) ?? []).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="muted text-xs leading-relaxed">
              제출한 이름·학년·반·번호는 교내 축구리그 운영 목적으로만 사용됩니다. 신청 후 수정이
              필요하면 담당 선생님에게 알려 주세요.
            </p>

            <SubmitButton pendingLabel="제출 중…">신청서 제출</SubmitButton>
          </ActionForm>
        </Card>

        <Card title="승인 절차">
          <ol className="muted space-y-3 text-sm leading-relaxed">
            <li>
              <strong className="text-[color:var(--text)]">1. 신청서 제출</strong>
              <br />
              제출하면 승인 대기 상태로 저장됩니다.
            </li>
            <li>
              <strong className="text-[color:var(--text)]">2. 담당 선생님 검토</strong>
              <br />
              승인 또는 반려 처리합니다.
            </li>
            <li>
              <strong className="text-[color:var(--text)]">3. 고유번호 발급</strong>
              <br />
              승인 시 <code>입학년도-0001</code> 형식의 학번이 자동 발급되며, 이후 변경되지 않습니다.
            </li>
            <li>
              <strong className="text-[color:var(--text)]">4. 3년간 기록 누적</strong>
              <br />
              학년·반이 바뀌어도 같은 학번 아래 경기 기록이 계속 쌓입니다.
            </li>
          </ol>
        </Card>
      </div>
    </>
  );
}
