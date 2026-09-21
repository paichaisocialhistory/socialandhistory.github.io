/**
 * 환경변수 접근을 한 곳으로 모은다.
 *
 * Supabase URL/anon key 는 브라우저 번들에도 포함되어야 하므로 NEXT_PUBLIC_ 접두사가
 * 필요하다. 기능 플래그는 서버 컴포넌트에서만 읽으므로 접두사 없는 이름도 함께 받는다.
 */

function readFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.');
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.');
  return value;
}

/** 환경변수가 하나라도 비어 있으면 안내 화면을 띄우기 위한 확인용. */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export { readFlag };
