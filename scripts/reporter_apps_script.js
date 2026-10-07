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
 *
 * 기사 공유·댓글 (선택):
 *   - '반코드' 탭에 학년, 반, 반코드를 적은 반만 공유 화면이 열립니다.
 *   - 학생이 쓴 댓글은 '댓글' 탭에 '승인' 체크가 꺼진 채로 들어옵니다.
 *     선생님이 '승인' 칸을 체크해야 친구들에게 보입니다.
 *   - 기사를 공유 화면에서 빼려면 '기자활동결과' 탭의 '공유숨김' 칸을 체크합니다.
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
const HIDE_COLUMN = COLUMNS.length + 1; // 그 오른쪽: 공유숨김 (선생님이 체크)

// 공유 화면에 기자 이름을 보일지 (false면 '1번 기자', '2번 기자'처럼 번호로 보임)
const SHOW_NAMES = true;
const CODE_SHEET = '반코드';
const COMMENT_SHEET = '댓글';
const COMMENT_HEADER = ['작성시각', '학년', '반', '기사ID', '기사제목', '댓글쓴학생ID', '댓글쓴이', '내용', '승인'];
const COMMENT_MAX_LENGTH = 200;
const COMMENTS_PER_ARTICLE = 3; // 한 학생이 한 기사에 쓸 수 있는 댓글 수 (대기 중 포함)
const WIDE_COLUMNS = ['기사본문', '새로알게된사실', '전쟁과평화에대한생각', '취재수첩', '인터뷰기록'];

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return json_({ success: false, error: '잘못된 요청입니다.' });
  }
  try {
    if (data.action === 'list') return json_(listArticles_(data)); // 읽기만 하므로 잠그지 않음
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: String(error) });
  }

  // 여러 학생이 동시에 써도 줄이 섞이지 않도록 한 번에 하나씩 처리
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (data.action === 'comment') return json_(addComment_(data));
    saveArticle_(data);
    return json_({ success: true });
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function saveArticle_(data) {
  const sheet = getSheet_();
  // 셀 하나에 들어가는 글자 수 제한(5만 자)을 넘지 않게 자름
  const row = COLUMNS.map(([, value]) => {
    const v = value(data);
    return typeof v === 'string' ? v.slice(0, 49000) : v;
  });
  const existingRow = findStudentRow_(sheet, data.studentId);
  if (existingRow) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]); // 공유숨김 칸은 그대로 둠
  } else {
    sheet.appendRow(row);
    sheet.getRange(sheet.getLastRow(), HIDE_COLUMN).insertCheckboxes();
  }
}

// ---------- 기사 공유·댓글 ----------

// 반코드가 맞는지 확인. 맞지 않으면 오류 메시지를 돌려줌
function checkClassCode_(data) {
  const sheet = getCodeSheet_();
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const row = rows.find(([g, c]) => String(g) === String(data.grade) && String(c) === String(data.classNo));
  if (!row || !String(row[2]).trim()) return '선생님이 아직 우리 반 공유를 열지 않았어요.';
  if (String(row[2]).trim() !== String(data.classCode || '').trim()) return '반 코드가 맞지 않아요.';
  return null;
}

// 기사ID: 학생ID를 그대로 보이지 않도록 짧은 해시로 바꿈
function articleId_(studentId) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'reporter:' + studentId, Utilities.Charset.UTF_8);
  return bytes.slice(0, 6).map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

function classArticles_(grade, classNo) {
  const sheet = getSheet_();
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HIDE_COLUMN).getValues();
  const col = title => COLUMNS.findIndex(([t]) => t === title);
  return values
    .filter(r => String(r[col('학년')]) === String(grade) && String(r[col('반')]) === String(classNo) && r[HIDE_COLUMN - 1] !== true)
    .map(r => ({
      studentId: r[col('학생ID')],
      studentNo: r[col('번호')],
      name: r[col('이름')],
      headline: r[col('기사제목')],
      body: r[col('기사본문')],
      people: r[col('인터뷰한인물(질문수)')],
    }))
    .sort((a, b) => Number(a.studentNo) - Number(b.studentNo));
}

