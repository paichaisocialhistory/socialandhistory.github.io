'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, getCurrentUser, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';
import { getFeatures } from '@/lib/features';

async function review(formData: FormData, approve: boolean): Promise<ActionState> {
  if (!getFeatures().playerAbilities) return fail('사용할 수 없는 기능입니다.');
  if (!(await isAdmin())) return fail('관리자만 처리할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('요청을 찾을 수 없습니다.');

  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();

  // 승인일 때만 player_abilities 에 upsert 된다(DB 함수가 처리).
  const { error } = await supabase.rpc('review_ability_request', {
    p_request_id: id,
    p_approve: approve,
    p_reviewer: user?.email ?? null,
    p_note: text(formData, 'note'),
  });

  if (error) return fail(describeError(error));

  revalidatePath('/admin/abilities');
  revalidatePath('/players');
  return ok(approve ? '승인했습니다. 능력치에 반영되었습니다.' : '반려했습니다. 능력치는 변경되지 않습니다.');
}

export async function approveAbilityRequest(formData: FormData) {
  return review(formData, true);
}

export async function rejectAbilityRequest(formData: FormData) {
  return review(formData, false);
}
