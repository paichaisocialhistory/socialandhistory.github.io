'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fail, text, type ActionState } from '@/lib/action-result';

export async function signIn(formData: FormData): Promise<ActionState> {
  const email = text(formData, 'email');
  const password = text(formData, 'password');

  if (!email || !password) return fail('이메일과 비밀번호를 모두 입력하세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 계정 존재 여부가 드러나지 않도록 사유를 구분하지 않는다.
    return fail('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const { data: adminCheck } = await supabase.rpc('is_admin');
  if (adminCheck !== true) {
    await supabase.auth.signOut();
    return fail('관리자로 등록되지 않은 계정입니다. 담당자에게 권한 등록을 요청하세요.');
  }

  revalidatePath('/', 'layout');
  redirect('/admin/players');
}
