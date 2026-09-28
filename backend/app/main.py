"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from sqlalchemy import select
from app.core.database import engine, Base, AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import Teacher
from app.api import session, persons, quiz, trial, reflection, teacher
from app.services.ai_service import check_ai_health


async def ensure_teacher_account():
    """TEACHER_EMAIL / TEACHER_PASSWORD 환경 변수로 교사 계정을 만들거나 비밀번호를 갱신"""
    if not (settings.TEACHER_EMAIL and settings.TEACHER_PASSWORD):
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Teacher).where(Teacher.email == settings.TEACHER_EMAIL)
        )
        teacher = result.scalar_one_or_none()
        if teacher:
            teacher.password_hash = get_password_hash(settings.TEACHER_PASSWORD)
        else:
            db.add(Teacher(
                email=settings.TEACHER_EMAIL,
                password_hash=get_password_hash(settings.TEACHER_PASSWORD),
                name=settings.TEACHER_NAME,
            ))
        await db.commit()
    print(f"👩‍🏫 교사 계정 준비: {settings.TEACHER_EMAIL}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 DB 테이블 생성
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_teacher_account()
    
    print(f"✅ {settings.APP_NAME} 서버 시작")
    print(f"🤖 AI 모델: {settings.CLAUDE_MODEL}")
    
    yield
    
    print("👋 서버 종료")


app = FastAPI(
    title="AI 역사 모의 법정 API",
    description="중학교 역사 모의 법정 학습 플랫폼 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(session.router, prefix="/api")
app.include_router(persons.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")
app.include_router(trial.router, prefix="/api")
app.include_router(reflection.router, prefix="/api")
app.include_router(teacher.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    ai_status = await check_ai_health()
    return {
        "status": "ok",
        "ai": ai_status,
    }
