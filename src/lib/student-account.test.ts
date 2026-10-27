import { describe, expect, it } from 'vitest';
import {
  generatePassword,
  isStudentNo,
  studentEmail,
  toLoginEmail,
} from './student-account';

describe('학번 → 로그인 아이디', () => {
  it('학번에 도메인을 붙인다', () => {
    expect(studentEmail('2026-0001', 'students.invalid')).toBe('2026-0001@students.invalid');
  });

  it('학번의 공백과 대소문자를 정리한다', () => {
    expect(studentEmail('  2026-0001  ', 'students.invalid')).toBe('2026-0001@students.invalid');
    expect(studentEmail('2026-000A', 'students.invalid')).toBe('2026-000a@students.invalid');
  });

  it('학생이 학번을 넣으면 아이디로, 이메일을 넣으면 그대로 쓴다', () => {
    expect(toLoginEmail('2026-0001', 'students.invalid')).toBe('2026-0001@students.invalid');
    expect(toLoginEmail('teacher@school.kr', 'students.invalid')).toBe('teacher@school.kr');
    expect(toLoginEmail('  TEACHER@School.kr ', 'students.invalid')).toBe('teacher@school.kr');
  });
});

describe('isStudentNo', () => {
  it('2026-0001 형식만 학번으로 본다', () => {
    expect(isStudentNo('2026-0001')).toBe(true);
    expect(isStudentNo(' 2026-0001 ')).toBe(true);
    expect(isStudentNo('2026-1')).toBe(false);
    expect(isStudentNo('abcd-0001')).toBe(false);
    expect(isStudentNo('teacher@school.kr')).toBe(false);
  });
});

describe('generatePassword', () => {
  it('요청한 길이로 만든다', () => {
    expect(generatePassword(10)).toHaveLength(10);
    expect(generatePassword(16)).toHaveLength(16);
  });

  it('받아적기 어려운 글자(0 O 1 l i)를 쓰지 않는다', () => {
    const joined = Array.from({ length: 200 }, () => generatePassword(12)).join('');
    expect(joined).not.toMatch(/[01loiLOI]/);
  });

  it('매번 다른 값이 나온다', () => {
    const set = new Set(Array.from({ length: 100 }, () => generatePassword(10)));
    expect(set.size).toBe(100);
  });
});
