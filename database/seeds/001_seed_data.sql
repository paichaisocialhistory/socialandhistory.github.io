-- ============================================
-- 시드 데이터 - 역사 인물 및 퀴즈
-- ============================================

-- 테스트 교사
INSERT INTO teachers (id, email, password_hash, name) VALUES
(uuid_generate_v4(), 'teacher@school.kr', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMN0.OWJ3/BUEbUHFHJ4L2xdaO', '김선생');

-- 테스트 학급
INSERT INTO classes (id, teacher_id, class_name, class_code, settings)
SELECT 
  uuid_generate_v4(),
  id,
  '2학년 3반',
  'HIST2-0921',
  '{"maxStudents": 35, "trialTurns": 5}'
FROM teachers WHERE email = 'teacher@school.kr';

-- 역사 인물 데이터
INSERT INTO persons (id, name, category, period, summary, content, image_url) VALUES

-- 김옥균
(uuid_generate_v4(), '김옥균', '개화파', '조선 후기 (1851-1894)',
'조선 말기의 개화파 정치인으로 갑신정변을 주도하였다.',
'{
  "birth": "1851년",
  "death": "1894년",
  "achievements": ["갑신정변 주도 (1884)", "개화사상 보급", "근대 개혁 추진"],
  "background": "조선 말기 개화파의 핵심 인물로, 일본의 메이지유신을 모델로 조선의 근대화를 꿈꿨다. 1884년 갑신정변을 일으켰으나 3일 천하로 끝났고, 이후 일본으로 망명하였다. 1894년 상하이에서 홍종우에게 암살당했다.",
  "trial_context": "갑신정변의 정당성, 외세 의존 논란, 근대화 비전에 대한 재판",
  "roles": {
    "defendant": "개화파 지도자로서 조선의 근대화를 위해 불가피한 선택을 했다고 주장",
    "prosecutor": "외세(일본)를 끌어들여 국권을 위협한 반역자",
    "defender": "선진 문명을 도입하려 했던 진정한 애국자"
  }
}',
'/images/persons/kim-okgyun.jpg'),

-- 전봉준
(uuid_generate_v4(), '전봉준', '동학농민운동', '조선 후기 (1855-1895)',
'동학농민운동을 이끈 지도자로 녹두장군이라 불린다.',
'{
  "birth": "1855년",
  "death": "1895년",
  "achievements": ["동학농민운동 지도 (1894)", "반봉건·반외세 운동", "농민 권익 대변"],
  "background": "전라북도 고부군 출신으로, 동학 접주로 활동하다 고부민란을 시작으로 전국적 농민운동을 이끌었다. 탐관오리 척결, 신분제 폐지, 외세 배격을 주장하였다. 1895년 체포되어 처형되었다.",
  "trial_context": "농민봉기의 정당성, 외세와의 협력 논란, 사회 개혁의 방법론에 대한 재판",
  "roles": {
    "defendant": "민중의 고통을 해결하기 위한 정당한 봉기였다",
    "prosecutor": "사회 질서를 무너뜨린 반란의 주동자",
    "defender": "억압받는 민중을 위해 싸운 혁명가"
  }
}',
'/images/persons/jeon-bongjun.jpg'),

-- 안중근
(uuid_generate_v4(), '안중근', '독립운동', '조선/대한제국 (1879-1910)',
'이토 히로부미를 저격한 독립운동가로 동양평화론을 주창하였다.',
'{
  "birth": "1879년",
  "death": "1910년",
  "achievements": ["이토 히로부미 저격 (1909)", "동양평화론 저술", "대한의군 참모중장 활동"],
  "background": "황해도 해주 출신으로, 을사늑약 이후 독립운동에 투신하였다. 1909년 하얼빈 역에서 이토 히로부미를 저격하고 체포되어 뤼순 감옥에서 순국하였다. 미완성 유작 동양평화론을 남겼다.",
  "trial_context": "의거의 정당성, 동양평화론의 의미, 테러와 의거의 경계에 대한 재판",
  "roles": {
    "defendant": "국제법에 따라 전쟁 포로이며, 침략자를 처단한 의거였다",
    "prosecutor": "법적 절차 없이 살인을 저지른 테러리스트",
    "defender": "조국의 독립을 위해 목숨을 바친 진정한 영웅"
  }
}',
'/images/persons/ahn-junggeun.jpg'),

-- 명성황후
(uuid_generate_v4(), '명성황후', '왕실/외교', '조선/대한제국 (1851-1895)',
'조선 고종의 왕비로 아관파천을 주도하며 열강 외교를 펼쳤다.',
'{
  "birth": "1851년",
  "death": "1895년",
  "achievements": ["친러 외교 정책 추진", "아관파천 계획", "열강 견제 외교"],
  "background": "여흥 민씨 출신으로 고종의 왕비가 되어 조정의 실권을 장악하였다. 개화 정책과 열강 외교를 통해 조선의 자주성을 지키려 했으나, 1895년 일본 낭인들에 의해 경복궁에서 시해되었다(을미사변).",
  "trial_context": "열강 외교의 정당성, 민씨 세력의 권력 독점, 을미사변의 책임 소재에 대한 재판",
  "roles": {
    "defendant": "조선의 자주독립을 지키기 위한 불가피한 외교였다",
    "prosecutor": "민씨 일족의 권력 유지를 위해 국가를 이용했다",
    "defender": "여성으로서 혼란의 시대에 나라를 지키려 했던 지도자"
  }
}',
'/images/persons/queen-myeongseong.jpg');

