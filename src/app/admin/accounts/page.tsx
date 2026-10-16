import Link from 'next/link';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { Alert, Card, EmptyState, PageHeader } from '@/components/ui';
import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import type { Player } from '@/lib/types';
import { linkPlayer, setRole } from './actions';

export const metadata = { title: '계정 관리' };
export const dynamic = 'force-dynamic';

type ProfileRow = {
  user_id: string;
  email: string | null;
  role: 'student' | 'staff';
  player_id: string | null;
  created_at: string;
};

export default async function AdminAccountsPage() {
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
      .select('id, name, student_no')
      .eq('status', 'approved')
      .order('student_no'),
  ]);

  const profiles = (profileRows as ProfileRow[] | null) ?? [];
  const players = (playerRows as Pick<Player, 'id' | 'name' | 'student_no'>[] | null) ?? [];

  const staff = profiles.filter((p) => p.role === 'staff');
  const students = profiles.filter((p) => p.role === 'student');

  return (
    <>
      <PageHeader
        title="계정 관리"
        description="로그인한 계정의 역할을 정하고, 학생 계정을 선수 기록과 연결합니다."
      />

      {error ? <Alert kind="error">계정을 불러오지 못했습니다: {error.message}</Alert> : null}

      <div className="mb-5">
        <Alert kind="info">
          계정은 본인이 학교 구글 계정으로 처음 로그인할 때 자동으로 만들어집니다. 새 계정은 모두
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
