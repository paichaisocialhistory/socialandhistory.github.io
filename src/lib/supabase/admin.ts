import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { supabaseUrl } from '../env';

/**
 * 관리자 전용 Supabase 클라이언트.
 *
 * service_role 키는 RLS 를 통째로 우회한다. 따라서
 *   - 반드시 서버에서만 쓴다('server-only' 가 클라이언트 번들로 새면 빌드를 깨뜨린다)
 *   - 환경변수 이름에 NEXT_PUBLIC_ 을 붙이지 않는다(붙이면 브라우저로 나간다)
 *   - 호출하는 서버 액션이 먼저 isAdmin() 으로 관리자인지 확인한다
 *
 * 계정 생성처럼 Auth 관리 API 가 필요한 작업에만 쓴다.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. 학생 계정 발급에는 이 키가 필요합니다.',
    );
  }

  return createClient(supabaseUrl(), key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** 학생 계정 발급 기능을 쓸 수 있는 상태인지. */
export function canIssueAccounts(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
