-- ============================================
-- AI 역사 모의 법정 - DB 스키마
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 교사 테이블
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 학급 테이블
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_name VARCHAR(100) NOT NULL,
  class_code VARCHAR(50) UNIQUE NOT NULL,
  sheet_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 학생 테이블
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  grade INT NOT NULL,
  class_no INT NOT NULL,
  student_no INT NOT NULL,
  name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(class_id, grade, class_no, student_no)
);

-- 활동 진행 테이블
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  current_step INT DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  total_seconds INT DEFAULT 0,
  step_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 역사 인물 테이블
CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  period VARCHAR(100),
  summary TEXT,
  content JSONB DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 퀴즈 문항 테이블
CREATE TABLE quiz_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  choices JSONB NOT NULL,
  answer INT NOT NULL,
  explanation TEXT,
  difficulty INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 퀴즈 시도 테이블
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  person_id UUID REFERENCES persons(id),
  score INT DEFAULT 0,
  total_questions INT DEFAULT 0,
  passed BOOLEAN DEFAULT false,
  attempts INT DEFAULT 1,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 재판 세션 테이블
CREATE TABLE trials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  selected_person VARCHAR(50),
  selected_role VARCHAR(30),
  current_turn INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ongoing',
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- 재판 턴 테이블
CREATE TABLE trial_turns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trial_id UUID REFERENCES trials(id) ON DELETE CASCADE,
  turn_no INT NOT NULL,
  branch VARCHAR(1),
  approved BOOLEAN,
  reject_reason TEXT,
  student_message TEXT,
  system_messages JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 느낀점 테이블
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  reflection_1 TEXT,
  reflection_2 TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Google Sheet 동기화 로그
CREATE TABLE sheet_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INT DEFAULT 0,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_activities_student_id ON activities(student_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX idx_trials_student_id ON trials(student_id);
CREATE INDEX idx_trial_turns_trial_id ON trial_turns(trial_id);
CREATE INDEX idx_reflections_student_id ON reflections(student_id);
CREATE INDEX idx_sheet_logs_student_id ON sheet_logs(student_id);
CREATE INDEX idx_sheet_logs_status ON sheet_logs(status);
