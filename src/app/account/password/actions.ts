'use server';

import { revalidatePath } from 'next/cache';

import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';
import { fail, ok, text, type ActionState } from '@/lib/action-result';

const MIN_LENGTH = 8;

/** 로그인한 본인이 비밀번호를 바꾼다. 관리자 키가 필요 없다. */
export async function changePassword(formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return fail('로그인이 필요합니다.');

  const next = text(formData, 'password');
  const confirm = text(formData, 'password_confirm');

  if (!next || !confirm) return fail('새 비밀번호를 두 번 입력하세요.');
  if (next !== confirm) return fail('두 비밀번호가 서로 다릅니다.');
  if (next.length < MIN_LENGTH) return fail(`비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return fail('비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도하세요.');

  // 임시 비밀번호 표시를 내린다. 본인 행만 바뀐다.
  const { error: flagError } = await supabase.rpc('complete_password_setup');
  if (flagError) {
    return fail('비밀번호는 바뀌었지만 설정을 마치지 못했습니다. 새로고침 후 다시 시도하세요.');
  }

  revalidatePath('/', 'layout');
  return ok('비밀번호를 정했습니다. 이제 사이트를 이용할 수 있습니다.');
}
