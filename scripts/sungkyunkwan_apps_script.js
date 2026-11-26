/**
 * 성균관 역사 투어 - Google Apps Script (사진은 Google 드라이브, 기록은 이 스프레드시트)
 *
 * 하는 일
 *   - 학생이 찍은 미션 사진을 선생님 드라이브의 '성균관 투어 사진' 폴더에 학생별로 저장
 *   - '사진제출' 탭: 학생 × 미션마다 한 줄 (다시 찍으면 그 줄을 고치고 예전 사진은 휴지통으로)
 *   - '퀴즈결과' 탭: 학생마다 한 줄 (첫 점수, 최고 점수, 최근 점수, 시도 횟수)
 *   - 관리자 화면(admin.html): 비밀번호를 아는 선생님만 사진 보기, '확인' / '다시 찍기' 표시
 *
 * 설치 방법은 SUNGKYUNKWAN.md를 참고하세요.
 *   1. 새 Google 스프레드시트 → 확장 프로그램 > Apps Script
 *   2. 이 코드를 전부 붙여넣고, 바로 아래 ADMIN_PASSWORD를 선생님만 아는 값으로 바꾼 뒤 저장
 *   3. 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자)
 *   4. 웹 앱 URL(…/exec)을 sungkyunkwan/config.js의 SCRIPT_URL에 붙여넣기
 */

// ★ 관리자 화면 비밀번호 (4글자 이상). 학생에게 알려 주지 마세요.
//   바꾼 뒤에는 '배포 > 배포 관리 > ✏️ > 버전: 새 버전 > 배포'를 해야 적용됩니다.
const ADMIN_PASSWORD = '';

const FOLDER_NAME = '성균관 투어 사진';
const PHOTO_SHEET = '사진제출';
const QUIZ_SHEET = '퀴즈결과';
const PHOTO_HEADER = ['제출시각', '학번', '이름', '장소', '미션ID', '미션', '상태', '선생님메모', '사진', '파일ID', '학생키', '썸네일'];
const QUIZ_HEADER = ['제출시각', '학번', '이름', '코스', '첫점수', '최고점수', '최근점수', '문항수', '시도횟수', '최근틀린문항', '학생키'];
const STATUSES = ['제출', '확인', '다시찍기'];
const MAX_IMAGE_CHARS = 8 * 1024 * 1024; // base64 글자 수 (약 6MB)

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (error) {
    return json_({ success: false, error: '잘못된 요청입니다.' });
  }
  try {
    // 읽기만 하는 요청은 잠그지 않음
    if (data.action === 'status') return json_(status_(data));
    if (data.action === 'admin_list') return json_(admin_(data, adminList_));
    if (data.action === 'admin_photo') return json_(admin_(data, adminPhoto_));
    if (data.action === 'admin_check') return json_(admin_(data, () => ({ success: true })));

    // 여러 학생이 동시에 올려도 줄이 섞이지 않도록 한 번에 하나씩
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      if (data.action === 'upload') return json_(upload_(data));
      if (data.action === 'quiz') return json_(saveQuiz_(data));
      if (data.action === 'admin_review') return json_(admin_(data, adminReview_));
      return json_({ success: false, error: '알 수 없는 요청입니다.' });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    return json_({ success: false, error: String((error && error.message) || error) });
  }
}

// 브라우저에서 웹 앱 URL을 열었을 때 연결 확인용 (처음 한 번 열면 탭과 폴더가 만들어짐)
function doGet() {
  photoSheet_();
  quizSheet_();
  rootFolder_();
  return json_({ status: 'ok', message: '성균관 역사 투어 Google Apps Script가 작동 중입니다.' });
}

// ---------- 학생 ----------

function student_(data) {
  const no = String(data.studentNo || '').replace(/\D/g, '');
  const name = String(data.name || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!/^\d{4,6}$/.test(no) || !name) throw new Error('학번과 이름을 확인해 주세요.');
  return { no, name, key: no + '|' + name };
}