function listArticles_(data) {
  const codeError = checkClassCode_(data);
  if (codeError) return { success: false, error: codeError };
  const articles = classArticles_(data.grade, data.classNo);
  const comments = getCommentSheet_();
  const crows = comments.getLastRow() < 2 ? [] : comments.getRange(2, 1, comments.getLastRow() - 1, COMMENT_HEADER.length).getValues();
  return {
    success: true,
    articles: articles.map(a => {
      const id = articleId_(a.studentId);
      const mine = a.studentId === data.studentId;
      const list = crows
        .filter(r => r[3] === id && (r[8] === true || r[5] === data.studentId)) // 승인된 것 + 내가 쓴 대기 중인 것
        .map(r => ({
          author: SHOW_NAMES ? r[6] : '친구',
          text: r[7],
          time: Utilities.formatDate(new Date(r[0]), 'Asia/Seoul', 'M/d HH:mm'),
          pending: r[8] !== true,
        }));
      return {
        id,
        mine,
        reporter: SHOW_NAMES ? `${a.name} 기자` : `${a.studentNo}번 기자`,
        headline: a.headline,
        body: a.body,
        people: a.people,
        comments: list,
      };
    }),
  };
}

function addComment_(data) {
  const codeError = checkClassCode_(data);
  if (codeError) return { success: false, error: codeError };
  const text = String(data.text || '').trim();
  if (text.length < 5) return { success: false, error: '댓글을 5글자 이상 써 주세요.' };
  if (text.length > COMMENT_MAX_LENGTH) return { success: false, error: `댓글은 ${COMMENT_MAX_LENGTH}자까지 쓸 수 있어요.` };

  const article = classArticles_(data.grade, data.classNo).find(a => articleId_(a.studentId) === data.articleId);
  if (!article) return { success: false, error: '기사를 찾을 수 없어요.' };
  if (article.studentId === data.studentId) return { success: false, error: '내 기사에는 댓글을 달 수 없어요.' };

  const sheet = getCommentSheet_();
  const rows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, COMMENT_HEADER.length).getValues();
  const already = rows.filter(r => r[3] === data.articleId && r[5] === data.studentId).length;
  if (already >= COMMENTS_PER_ARTICLE) return { success: false, error: `한 기사에 댓글은 ${COMMENTS_PER_ARTICLE}개까지 쓸 수 있어요.` };

  sheet.appendRow([new Date(), data.grade, data.classNo, data.articleId, article.headline, data.studentId, data.name, text, false]);
  sheet.getRange(sheet.getLastRow(), COMMENT_HEADER.length).insertCheckboxes();
  return { success: true };
}

function getCodeSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CODE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CODE_SHEET);
    sheet.appendRow(['학년', '반', '반코드']);
    sheet.appendRow([3, 1, '']); // 예시: 반코드를 적으면 그 반의 공유가 열림
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getCommentSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(COMMENT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(COMMENT_SHEET);
    sheet.appendRow(COMMENT_HEADER);
    sheet.getRange(1, 1, 1, COMMENT_HEADER.length).setBackground('#2a2620').setFontColor('#f6f0e1').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(8, 360);
    sheet.getRange(1, 8, sheet.getMaxRows(), 1).setWrap(true);
  }
  return sheet;
}

// 브라우저에서 웹 앱 URL을 열었을 때 연결을 확인하는 용도
function doGet() {
  getCodeSheet_();     // 처음 열 때 '반코드'와 '댓글' 탭을 만들어 둠
  getCommentSheet_();
  return json_({ status: 'ok', message: '전쟁 속 종군기자 Google Apps Script가 작동 중입니다.' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(([title]) => title).concat('공유숨김'));
    const header = sheet.getRange(1, 1, 1, HIDE_COLUMN);
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
