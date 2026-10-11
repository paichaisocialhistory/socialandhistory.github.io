// API 키 찾기 (밑줄로 시작하는 파일은 Vercel이 주소로 만들지 않고, 다른 함수가 불러 쓰기만 한다)
// 이름을 조금 다르게 넣었거나 값 앞뒤에 공백·따옴표가 붙어도 쓸 수 있게 한다.
const NAMES = ['ANTHROPIC_API_KEY', 'CLAUDE_API_KEY', 'ANTHROPIC_KEY'];

export function findApiKey() {
  for (const name of NAMES) {
    const value = (process.env[name] || '').trim().replace(/^["']|["']$/g, '').trim();
    if (value) return { name, value };
  }
  return null;
}

// 점검용: 키와 비슷한 이름의 환경 변수 이름만 (값은 절대 보이지 않음)
export function similarEnvNames() {
  return Object.keys(process.env).filter((n) => /anthropic|claude|api_?key/i.test(n));
}
