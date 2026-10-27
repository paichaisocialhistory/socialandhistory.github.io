import Link from 'next/link';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import type { Player } from '@/lib/types';
import { issueStudentAccounts, linkPlayer, resetStudentPassword, setRole } from './actions';
import { IssueAccountsForm } from '@/components/issue-accounts-form';
import { ResetPasswordButton } from '@/components/reset-password-button';
import { canIssueAccounts } from '@/lib/supabase/admin';
import { studentAccountDomain } from '@/lib/student-account';

export const metadata = { title: '계정 관리' };
export const dynamic = 'force-dynamic';

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: 'student' | 'staff';
  player_id: string | null;
  created_at: string;
};

type SearchParams = Promise<{ grade?: string }>;

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { grade: gradeFilter } = await searchParams;
  const user = await getCurrentUser();
  const admin = await isAdmin();

  if (!user || !admin) {
    return (
      <>
        <PageHeader title="계정 관리" />
        <Alert kind="info">
          관리자 전용 화면입니다. <Link href="/admin/login" className="underline">관리자 로그인</Link> 후
          이용하세요.
        </Alert>
      </>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: profileRows, error }, { data: playerRows }] = await Promise.all([
    supabase
      .from('profiles')
      .select('user_id, email, role, player_id, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('players')
      .select('id, name, student_no, grade')
      .eq('status', 'approved')
      .order('student_no'),
  ]);

  const profiles = (profileRows as ProfileRow[] | null) ?? [];
  const players = (playerRows as Pick<Player, 'id' | 'name' | 'student_no' | 'grade'>[] | null) ?? [];

  const staff = profiles.filter((p) => p.role === 'staff');
  const students = profiles.filter((p) => p.role === 'student');

  // 아직 계정이 없는 승인 선수만 발급 대상으로 보여 준다.
  const linkedPlayerIds = new Set(profiles.map((p) => p.player_id).filter(Boolean));
  const unlinked = players.filter(
    (player) => player.student_no && !linkedPlayerIds.has(player.id),
  );

  // 올해는 3학년만 발급하는 식으로, 학년을 좁혀 한꺼번에 처리한다.
  const grades = [...new Set(unlinked.map((p) => p.grade).filter(Boolean))].sort();
  const playersWithoutAccount = gradeFilter
    ? unlinked.filter((player) => player.grade === gradeFilter)
    : unlinked;

  return (
    <>
      <PageHeader
        title="계정 관리"
        description="로그인한 계정의 역할을 정하고, 학생 계정을 선수 기록과 연결합니다."
      />

      {error ? <Alert kind="error">계정을 불러오지 못했습니다: {error.message}</Alert> : null}

      <Card
        title="학생 계정 발급"
        description="승인된 선수에게 로그인 계정을 만들어 줍니다. 학생은 학번과 비밀번호로 로그인합니다."
        className="mb-5"
      >
        {canIssueAccounts() ? (
          <>
            <p className="muted mb-3 text-xs leading-relaxed">
              아이디는 <code>학번@{studentAccountDomain()}</code> 형식으로 자동 생성됩니다.
              실제 메일 주소가 아니며 메일은 발송되지 않습니다. 학생에게는 <strong>학번</strong>만
              알려 주면 됩니다.
            </p>
            <form className="mb-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="label !text-xs" htmlFor="grade">학년으로 좁히기</label>
                <select id="grade" name="grade" className="field !w-32 !py-1.5 !text-xs" defaultValue={gradeFilter ?? ''}>
                  <option value="">전체 학년</option>
                  {grades.map((g) => (
                    <option key={g as string} value={g as string}>{g}학년</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-secondary !px-2.5 !py-1 !text-xs">적용</button>
              <span className="muted pb-1 text-xs">
                계정 없는 선수 {playersWithoutAccount.length}명
                {gradeFilter ? ` (전체 ${unlinked.length}명 중)` : ''}
              </span>
            </form>

            <IssueAccountsForm players={playersWithoutAccount} action={issueStudentAccounts} />
          </>
        ) : (
          <Alert kind="info">
            계정 발급에는 <code>SUPABASE_SERVICE_ROLE_KEY</code> 환경변수가 필요합니다. 이 키는
            브라우저로 나가지 않는 서버 전용 값이며, Vercel 환경변수에 등록한 뒤 재배포하면
            이 기능이 켜집니다. 그 전까지는 Supabase 대시보드에서 수동으로 계정을 만들 수 있습니다.
          </Alert>
        )}
      </Card>

      <div className="mb-5">
        <Alert kind="info">
          교사 계정은 본인이 먼저 로그인해야 목록에 나타납니다. 새 계정은 모두
          <strong> 학생</strong>으로 시작하므로, 교사는 여기서 교직원으로 올려 주세요.
        </Alert>
      </div>

      <Card title={`교직원 ${staff.length}명`} className="mb-5">
        {staff.length === 0 ? (
          <EmptyState>교직원으로 지정된 계정이 없습니다.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>이메일</th>
                  <th className="w-32" />
                </tr>
              </thead>
              <tbody>
                {staff.map((profile) => (
                  <tr key={profile.user_id}>
                    <td className="font-medium">{profile.email ?? '(이메일 없음)'}</td>
                    <td className="text-right">
                      <ActionForm action={setRole}>
                        <input type="hidden" name="user_id" value={profile.user_id} />
                        <input type="hidden" name="role" value="student" />
                        <SubmitButton className="btn-secondary !px-2.5 !py-1 !text-xs" pendingLabel="변경 중…">
                          학생으로 내리기
                        </SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={`학생 ${students.length}명`}
        description="선수와 연결해야 학생이 자기 경기 장면을 볼 수 있습니다."
      >
        {students.length === 0 ? (
          <EmptyState>로그인한 학생 계정이 없습니다.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {students.map((profile) => (
              <li key={profile.user_id} className="rounded-lg border p-3.5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{profile.email ?? '(이메일 없음)'}</p>
                    <p className="muted mt-0.5 text-xs">
                      {profile.player_id ? '선수와 연결됨' : '아직 연결되지 않음'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <ActionForm action={linkPlayer} className="flex items-end gap-2">
                      <input type="hidden" name="user_id" value={profile.user_id} />
                      <div>
                        <label className="label !text-xs" htmlFor={`player-${profile.user_id}`}>
                          연결할 선수
                        </label>
                        <select
                          id={`player-${profile.user_id}`}
                          name="player_id"
                          className="field !w-56 !py-1.5 !text-xs"
                          defaultValue={profile.player_id ?? ''}
                        >
                          <option value="">연결 안 함</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.student_no} · {player.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <SubmitButton className="btn-secondary" pendingLabel="저장 중…">
                        저장
                      </SubmitButton>
                    </ActionForm>

                    {canIssueAccounts() ? (
                      <ResetPasswordButton userId={profile.user_id} action={resetStudentPassword} />
                    ) : null}

                    <ActionForm action={setRole}>
                      <input type="hidden" name="user_id" value={profile.user_id} />
                      <input type="hidden" name="role" value="staff" />
                      <SubmitButton className="btn-secondary !px-2.5 !py-1 !text-xs" pendingLabel="변경 중…">
                        교직원으로 지정
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
