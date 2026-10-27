import { describe, expect, it } from 'vitest';
import { parsePlayerList } from './player-import';

describe('parsePlayerList', () => {
  it('쉼표로 구분된 명단을 읽는다', () => {
    const { rows, errors } = parsePlayerList('1,3,7,김민준\n2,5,11,이서준');
    expect(errors).toHaveLength(0);
    expect(rows).toEqual([
      { line: 1, grade: '1', classNo: '3', number: '7', name: '김민준', position: null },
      { line: 2, grade: '2', classNo: '5', number: '11', name: '이서준', position: null },
    ]);
  });

  it('엑셀에서 복사한 탭 구분도 읽는다', () => {
    const { rows } = parsePlayerList('1\t3\t7\t김민준');
    expect(rows[0].name).toBe('김민준');
  });

  it('단위가 붙어 있어도 읽는다', () => {
    const { rows } = parsePlayerList('1학년 3반 7번 김민준');
    expect(rows[0]).toMatchObject({ grade: '1', classNo: '3', number: '7', name: '김민준' });
  });

  it('앞에 0이 붙은 숫자를 정리한다', () => {
    const { rows } = parsePlayerList('1,03,07,김민준');
    expect(rows[0]).toMatchObject({ classNo: '3', number: '7' });
  });

  it('제목 줄을 건너뛴다', () => {
    const { rows, errors } = parsePlayerList('학년,반,번호,이름\n1,3,7,김민준');
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
  });

  it('빈 줄을 무시한다', () => {
    const { rows } = parsePlayerList('1,3,7,김민준\n\n\n2,5,11,이서준\n');
    expect(rows).toHaveLength(2);
  });

  it('포지션을 받는다', () => {
    const { rows } = parsePlayerList('1,3,7,김민준,fw');
    expect(rows[0].position).toBe('FW');
  });

  it('모르는 포지션은 오류로 보고한다', () => {
    const { rows, errors } = parsePlayerList('1,3,7,김민준,스트라이커');
    expect(rows).toHaveLength(0);
    expect(errors[0].reason).toContain('스트라이커');
  });

  it('칸이 모자라면 오류로 보고하고 나머지는 계속 읽는다', () => {
    const { rows, errors } = parsePlayerList('1,3,김민준\n2,5,11,이서준');
    expect(rows).toHaveLength(1);
    expect(errors[0].line).toBe(1);
    expect(errors[0].reason).toContain('4개');
  });

  it('학년·반·번호가 숫자가 아니면 거른다', () => {
    const { errors } = parsePlayerList('일,삼,칠,김민준');
    expect(errors[0].reason).toContain('숫자');
  });

  it('같은 학년·반·번호가 겹치면 뒤엣것을 거른다', () => {
    const { rows, errors } = parsePlayerList('1,3,7,김민준\n1,3,7,다른이름');
    expect(rows).toHaveLength(1);
    expect(errors[0].line).toBe(2);
    expect(errors[0].reason).toContain('1번째 줄');
  });

  it('빈 입력은 빈 결과', () => {
    expect(parsePlayerList('')).toEqual({ rows: [], errors: [] });
  });
});
