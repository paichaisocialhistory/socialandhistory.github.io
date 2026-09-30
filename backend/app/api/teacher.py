"""
교사 인증 및 대시보드 API
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import uuid
from datetime import timedelta
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.models.models import Teacher, Class, Student, Activity, QuizAttempt, Trial
from app.schemas.schemas import (
    TeacherLogin, TeacherRegister, TokenResponse,
    ClassCreate, ClassResponse, StudentProgress,
)

router = APIRouter(prefix="/teacher", tags=["teacher"])
security = HTTPBearer()


async def get_current_teacher(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Teacher:
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    
    result = await db.execute(
        select(Teacher).where(Teacher.id == payload.get("sub"))
    )
    teacher = result.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=401, detail="교사를 찾을 수 없습니다.")
    return teacher


@router.post("/register", response_model=TokenResponse)
async def register_teacher(
    data: TeacherRegister,
    db: AsyncSession = Depends(get_db),
):
    """교사 회원가입"""
    if not settings.ALLOW_TEACHER_REGISTRATION:
        raise HTTPException(status_code=403, detail="교사 회원가입이 비활성화되어 있습니다.")
    result = await db.execute(
        select(Teacher).where(Teacher.email == data.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 등록된 이메일입니다.")
    
    teacher = Teacher(
        id=uuid.uuid4(),
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
    )
    db.add(teacher)
    await db.commit()
    
    token = create_access_token(
        data={"sub": str(teacher.id)},
        expires_delta=timedelta(days=1),
    )
    
    return TokenResponse(
        access_token=token,
        teacher_id=str(teacher.id),
        name=teacher.name or "",
    )


@router.post("/login", response_model=TokenResponse)
async def login_teacher(
    data: TeacherLogin,
    db: AsyncSession = Depends(get_db),
):
    """교사 로그인"""
    result = await db.execute(
        select(Teacher).where(Teacher.email == data.email)
    )
    teacher = result.scalar_one_or_none()
    
    if not teacher or not verify_password(data.password, teacher.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")
    
    token = create_access_token(
        data={"sub": str(teacher.id)},
        expires_delta=timedelta(days=1),
    )
    
    return TokenResponse(
        access_token=token,
        teacher_id=str(teacher.id),
        name=teacher.name or "",
    )


@router.get("/classes", response_model=list[ClassResponse])
async def get_classes(
    teacher: Teacher = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """교사의 학급 목록"""
    result = await db.execute(
        select(Class).where(Class.teacher_id == teacher.id)
    )
    classes = result.scalars().all()
    
    response = []
    for c in classes:
        # 학생 수 계산
        count_result = await db.execute(
            select(func.count(Student.id)).where(Student.class_id == c.id)
        )
        student_count = count_result.scalar() or 0
        
        response.append(ClassResponse(
            id=str(c.id),
            className=c.class_name,
            classCode=c.class_code,
            sheetUrl=c.sheet_url,
            settings=c.settings or {},
            studentCount=student_count,
            createdAt=c.created_at.isoformat() if c.created_at else "",
        ))
    
    return response


@router.post("/classes", response_model=ClassResponse)
async def create_class(
    data: ClassCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """학급 생성"""
    # 학급 코드 중복 확인
    result = await db.execute(
        select(Class).where(Class.class_code == data.classCode)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 사용 중인 학급 코드입니다.")
    
    class_ = Class(
        id=uuid.uuid4(),
        teacher_id=teacher.id,
        class_name=data.className,
        class_code=data.classCode,
        sheet_url=data.sheetUrl,
        settings=data.settings or {},
    )
    db.add(class_)
    await db.commit()
    
    return ClassResponse(
        id=str(class_.id),
        className=class_.class_name,
        classCode=class_.class_code,
        sheetUrl=class_.sheet_url,
        settings=class_.settings or {},
        studentCount=0,
        createdAt=class_.created_at.isoformat() if class_.created_at else "",
    )


@router.put("/classes/{class_id}/sheet")
async def update_sheet_url(
    class_id: str,
    sheet_url: str,
    teacher: Teacher = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """학급 Google Sheet URL 업데이트"""
    result = await db.execute(
        select(Class).where(Class.id == class_id, Class.teacher_id == teacher.id)
    )
    class_ = result.scalar_one_or_none()
    if not class_:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다.")
    
    class_.sheet_url = sheet_url
    await db.commit()
    
    return {"success": True, "sheetUrl": sheet_url}


@router.get("/classes/{class_id}/students", response_model=list[StudentProgress])
async def get_students_progress(
    class_id: str,
    teacher: Teacher = Depends(get_current_teacher),
    db: AsyncSession = Depends(get_db),
):
    """학급 학생 진행 현황"""
    # 학급 권한 확인
    result = await db.execute(
        select(Class).where(Class.id == class_id, Class.teacher_id == teacher.id)
    )
    class_ = result.scalar_one_or_none()
    if not class_:
        raise HTTPException(status_code=404, detail="학급을 찾을 수 없습니다.")
    
    # 학생 목록
    result = await db.execute(
        select(Student).where(Student.class_id == class_id)
        .order_by(Student.class_no, Student.student_no)
    )
    students = result.scalars().all()
    
    progress_list = []
    for student in students:
        # 활동 상태
        act_result = await db.execute(
            select(Activity).where(Activity.student_id == student.id)
        )
        activity = act_result.scalar_one_or_none()
        
        # 최근 퀴즈
        quiz_result = await db.execute(
            select(QuizAttempt).where(
                QuizAttempt.student_id == student.id
            ).order_by(QuizAttempt.created_at.desc())
        )
        latest_quiz = quiz_result.scalar_one_or_none()
        
        # 최근 재판
        trial_result = await db.execute(
            select(Trial).where(
                Trial.student_id == student.id
            ).order_by(Trial.started_at.desc())
        )
        latest_trial = trial_result.scalar_one_or_none()
        
        step_data = activity.step_data if activity else {}
        
        progress_list.append(StudentProgress(
            studentId=str(student.id),
            name=student.name,
            grade=student.grade,
            classNo=student.class_no,
            studentNo=student.student_no,
            currentStep=activity.current_step if activity else 1,
            completed=activity.completed if activity else False,
            selectedPerson=step_data.get("selectedPerson"),
            selectedRole=latest_trial.selected_role if latest_trial else None,
            quizScore=latest_quiz.score if latest_quiz else None,
            quizPassed=latest_quiz.passed if latest_quiz else None,
            totalSeconds=activity.total_seconds if activity else 0,
        ))
    
    return progress_list
