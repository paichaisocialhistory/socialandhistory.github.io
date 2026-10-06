/**
 * 전쟁 속 종군기자 - Google Sheets 연동 Apps Script
 *
 * 학생이 '선생님께 제출하기'를 누르면 결과가 '기자활동결과' 시트에 한 줄로 저장됩니다.
 * 같은 학생(학년-반-번호-이름)이 다시 제출하면 새 줄을 만들지 않고 그 학생의 줄을 고칩니다.
 *
 * 설치 방법은 REPORTER.md를 참고하세요.
 *   1. 새 Google 스프레드시트 만들기
 *   2. 확장 프로그램 > Apps Script
 *   3. 이 코드를 전부 붙여넣고 저장
 *   4. 배포 > 새 배포 > 유형: 웹 앱
 *      - 다음 사용자 인증 정보로 실행: 나
 *      - 액세스 권한이 있는 사용자: 모든 사용자
 *   5. 웹 앱 URL(…/exec)을 reporter/config.js의 SHEET_URL에 붙여넣기
 */

const SHEET_NAME = '기자활동결과';

// [열 제목, 학생 데이터의 값을 시트에 넣을 형태로 바꾸는 함수]
const COLUMNS = [
  ['제출시각', d => new Date()],
  ['학년', d => d.grade || ''],
  ['반', d => d.classNo || ''],
  ['번호', d => d.studentNo || ''],
  ['이름', d => d.name || ''],
  ['전쟁', d => d.war || ''],
  ['인터뷰한인물(질문수)', d => d.people || ''],
  ['총질문수', d => d.questionCount || 0],
  ['사실확인(정답/푼수)', d => d.factCheck ? "'" + d.factCheck : ''], // 날짜로 바뀌지 않게
  ['기사제목', d => d.headline || ''],
  ['기사본문', d => d.body || ''],
  ['새로알게된사실', d => d.learned || ''],
  ['전쟁과평화에대한생각', d => d.think || ''],
  ['취재수첩', d => d.quotes || ''],
  ['인터뷰기록', d => d.transcript || ''],
  ['학생ID', d => d.studentId || ''],
];
const ID_COLUMN = COLUMNS.length; // 학생ID는 마지막 열
const WIDE_COLUMNS = ['기사본문', '새로알게된사실', '전쟁과평화에대한생각', '취재수첩', '인터뷰기록'];

function doPost(e) {
  // 여러 학생이 동시에 제출해도 줄이 섞이지 않도록 한 번에 하나씩 처리
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    // 셀 하나에 들어가는 글자 수 제한(5만 자)을 넘지 않게 자름
    const row = COLUMNS.map(([, value]) => {
      const v = value(data);
      return typeof v === 'string' ? v.slice(0, 49000) : v;
    });

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

// 브라우저에서 웹 앱 URL을 열었을 때 연결을 확인하는 용도
function doGet() {
  return json_({ status: 'ok', message: '전쟁 속 종군기자 Google Apps Script가 작동 중입니다.' });
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
    header.setBackground('#2a2620').setFontColor('#f6f0e1').setFontWeight('bold');
    sheet.setFrozenRows(1);
    // 긴 글이 들어가는 열은 줄바꿈해서 보기 좋게
    WIDE_COLUMNS.forEach(title => {
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
