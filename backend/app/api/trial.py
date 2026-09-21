"""
재판 API - AI 모의 재판 진행
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid
from app.core.database import get_db
from app.models.models import Trial, TrialTurn, Student, Activity
from app.schemas.schemas import (
    TrialStart, TrialStartResponse,
    TrialTurnRequest, TrialTurnResponse,
)
from app.services.ai_service import (
    validate_history_message,
    generate_court_responses,
    generate_verdict,
    MAX_TURNS,
)

router = APIRouter(prefix="/trial", tags=["trial"])

VALID_ROLES = ["검사", "변호인", "판사", "증인", "피고인"]


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
    
    # 기존 진행 중인 재판 확인
    result = await db.execute(
        select(Trial).where(
            Trial.student_id == student.id,
            Trial.status == "ongoing",
        )
    )
    existing_trial = result.scalar_one_or_none()
    
    if existing_trial:
        # 기존 재판 반환
        return TrialStartResponse(
            trialId=str(existing_trial.id),
            person=existing_trial.selected_person,
            role=existing_trial.selected_role,
            maxTurns=MAX_TURNS,
        )
    
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
        step_data = activity.step_data or {}
        step_data["selectedRole"] = data.role
        step_data["trialId"] = str(trial.id)
        activity.step_data = step_data
    
    await db.commit()
    
    return TrialStartResponse(
        trialId=str(trial.id),
        person=data.person,
        role=data.role,
        maxTurns=MAX_TURNS,
    )


@router.post("/turn", response_model=TrialTurnResponse)
async def process_trial_turn(
    data: TrialTurnRequest,
    db: AsyncSession = Depends(get_db),
):
    """재판 턴 처리 - AI 검증 및 응답 생성"""
    # 재판 조회
    result = await db.execute(
        select(Trial).where(Trial.id == data.trialId)
    )
    trial = result.scalar_one_or_none()
    if not trial:
        raise HTTPException(status_code=404, detail="재판을 찾을 수 없습니다.")
    
    if trial.status != "ongoing":
        raise HTTPException(status_code=400, detail="이미 종료된 재판입니다.")
    
    # 이전 턴 이력 조회
    result = await db.execute(
        select(TrialTurn).where(TrialTurn.trial_id == trial.id).order_by(TrialTurn.turn_no)
    )
    history = result.scalars().all()
    history_data = [
        {
            "turn_no": t.turn_no,
            "student_message": t.student_message,
            "branch": t.branch,
        }
        for t in history
    ]
    
    # 1. AI 역사 검증
    validation = await validate_history_message(
        person=trial.selected_person,
        role=trial.selected_role,
        message=data.message,
    )
    
    approved = validation["approved"]
    branch = validation["branch"]
    reason = validation.get("reason", "")
    
    # 2. AI 법정 응답 생성 (승인된 경우만)
    responses = []
    if approved:
        responses = await generate_court_responses(
            person=trial.selected_person,
            student_role=trial.selected_role,
            student_message=data.message,
            branch=branch,
            turn_no=data.turn,
            history=history_data,
        )
    
    # 턴 저장
    turn = TrialTurn(
        id=uuid.uuid4(),
        trial_id=trial.id,
        turn_no=data.turn,
        branch=branch,
        approved=approved,
        reject_reason=reason if not approved else None,
        student_message=data.message,
        system_messages=responses,
    )
    db.add(turn)
    
    # 재판 진행 상태 업데이트
    trial.current_turn = data.turn
    
    # 최종 턴 확인
    is_finished = data.turn >= MAX_TURNS
    verdict = None
    
    if is_finished:
        trial.status = "completed"
        trial.ended_at = datetime.now()
        
        # 판결문 생성
        all_turns = history_data + [{"turn_no": data.turn, "student_message": data.message, "branch": branch}]
        verdict = await generate_verdict(
            person=trial.selected_person,
            student_role=trial.selected_role,
            turns=all_turns,
        )
        
        # 판결문을 마지막 응답에 추가
        responses.append({
            "speaker": "판사",
            "message": verdict,
        })
        
        # 활동 단계 업데이트
        result = await db.execute(
            select(Activity).where(Activity.student_id == trial.student_id)
        )
        activity = result.scalar_one_or_none()
        if activity:
            activity.current_step = max(activity.current_step, 7)
            step_data = activity.step_data or {}
            step_data["trialCompleted"] = True
            step_data["totalTurns"] = data.turn
            activity.step_data = step_data
    
    await db.commit()
    
    return TrialTurnResponse(
        approved=approved,
        branch=branch,
        rejectReason=reason if not approved else None,
        responses=responses,
        currentTurn=data.turn,
        isFinished=is_finished,
    )


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
    
    result = await db.execute(
        select(TrialTurn).where(TrialTurn.trial_id == trial.id).order_by(TrialTurn.turn_no)
    )
    turns = result.scalars().all()
    
    return {
        "trialId": str(trial.id),
        "person": trial.selected_person,
        "role": trial.selected_role,
        "status": trial.status,
        "currentTurn": trial.current_turn,
        "maxTurns": MAX_TURNS,
        "turns": [
            {
                "turnNo": t.turn_no,
                "branch": t.branch,
                "approved": t.approved,
                "rejectReason": t.reject_reason,
                "studentMessage": t.student_message,
                "systemMessages": t.system_messages,
            }
            for t in turns
        ],
    }
