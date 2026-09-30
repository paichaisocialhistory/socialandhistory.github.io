"""
Google Sheets 연동 서비스
교사가 만든 Google Apps Script 웹 앱(scripts/google_apps_script.js)으로 학생 결과를 보낸다.
"""
import re
import httpx
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Student, Class, Activity, QuizAttempt, Trial, TrialTurn, Reflection

APPS_SCRIPT_URL_PATTERN = re.compile(r"^https://script\.google\.com/macros/s/[\w-]+/exec$")

# 시트 한 칸에 넣을 수 있는 글자 수는 50,000자
MAX_CELL_CHARS = 45000


def _transcript(role: str, turns: list[TrialTurn]) -> str:
    """재판 기록을 시트 한 칸에 넣을 글로 만든다."""
    lines = []
    for t in turns:
        mark = "" if t.approved else f" (인정되지 않음: {t.reject_reason or ''})"
        lines.append(f"[{t.turn_no}] 학생({role}): {t.student_message}{mark}")
        sm = t.system_messages or []
        responses = sm.get("responses", []) if isinstance(sm, dict) else sm
        for r in responses:
            lines.append(f"    {r.get('speaker')}: {r.get('message')}")
    text = "\n".join(lines)
    if len(text) > MAX_CELL_CHARS:
        text = text[:MAX_CELL_CHARS] + "\n...(이하 생략)"
    return text


async def build_sheet_payload(db: AsyncSession, student: Student) -> Dict[str, Any]:
    """학생 한 명의 활동 결과를 모아 시트로 보낼 데이터를 만든다."""
    class_ = (await db.execute(
        select(Class).where(Class.id == student.class_id)
    )).scalar_one_or_none()
    activity = (await db.execute(
        select(Activity).where(Activity.student_id == student.id)
    )).scalar_one_or_none()
    latest_quiz = (await db.execute(
        select(QuizAttempt).where(QuizAttempt.student_id == student.id)
        .order_by(QuizAttempt.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    latest_trial = (await db.execute(
        select(Trial).where(Trial.student_id == student.id)
        .order_by(Trial.started_at.desc()).limit(1)
    )).scalar_one_or_none()
    reflection = (await db.execute(
        select(Reflection).where(Reflection.student_id == student.id)
    )).scalar_one_or_none()

    turns: list[TrialTurn] = []
    if latest_trial:
        turns = list((await db.execute(
            select(TrialTurn).where(TrialTurn.trial_id == latest_trial.id)
            .order_by(TrialTurn.turn_no)
        )).scalars().all())

    step_data = (activity.step_data or {}) if activity else {}
    verdict = step_data.get("verdict") or {}

    return {
        "studentId": str(student.id),
        "className": class_.class_name if class_ else "",
        "classCode": class_.class_code if class_ else "",
        "name": student.name,
        "grade": student.grade,
        "classNo": student.class_no,
        "studentNo": student.student_no,
        "person": step_data.get("selectedPerson", ""),
        "role": latest_trial.selected_role if latest_trial else "",
        "score": latest_quiz.score if latest_quiz else 0,
        "totalQuestions": latest_quiz.total_questions if latest_quiz else 0,
        "passed": latest_quiz.passed if latest_quiz else False,
        "trialCompleted": latest_trial.status == "completed" if latest_trial else False,
        "totalTurns": len(turns),
        "approvedTurns": sum(1 for t in turns if t.approved),
        "verdict": verdict.get("verdict", ""),
        "strengths": verdict.get("strengths", ""),
        "growth": verdict.get("growth", ""),
        "transcript": _transcript(latest_trial.selected_role, turns) if latest_trial else "",
        "reflection1": reflection.reflection_1 if reflection else "",
        "reflection2": reflection.reflection_2 if reflection else "",
        "completedAt": datetime.now().isoformat(timespec="seconds"),
    }


def _read_script_response(response: httpx.Response) -> Dict[str, Any]:
    """Apps Script 응답을 해석한다. 권한 설정이 틀리면 JSON 대신 로그인 화면(HTML)이 온다."""
    if response.status_code != 200:
        return {"success": False, "error": f"Apps Script가 HTTP {response.status_code}을 돌려주었습니다."}
    try:
        return response.json()
    except ValueError:
        return {
            "success": False,
            "error": "Apps Script가 JSON이 아닌 응답을 보냈습니다. 배포할 때 '액세스 권한이 있는 사용자'를 '모든 사용자'로 했는지 확인하세요.",
        }


async def check_sheet_url(sheet_url: str) -> Optional[str]:
    """시트 주소가 올바른 Apps Script 웹 앱인지 확인한다. 문제가 없으면 None, 있으면 이유를 돌려준다."""
    if not APPS_SCRIPT_URL_PATTERN.match(sheet_url):
        return "주소 형식이 올바르지 않습니다. 'https://script.google.com/macros/s/…/exec' 형태의 웹 앱 URL을 붙여넣으세요."
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            result = _read_script_response(await client.get(sheet_url))
    except httpx.HTTPError as e:
        return f"Apps Script에 연결하지 못했습니다: {e}"
    if result.get("status") != "ok":
        return result.get("error") or "Apps Script 응답이 예상과 다릅니다. 최신 코드를 붙여넣고 새로 배포했는지 확인하세요."
    return None


async def sync_to_google_sheet(sheet_url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Google Apps Script 웹 앱으로 학생 결과를 보낸다.
    Apps Script는 POST를 받은 뒤 결과 주소로 302 이동시키므로 이동을 따라가야 한다.
    """
    if not sheet_url:
        return {"success": False, "error": "시트 주소가 설정되지 않았습니다."}
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            result = _read_script_response(await client.post(sheet_url, json=payload))
    except httpx.HTTPError as e:
        return {"success": False, "error": f"Apps Script에 연결하지 못했습니다: {e}"}
    if result.get("success"):
        return {"success": True}
    return {"success": False, "error": result.get("error", "알 수 없는 오류")}
