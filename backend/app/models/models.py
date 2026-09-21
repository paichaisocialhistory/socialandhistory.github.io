import uuid
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    name = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    classes = relationship("Class", back_populates="teacher")


class Class(Base):
    __tablename__ = "classes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"))
    class_name = Column(String(100), nullable=False)
    class_code = Column(String(50), unique=True, nullable=False)
    sheet_url = Column(Text)
    settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    teacher = relationship("Teacher", back_populates="classes")
    students = relationship("Student", back_populates="class_")


class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"))
    grade = Column(Integer, nullable=False)
    class_no = Column(Integer, nullable=False)
    student_no = Column(Integer, nullable=False)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    class_ = relationship("Class", back_populates="students")
    activity = relationship("Activity", back_populates="student", uselist=False)
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    trials = relationship("Trial", back_populates="student")
    reflection = relationship("Reflection", back_populates="student", uselist=False)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    current_step = Column(Integer, default=1)
    completed = Column(Boolean, default=False)
    total_seconds = Column(Integer, default=0)
    step_data = Column(JSONB, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    student = relationship("Student", back_populates="activity")


class Person(Base):
    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    category = Column(String(50))
    period = Column(String(100))
    summary = Column(Text)
    content = Column(JSONB, default={})
    image_url = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    quiz_items = relationship("QuizItem", back_populates="person")


class QuizItem(Base):
    __tablename__ = "quiz_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"))
    question = Column(Text, nullable=False)
    choices = Column(JSONB, nullable=False)
    answer = Column(Integer, nullable=False)
    explanation = Column(Text)
    difficulty = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())

    person = relationship("Person", back_populates="quiz_items")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id"))
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    passed = Column(Boolean, default=False)
    attempts = Column(Integer, default=1)
    answers = Column(JSONB, default=[])
    created_at = Column(DateTime, server_default=func.now())

    student = relationship("Student", back_populates="quiz_attempts")


class Trial(Base):
    __tablename__ = "trials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    selected_person = Column(String(50))
    selected_role = Column(String(30))
    current_turn = Column(Integer, default=0)
    status = Column(String(20), default="ongoing")
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime)

    student = relationship("Student", back_populates="trials")
    turns = relationship("TrialTurn", back_populates="trial")


class TrialTurn(Base):
    __tablename__ = "trial_turns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trial_id = Column(UUID(as_uuid=True), ForeignKey("trials.id"))
    turn_no = Column(Integer, nullable=False)
    branch = Column(String(1))
    approved = Column(Boolean)
    reject_reason = Column(Text)
    student_message = Column(Text)
    system_messages = Column(JSONB, default=[])
    created_at = Column(DateTime, server_default=func.now())

    trial = relationship("Trial", back_populates="turns")


class Reflection(Base):
    __tablename__ = "reflections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    reflection_1 = Column(Text)
    reflection_2 = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    student = relationship("Student", back_populates="reflection")


class SheetLog(Base):
    __tablename__ = "sheet_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True))
    status = Column(String(20), default="pending")
    retry_count = Column(Integer, default=0)
    payload = Column(JSONB)
    error_message = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    synced_at = Column(DateTime)
