-- ============================================
-- 이미 배포된 DB에 전봉준 퀴즈 2문항 추가 (2026-09-30)
-- Neon SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 중복으로 들어가지 않습니다.
-- ============================================

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '전주 화약 이후 동학 농민군이 전라도 각 고을에 설치하여 개혁을 실천한 자치 기구는?',
  '["향약", "집강소", "서원", "의금부"]',
  1,
  '동학 농민군은 전주성을 점령한 뒤 정부와 전주 화약을 맺고, 전라도 각 고을에 집강소를 설치하여 탐관오리 처벌, 신분 차별 철폐 등 폐정 개혁을 스스로 실천하였다.'
FROM persons p
WHERE p.name = '전봉준'
  AND NOT EXISTS (SELECT 1 FROM quiz_items q WHERE q.question = '전주 화약 이후 동학 농민군이 전라도 각 고을에 설치하여 개혁을 실천한 자치 기구는?');

INSERT INTO quiz_items (id, person_id, question, choices, answer, explanation)
SELECT uuid_generate_v4(), p.id,
  '일본의 내정 간섭에 맞서 다시 일어난 동학 농민군이 일본군과 관군에게 크게 패한 전투는?',
  '["황토현 전투", "행주 대첩", "우금치 전투", "살수 대첩"]',
  2,
  '일본군이 경복궁을 점령하고 내정에 간섭하자 동학 농민군은 반외세를 내걸고 다시 일어났다(2차 봉기). 그러나 1894년 11월 공주 우금치에서 신식 무기를 갖춘 일본군과 관군에게 크게 패하였다. 황토현 전투는 1차 봉기 때 농민군이 승리한 전투이다.'
FROM persons p
WHERE p.name = '전봉준'
  AND NOT EXISTS (SELECT 1 FROM quiz_items q WHERE q.question = '일본의 내정 간섭에 맞서 다시 일어난 동학 농민군이 일본군과 관군에게 크게 패한 전투는?');

-- 확인: 전봉준 5문항이 나오면 성공
SELECT p.name, count(q.id) AS 퀴즈수
FROM persons p LEFT JOIN quiz_items q ON q.person_id = p.id
GROUP BY p.name;
