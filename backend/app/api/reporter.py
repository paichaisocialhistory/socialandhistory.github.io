"""
종군기자 인터뷰 API - reporter/ 정적 사이트가 부르는 AI 인터뷰

학생 기록은 DB에 저장하지 않는다 (결과는 Google 시트로 바로 간다).
API 키 사용량을 지키기 위해 학생별·하루 전체 질문 수를 제한한다.
"""
import time
from collections import defaultdict, deque
from datetime import date
from fastapi import APIRouter, HTTPException
from app.core.config import settings
from app.schemas.schemas import InterviewAskRequest, InterviewAskResponse
from app.services.ai_service import generate_interview_answer

router = APIRouter(prefix="/reporter", tags=["reporter"])

# 서버 메모리에만 두는 사용량 기록 (서버가 다시 시작되면 초기화)
_daily = {"date": None, "count": 0}
_student_hits: dict[str, deque] = defaultdict(deque)


def _check_limits(student_id: str) -> None:
    today = date.today()
    if _daily["date"] != today:
        _daily.update(date=today, count=0)
        _student_hits.clear()
    if _daily["count"] >= settings.REPORTER_DAILY_LIMIT:
        raise HTTPException(status_code=429, detail="오늘 AI 인터뷰 사용량을 모두 썼습니다.")

    hits = _student_hits[student_id]
    now = time.monotonic()
    while hits and now - hits[0] > 3600:
        hits.popleft()
    if len(hits) >= settings.REPORTER_STUDENT_HOURLY_LIMIT:
        raise HTTPException(status_code=429, detail="질문이 너무 많습니다. 잠시 뒤에 다시 질문하세요.")

    hits.append(now)
    _daily["count"] += 1


@router.post("/ask", response_model=InterviewAskResponse)
async def ask(data: InterviewAskRequest):
    """기자(학생)의 질문에 인물이 역사 자료를 바탕으로 대답"""
    _check_limits(data.studentId)
    try:
        result = await generate_interview_answer(
            person=data.person.model_dump(),
            sources=[s.model_dump() for s in data.sources],
            history=[t.model_dump() for t in data.history],
            question=data.question.strip(),
        )
    except Exception as e:
        print(f"AI interview error: {e}")
        raise HTTPException(status_code=503, detail="AI가 지금 대답하지 못했습니다.")
    return InterviewAskResponse(**result)
