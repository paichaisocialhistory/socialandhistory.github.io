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

/** 교직원(교사·코치·관리자) 여부. 학생 계정은 false. */
export async function isStaff(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data, error } = await supabase.rpc('is_staff');
  if (error) return false;
  return data === true;
}

export type Profile = {
  user_id: string;
  email: string | null;
  role: 'student' | 'staff';
  player_id: string | null;
  /** 임시 비밀번호 상태. true 면 본인이 새 비밀번호를 정해야 한다. */
  must_set_password: boolean;
};

/** 로그인한 사용자의 프로필(역할·연결된 선수). 비로그인 시 null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('user_id, email, role, player_id, must_set_password')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}
