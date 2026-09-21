"""
인물 선택 및 학습 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import get_db
from app.models.models import Person, Student, Activity
from app.schemas.schemas import PersonResponse, PersonSelect

router = APIRouter(prefix="/persons", tags=["persons"])


@router.get("", response_model=list[PersonResponse])
async def get_persons(db: AsyncSession = Depends(get_db)):
    """활성화된 역사 인물 목록 반환"""
    result = await db.execute(
        select(Person).where(Person.is_active == True)
    )
    persons = result.scalars().all()
    
    return [
        PersonResponse(
            id=str(p.id),
            name=p.name,
            category=p.category or "",
            period=p.period or "",
            summary=p.summary or "",
            content=p.content or {},
            image_url=p.image_url,
        )
        for p in persons
    ]


@router.get("/{person_name}", response_model=PersonResponse)
async def get_person(
    person_name: str,
    db: AsyncSession = Depends(get_db),
):
    """인물 상세 정보 조회"""
    result = await db.execute(
        select(Person).where(Person.name == person_name, Person.is_active == True)
    )
    person = result.scalar_one_or_none()
    
    if not person:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")
    
    return PersonResponse(
        id=str(person.id),
        name=person.name,
        category=person.category or "",
        period=person.period or "",
        summary=person.summary or "",
        content=person.content or {},
        image_url=person.image_url,
    )


@router.post("/select")
async def select_person(
    data: PersonSelect,
    db: AsyncSession = Depends(get_db),
):
    """학생의 인물 선택 저장"""
    # 학생 확인
    result = await db.execute(
        select(Student).where(Student.id == data.studentId)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다.")
    
    # 인물 확인
    result = await db.execute(
        select(Person).where(Person.name == data.person, Person.is_active == True)
    )
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")
    
    # 활동 업데이트
    result = await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )
    activity = result.scalar_one_or_none()
    
    if activity:
        activity.current_step = max(activity.current_step, 3)  # 학습 단계로 진행
        step_data = activity.step_data or {}
        step_data["selectedPerson"] = data.person
        step_data["personId"] = str(person.id)
        activity.step_data = step_data
    
    await db.commit()
    
    return {
        "success": True,
        "person": data.person,
        "message": f"{data.person}을(를) 선택했습니다.",
    }
