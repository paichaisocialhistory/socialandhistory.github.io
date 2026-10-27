# 교내 축구리그 · 선수 데이터베이스

중학교 교내 축구리그 운영 웹사이트입니다. 방문자는 로그인 없이 팀·일정·순위를 보고
선수 등록을 신청할 수 있으며, 교사(관리자)는 로그인 후 승인·경기 관리를 합니다.
선수 데이터는 고유번호(학번)를 기준으로 재학 3년간 누적됩니다.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프런트엔드 | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 |
| 백엔드/DB/인증 | Supabase (PostgreSQL, 서울 리전 `ap-northeast-2`), Supabase Auth, Row Level Security |
| 배포 | Vercel |
| 동영상 | 학교 구글 드라이브 공유 링크 임베드 (파일은 DB 에 저장하지 않음) |

---

## 1. 로컬 실행

```bash
npm install
cp .env.example .env.local   # 값을 채운 뒤
npm run dev                  # http://localhost:3000
```

`.env.local` 이 비어 있으면 안내 화면이 표시되고 앱은 뜹니다.

### 사용 가능한 명령

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint
npm run typecheck  # 타입 검사
npm test           # 순위표·링크 처리 단위 테스트 (vitest)
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. 리전은 **Northeast Asia (Seoul) `ap-northeast-2`** 선택
3. Project Settings → API 에서 `Project URL` 과 `anon public` 키를 복사해
   `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 에 입력

### 2.2 스키마 적용

`supabase/migrations/` 의 SQL 을 **파일명 순서대로** 적용합니다.

Supabase CLI 사용:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

CLI 없이: 대시보드 → SQL Editor 에서 아래 순서로 붙여넣고 실행

| 순서 | 파일 | 내용 |
|---|---|---|
| 1 | `20260101000000_core_schema.sql` | 관리자·팀·선수·경기, 학번 발급, 승인 함수, RLS |
| 2 | `20260101000100_player_abilities.sql` | [2단계] 능력치·시즌 기록·변경 승인 워크플로우 |
| 3 | `20260101000200_videos.sql` | [3단계] 영상·타임스탬프 메모 |
| 4 | `20261016000000_student_accounts_and_video_sources.sql` | 학생 계정(역할·선수 연결), YouTube 소스 허용, 교직원 전용 정책 조이기 |
| 5 | `20261027000000_annotation_pitch_position.sql` | 분석 메모에 경기장 위치 좌표 추가 |

2·3단계 마이그레이션은 기능 플래그와 무관하게 미리 적용해도 안전합니다.
플래그를 끄면 애플리케이션이 해당 화면을 노출하지 않을 뿐입니다.

### 2.3 최초 관리자 등록 (중요)

로그인만으로는 권한이 생기지 않습니다. `admins` 표에 등록된 계정만 관리자입니다.

1. 대시보드 → Authentication → Users → **Add user** 로 교사 계정 생성
   (이메일 + 비밀번호, "Auto Confirm User" 체크)
2. SQL Editor 에서 실행:

```sql
insert into public.admins (user_id, email, display_name)
select id, email, '홍길동 선생님' from auth.users where email = 'teacher@school.kr';
```

`admins` 표에는 RLS 상 쓰기 정책이 없으므로, 관리자 추가·삭제는 항상 대시보드
(service_role)에서만 가능합니다. 교사 계정이 스스로 권한을 올릴 수 없습니다.

### 2.4 학생 로그인용 구글 공급자 설정

학생은 학교 구글 계정으로 로그인합니다. Supabase 대시보드에서 설정합니다.

1. Authentication → Providers → **Google** 활성화
2. Google Cloud Console 에서 OAuth 클라이언트를 만들고 Client ID/Secret 을 입력
3. 승인된 리디렉션 URI 에 Supabase 가 안내하는 콜백 주소를 등록
4. 배포 주소의 `/auth/callback` 을 Authentication → URL Configuration 의 Redirect URLs 에 추가

> **도메인 제한이 중요합니다.** `NEXT_PUBLIC_SCHOOL_DOMAIN` 은 로그인 화면에서 학교 계정을
> 먼저 보여 줄 뿐, 실제 제한은 아닙니다. 외부인 가입을 막으려면 Google Cloud Console 의 OAuth
> 동의 화면을 **내부(Internal)** 로 설정하세요.

### 2.5 계정 역할 지정

처음 로그인한 계정은 모두 **학생**으로 생성됩니다(DB 트리거 `handle_new_user`).

- 교사는 관리자가 `/admin/accounts` 에서 **교직원으로 지정**해야 영상·메모·능력치 기능을 쓸 수 있습니다.
- 학생은 `/admin/accounts` 에서 **선수와 연결**해야 자기 경기 장면을 볼 수 있습니다.
- `admins` 표에 등록된 계정은 역할과 무관하게 항상 교직원 권한을 가집니다.

### 2.6 권장 인증 설정

- Authentication → Providers → Email 에서 **"Enable email signup" 을 끕니다.**
  교사 계정은 대시보드에서만 발급합니다.
- 비밀번호 최소 길이를 높이고, 가능하면 학교 도메인 이메일만 사용합니다.

---

## 3. 배포 (Vercel)

1. Vercel 에서 이 저장소를 Import
2. Environment Variables 에 `.env.example` 의 항목을 입력
3. Deploy

> Vercel Hobby 요금제는 약관상 개인·비상업 용도로 안내되는 경우가 있습니다.
> 학교 공식 사이트로 장기 운영하기 전에 약관을 확인하거나 Cloudflare Pages 등
> 대안을 검토하세요.

### 무료 요금제 운영 시 필수 대응

Supabase 무료 프로젝트는 **7일간 API 요청이 없으면 자동 일시중지**됩니다.
방학처럼 접속이 없는 기간에 프로젝트가 멈추는 것을 막기 위해 둘 중 하나를 택하세요.

- **(a) 크론 핑** — 이 저장소의 `.github/workflows/supabase-keepalive.yml` 이
  3일마다 가벼운 조회를 보냅니다. 저장소 Settings → Secrets 에
  `SUPABASE_URL`, `SUPABASE_ANON_KEY` 를 등록하면 동작합니다.
- **(b) Supabase Pro 전환** (월 $25 수준)

---

## 4. 기능 플래그

단계별 선택 기능은 환경변수로 켜고 끕니다. 플래그를 끄면 관련 메뉴가 사라지고
라우트는 404 를 반환하며, 1단계 기능(팀·선수 등록·경기·순위)은 그대로 동작합니다.

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_ENABLE_PLAYER_ABILITIES` | `false` | [2단계] 능력치·코치 메모·시즌 기록 + 승인 워크플로우 |
| `NEXT_PUBLIC_ENABLE_VIDEOS` | `false` | [3단계] 구글 드라이브 영상 + 타임스탬프 메모 |
| `NEXT_PUBLIC_PUBLIC_PLAYER_DIRECTORY` | `true` | 선수 데이터베이스를 비로그인 방문자에게 공개할지 |

