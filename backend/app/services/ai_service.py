"""
AI 서비스 - Ollama Qwen3 연동
역사 검증 및 재판 역할극 처리
"""
import json
import asyncio
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.config import settings

# Ollama를 OpenAI 호환 API로 사용
client = AsyncOpenAI(
    base_url=f"{settings.OLLAMA_BASE_URL}/v1",
    api_key="ollama",
)

MAX_TURNS = 5

COURT_ROLES = {
    "검사": "검사",
    "변호인": "변호인",
    "판사": "판사",
    "증인": "증인",
    "피고인": "피고인",
}

# 역할별 반대 역할 (학생 역할에 따른 AI 응답 역할)
OPPOSING_ROLES = {
    "검사": ["변호인", "판사", "증인"],
    "변호인": ["검사", "판사", "증인"],
    "판사": ["검사", "변호인"],
    "증인": ["검사", "변호인"],
    "피고인": ["검사", "판사"],
}


async def validate_history_message(
    person: str,
    role: str,
    message: str,
) -> Dict[str, Any]:
    """
    학생의 발언을 역사적 관점에서 검증
    Returns: {approved, branch, reason}
    """
    system_prompt = """당신은 대한민국 중학교 역사 교사이다.
학생의 법정 발언을 역사적 사실에 기반하여 평가하라.

판정 기준:
- A: 역사적으로 타당하며 근거 충분 (approved=true)
- B: 역사성은 맞지만 근거 부족 (approved=true)
- C: 역할 불일치 또는 역사적 오류 (approved=false)
- D: 무성의 응답 또는 너무 짧음 (approved=false)

반드시 JSON만 출력하라. 다른 설명 금지."""

    user_prompt = f"""인물: {person}
역할: {role}
학생발언: {message}

JSON 형식으로만 출력:
{{"approved": true/false, "branch": "A/B/C/D", "reason": "판정 이유 한 문장"}}"""

    try:
        response = await client.chat.completions.create(
            model=settings.OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
            max_tokens=200,
        )
        
        content = response.choices[0].message.content.strip()
        
        # JSON 추출 (마크다운 코드블록 제거)
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        
        result = json.loads(content.strip())
        return {
            "approved": result.get("approved", False),
            "branch": result.get("branch", "D"),
            "reason": result.get("reason", ""),
        }
    except Exception as e:
        # 파싱 실패 시 기본값 반환
        print(f"AI validation error: {e}")
        # 메시지 길이로 간단 판정
        if len(message.strip()) < 10:
            return {"approved": False, "branch": "D", "reason": "발언이 너무 짧습니다."}
        return {"approved": True, "branch": "B", "reason": "내용 확인됨"}


async def generate_court_responses(
    person: str,
    student_role: str,
    student_message: str,
    branch: str,
    turn_no: int,
    history: List[Dict] = None,
) -> List[Dict[str, str]]:
    """
    재판 역할극 - AI 캐릭터들의 응답 생성
    """
    # 학생 역할에 따른 AI 응답 역할 결정
    responding_roles = OPPOSING_ROLES.get(student_role, ["검사", "판사"])
    
    responses = []
    
    system_prompt = f"""당신은 역사 모의 법정의 등장인물이다.

현재 재판 대상: {person}
법정 규칙:
1. 자신의 역할을 절대 유지할 것
2. 역사적으로 검증된 사실만 사용할 것
3. 학생을 직접 평가하거나 칭찬/비판하지 말 것
4. 최대 2문장으로 응답할 것
5. 중학교 교과서 수준의 설명을 사용할 것
6. 법정 어투를 유지할 것 (정중하고 공식적)
7. 분기 {branch}에 맞는 응답을 할 것:
   - A분기: 발언이 타당하므로 추가 질문이나 심화 논의
   - B분기: 근거를 더 요청하거나 보충 설명 요구
   - C분기: 역할이나 사실 오류를 지적
   - D분기: 발언의 성의를 요구"""

    for ai_role in responding_roles[:2]:  # 최대 2개 역할
        user_prompt = f"""학생역할: {student_role}
학생발언: "{student_message}"
분기: {branch}
당신의 역할: {ai_role}
턴: {turn_no}/{MAX_TURNS}

{ai_role}로서 한 번만 짧게 응답하라. 캐릭터 대사만 반환하라."""

        try:
            response = await client.chat.completions.create(
                model=settings.OLLAMA_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=150,
            )
            
            message = response.choices[0].message.content.strip()
            # 불필요한 prefix 제거
            for prefix in [f"{ai_role}:", f"[{ai_role}]", f"({ai_role})"]:
                if message.startswith(prefix):
                    message = message[len(prefix):].strip()
            
            responses.append({
                "speaker": ai_role,
                "message": message,
            })
            
        except Exception as e:
            print(f"AI response error for {ai_role}: {e}")
            responses.append({
                "speaker": ai_role,
                "message": f"본 법정은 계속 진행합니다. {ai_role}의 의견을 구합니다.",
            })
    
    return responses


async def generate_verdict(
    person: str,
    student_role: str,
    turns: List[Dict],
) -> str:
    """
    최종 판결문 생성
    """
    turns_summary = "\n".join([
        f"- 턴{t.get('turn_no', 0)}: {t.get('student_message', '')} (평가: {t.get('branch', '?')})"
        for t in turns
    ])
    
    prompt = f"""당신은 역사 모의 법정의 판사이다.
    
재판 대상: {person}
학생 역할: {student_role}
재판 진행 내용:
{turns_summary}

위 재판 과정을 바탕으로 역사적 사실에 근거한 최종 판결문을 작성하라.
판결문은 3-4문장으로 작성하고, 역사적 의미와 현대적 시사점을 포함하라.
중학교 학생이 이해할 수 있는 수준으로 작성하라."""

    try:
        response = await client.chat.completions.create(
            model=settings.OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Verdict generation error: {e}")
        return f"본 법정은 {person}에 관한 역사적 재판을 마무리합니다. 학생 여러분은 이 재판을 통해 역사의 다양한 시각을 이해하는 기회가 되었기를 바랍니다."


async def check_ollama_health() -> Dict[str, Any]:
    """Ollama 서버 상태 확인"""
    try:
        models = await client.models.list()
        model_names = [m.id for m in models.data]
        return {
            "status": "ok",
            "models": model_names,
            "target_model": settings.OLLAMA_MODEL,
            "model_available": settings.OLLAMA_MODEL in model_names,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "model_available": False,
        }
