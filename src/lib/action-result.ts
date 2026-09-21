import type { PostgrestError } from '@supabase/supabase-js';

export type ActionState = { error?: string; success?: string } | null;

export function fail(message: string): ActionState {
  return { error: message };
}

export function ok(message: string): ActionState {
  return { success: message };
}

/** Postgres 오류를 사용자에게 보여줄 한글 메시지로 바꾼다. */
export function describeError(error: PostgrestError | { message: string; code?: string }): string {
  const code = 'code' in error ? error.code : undefined;

  if (code === '23505') return '이미 같은 값이 등록되어 있습니다.';
  if (code === '42501') return '권한이 없습니다. 관리자 계정으로 로그인했는지 확인하세요.';
  if (code === 'PGRST301' || code === '42P01') return '데이터베이스 설정이 완료되지 않았습니다.';

  return error.message || '알 수 없는 오류가 발생했습니다.';
}

/** FormData 에서 비어 있지 않은 문자열만 꺼낸다. */
export function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function integer(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