`NEXT_PUBLIC_PUBLIC_PLAYER_DIRECTORY=false` 로 두면 `/players` 와 선수 상세는
관리자만 볼 수 있습니다(운영 중 언제든 변경 가능).

---

## 5. 화면 구성

| 경로 | 설명 | 접근 |
|---|---|---|
| `/` | 팀 현황 요약, 다가오는 경기, 상위 5팀 | 전체 공개 |
| `/teams` | 팀 목록 · 추가 · 삭제 | 조회 공개 / 쓰기 관리자 |
| `/register` | 선수 등록 신청서 | 로그인 불필요 |
| `/players` | 선수 데이터베이스 (팀·입학년도·이름 필터) | 플래그에 따름 |
| `/players/[student_no]` | 선수 상세 — 기본정보, 능력치·코치메모·시즌기록(2단계), 분석 메모(3단계) | 플래그에 따름 |
| `/schedule` | 경기 일정 등록 · 점수 입력 · 결과 확정 | 조회 공개 / 쓰기 관리자 |
| `/standings` | 자동 순위표 | 전체 공개 |
| `/videos`, `/videos/[id]` | 영상 목록 · 재생 · 타임스탬프 메모 | 교직원 |
| `/login` | 학생·교사 구글 로그인 | — |
| `/admin/login` | 관리자 이메일 로그인 | — |
| `/admin/players` | 선수 등록 승인 · 반려 | 관리자 |
| `/admin/abilities` | 능력치 변경 요청 승인 · 반려 | 관리자 |
| `/admin/accounts` | 계정 역할 지정 · 학생↔선수 연결 | 관리자 |

---

## 6. 핵심 비즈니스 로직

### 6.1 고유번호(학번) 발급

- 승인 시점에 `{입학년도}-{일련번호 4자리}` 형식으로 자동 발급 (`2026-0001`)
- 일련번호는 같은 입학년도 안에서 1부터 순차 발급
- 발급은 DB 함수 `issue_student_no()` 가 `student_no_counters` 표에 upsert 하며
  **원자적으로** 처리합니다. 여러 관리자가 동시에 승인해도 번호가 겹치지 않습니다.
