// ============================================
// AI 연결 점검 - Vercel 서버리스 함수 (GET /api/reporter/health)
// ============================================
// 선생님이 브라우저에서 이 주소를 열면 API 키와 모델이 제대로 설정됐는지 알려 준다.
// 모델 정보만 조회하므로 Claude 사용 요금이 들지 않는다. 키 값은 보여 주지 않는다.
import Anthropic from '@anthropic-ai/sdk';
import { findApiKey, similarEnvNames } from '../_anthropic.js';

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // 어느 배포가 대답하는지 (Production인지, 어느 커밋인지)
  const deployment = {
    environment: process.env.VERCEL_ENV || '(알 수 없음)',
    commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || '(알 수 없음)',
    branch: process.env.VERCEL_GIT_COMMIT_REF || '(알 수 없음)',
  };
  const key = findApiKey();
  if (!key) {
    const names = similarEnvNames();
    return res.status(200).json({ ok: false, model: MODEL, deployment,
      problem: 'ANTHROPIC_API_KEY가 없습니다. 이 프로젝트의 Settings → Environment Variables에 Production으로 넣고 Redeploy 하세요.',
      similarNames: names.length ? names : '(키와 비슷한 이름의 변수가 하나도 없습니다)' });
  }
  try {
    const client = new Anthropic({ apiKey: key.value, timeout: 15_000 });
    const model = await client.models.retrieve(MODEL);
    return res.status(200).json({ ok: true, model: model.id, keyName: key.name, deployment, message: 'AI 연결 정상입니다.' });
  } catch (e) {
    const problem = e instanceof Anthropic.AuthenticationError ? 'API 키가 올바르지 않습니다. 키를 다시 복사해 넣고 Redeploy 하세요.'
      : e instanceof Anthropic.NotFoundError ? `모델 이름(${MODEL})이 올바르지 않습니다. CLAUDE_MODEL 값을 확인하세요.`
      : e instanceof Anthropic.PermissionDeniedError ? 'API 키에 이 모델을 쓸 권한이 없습니다. Claude 콘솔을 확인하세요.'
      : `Claude 서버에 연결하지 못했습니다: ${e.message}`;
    return res.status(200).json({ ok: false, model: MODEL, keyName: key.name, deployment, problem });
  }
}
