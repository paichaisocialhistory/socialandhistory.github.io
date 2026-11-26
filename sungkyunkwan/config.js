// ============================================
// 성균관 역사 투어 - 선생님 설정
// ============================================
// 이 파일만 고치면 됩니다. 자세한 방법은 SUNGKYUNKWAN.md를 보세요.
window.TOUR_CONFIG = {
  // Google Apps Script 웹 앱 URL (…/exec)
  // 비워 두면 '체험 모드'로 동작합니다. (사진이 선생님께 전송되지 않음, 미리 보기용)
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxkFRVnJ9YwwbRoANHplDVxxExYbtNHrnAVpJQQFeFguNj9car4Em6sBJKUYUvY5LoFzQ/exec',

  // 퀴즈 문항 수 (장소마다 고르게 뽑음). 0이면 모든 문제
  QUIZ_COUNT: 10,

  // 상품 안내 문구 (학생 첫 화면, 장소 목록, 사진 미션 칸에 보임). 비워 두면 안 보임
  PRIZE_TEXT: '🎁 사진을 잘 찍어서 제출한 학생 9명에게 왕용성 선생님이 상품을 드려요!',

  // 학번 자릿수 안내 (예: 3학년 1반 5번 → 30105)
  STUDENT_NO_HINT: '예: 3학년 1반 5번 → 30105',
};
