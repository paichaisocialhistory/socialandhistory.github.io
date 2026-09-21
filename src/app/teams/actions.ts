'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient, isAdmin } from '@/lib/supabase/server';
import { describeError, fail, ok, text, type ActionState } from '@/lib/action-result';

export async function createTeam(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 팀을 추가할 수 있습니다.');

  const name = text(formData, 'name');
  if (!name) return fail('팀 이름을 입력하세요.');
  if (name.length > 40) return fail('팀 이름은 40자 이내로 입력하세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('teams').insert({ name });
  if (error) return fail(describeError(error));

  revalidatePath('/teams');
  revalidatePath('/standings');
  return ok(`"${name}" 팀을 추가했습니다.`);
}

export async function deleteTeam(formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return fail('관리자만 팀을 삭제할 수 있습니다.');

  const id = text(formData, 'id');
  if (!id) return fail('삭제할 팀을 찾을 수 없습니다.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) return fail(describeError(error));

  revalidatePath('/teams');
  revalidatePath('/standings');
  revalidatePath('/schedule');
  return ok('팀을 삭제했습니다. 소속 선수의 기록은 그대로 보존됩니다.');
}
