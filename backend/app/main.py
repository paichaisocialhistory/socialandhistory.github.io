"""
FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import engine, Base
from app.api import session, persons, quiz, trial, reflection, teacher
from app.services.ai_service import check_ollama_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 DB 테이블 생성
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print(f"✅ {settings.APP_NAME} 서버 시작")
    print(f"📦 DB: {settings.DATABASE_URL[:30]}...")
    print(f"🤖 Ollama: {settings.OLLAMA_BASE_URL} / {settings.OLLAMA_MODEL}")
    
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
    ollama_status = await check_ollama_health()
    return {
        "status": "ok",
        "ollama": ollama_status,
    }
