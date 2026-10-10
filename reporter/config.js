// ============================================
// 종군기자 인터뷰 시뮬레이션 - 선생님 설정
// ============================================
// 이 파일만 고치면 됩니다. 자세한 방법은 REPORTER.md를 보세요.
window.REPORTER_CONFIG = {
  // Google Apps Script 웹 앱 URL (…/exec). 비워 두면 제출 대신 파일 저장만 됩니다.
  SHEET_URL: 'https://script.google.com/macros/s/AKfycbxex0NUp_4zo2EwgbyhQ-1L9Fpub8SKZs-tJj4Mt9pCwlqneuFoS7-szaFUAmAkqOehIg/exec',

  // AI 인터뷰 서버
  //   '/'  → 이 사이트를 Vercel에 올렸을 때 (권장: 서버가 잠들지 않아 기다림 없음)
  //   'https://hist-court-backend-xxxx.onrender.com' → 모의 법정의 Render 서버 (무료는 처음 30초~1분 깨우는 시간)
  //   ''   → AI 없이 준비된 대답만. AI가 대답하지 못할 때도 준비된 대답으로 이어 갑니다.
  AI_URL: '',

  // 기사 쓰기로 넘어가기 위한 조건
  MIN_COMMON_TOPICS: 5,        // 공통 인터뷰(연구자)에게서 서로 다른 주제를 몇 가지 이상 들어야 하는지
  MIN_PEOPLE: 3,              // 공통 인터뷰 말고 현장 사람을 최소 몇 명 인터뷰해야 하는지
  MIN_QUESTIONS_PER_PERSON: 3, // 한 사람에게서 서로 다른 주제(역사 자료)를 몇 가지 이상 들어야 '취재 완료'인지

  // 기사 본문 최소 글자 수
  MIN_ARTICLE_LENGTH: 200,

  // 기사 쓰기 화면의 '편집장 검토'(AI 피드백)를 한 학생이 받을 수 있는 횟수 (0이면 AI 피드백 끔, 기본 점검만)
  FEEDBACK_LIMIT: 5,

  // 제출 뒤 '우리 반 기사' 보기·댓글 달기 (댓글은 선생님이 시트에서 승인해야 보임)
  SHARE_ENABLED: true,
};
