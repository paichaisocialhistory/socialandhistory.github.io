/**
 * Google Apps Script
 * 학생 데이터를 Google Sheets에 저장하는 웹 앱
 * 
 * 사용법:
 * 1. Google Sheets 새 시트 생성
 * 2. 도구 > Apps Script 열기
 * 3. 아래 코드 붙여넣기
 * 4. 배포 > 새 배포 > 웹 앱으로 배포
 * 5. 실행: 나(본인), 접근 권한: 모든 사람
 * 6. 배포 URL을 교사 대시보드에 입력
 */

function doPost(e) {
  try {
    const sheet = getOrCreateSheet("Students");
    
    // 헤더 설정 (첫 행이 비어있을 때)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "제출시각", "학생ID", "이름", "학년", "반", "번호",
        "선택인물", "법정역할", "퀴즈점수", "퀴즈합격",
        "재판완료", "진행턴수", "느낀점1", "느낀점2"
      ]);
      
      // 헤더 스타일링
      const headerRange = sheet.getRange(1, 1, 1, 14);
      headerRange.setBackground("#1A1A2E");
      headerRange.setFontColor("#C9A84C");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    
    const data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date(),
      data.studentId || "",
      data.name || "",
      data.grade || "",
      data.classNo || "",
      data.studentNo || "",
      data.person || "",
      data.role || "",
      data.score || 0,
      data.passed ? "합격" : "불합격",
      data.trialCompleted ? "완료" : "미완료",
      data.totalTurns || 0,
      data.reflection1 || "",
      data.reflection2 || "",
    ]);
    
    // 자동 열 너비 조정
    sheet.autoResizeColumns(1, 14);
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error(error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ 
      status: "ok",
      message: "AI 역사 모의 법정 Google Apps Script"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
