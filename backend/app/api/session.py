"""
세션 API - 학생 정보 입력 및 세션 복원
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.models import Student, Class, Activity
from app.schemas.schemas import SessionCreate, SessionResponse
import uuid

router = APIRouter(prefix="/session", tags=["session"])


@router.post("", response_model=SessionResponse)
async def create_or_restore_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    학생 세션 생성 또는 복원
    - 이미 등록된 학생이면 진행 상태 복원
    - 새 학생이면 신규 생성
    """
    # 학급 코드로 학급 찾기
    result = await db.execute(
        select(Class).where(
            func.upper(Class.class_code) == data.classCode.strip().upper(),
            Class.is_active == True,
        )
    )
    class_ = result.scalars().first()
    
    if not class_:
        raise HTTPException(status_code=404, detail="학급 코드를 찾을 수 없습니다.")
    
    # 기존 학생 찾기 (학급 + 학년 + 반 + 번호)
    result = await db.execute(
        select(Student).where(
            Student.class_id == class_.id,
            Student.grade == data.grade,
            Student.class_no == data.classNo,
            Student.student_no == data.studentNo,
        )
    )
    student = result.scalar_one_or_none()
    
    if not student:
        # 신규 학생 생성
        student = Student(
            id=uuid.uuid4(),
            class_id=class_.id,
            grade=data.grade,
            class_no=data.classNo,
            student_no=data.studentNo,
            name=data.name,
        )
        db.add(student)
        await db.flush()
        
        # 활동 레코드 생성
        activity = Activity(
            id=uuid.uuid4(),
            student_id=student.id,
            current_step=1,
            step_data={},
        )
        db.add(activity)
    
    # 활동 상태 조회
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    
    if not activity:
        activity = Activity(
            id=uuid.uuid4(),
            student_id=student.id,
            current_step=1,
            step_data={},
        )
        db.add(activity)
    
    await db.commit()
    
    return SessionResponse(
        sessionId=str(student.id),
        studentId=str(student.id),
        currentStep=activity.current_step,
        stepData=activity.step_data or {},
    )


@router.get("/{student_id}", response_model=SessionResponse)
async def get_session(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """세션 상태 조회 (재접속 복원)"""
    result = await db.execute(
        select(Student).where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    
    return SessionResponse(
        sessionId=str(student.id),
        studentId=str(student.id),
        currentStep=activity.current_step if activity else 1,
        stepData=activity.step_data if activity else {},
    )