-- 김옥균 퀴즈
INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation) 
SELECT 
  uuid_generate_v4(),
  p.id,
  '김옥균이 주도한 개화운동으로 1884년에 일어난 사건은?',
  '["동학농민운동", "갑신정변", "을미사변", "아관파천"]',
  1,
  '1884년 12월 4일 김옥균을 비롯한 급진 개화파가 일으킨 정변으로, 우정국 개국 축하연을 계기로 시작되었으나 청나라 군대의 개입으로 3일 만에 실패하였다.'
FROM persons p WHERE p.name = '김옥균';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '김옥균이 갑신정변에서 모델로 삼은 일본의 개혁은?',
  '["다이쇼 민주주의", "메이지유신", "쇼와 유신", "하쿠호 개혁"]',
  1,
  '메이지유신(1868)은 일본이 서구 문물을 받아들여 근대 국가로 발전한 개혁으로, 김옥균은 이를 모델로 조선의 근대화를 추진하고자 하였다.'
FROM persons p WHERE p.name = '김옥균';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '갑신정변이 실패한 주요 원인은?',
  '["조선 민중의 반대", "청나라 군대의 개입", "일본의 배신", "재정 부족"]',
  1,
  '갑신정변은 청나라 군대의 신속한 개입으로 3일 만에 진압되었다. 당시 조선에 주둔하고 있던 청나라 군대가 개화파 정권을 타도하는 데 결정적 역할을 하였다.'
FROM persons p WHERE p.name = '김옥균';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '김옥균의 갑신정변 14개조 개혁안에 포함된 내용이 아닌 것은?',
  '["문벌 폐지", "지조법 개혁", "청에 대한 사대 강화", "내각제 수립"]',
  2,
  '14개조 정강은 청에 대한 사대 관계 폐지를 주장하였다. 청나라에 대한 사대 강화는 오히려 반대되는 내용으로, 자주독립을 핵심 목표로 하였다.'
FROM persons p WHERE p.name = '김옥균';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '김옥균이 1894년 암살된 장소는?',
  '["도쿄", "오사카", "상하이", "베이징"]',
  2,
  '김옥균은 1894년 3월 중국 상하이(上海)의 동화양행에서 조선 정부가 보낸 자객 홍종우에게 암살되었다. 갑신정변 실패 후 일본으로 망명하여 10여 년을 보내다 상하이에서 생을 마감하였다.'
FROM persons p WHERE p.name = '김옥균';

-- 전봉준 퀴즈
INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '전봉준이 이끈 동학농민운동이 시작된 계기가 된 사건은?',
  '["임오군란", "고부민란", "갑신정변", "을미사변"]',
  1,
  '1894년 전라북도 고부군수 조병갑의 횡포에 항거하여 일어난 고부민란이 동학농민운동의 직접적인 발화점이 되었다. 조병갑은 만석보를 축조하여 농민을 수탈하였다.'
FROM persons p WHERE p.name = '전봉준';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '동학농민군이 전주화약에서 요구한 폐정개혁안에 포함된 내용은?',
  '["청나라와의 무역 확대", "노비제도 폐지", "서양 문물 도입", "왕권 강화"]',
  1,
  '전주화약의 폐정개혁안 12개조에는 노비문서 소각(노비제도 폐지), 칠반천인의 신분 차별 철폐 등 봉건적 신분제 폐지 요구가 포함되어 있었다.'
FROM persons p WHERE p.name = '전봉준';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '전봉준이 녹두장군이라는 별명을 얻은 이유는?',
  '["녹두를 즐겨 먹어서", "키가 작고 눈빛이 형형하여", "녹두 밭에서 태어나서", "녹두 장사를 해서"]',
  1,
  '전봉준은 키가 작고 눈빛이 날카롭고 형형하여 민중들이 녹두처럼 작지만 강하다고 하여 녹두장군이라 불렀다.'
FROM persons p WHERE p.name = '전봉준';

-- 안중근 퀴즈
INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '안중근이 이토 히로부미를 저격한 장소는?',
  '["뤼순", "하얼빈", "블라디보스토크", "연해주"]',
  1,
  '1909년 10월 26일 안중근은 중국 하얼빈 역에서 을사늑약을 강제한 이토 히로부미를 저격하였다. 이토 히로부미는 러시아 재무장관을 만나기 위해 하얼빈을 방문하던 중이었다.'
FROM persons p WHERE p.name = '안중근';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '안중근이 미완성으로 남긴 저서의 제목은?',
  '["독립론", "동양평화론", "항일투쟁론", "대한독립선언"]',
  1,
  '안중근은 뤼순 감옥에서 사형을 기다리며 동양평화론을 집필하였으나, 1910년 3월 26일 순국으로 인해 미완성으로 남겨졌다. 이 책에서 한·중·일 3국의 평화 협력을 주장하였다.'
FROM persons p WHERE p.name = '안중근';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '안중근이 의거 직전 서명한 단체의 이름은?',
  '["신민회", "독립협회", "단지동맹", "대한의군"]',
  2,
  '안중근은 1909년 함께 의거를 결의한 동지들과 손가락을 잘라 혈서로 단지동맹(斷指同盟)을 맺었다. 이는 조국 독립을 위해 목숨을 바치겠다는 결의를 다진 것이다.'
FROM persons p WHERE p.name = '안중근';
