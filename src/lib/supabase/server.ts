import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '../env';

/**
 * 서버 컴포넌트 / 서버 액션용 Supabase 클라이언트.
 * anon key 를 쓰므로 모든 접근은 RLS 정책의 통제를 받는다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 미들웨어가 담당한다.
        }
      },
    },
  });
}

/** 로그인한 사용자를 반환한다. 비로그인 시 null. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/** 로그인 사용자가 admins 표에 등록되어 있는지 확인한다. */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

export type AdminContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
  admin: boolean;
};
