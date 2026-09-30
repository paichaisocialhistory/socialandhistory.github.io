"""
느낀점 제출 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime
from app.core.database import get_db
from app.models.models import Reflection, Student, Activity, Class, SheetLog
from app.schemas.schemas import ReflectionCreate, ReflectionResponse
from app.services.sheet_service import build_sheet_payload, sync_to_google_sheet

router = APIRouter(prefix="/reflection", tags=["reflection"])


@router.post("", response_model=ReflectionResponse)
async def submit_reflection(
    data: ReflectionCreate,
    db: AsyncSession = Depends(get_db),
):
    """느낀점 제출 및 Google Sheets 동기화"""
    # 학생 확인
    result = await db.execute(
        select(Student).where(Student.id == data.studentId)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    # 기존 느낀점 확인 (업데이트 또는 신규)
    result = await db.execute(
        select(Reflection).where(Reflection.student_id == student.id)
    )
    reflection = result.scalar_one_or_none()
    
    if reflection:
        reflection.reflection_1 = data.reflection1
        reflection.reflection_2 = data.reflection2
        reflection.updated_at = datetime.now()
    else:
        reflection = Reflection(
            id=uuid.uuid4(),
            student_id=student.id,
            reflection_1=data.reflection1,
            reflection_2=data.reflection2,
        )
        db.add(reflection)
    
    # 활동 완료 처리
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    if activity:
        activity.current_step = 7
        activity.completed = True
        step_data = activity.step_data or {}
        step_data["reflectionSubmitted"] = True
        activity.step_data = step_data
    
    await db.flush()
    
    # Google Sheets 동기화 (학급에 시트 주소가 있을 때만)
    sheet_synced = False
    result = await db.execute(
        select(Class).where(Class.id == student.class_id)
    )
    class_ = result.scalar_one_or_none()

    if class_ and class_.sheet_url:
        payload = await build_sheet_payload(db, student)
        sync_result = await sync_to_google_sheet(class_.sheet_url, payload)
        sheet_synced = sync_result["success"]

        # 동기화 로그 저장
        db.add(SheetLog(
            id=uuid.uuid4(),
            student_id=student.id,
            status="success" if sheet_synced else "failed",
            retry_count=0,
            payload=payload,
            error_message=sync_result.get("error") if not sheet_synced else None,
            synced_at=datetime.now() if sheet_synced else None,
        ))
    
    await db.commit()
    
    return ReflectionResponse(
        id=str(reflection.id),
        reflection1=data.reflection1,
        reflection2=data.reflection2,
        sheetSynced=sheet_synced,
    )


@router.get("/{student_id}")
async def get_reflection(
    student_id: str,
    db: AsyncSession = Depends(get_db),
):
    """느낀점 조회"""
    result = await db.execute(
        select(Reflection).where(Reflection.student_id == student_id)
    )
    reflection = result.scalar_one_or_none()
    
    if not reflection:
        return {"reflection1": "", "reflection2": ""}
    
    return {
        "id": str(reflection.id),
        "reflection1": reflection.reflection_1,
        "reflection2": reflection.reflection_2,
    }
