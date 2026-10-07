// ============================================
// 종군기자 인터뷰 시뮬레이션 - 선생님 설정
// ============================================
// 이 파일만 고치면 됩니다. 자세한 방법은 REPORTER.md를 보세요.
window.REPORTER_CONFIG = {
  // Google Apps Script 웹 앱 URL (…/exec). 비워 두면 제출 대신 파일 저장만 됩니다.
  SHEET_URL: '',

  // AI 인터뷰 서버 주소 (모의 법정과 같은 Render 서버, 예: https://hist-court-backend-xxxx.onrender.com)
  // 비워 두면 AI 없이 준비된 대답만 나옵니다. AI가 대답하지 못할 때도 준비된 대답으로 이어 갑니다.
  AI_URL: '',

  // 기사 쓰기로 넘어가기 위한 조건
  MIN_COMMON_TOPICS: 5,        // 공통 인터뷰(연구자)에게서 서로 다른 주제를 몇 가지 이상 들어야 하는지
  MIN_PEOPLE: 3,              // 공통 인터뷰 말고 현장 사람을 최소 몇 명 인터뷰해야 하는지
  MIN_QUESTIONS_PER_PERSON: 3, // 한 사람에게서 서로 다른 주제(역사 자료)를 몇 가지 이상 들어야 '취재 완료'인지

  // 기사 본문 최소 글자 수
  MIN_ARTICLE_LENGTH: 200,

  // 제출 뒤 '우리 반 기사' 보기·댓글 달기 (댓글은 선생님이 시트에서 승인해야 보임)
  SHARE_ENABLED: true,
};
