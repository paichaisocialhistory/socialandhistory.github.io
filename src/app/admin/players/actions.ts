'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';

export async function approvePlayer(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 승인할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  // 학번 발급은 DB 함수에서 원자적으로 처리한다(동시 승인 시 번호 중복 방지).
  const { data, error } = await supabase.rpc('approve_player', { p_player_id: id });
  if (error) return fail(describeError(error));

  revalidatePath('/admin/players');
  revalidatePath('/players');

  const studentNo = (data as { student_no?: string } | null)?.student_no;
  return ok(studentNo ? `승인했습니다. 학번 ${studentNo} 발급.` : '승인했습니다.');
}

export async function rejectPlayer(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 반려할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('선수를 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('reject_player', {
    p_player_id: id,
    p_reason: text(formData, 'reason'),
  });
  if (error) return fail(describeError(error));

  revalidatePath('/admin/players');
  revalidatePath('/players');
  return ok('반려 처리했습니다.');
}
