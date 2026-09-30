from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime


# ---- Session / Student ----
class SessionCreate(BaseModel):
    classCode: str
    grade: int
    classNo: int
    studentNo: int
    name: str


class SessionResponse(BaseModel):
    sessionId: str
    studentId: str
    currentStep: int
    stepData: Dict[str, Any] = {}


# ---- Person ----
class PersonResponse(BaseModel):
    id: str
    name: str
    category: str
    period: str
    summary: str
    content: Dict[str, Any]
    image_url: Optional[str] = None

    class Config:
        from_attributes = True


class PersonSelect(BaseModel):
    studentId: str
    person: str


# ---- Quiz ----
class QuizItemResponse(BaseModel):
    id: str
    question: str
    choices: List[str]
    difficulty: int

    class Config:
        from_attributes = True


class QuizAnswer(BaseModel):
    questionId: str
    answer: int


class QuizSubmit(BaseModel):
    studentId: str
    answers: List[QuizAnswer]


class QuizResult(BaseModel):
    score: int
    total: int
    passed: bool
    results: List[Dict[str, Any]]
    attempts: int


# ---- Role ----
class RoleSelect(BaseModel):
    studentId: str
    role: str


# ---- Trial ----
class TrialStart(BaseModel):
    studentId: str
    person: str
    role: str


class TrialStartResponse(BaseModel):
    trialId: str
    person: str
    role: str
    minTurns: int
    maxTurns: int


class TrialTurnRequest(BaseModel):
    trialId: str
    turn: int
    message: str


class SpeakerMessage(BaseModel):
    speaker: str
    message: str


class CoachFeedback(BaseModel):
    good: str
    improve: str
    hint: str


class TrialVerdict(BaseModel):
    verdict: str
    strengths: str
    growth: str


class TrialTurnResponse(BaseModel):
    approved: bool
    branch: str
    rejectReason: Optional[str] = None
    feedback: Optional[CoachFeedback] = None
    responses: List[SpeakerMessage]
    currentTurn: int
    approvedTurns: int
    isFinished: bool
    verdict: Optional[TrialVerdict] = None


class TrialFinishRequest(BaseModel):
    trialId: str


class TrialFinishResponse(BaseModel):
    verdict: TrialVerdict
    currentTurn: int


# ---- Reflection ----
class ReflectionCreate(BaseModel):
    studentId: str
    reflection1: str
    reflection2: str


class ReflectionResponse(BaseModel):
    id: str
    reflection1: str
    reflection2: str
    sheetSynced: bool


# ---- Teacher Auth ----
class TeacherLogin(BaseModel):
    email: EmailStr
    password: str


class TeacherRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    teacher_id: str
    name: str


# ---- Teacher Dashboard ----
class ClassCreate(BaseModel):
    className: str
    classCode: str
    sheetUrl: Optional[str] = None
    settings: Optional[Dict[str, Any]] = {}


class ClassResponse(BaseModel):
    id: str
    className: str
    classCode: str
    sheetUrl: Optional[str]
    settings: Dict[str, Any]
    studentCount: int
    createdAt: str

    class Config:
        from_attributes = True


class StudentProgress(BaseModel):
    studentId: str
    name: str
    grade: int
    classNo: int
    studentNo: int
    currentStep: int
    completed: bool
    selectedPerson: Optional[str]
    selectedRole: Optional[str]
    quizScore: Optional[int]
    quizPassed: Optional[bool]
    totalSeconds: int