- 발급 후 변경 불가 — `players_guard_student_no` 트리거가 `student_no` 와
  (발급 이후의) `admission_year` 변경을 거부합니다.
- 학년·반·번호는 바뀌어도 학번은 유지되어 모든 기록이 한 학번 아래 누적됩니다.
- `graduation_year` 는 `admission_year + 3` 으로 자동 계산되며, 보관·삭제 정책의
  기준으로 사용합니다.

### 6.2 선수 등록 승인

1. 학생이 로그인 없이 신청서 제출 → `status='pending'`
2. 관리자 승인 → `status='approved'`, `student_no`·`approved_at` 채움
   / 반려 → `status='rejected'` (사유는 `reject_reason` 에 저장)

반려된 신청서는 관리자 화면에서 다시 승인할 수 있습니다.

### 6.3 능력치 변경 승인 (2단계)

1. 로그인한 교사가 능력치 제안 → `ability_change_requests` 에 `pending` 으로 저장
   (이 시점에는 `player_abilities` 에 **반영되지 않음**)
2. 관리자 승인 → `player_abilities` 에 upsert + 요청에 `reviewed_by`/`reviewed_at` 기록
   / 반려 → 요청 상태만 `rejected`, 능력치는 그대로

승인·반려는 DB 함수 `review_ability_request()` 만 수행하며, 관리자가 아니면 거부합니다.
`player_abilities` 에는 직접 쓰기 정책이 없어 승인 경로를 우회할 수 없습니다.

### 6.4 순위표 계산

- 확정(`is_confirmed=true`)되고 양 팀 점수가 모두 있는 경기만 집계
- 승점 = 승×3 + 무×1 + 패×0
- 정렬: 승점 ↓ → 득실차 ↓ → 득점 ↓ → 팀명 가나다순

구현은 `src/lib/standings.ts` 에 있고 `npm test` 로 검증합니다.

### 6.5 영상 연동과 장면 바로가기 (3단계)

- 파일 업로드 없음. 링크만 등록하며 `videos.source_url` 은 DB 체크 제약으로
  **YouTube** 와 **구글 드라이브** 링크만 허용합니다(임의 외부 임베드 차단).
- **YouTube 일부공개를 권장합니다.** 메모를 누르면 영상이 그 장면부터 재생됩니다.
  임베드는 추적을 줄인 `youtube-nocookie.com` 도메인을 씁니다.
- **구글 드라이브는 시점 이동을 지원하지 않습니다.** 드라이브 미리보기는 외부에서 재생
  위치를 제어할 수 없는 닫힌 플레이어입니다. 기존 영상 재생용으로만 유지하며, 화면에
  그 제약을 안내합니다.
- 타임스탬프 메모는 `video_annotations` 에 저장됩니다. 선수를 지정하면 그 학생이
  로그인했을 때 자기 화면(`/players/[student_no]`)에서 해당 장면을 눌러 볼 수 있습니다.
- 선수를 지정하지 않은 메모는 교직원에게만 보입니다.

### 6.6 전술 시각화 (수동 태깅 기반)

영상 분석 없이, 교사가 메모를 남길 때 경기장 그림을 눌러 위치를 함께 찍습니다.
찍은 지점은 영상 화면과 선수 상세 화면의 **전술판**에 표시되고, 선수별로
수비/중원/공격 구역 분포를 셉니다.

- 좌표는 경기장 크기와 무관하게 `0~1` 비율로 저장합니다
  (`pitch_x` 공격 방향, `pitch_y` 터치라인 사이). `src/lib/pitch.ts` 의
  `toMeters()` 로 실제 미터로 환산할 수 있습니다.
- 위치는 **선택사항**입니다. 찍지 않은 메모도 그대로 저장되고, 기존 메모는
  영향을 받지 않습니다.
- DB 제약이 반쪽 좌표(한쪽만 입력)와 범위 밖 값을 막습니다.
- 메모 수가 적은 단계에서는 밀도 히트맵이 오해를 부르므로, 개별 지점만
  표시합니다. 데이터가 쌓이면 히트맵을 검토하세요.

자동 추적으로 좌표를 만드는 실험은 `prototypes/tactical-board/` 에 있습니다
(웹사이트에 연결되어 있지 않음).

---

## 7. 권한 및 보안

권한은 화면이 아니라 **PostgreSQL Row Level Security** 로 강제됩니다. 앱은 anon 키만
사용하므로 API 를 직접 호출해도 아래 규칙을 우회할 수 없습니다.

