# 🌐 인터넷 배포 안내서

학생들이 어디서든 접속할 수 있도록 사이트를 인터넷에 올리는 방법입니다.
모두 **무료 요금제**로 시작할 수 있습니다. Claude API만 사용량만큼 요금이 나옵니다.

| 부분 | 서비스 | 하는 일 | 요금 |
|---|---|---|---|
| 화면 (Next.js) | [Vercel](https://vercel.com) | 학생·교사가 보는 웹페이지 | 무료 |
| 서버 (FastAPI) | [Render](https://render.com) | 퀴즈·재판 처리 | 무료 |
| 데이터베이스 | [Neon](https://neon.tech) | 학생 기록 저장 | 무료 |
| AI | [Claude API](https://console.anthropic.com) | 판사·검사·변호인 대답 | 사용량만큼 |

> 순서가 중요합니다. **① Claude → ② Neon → ③ Render → ④ Vercel → ⑤ Render에 주소 연결** 순서로 진행하세요.
> 각 단계에서 복사한 값은 메모장에 모아 두면 편합니다.

---

## ① Claude API 키 만들기

1. https://console.anthropic.com 에 가입하고 로그인합니다.
2. **Settings → Billing**에서 결제 카드를 등록하고 크레딧을 충전합니다. (처음엔 $5 정도면 충분합니다.)
3. **Settings → Limits**에서 월 사용 한도(Spend limit)를 정해 두면 예상치 못한 요금을 막을 수 있습니다.
4. **API Keys → Create Key**로 키를 만들고, `sk-ant-`로 시작하는 값을 복사합니다.
   - 📝 메모: `ANTHROPIC_API_KEY`
   - ⚠️ 이 키는 비밀번호와 같습니다. 코드나 GitHub에 올리지 마세요.

**예상 비용** (기본 모델 `claude-haiku-4-5` 기준, 추정치)
- 학생 1명이 재판 5턴을 마치면 약 $0.02 (약 20~30원)
- 한 반 30명이 한 번씩 하면 약 $0.5 (약 700원)

---

## ② Neon 데이터베이스 만들기

1. https://neon.tech 에 가입합니다. (GitHub 계정으로 가입 가능)
2. **Create project**를 누릅니다.
   - Project name: `hist-court`
   - Region: **Asia Pacific (Singapore)** (한국과 가장 가까움)
3. 프로젝트 화면의 **Connect** 버튼을 누릅니다.
   - **Connection pooling은 끕니다.** (주소에 `-pooler`가 없어야 합니다.)
   - `postgresql://...neon.tech/neondb?sslmode=require` 형태의 주소를 복사합니다.
   - 📝 메모: `DATABASE_URL`
4. 왼쪽 메뉴의 **SQL Editor**를 엽니다.
5. GitHub 저장소에서 아래 파일을 열어 **내용 전체를 복사 → SQL Editor에 붙여넣기 → Run**을 누릅니다. 두 파일을 순서대로 실행합니다.
   1. `database/migrations/001_schema.sql` (표 만들기)
   2. `database/seeds/001_seed_data.sql` (역사 인물·퀴즈 넣기)
   - ⚠️ `002_local_test_account.sql`은 **넣지 마세요.** (공개된 테스트 계정입니다.)

---

## ③ Render에 서버 올리기

1. https://render.com 에 **GitHub 계정으로** 가입합니다.
2. **New → Blueprint**를 누르고, 이 저장소(`socialandhistory.github.io`)를 선택합니다.
   - 저장소가 안 보이면 **Configure GitHub App**을 눌러 이 저장소 접근을 허용합니다.
3. Render가 `render.yaml`을 읽고 `hist-court-backend` 서비스를 보여 줍니다. 비어 있는 값을 입력합니다.

   | 이름 | 넣을 값 |
   |---|---|
   | `DATABASE_URL` | ②에서 복사한 Neon 주소 |
   | `ANTHROPIC_API_KEY` | ①에서 복사한 Claude 키 |
   | `TEACHER_EMAIL` | 선생님이 쓸 로그인 이메일 |
   | `TEACHER_PASSWORD` | 선생님이 쓸 로그인 비밀번호 (길고 어렵게) |
   | `CORS_ORIGINS` | 일단 `http://localhost:3000` (⑤에서 바꿉니다) |

4. **Apply**를 누르고 배포가 끝날 때까지 기다립니다. (5분 정도)
5. 서비스 화면 위쪽의 주소(`https://hist-court-backend-xxxx.onrender.com`)를 복사합니다.
   - 📝 메모: 서버 주소
6. 확인: 브라우저에서 `서버 주소/health`에 들어가 `"ai":{"status":"ok"...}`가 보이면 성공입니다.

> 💡 무료 서버는 15분 동안 아무도 안 쓰면 잠듭니다. 수업 시작 5분 전에 `서버 주소/health`를 한 번 열어서 깨워 두세요. (처음 깨어날 때 30초~1분 걸립니다.)

---

## ④ Vercel에 화면 올리기

1. https://vercel.com 에 **GitHub 계정으로** 가입합니다.
2. **Add New → Project**를 누르고 이 저장소를 **Import**합니다.
3. 설정을 바꿉니다.
   - **Root Directory**: `frontend` (Edit을 눌러 선택)
   - **Environment Variables**에 하나 추가:
     - Name: `NEXT_PUBLIC_BACKEND_URL`
     - Value: ③에서 복사한 서버 주소 (끝에 `/` 없이)
4. **Deploy**를 누릅니다. 끝나면 사이트 주소(`https://xxxx.vercel.app`)가 나옵니다.
   - 📝 메모: 사이트 주소 ← **학생들에게 알려 줄 주소입니다.**

---

## ⑤ 서버에 사이트 주소 알려 주기

서버는 허락된 사이트에서 온 요청만 받습니다.

1. Render → `hist-court-backend` → **Environment**로 갑니다.
2. `CORS_ORIGINS` 값을 ④의 사이트 주소로 바꿉니다. (예: `https://hist-court.vercel.app`, 끝에 `/` 없이)
3. **Save Changes**를 누르면 서버가 자동으로 다시 시작됩니다.

---

## ⑥ 수업 준비

1. `사이트 주소/teacher`에서 ③에서 정한 이메일·비밀번호로 로그인합니다.
2. **학급 만들기**로 학급 코드를 만듭니다. (예: `HIST-2026-3`)
3. 학생들에게 **사이트 주소**와 **학급 코드**를 알려 줍니다.
4. 학생은 학급 코드, 학년·반·번호, 이름을 입력하고 시작합니다.

---

## 코드를 고치면?

GitHub의 `main` 브랜치에 새 코드를 올리면 Render와 Vercel이 **자동으로 다시 배포**합니다.

## 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 학생 화면에서 "네트워크 오류" | Vercel의 `NEXT_PUBLIC_BACKEND_URL`, Render의 `CORS_ORIGINS` 주소가 정확한지 (끝에 `/` 없이). Vercel 값을 바꿨다면 **Redeploy** 필요 |
| `/health`에서 AI가 `error` | Render의 `ANTHROPIC_API_KEY` 값, Claude 콘솔의 크레딧 잔액 |
| 교사 로그인 실패 | Render의 `TEACHER_EMAIL` / `TEACHER_PASSWORD` 값 (바꾼 뒤 서버가 다시 시작되면 반영) |
| "학급 코드를 찾을 수 없습니다" | 교사 대시보드에서 학급을 만들었는지, 코드 철자 |
| 첫 접속이 매우 느림 | 무료 서버가 잠들어 있던 것. 수업 전에 미리 깨우기 |

## ⚠️ 개인정보 안내

학생의 이름과 학번은 Neon(싱가포르 서버)에 저장되고, 재판 중 학생이 쓴 발언은 Claude API(Anthropic)로 전송됩니다.
학교의 개인정보 처리 방침에 맞는지 확인하시고, 필요하면 이름 대신 별명을 쓰게 하세요.
