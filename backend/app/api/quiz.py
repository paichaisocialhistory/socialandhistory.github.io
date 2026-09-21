"""
퀴즈 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.core.database import get_db
from app.models.models import Person, QuizItem, QuizAttempt, Student, Activity
from app.schemas.schemas import QuizItemResponse, QuizSubmit, QuizResult

router = APIRouter(prefix="/quiz", tags=["quiz"])


@router.get("/{person_name}", response_model=list[QuizItemResponse])
async def get_quiz_items(
    person_name: str,
    db: AsyncSession = Depends(get_db),
):
    """인물별 퀴즈 문항 반환 (선택지만, 정답 제외)"""
    result = await db.execute(
        select(Person).where(Person.name == person_name)
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")
    
    result = await db.execute(
        select(QuizItem).where(QuizItem.person_id == person.id)
    )
    items = result.scalars().all()
    
    return [
        QuizItemResponse(
            id=str(item.id),
            question=item.question,
            choices=item.choices if isinstance(item.choices, list) else [],
            difficulty=item.difficulty or 1,
        )
        for item in items
    ]


@router.post("/submit", response_model=QuizResult)
async def submit_quiz(
    data: QuizSubmit,
    db: AsyncSession = Depends(get_db),
):
    """퀴즈 답안 제출 및 채점"""
    # 학생 확인
    result = await db.execute(
        select(Student).where(Student.id == data.studentId)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    # 기존 시도 횟수 확인
    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.student_id == student.id)
    )
    existing_attempts = result.scalars().all()
    attempt_count = len(existing_attempts) + 1
    
    # 채점
    score = 0
    total = len(data.answers)
    results = []
    
    for answer in data.answers:
        result = await db.execute(
            select(QuizItem).where(QuizItem.id == answer.questionId)
        )
        item = result.scalar_one_or_none()
        
        if item:
            is_correct = item.answer == answer.answer
            if is_correct:
                score += 1
            results.append({
                "questionId": answer.questionId,
                "correct": is_correct,
                "yourAnswer": answer.answer,
                "correctAnswer": item.answer,
                "explanation": item.explanation or "",
            })
    
    passed = total > 0 and (score / total) >= 0.6  # 60% 이상 합격
    
    # 퀴즈 시도 저장
    quiz_attempt = QuizAttempt(
        id=uuid.uuid4(),
        student_id=student.id,
        score=score,
        total_questions=total,
        passed=passed,
        attempts=attempt_count,
        answers=[{"questionId": a.questionId, "answer": a.answer} for a in data.answers],
    )
    db.add(quiz_attempt)
    
    # 활동 업데이트 (합격 시 다음 단계로)
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    if activity:
        step_data = activity.step_data or {}
        step_data["quizScore"] = score
        step_data["quizPassed"] = passed
        step_data["quizAttempts"] = attempt_count
        activity.step_data = step_data
        if passed:
            activity.current_step = max(activity.current_step, 5)  # 역할 선택 단계
    
    await db.commit()
    
    return QuizResult(
        score=score,
        total=total,
        passed=passed,
        results=results,
        attempts=attempt_count,
    )
