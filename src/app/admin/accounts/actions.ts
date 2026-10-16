'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';

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