| 표 | 조회 | 쓰기 |
|---|---|---|
| `teams`, `matches` | 전체 공개 | 관리자만 |
| `players` | `status='approved'` 행만 공개 / 대기·반려는 관리자만 | 신청서(insert)는 누구나(`pending` 고정), 수정·삭제는 관리자만 |
| `player_abilities` | 승인된 선수만 공개 | 직접 쓰기 불가 (승인 함수 경유만) |
| `player_season_stats` | 승인된 선수만 공개 | 관리자만 |
| `ability_change_requests` | 로그인한 교사 | insert 는 교사, 승인 처리(update)는 관리자만 |
| `videos` | 로그인한 교직원·학생 | 관리자만 |
| `video_annotations` | 교직원은 전체 / 학생은 **본인 것만** | 작성은 교직원, 수정·삭제는 관리자만 |
| `profiles` | 본인 행만 (관리자는 전체) | 직접 쓰기 불가 (관리자 함수 경유만) |
| `admins` | 본인 행만 | 대시보드(service_role)에서만 |
| `student_no_counters` | 접근 불가 | 접근 불가 (발급 함수 전용) |

신청서 insert 정책은 `status='pending'`, `student_no is null`, `approved_at is null`,
`coach_note is null` 을 강제하므로, 방문자가 승인 상태나 학번을 선점할 수 없습니다.

### 개인정보 운영 사항

- `student_no` 에 입학년도가 포함되어 그 자체로 개인 식별정보입니다.
  졸업(입학년도 + 3년) 후 보관·삭제 기준을 학교 운영 정책으로 정의하세요.
  `players.graduation_year` 로 대상자를 조회할 수 있습니다.

  ```sql
  -- 올해 기준 졸업한 선수 조회
  select student_no, name, graduation_year
    from public.players
   where graduation_year < extract(year from now());
  ```

- 선수 정보 공개 범위는 `NEXT_PUBLIC_PUBLIC_PLAYER_DIRECTORY` 로 조정합니다.
  학교 구성원 한정 운영이 필요하면 `false` 로 두세요.
- 영상에 얼굴이 포함되는 경우 촬영·활용 동의 절차는 학교 규정에 따라 별도로
  마련해야 합니다(웹사이트 기능 외 사항). 영상은 기본적으로 로그인한 교직원에게만
  보입니다.

### 백업 (이중화)

- Supabase 자동 일일 백업 (대시보드 → Database → Backups)
- 학기 단위 CSV 수동 백업: Table Editor 에서 `players`, `matches`,
  `player_season_stats` 등을 CSV 로 내보내 학교 보관소에 저장

---

## 8. 개발 단계

| 단계 | 범위 | 상태 |
|---|---|---|
| 1단계 (MVP) | 팀 관리, 선수 등록·승인(고유번호 자동 발급), 경기 일정·결과, 자동 순위표, 관리자 로그인 | 구현 완료 |
| 2단계 (선택) | 능력치·코치 메모·시즌 기록 + 승인 워크플로우 (플래그) | 구현 완료 |
| 3단계 | 구글 드라이브 영상 연동 + 타임스탬프 분석 메모 (플래그) | 구현 완료 |
| 4단계 (선택) | 학생 계정 — 구현 완료 / 변경 이력 로그, 연도별 시즌 구분, 통계 대시보드 — 미구현 | 일부 구현 |

---

## 9. 디렉터리 구조

```
src/
  app/
    page.tsx                    홈
    teams/                      팀 목록·추가·삭제
    register/                   선수 등록 신청 (로그인 불필요)
    players/                    선수 데이터베이스
      [student_no]/             선수 상세
    schedule/                   경기 일정·결과
    standings/                  순위표
    videos/                     [3단계] 영상
    login/                      학생·교사 구글 로그인
    auth/callback/              구글 로그인 콜백
    admin/
      login/                    관리자 로그인
      players/                  선수 등록 승인
      abilities/                [2단계] 능력치 변경 승인
      accounts/                 계정 역할 지정 · 학생↔선수 연결
  components/                   공용 UI (video-player 포함, + 테스트)
  lib/
    supabase/                   서버·브라우저 클라이언트
    standings.ts                순위표 계산 (+ 테스트)
    video-source.ts             YouTube·드라이브 링크 처리 (+ 테스트)
    drive.ts                    구글 드라이브 링크 처리 (+ 테스트)
    features.ts                 기능 플래그
  middleware.ts                 Supabase 세션 갱신
supabase/
  migrations/                   스키마 · RLS · 비즈니스 로직 함수
  seed.sql                      로컬 개발용 샘플 데이터
```
