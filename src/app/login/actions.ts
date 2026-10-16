'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fail, text, type ActionState } from '@/lib/action-result';

/**
 * 학교 구글 계정으로 로그인한다.
 * 학교 도메인 제한은 Supabase 대시보드의 구글 공급자 설정에서 지정한다.
 */
export async function signInWithGoogle(formData: FormData): Promise<ActionState> {
  const headerList = await headers();
  const origin = headerList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) return fail('사이트 주소를 확인할 수 없습니다. 관리자에게 문의하세요.');

  const next = text(formData, 'next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        // 학교 도메인 계정을 먼저 보여 준다.
        ...(process.env.NEXT_PUBLIC_SCHOOL_DOMAIN
          ? { hd: process.env.NEXT_PUBLIC_SCHOOL_DOMAIN }
          : {}),
      },
    },
  });

  if (error || !data.url) return fail('구글 로그인을 시작하지 못했습니다. 잠시 후 다시 시도하세요.');

  redirect(data.url);
}
