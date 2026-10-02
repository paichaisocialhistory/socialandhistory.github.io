"""
재판 API - AI 모의 재판 진행
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid
from app.core.database import get_db
from app.models.models import Trial, TrialTurn, Student, Activity, Person
from app.schemas.schemas import (
    TrialStart, TrialStartResponse,
    TrialTurnRequest, TrialTurnResponse,
    TrialFinishRequest, TrialFinishResponse,
)
from app.services.ai_service import (
    evaluate_statement,
    generate_court_responses,
    generate_verdict,
    MIN_TURNS,
    MAX_TURNS,
)

router = APIRouter(prefix="/trial", tags=["trial"])

# 판사는 AI만 맡는다 (학생 역할에서 제외)
VALID_ROLES = ["검사", "변호인", "증인", "피고인"]


@router.post("/start", response_model=TrialStartResponse)
async def start_trial(
    data: TrialStart,
    db: AsyncSession = Depends(get_db),
):
    """재판 세션 시작"""
    result = await db.execute(
        select(Student).where(Student.id == data.studentId)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"역할은 {', '.join(VALID_ROLES)} 중 하나여야 합니다.")
    
    # 기존 진행 중인 재판 확인: 같은 인물·역할이면 이어서 하고,
    # 다른 인물이나 역할을 골랐으면 이전 재판은 중단 처리하고 새로 시작한다
    result = await db.execute(
        select(Trial).where(
            Trial.student_id == student.id,
            Trial.status == "ongoing",
        ).order_by(Trial.started_at.desc())
    )
    for existing_trial in result.scalars().all():
        if existing_trial.selected_person == data.person and existing_trial.selected_role == data.role:
            return TrialStartResponse(
                trialId=str(existing_trial.id),
                person=existing_trial.selected_person,
                role=existing_trial.selected_role,
                minTurns=MIN_TURNS,
                maxTurns=MAX_TURNS,
            )
        existing_trial.status = "abandoned"
        existing_trial.ended_at = datetime.now()
    
    # 새 재판 생성
    trial = Trial(
        id=uuid.uuid4(),
        student_id=student.id,
        selected_person=data.person,
        selected_role=data.role,
        current_turn=0,
        status="ongoing",
        started_at=datetime.now(),
    )
    db.add(trial)
    
    # 활동 업데이트
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    if activity:
        activity.current_step = max(activity.current_step, 6)
        # 새 dict로 복사해야 DB가 변경을 알아챈다 (같은 객체를 고치면 저장되지 않음)
        step_data = dict(activity.step_data or {})
        step_data["selectedRole"] = data.role
        step_data["trialId"] = str(trial.id)
        activity.step_data = step_data
    
    await db.commit()
    
    return TrialStartResponse(
        trialId=str(trial.id),
        person=data.person,
        role=data.role,
        minTurns=MIN_TURNS,
        maxTurns=MAX_TURNS,
    )


def _turn_record(t: TrialTurn) -> dict:
    """DB의 턴을 AI 대화 기록 형식으로 바꾼다. (예전 형식: system_messages가 목록)"""
    sm = t.system_messages or []
    if isinstance(sm, dict):
        responses, feedback = sm.get("responses", []), sm.get("feedback")
    else:
        responses, feedback = sm, None
    return {
        "turn_no": t.turn_no,
        "student_message": t.student_message,
        "branch": t.branch,
        "approved": t.approved,
        "reject_reason": t.reject_reason,
        "responses": responses,
        "feedback": feedback,
    }


async def _load_history(db: AsyncSession, trial: Trial) -> list[dict]:
    result = await db.execute(
        select(TrialTurn).where(TrialTurn.trial_id == trial.id).order_by(TrialTurn.turn_no)
    )
    return [_turn_record(t) for t in result.scalars().all()]


async def _person_context(db: AsyncSession, name: str) -> str:
    """인물 학습 자료를 AI가 참고할 짧은 설명으로 만든다."""
    result = await db.execute(select(Person).where(Person.name == name))
    person = result.scalar_one_or_none()
    if not person:
        return ""
    c = person.content or {}
    roles = c.get("roles", {})
    lines = [
        f"인물 요약: {person.summary or ''}",
        f"배경: {c.get('background', '')}",
        f"재판 쟁점: {c.get('trial_context', '')}",
        f"검사 측 관점: {roles.get('prosecutor', '')}",
        f"변호인 측 관점: {roles.get('defender', '')}",
        f"피고인 측 관점: {roles.get('defendant', '')}",
    ]
    return "\n".join(line for line in lines if not line.endswith(": "))


async def _close_trial(
    db: AsyncSession, trial: Trial, history: list[dict], closed_by_judge: bool
) -> dict:
    """판결문을 만들고 재판을 종료 상태로 바꾼다."""
    verdict = await generate_verdict(
        person=trial.selected_person,
        student_role=trial.selected_role,
        history=history,
        person_context=await _person_context(db, trial.selected_person),
        closed_by_judge=closed_by_judge,
    )
    trial.status = "completed"
    trial.ended_at = datetime.now()

    result = await db.execute(
        select(Activity).where(Activity.student_id == trial.student_id)
    )
    activity = result.scalar_one_or_none()
    if activity:
        activity.current_step = max(activity.current_step, 7)
        step_data = dict(activity.step_data or {})
        step_data["trialCompleted"] = True
        step_data["totalTurns"] = len(history)
        step_data["approvedTurns"] = sum(1 for t in history if t["approved"])
        step_data["verdict"] = verdict
        activity.step_data = step_data
    return verdict


async def _get_ongoing_trial(db: AsyncSession, trial_id: str) -> Trial:
    result = await db.execute(select(Trial).where(Trial.id == trial_id))
    trial = result.scalar_one_or_none()
    if not trial:
        raise HTTPException(status_code=404, detail="재판을 찾을 수 없습니다.")
    if trial.status != "ongoing":
        raise HTTPException(status_code=400, detail="이미 종료된 재판입니다.")
    return trial


@router.post("/turn", response_model=TrialTurnResponse)
async def process_trial_turn(
    data: TrialTurnRequest,
    db: AsyncSession = Depends(get_db),
):
    """재판 턴 처리 - 발언 평가, 역사 코치 피드백, AI 법정 응답"""
    trial = await _get_ongoing_trial(db, data.trialId)
    history = await _load_history(db, trial)
    turn_no = len(history) + 1
    person_context = await _person_context(db, trial.selected_person)

    # 1. 발언 평가 + 역사 코치 피드백
    evaluation = await evaluate_statement(
        person=trial.selected_person,
        role=trial.selected_role,
        message=data.message,
        person_context=person_context,
        history=history,
    )
    approved = evaluation["approved"]
    branch = evaluation["branch"]
    reason = evaluation.get("reason", "")
    feedback = evaluation.get("feedback")

    # 2. AI 법정 응답 (인정된 발언만, 지금까지의 재판 흐름을 이어서)
    responses = []
    if approved:
        responses = await generate_court_responses(
            person=trial.selected_person,
            student_role=trial.selected_role,
            student_message=data.message,
            branch=branch,
            person_context=person_context,
            history=history,
        )

    db.add(TrialTurn(
        id=uuid.uuid4(),
        trial_id=trial.id,
        turn_no=turn_no,
        branch=branch,
        approved=approved,
        reject_reason=reason if not approved else None,
        student_message=data.message,
        system_messages={"responses": responses, "feedback": feedback},
    ))
    trial.current_turn = turn_no
    history.append({
        "turn_no": turn_no, "student_message": data.message, "branch": branch,
        "approved": approved, "responses": responses, "feedback": feedback,
    })
    approved_turns = sum(1 for t in history if t["approved"])

    # 3. 발언 한도에 이르면 판사가 재판을 마무리
    verdict = None
    is_finished = turn_no >= MAX_TURNS
    if is_finished:
        verdict = await _close_trial(db, trial, history, closed_by_judge=True)

    await db.commit()

    return TrialTurnResponse(
        approved=approved,
        branch=branch,
        rejectReason=reason if not approved else None,
        feedback=feedback,
        responses=responses,
        currentTurn=turn_no,
        approvedTurns=approved_turns,
        isFinished=is_finished,
        verdict=verdict,
    )


@router.post("/finish", response_model=TrialFinishResponse)
async def finish_trial(
    data: TrialFinishRequest,
    db: AsyncSession = Depends(get_db),
):
    """학생이 최후 변론을 마치고 판결을 요청"""
    trial = await _get_ongoing_trial(db, data.trialId)
    history = await _load_history(db, trial)
    approved_turns = sum(1 for t in history if t["approved"])
    if approved_turns < MIN_TURNS:
        raise HTTPException(
            status_code=400,
            detail=f"인정된 발언이 {MIN_TURNS}번 이상이어야 판결을 받을 수 있습니다. (현재 {approved_turns}번)",
        )

    verdict = await _close_trial(db, trial, history, closed_by_judge=False)
    await db.commit()
    return TrialFinishResponse(verdict=verdict, currentTurn=len(history))


@router.get("/{trial_id}/history")
async def get_trial_history(
    trial_id: str,
    db: AsyncSession = Depends(get_db),
):
    """재판 이력 조회"""
    result = await db.execute(
        select(Trial).where(Trial.id == trial_id)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise HTTPException(status_code=404, detail="재판을 찾을 수 없습니다.")
    
    history = await _load_history(db, trial)
    
    return {
        "trialId": str(trial.id),
        "person": trial.selected_person,
        "role": trial.selected_role,
        "status": trial.status,
        "currentTurn": trial.current_turn,
        "minTurns": MIN_TURNS,
        "maxTurns": MAX_TURNS,
        "turns": [
            {
                "turnNo": t["turn_no"],
                "branch": t["branch"],
                "approved": t["approved"],
                "rejectReason": t["reject_reason"],
                "studentMessage": t["student_message"],
                "responses": t["responses"],
                "feedback": t["feedback"],
            }
            for t in history
        ],
    }
