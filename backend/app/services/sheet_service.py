"""
Google Sheets 연동 서비스
"""
import httpx
import json
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings


async def sync_to_google_sheet(
    sheet_url: str,
    student_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Google Apps Script 엔드포인트로 학생 데이터 전송
    """
    if not sheet_url:
        return {"success": False, "error": "Sheet URL not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                sheet_url,
                json={
                    "studentId": str(student_id),
                    "name": payload.get("name", ""),
                    "grade": payload.get("grade", 0),
                    "classNo": payload.get("classNo", 0),
                    "studentNo": payload.get("studentNo", 0),
                    "person": payload.get("person", ""),
                    "role": payload.get("role", ""),
                    "score": payload.get("score", 0),
                    "passed": payload.get("passed", False),
                    "trialCompleted": payload.get("trialCompleted", False),
                    "totalTurns": payload.get("totalTurns", 0),
                    "reflection1": payload.get("reflection1", ""),
                    "reflection2": payload.get("reflection2", ""),
                    "completedAt": datetime.now().isoformat(),
                },
            )
            
            if response.status_code == 200:
                result = response.json()
                return {"success": result.get("success", False)}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}"}
                
    except Exception as e:
        return {"success": False, "error": str(e)}


# Google Apps Script 코드 (참조용)
APPS_SCRIPT_CODE = """
// Google Apps Script - 학생 데이터 수신 및 시트 저장
function doPost(e) {
  try {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Students") || 
      SpreadsheetApp.getActiveSpreadsheet().insertSheet("Students");
    
    // 헤더 초기화
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "제출시각", "학생ID", "이름", "학년", "반", "번호",
        "선택인물", "역할", "퀴즈점수", "퀴즈합격", 
        "재판완료", "턴수", "느낀점1", "느낀점2"
      ]);
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
    
    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
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
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
"""
