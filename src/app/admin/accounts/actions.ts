'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';
import { canIssueAccounts, createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generatePassword, studentEmail } from '@/lib/student-account';

/** 계정을 교직원 또는 학생으로 지정한다. 관리자만 가능하다. */
export async function setRole(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 역할을 변경할 수 있습니다.');

  const userId = text(formData, 'user_id');
  const role = text(formData, 'role');
  if (!userId) return fail('계정을 찾을 수 없습니다.');
  if (role !== 'student' && role !== 'staff') return fail('알 수 없는 역할입니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_profile_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) return fail(describeError(error));

  revalidatePath('/admin/accounts');
  return ok(role === 'staff' ? '교직원으로 지정했습니다.' : '학생으로 지정했습니다.');
}

/** 학생 계정을 선수 기록과 연결한다. 연결해야 본인 장면을 볼 수 있다. */
export async function linkPlayer(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 연결할 수 있습니다.');

  const userId = text(formData, 'user_id');
  if (!userId) return fail('계정을 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('link_profile_to_player', {
    p_user_id: userId,
    // 빈 값이면 연결을 끊는다.
    p_player_id: text(formData, 'player_id'),
  });
  if (error) return fail(describeError(error));

  revalidatePath('/admin/accounts');
  revalidatePath('/players');
  return ok('연결을 저장했습니다.');
}

/**
 * 승인된 선수에게 로그인 계정을 발급한다.
 *
 * service_role 키를 쓰므로 반드시 관리자인지 먼저 확인한다. 초기 비밀번호는
 * 저장하지 않고 이 응답으로 한 번만 돌려준다(DB 에는 해시만 남는다).
 */
export type IssuedAccount = {
  studentNo: string;
  name: string;
  loginId: string;
  password: string;
};

export type IssueResult =
  | { error: string }
  | { success: string; issued: IssuedAccount[]; skipped: string[] };

export async function issueStudentAccounts(formData: FormData): Promise<IssueResult> {
  if (!(await isAdmin())) return { error: '관리자만 계정을 발급할 수 있습니다.' };
  if (!canIssueAccounts()) {
    return {
      error:
        'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. 설정 후 다시 시도하세요.',
    };
  }

  const ids = formData.getAll('player_id').filter((v): v is string => typeof v === 'string');
  if (ids.length === 0) return { error: '계정을 발급할 선수를 선택하세요.' };

  const supabase = await createSupabaseServerClient();
  const { data: playerRows, error: playerError } = await supabase
    .from('players')
    .select('id, name, student_no')
    .in('id', ids)
    .eq('status', 'approved');

  if (playerError) return { error: describeError(playerError) };

  const players = (playerRows as { id: string; name: string; student_no: string | null }[]) ?? [];
  const admin = createSupabaseAdminClient();

  const issued: IssuedAccount[] = [];
  const skipped: string[] = [];

  for (const player of players) {
    if (!player.student_no) {
      skipped.push(`${player.name}: 학번이 아직 없습니다`);
      continue;
    }

    // 이미 계정이 연결된 선수는 건너뛴다(비밀번호 재설정은 따로 있다).
    const { data: linked } = await admin
      .from('profiles')
      .select('user_id')
      .eq('player_id', player.id)
      .maybeSingle();

    if (linked) {
      skipped.push(`${player.name}: 이미 계정이 있습니다`);
      continue;
    }

    const loginId = studentEmail(player.student_no);
    const password = generatePassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginId,
      password,
      // 메일을 보내지 않으므로 바로 확인 처리한다.
      email_confirm: true,
    });

    if (createError || !created.user) {
      skipped.push(`${player.name}: ${createError?.message ?? '계정 생성 실패'}`);
      continue;
    }

    // 트리거가 만든 프로필에 선수를 연결한다. 역할은 학생 그대로 둔다.
    const { error: linkError } = await admin
      .from('profiles')
      // 임시 비밀번호 상태로 둔다. 학생이 첫 로그인에서 직접 정한다.
      .update({ player_id: player.id, role: 'student', must_set_password: true })
      .eq('user_id', created.user.id);

    if (linkError) {
      skipped.push(`${player.name}: 계정은 만들었지만 선수 연결에 실패했습니다`);
      continue;
    }

    issued.push({ studentNo: player.student_no, name: player.name, loginId, password });
  }

  revalidatePath('/admin/accounts');

  if (issued.length === 0) {
    return { error: skipped.join(' / ') || '발급된 계정이 없습니다.' };
  }

  return {
    success: `${issued.length}명의 계정을 발급했습니다. 비밀번호는 지금만 볼 수 있습니다.`,
    issued,
    skipped,
  };
}

/** 비밀번호를 잊은 학생에게 새 비밀번호를 발급한다. */
export async function resetStudentPassword(formData: FormData): Promise<IssueResult> {
  if (!(await isAdmin())) return { error: '관리자만 비밀번호를 재설정할 수 있습니다.' };
  if (!canIssueAccounts()) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.' };
  }

  const userId = text(formData, 'user_id');
  if (!userId) return { error: '계정을 찾을 수 없습니다.' };

  const admin = createSupabaseAdminClient();
  const password = generatePassword();

  const { data: updated, error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error || !updated.user) return { error: error?.message ?? '재설정에 실패했습니다.' };

  // 재설정한 비밀번호도 임시다. 학생이 다시 정해야 한다.
  await admin.from('profiles').update({ must_set_password: true }).eq('user_id', userId);

  const { data: profile } = await admin
    .from('profiles')
    .select('player_id, players(name, student_no)')
    .eq('user_id', userId)
    .maybeSingle();

  const player = (profile as { players: { name: string; student_no: string | null } | null } | null)
    ?.players;

  revalidatePath('/admin/accounts');

  return {
    success: '새 비밀번호를 발급했습니다. 지금만 볼 수 있습니다.',
    issued: [
      {
        studentNo: player?.student_no ?? '-',
        name: player?.name ?? updated.user.email ?? '학생',
        loginId: updated.user.email ?? '',
        password,
      },
    ],
    skipped: [],
  };
}
