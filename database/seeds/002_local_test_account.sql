-- ============================================
-- 로컬 테스트 전용 교사 계정과 학급
-- 인터넷에 배포하는 DB에는 넣지 마세요.
-- (비밀번호 해시는 SECRET_KEY가 기본값일 때만 맞습니다)
-- ============================================

-- 테스트 교사
-- 비밀번호: password (HMAC-SHA256)
INSERT INTO teachers (id, email, password_hash, name) VALUES
(uuid_generate_v4(), 'teacher@school.kr', '4a5437e4d69bb64afd4ea98efc9d2d7d42fae52c22ec387aa0de4809096ce48d', '김선생');

-- 테스트 학급
INSERT INTO classes (id, teacher_id, class_name, class_code, settings)
SELECT 
  uuid_generate_v4(),
  id,
  '2학년 3반',
  'HIST2-0921',
  '{"maxStudents": 35, "trialTurns": 5}'
FROM teachers WHERE email = 'teacher@school.kr';
