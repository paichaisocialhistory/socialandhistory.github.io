-- ============================================
-- 시드 데이터 - 역사 인물 및 퀴즈
-- ============================================

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

-- 최익현
(uuid_generate_v4(), '최익현', '위정척사/의병', '조선 후기~대한제국 (1833-1906)',
'위정척사파 유학자로 개항과 단발령에 반대하고, 을사늑약 이후 의병을 일으켰다.',
'{
  "birth": "1833년",
  "death": "1906년",
  "achievements": ["흥선대원군 비판 상소 (1873)", "강화도 조약 반대 도끼 상소 (1876)", "단발령 반대 (1895)", "을사의병 봉기 (1906)"],
  "background": "호는 면암이며, 이항로의 제자로 위정척사 사상을 이어받았다. 1873년 흥선대원군을 비판하는 상소를 올려 대원군이 물러나는 계기를 만들었다. 1876년 도끼를 들고 궁궐 앞에 엎드려 강화도 조약 체결에 반대하다 흑산도로 유배되었고, 1895년에는 단발령에 반대하였다. 1905년 을사늑약이 체결되자 이듬해 전라북도 태인에서 의병을 일으켰으나, 같은 동포인 진위대와 싸울 수 없다며 스스로 해산하였다. 체포되어 대마도(쓰시마)로 끌려갔고 그곳에서 세상을 떠났다.",
  "trial_context": "위정척사 사상의 정당성, 개항과 근대화 반대의 책임, 의병 항쟁의 의미에 대한 재판",
  "roles": {
    "defendant": "외세의 침략에 맞서 나라의 자주와 전통을 지키려 한 정당한 저항이었다",
    "prosecutor": "시대의 변화를 거부하고 개항과 근대화를 가로막은 완고한 보수주의자",
    "defender": "목숨을 걸고 끝까지 국권을 지키려 한 선비이자 의병장"
  }
}',
'/images/persons/choi-ikhyeon.jpg');

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

-- 최익현 퀴즈
INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '최익현이 1876년 도끼를 들고 궁궐 앞에 엎드려 체결에 반대한 조약은?',
  '["강화도 조약", "을사늑약", "제물포 조약", "한일 병합 조약"]',
  0,
  '1876년 일본과 강화도 조약(조일수호조규)을 맺으려 하자, 최익현은 도끼를 들고 궁궐 앞에 엎드려 받아들이지 않으려면 자신의 목을 치라며 반대 상소를 올렸다. 이 일로 흑산도에 유배되었다.'
FROM persons p WHERE p.name = '최익현';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '최익현이 이어받은, 성리학 질서를 지키고 서양 문물을 배척하자는 사상은?',
  '["개화사상", "동학", "위정척사 사상", "실학"]',
  2,
  '위정척사(衛正斥邪)는 바른 것(성리학 질서)을 지키고 사악한 것(서양 문물과 천주교)을 물리친다는 뜻이다. 최익현은 스승 이항로의 뒤를 이은 위정척사파의 대표 인물이다.'
FROM persons p WHERE p.name = '최익현';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '1873년 최익현의 상소를 계기로 권력에서 물러난 인물은?',
  '["김옥균", "흥선대원군", "전봉준", "고종"]',
  1,
  '최익현은 1873년 흥선대원군의 정책을 비판하는 상소를 올렸고, 이를 계기로 흥선대원군이 물러나고 고종이 직접 나라를 다스리게 되었다.'
FROM persons p WHERE p.name = '최익현';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '1905년 을사늑약이 체결된 뒤 최익현이 한 일은?',
  '["갑신정변을 일으켰다", "독립협회를 만들었다", "일본으로 망명하였다", "의병을 일으켰다"]',
  3,
  '을사늑약으로 외교권을 빼앗기자, 최익현은 70이 넘은 나이에 1906년 전라북도 태인에서 의병을 일으켰다. 이를 을사의병이라고 한다.'
FROM persons p WHERE p.name = '최익현';

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '의병 활동 중 체포된 최익현이 끌려가 세상을 떠난 곳은?',
  '["흑산도", "상하이", "대마도(쓰시마)", "뤼순"]',
  2,
  '최익현은 체포된 뒤 일본 대마도(쓰시마)로 끌려갔고, 1906년 그곳에서 세상을 떠났다.'
FROM persons p WHERE p.name = '최익현';