function status_(data) {
  const st = student_(data);
  const photos = {};
  const ps = photoSheet_();
  rows_(ps, PHOTO_HEADER).forEach(r => {
    if (r['학생키'] !== st.key) return;
    photos[r['미션ID']] = { status: r['상태'] || '제출', memo: r['선생님메모'] || '', time: time_(r['제출시각']) };
  });
  const q = rows_(quizSheet_(), QUIZ_HEADER).find(r => r['학생키'] === st.key);
  return {
    success: true,
    photos,
    quiz: q ? { first: q['첫점수'], best: q['최고점수'], last: q['최근점수'], total: q['문항수'], attempts: q['시도횟수'] } : null,
  };
}

function upload_(data) {
  const st = student_(data);
  const missionId = String(data.missionId || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!missionId) throw new Error('미션 정보가 없어요.');
  const image = String(data.image || '');
  if (image.length < 100) throw new Error('사진이 비어 있어요.');
  if (image.length > MAX_IMAGE_CHARS) throw new Error('사진이 너무 커요.');
  let thumb = String(data.thumb || '');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(thumb) || thumb.length > 48000) thumb = '';

  const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd-HHmmss');
  const blob = Utilities.newBlob(Utilities.base64Decode(image), 'image/jpeg', `${st.no}_${st.name}_${missionId}_${stamp}.jpg`);
  const file = studentFolder_(st).createFile(blob);

  const sheet = photoSheet_();
  const col = colIndex_(PHOTO_HEADER);
  const rowNo = findRow_(sheet, PHOTO_HEADER, r => r['학생키'] === st.key && r['미션ID'] === missionId);
  const row = [
    new Date(), "'" + st.no, safe_(st.name), safe_(data.stopName), missionId, safe_(data.missionTitle),
    '제출', '', file.getUrl(), file.getId(), safe_(st.key), thumb,
  ];
  if (rowNo) {
    const oldId = sheet.getRange(rowNo, col['파일ID'] + 1).getValue();
    if (oldId) {
      try { DriveApp.getFileById(oldId).setTrashed(true); } catch (e) { /* 이미 지워진 파일 */ }
    }
    sheet.getRange(rowNo, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { success: true, time: time_(new Date()) };
}

function saveQuiz_(data) {
  const st = student_(data);
  const score = Math.max(0, Number(data.score) || 0);
  const total = Math.max(0, Number(data.total) || 0);
  const sheet = quizSheet_();
  const rowNo = findRow_(sheet, QUIZ_HEADER, r => r['학생키'] === st.key);
  let first = score, best = score, attempts = 1;
  if (rowNo) {
    const old = rowObject_(QUIZ_HEADER, sheet.getRange(rowNo, 1, 1, QUIZ_HEADER.length).getValues()[0]);
    first = old['첫점수'] === '' ? score : old['첫점수'];
    best = Math.max(Number(old['최고점수']) || 0, score);
    attempts = (Number(old['시도횟수']) || 0) + 1;
  }
  const row = [
    new Date(), "'" + st.no, safe_(st.name), data.course === 'short' ? '30분' : '60분',
    first, best, score, total, attempts, safe_(String(data.wrong || '').slice(0, 2000)), safe_(st.key),
  ];
  if (rowNo) sheet.getRange(rowNo, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return { success: true, first, best, attempts };
}

// ---------- 관리자 ----------

function admin_(data, fn) {
  if (!ADMIN_PASSWORD || String(ADMIN_PASSWORD).length < 4) {
    return { success: false, error: 'Apps Script 코드 맨 위의 ADMIN_PASSWORD를 4글자 이상으로 정한 뒤, 새 버전으로 다시 배포해 주세요.' };
  }
  if (String(data.password || '') !== String(ADMIN_PASSWORD)) {
    Utilities.sleep(800); // 비밀번호 맞히기를 느리게
    return { success: false, auth: false, error: '비밀번호가 맞지 않아요.' };
  }
  return fn(data);
}

function adminList_() {
  const students = {};
  const get = (no, name, key) => students[key] || (students[key] = { key, studentNo: String(no), name, photos: {}, quiz: null });
  rows_(photoSheet_(), PHOTO_HEADER).forEach(r => {
    if (!r['학생키']) return;
    get(r['학번'], r['이름'], r['학생키']).photos[r['미션ID']] = {
      time: time_(r['제출시각']),
      status: r['상태'] || '제출',
      memo: r['선생님메모'] || '',
      fileId: r['파일ID'],
      thumb: r['썸네일'] || '',
    };
  });
  rows_(quizSheet_(), QUIZ_HEADER).forEach(r => {
    if (!r['학생키']) return;
    get(r['학번'], r['이름'], r['학생키']).quiz = {
      time: time_(r['제출시각']), course: r['코스'], first: r['첫점수'], best: r['최고점수'], last: r['최근점수'],
      total: r['문항수'], attempts: r['시도횟수'], wrong: r['최근틀린문항'],
    };
  });
  const list = Object.keys(students).map(k => students[k])
    .sort((a, b) => a.studentNo.localeCompare(b.studentNo) || a.name.localeCompare(b.name));
  return { success: true, students: list, folderUrl: rootFolder_().getUrl(), sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(), now: time_(new Date()) };
}

function adminPhoto_(data) {
  const fileId = String(data.fileId || '');
  // 이 시트에 기록된 사진만 꺼내 볼 수 있음 (드라이브의 다른 파일은 안 됨)
  const known = rows_(photoSheet_(), PHOTO_HEADER).some(r => r['파일ID'] === fileId);
  if (!fileId || !known) return { success: false, error: '사진을 찾을 수 없어요.' };
  const blob = DriveApp.getFileById(fileId).getBlob();
  return { success: true, mimeType: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function adminReview_(data) {
  const status = STATUSES.indexOf(data.status) === -1 ? '제출' : data.status;
  const sheet = photoSheet_();
  const col = colIndex_(PHOTO_HEADER);
  const rowNo = findRow_(sheet, PHOTO_HEADER, r => r['학생키'] === data.key && r['미션ID'] === data.missionId);
  if (!rowNo) return { success: false, error: '제출 기록을 찾을 수 없어요.' };
  sheet.getRange(rowNo, col['상태'] + 1).setValue(status);
  sheet.getRange(rowNo, col['선생님메모'] + 1).setValue(safe_(String(data.memo || '').slice(0, 300)));
  return { success: true };
}

// ---------- 드라이브 ----------

function rootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) {
    try {
      const folder = DriveApp.getFolderById(id);
      if (!folder.isTrashed()) return folder;
    } catch (e) { /* 폴더가 지워졌으면 새로 만듦 */ }
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

function studentFolder_(st) {
  const root = rootFolder_();
  const label = `${st.no} ${st.name}`;
  const found = root.getFoldersByName(label);
  return found.hasNext() ? found.next() : root.createFolder(label);
}

// ---------- 시트 ----------

function photoSheet_() {
  return sheet_(PHOTO_SHEET, PHOTO_HEADER, sheet => {
    sheet.hideColumns(PHOTO_HEADER.length); // 썸네일 열은 숨김 (관리자 화면용)
    sheet.setColumnWidth(PHOTO_HEADER.indexOf('선생님메모') + 1, 220);
  });
}

function quizSheet_() {
  return sheet_(QUIZ_SHEET, QUIZ_HEADER, sheet => {
    sheet.setColumnWidth(QUIZ_HEADER.indexOf('최근틀린문항') + 1, 320);
  });
}

function sheet_(name, header, setup) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setBackground('#2b2a26').setFontColor('#f4eee0').setFontWeight('bold');
    sheet.setFrozenRows(1);
    if (setup) setup(sheet);
  }
  return sheet;
}

function rows_(sheet, header) {
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, header.length).getValues().map(v => rowObject_(header, v));
}

function rowObject_(header, values) {
  const o = {};
  header.forEach((h, i) => { o[h] = values[i]; });
  return o;
}

function findRow_(sheet, header, test) {
  const index = rows_(sheet, header).findIndex(test);
  return index === -1 ? null : index + 2;
}

function colIndex_(header) {
  const o = {};
  header.forEach((h, i) => { o[h] = i; });
  return o;
}

// 이름 등이 =, +, -, @로 시작하면 수식으로 바뀌지 않게
function safe_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function time_(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, 'Asia/Seoul', 'M/d HH:mm');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
