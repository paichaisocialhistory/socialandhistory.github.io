# AI 역사 모의 법정 학습 플랫폼

> 중학교 역사 수업을 위한 AI 기반 모의 법정 웹 애플리케이션

## 🏛️ 프로젝트 개요

AI 역사 모의 법정은 중학생이 역사 속 인물을 재판하는 형식으로 역사를 깊이 이해하는 교육 플랫폼입니다.

### 학생 활동 흐름 (7단계)

| 단계 | 활동 | 설명 |
|------|------|------|
| 1️⃣ | **정보 입력** | 학급 코드, 학년/반/번호, 이름 입력 |
| 2️⃣ | **인물 선택** | 김옥균, 전봉준, 안중근, 명성황후 중 선택 |
| 3️⃣ | **학습** | 선택한 인물의 역사적 정보 학습 |
| 4️⃣ | **퀴즈** | 학습 확인 퀴즈 (60% 이상 합격) |
| 5️⃣ | **역할 선택** | 검사/변호인/판사/증인/피고인 선택 |
| 6️⃣ | **AI 모의재판** | Claude AI와 5턴 법정 대화 |
| 7️⃣ | **느낀점 제출** | 활동 소감 작성 및 Google Sheets 저장 |

---

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** (App Router)
- **TypeScript** + **Tailwind CSS**
- **shadcn/ui** + **Radix UI**
- **Zustand** (전역 상태, 자동저장/재접속 복원)
- **React Hook Form** + **Zod** (폼 검증)

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy** (비동기 ORM)
- **Alembic** (DB 마이그레이션)

### Database
- **PostgreSQL 16** + **pgvector** 확장

### AI
- **Claude API** (Anthropic, 기본 모델 `claude-haiku-4-5`)
- 역사 검증 + 역할극 + 판결문 생성

### 기타
- **Docker Compose** (전체 스택 실행)
- **Google Apps Script** (Sheets 연동)
- **JWT** (교사 인증)

---

## 🚀 빠른 시작

### 1. 사전 요구사항

```bash
# Docker & Docker Compose 설치 확인
docker --version
docker compose --version
```

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 편집 (ANTHROPIC_API_KEY, SECRET_KEY 등)
```

### 3. Docker Compose로 실행

```bash
# DB + Backend 실행 (Frontend는 frontend 폴더에서 npm run dev)
docker compose up -d

# 로그 확인
docker compose logs -f
```

### 4. 데이터베이스 초기화

```bash
# 스키마 생성
docker exec -i hist-court-db psql -U postgres hist_court < database/migrations/001_schema.sql

# 시드 데이터 삽입
docker exec -i hist-court-db psql -U postgres hist_court < database/seeds/001_seed_data.sql

# (로컬 테스트용) 테스트 교사 계정과 학급
docker exec -i hist-court-db psql -U postgres hist_court < database/seeds/002_local_test_account.sql
```

### 5. 접속

| 서비스 | URL |
|--------|-----|
| 학생 메인 | http://localhost:3000 |
| 교사 대시보드 | http://localhost:3000/teacher |
| FastAPI Docs | http://localhost:8000/docs |

---

## 📁 프로젝트 구조

```
hist-court/
├── frontend/                # Next.js 15 프론트엔드
│   └── src/
│       ├── app/             # App Router 페이지
│       │   ├── page.tsx     # 학생 메인 (7단계 플로우)
│       │   └── (teacher)/   # 교사 대시보드
│       ├── components/
│       │   └── student/     # 단계별 컴포넌트
│       ├── lib/api.ts        # API 클라이언트
│       └── store/appStore.ts # Zustand 상태 (자동저장)
│
├── backend/                 # FastAPI 백엔드
│   └── app/
│       ├── api/             # API 라우터
│       │   ├── session.py   # 세션/정보 입력
│       │   ├── persons.py   # 인물 선택
│       │   ├── quiz.py      # 퀴즈
│       │   ├── trial.py     # AI 모의재판
│       │   ├── reflection.py# 느낀점
│       │   └── teacher.py   # 교사 인증/대시보드
│       ├── models/          # SQLAlchemy 모델
│       ├── schemas/         # Pydantic 스키마
│       ├── services/
│       │   ├── ai_service.py   # Claude API 연동
│       │   └── sheet_service.py # Google Sheets 연동
│       └── core/
│           ├── config.py    # 환경 변수
│           ├── database.py  # DB 연결
│           └── security.py  # JWT 인증
│
├── database/
│   ├── migrations/          # SQL 스키마
│   └── seeds/               # 시드 데이터
│
├── scripts/
│   └── google_apps_script.js # Google Sheets 스크립트
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🤖 AI 로직

### 역사 검증 (validate_history_message)
학생 발언을 4가지 분기로 평가:
- **A**: 역사적으로 타당, 근거 충분 → 승인
- **B**: 역사성 맞지만 근거 부족 → 승인
- **C**: 역할 불일치 또는 역사적 오류 → 거부
- **D**: 무성의 응답 → 거부

### 역할극 응답 (generate_court_responses)
- 학생 역할에 따라 반대 역할의 AI가 응답
- 최대 2개 캐릭터 동시 응답
- 중학교 교과서 수준, 2문장 이내

### 최종 판결문 (generate_verdict)
- 전체 재판 이력 기반으로 판결문 생성
- 역사적 의미 + 현대적 시사점 포함

---

## 🔗 Google Sheets 연동

1. Google Sheets 새 문서 생성
2. **도구 > Apps Script** 열기
3. `scripts/google_apps_script.js` 코드 붙여넣기
4. **배포 > 웹 앱으로 배포** (모든 사람 접근 허용)
5. 배포 URL을 교사 대시보드에 입력

---

## 👩‍🏫 교사 테스트 계정 (로컬 전용)

`database/seeds/002_local_test_account.sql`을 넣었을 때만 생기는 계정입니다.
`SECRET_KEY`가 기본값일 때만 로그인되며, **인터넷 배포 DB에는 넣지 마세요.**
배포 환경에서는 `TEACHER_EMAIL` / `TEACHER_PASSWORD` 환경 변수로 교사 계정이 만들어집니다.

```
이메일: teacher@school.kr
비밀번호: password
학급 코드: HIST2-0921
```

---

## 📡 API 엔드포인트

```
POST /api/session              # 학생 세션 생성/복원
POST /api/persons/select       # 인물 선택
GET  /api/quiz/{person}        # 퀴즈 문항
POST /api/quiz/submit          # 퀴즈 답안 제출
POST /api/trial/start          # 재판 시작
POST /api/trial/turn           # 재판 턴 처리
POST /api/reflection           # 느낀점 제출
POST /api/teacher/login        # 교사 로그인
GET  /api/teacher/classes      # 학급 목록
GET  /api/teacher/classes/{id}/students  # 학생 현황
```

---

## 🐳 Docker 서비스 포트

| 서비스 | 컨테이너 | 호스트 포트 |
|--------|----------|------------|
| PostgreSQL | hist-court-db | 5432 |
| FastAPI | hist-court-backend | 8000 |
| Next.js | hist-court-frontend | 3000 |

---

## 🌐 인터넷 배포

[DEPLOY.md](DEPLOY.md)를 참고하세요. (Vercel + Render + Neon + Claude API)

---

## 📄 라이선스

교육 목적으로 자유롭게 사용 가능합니다.
