/**
 * AI 역사 모의 법정 - Google Sheets 연동 Apps Script
 *
 * 학생이 느낀점을 제출하면 결과가 '재판결과' 시트에 한 줄로 저장됩니다.
 * 같은 학생이 다시 제출하면 새 줄을 만들지 않고 그 학생의 줄을 고칩니다.
 *
 * 설치 방법은 GOOGLE_SHEETS.md를 참고하세요.
 *   1. 새 Google 스프레드시트 만들기
 *   2. 확장 프로그램 > Apps Script
 *   3. 이 코드를 전부 붙여넣고 저장
 *   4. 배포 > 새 배포 > 유형: 웹 앱
 *      - 다음 사용자 인증 정보로 실행: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *   5. 웹 앱 URL(…/exec)을 교사 대시보드의 'Google Sheets 연동'에 붙여넣기
 */

const SHEET_NAME = '재판결과';

// [열 제목, 학생 데이터의 값을 시트에 넣을 형태로 바꾸는 함수]
const COLUMNS = [
  ['제출시각', d => new Date()],
  ['학급', d => d.className || ''],
  ['학년', d => d.grade || ''],
  ['반', d => d.classNo || ''],
  ['번호', d => d.studentNo || ''],
  ['이름', d => d.name || ''],
  ['선택인물', d => d.person || ''],
  ['법정역할', d => d.role || ''],
  ['퀴즈점수', d => d.totalQuestions ? `${d.score}/${d.totalQuestions}` : ''],
  ['퀴즈합격', d => d.passed ? '합격' : '불합격'],
  ['재판완료', d => d.trialCompleted ? '완료' : '미완료'],
  ['발언수', d => d.totalTurns || 0],
  ['인정된발언수', d => d.approvedTurns || 0],
  ['판결문', d => d.verdict || ''],
  ['코치총평_잘한점', d => d.strengths || ''],
  ['코치총평_성장할점', d => d.growth || ''],
  ['느낀점1', d => d.reflection1 || ''],
  ['느낀점2', d => d.reflection2 || ''],
  ['재판기록', d => d.transcript || ''],
  ['학생ID', d => d.studentId || ''],
];
const ID_COLUMN = COLUMNS.length; // 학생ID는 마지막 열

function doPost(e) {
  // 여러 학생이 동시에 제출해도 줄이 섞이지 않도록 한 번에 하나씩 처리
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    const row = COLUMNS.map(([, value]) => value(data));

    const existingRow = findStudentRow_(sheet, data.studentId);
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    return json_({ success: true });
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

// 교사 대시보드에서 주소를 저장할 때 연결을 확인하는 용도
function doGet(e) {
  return json_({ status: 'ok', message: 'AI 역사 모의 법정 Google Apps Script' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(([title]) => title));
    const header = sheet.getRange(1, 1, 1, COLUMNS.length);
    header.setBackground('#1A1A2E').setFontColor('#C9A84C').setFontWeight('bold');
    sheet.setFrozenRows(1);
    // 긴 글이 들어가는 열은 줄바꿈해서 보기 좋게
    ['판결문', '코치총평_잘한점', '코치총평_성장할점', '느낀점1', '느낀점2', '재판기록'].forEach(title => {
      const col = COLUMNS.findIndex(([t]) => t === title) + 1;
      sheet.setColumnWidth(col, 320);
      sheet.getRange(1, col, sheet.getMaxRows(), 1).setWrap(true).setVerticalAlignment('top');
    });
  }
  return sheet;
}

function findStudentRow_(sheet, studentId) {
  if (!studentId || sheet.getLastRow() < 2) return null;
  const ids = sheet.getRange(2, ID_COLUMN, sheet.getLastRow() - 1, 1).getValues();
  const index = ids.findIndex(([id]) => id === studentId);
  return index === -1 ? null : index + 2;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
