from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI 역사 모의 법정"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/hist_court"
    
    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Claude API
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5"
    
    # 교사 계정 (서버 시작 시 이 계정을 만들거나 비밀번호를 갱신)
    TEACHER_EMAIL: str = ""
    TEACHER_PASSWORD: str = ""
    TEACHER_NAME: str = "선생님"
    # 누구나 교사 회원가입을 할 수 있게 할지 여부 (인터넷 배포 시 false 권장)
    ALLOW_TEACHER_REGISTRATION: bool = False
    
    # 종군기자 인터뷰 AI 사용량 제한 (API 요금 보호)
    REPORTER_DAILY_LIMIT: int = 2000          # 하루 전체 질문 수
    REPORTER_STUDENT_HOURLY_LIMIT: int = 60   # 학생 한 명이 한 시간에 할 수 있는 질문 수
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"


settings = Settings()
