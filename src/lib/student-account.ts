/**
 * 교사가 발급하는 학생 계정.
 *
 * 학생에게 학교 이메일이 없으므로, 학번으로 로그인 아이디를 만든다. 메일을
 * 보내지 않으므로 실제 배달되는 주소일 필요가 없고, 기본 도메인은 RFC 2606 이
 * 예약해 둔 `.invalid` 를 써서 바깥으로 메일이 샐 가능성을 없앴다.
 */

/** 로그인 아이디를 만들 때 붙이는 도메인. */
export function studentAccountDomain(): string {
  return process.env.NEXT_PUBLIC_STUDENT_ACCOUNT_DOMAIN?.trim() || 'students.invalid';
}

/** 학번 → 로그인용 이메일. 학번은 공백 제거 후 소문자로 맞춘다. */
export function studentEmail(studentNo: string, domain = studentAccountDomain()): string {
  return `${studentNo.trim().toLowerCase()}@${domain}`;
}

/** 학생이 입력한 값이 학번인지 이메일인지 가려 로그인용 이메일로 바꾼다. */
export function toLoginEmail(input: string, domain = studentAccountDomain()): string {
  const value = input.trim();
  return value.includes('@') ? value.toLowerCase() : studentEmail(value, domain);
}

/** 학번 형식: 2026-0001 */
export function isStudentNo(value: string): boolean {
  return /^\d{4}-\d{4}$/.test(value.trim());
}

// 숫자 0/O, 1/l/I 처럼 종이에 적어 나눠 줄 때 헷갈리는 글자는 뺀다.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * 초기 비밀번호를 만든다. 종이로 전달하므로 받아적기 쉬운 글자만 쓴다.
 * 암호학적 난수를 쓴다(Math.random 아님).
 */
export function generatePassword(length = 10): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let out = '';
  for (const byte of bytes) {
    out += ALPHABET[byte % ALPHABET.length];
  }
  return out;
}
