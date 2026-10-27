import { describe, expect, it } from 'vitest';
import { parsePitchPoint, thirdOf, toMeters } from './pitch';

describe('parsePitchPoint', () => {
  it('둘 다 비어 있으면 위치 없이 저장한다', () => {
    expect(parsePitchPoint(null, null)).toBeNull();
  });

  it('한쪽만 오면 거부한다', () => {
    expect(parsePitchPoint('0.5', null)).toBe('invalid');
    expect(parsePitchPoint(null, '0.5')).toBe('invalid');
  });

  it('0~1 범위를 벗어나면 거부한다', () => {
    expect(parsePitchPoint('1.2', '0.5')).toBe('invalid');
    expect(parsePitchPoint('0.5', '-0.1')).toBe('invalid');
  });

  it('숫자가 아니면 거부한다', () => {
    expect(parsePitchPoint('가운데', '0.5')).toBe('invalid');
    expect(parsePitchPoint('NaN', '0.5')).toBe('invalid');
  });

  it('정상 좌표를 통과시킨다', () => {
    expect(parsePitchPoint('0.7321', '0.25')).toEqual({ x: 0.7321, y: 0.25 });
    expect(parsePitchPoint('0', '1')).toEqual({ x: 0, y: 1 });
  });
});

describe('toMeters', () => {
  it('표준 경기장 기준으로 환산한다', () => {
    expect(toMeters({ x: 1, y: 1 })).toEqual({ x: 105, y: 68 });
    expect(toMeters({ x: 0.5, y: 0.5 })).toEqual({ x: 52.5, y: 34 });
  });

  it('경기장 실측값을 넘기면 그 값을 쓴다', () => {
    expect(toMeters({ x: 1, y: 1 }, 90, 50)).toEqual({ x: 90, y: 50 });
  });
});

describe('thirdOf', () => {
  it('공격 방향 기준으로 구역을 나눈다', () => {
    expect(thirdOf({ x: 0.1, y: 0.5 })).toBe('수비 진영');
    expect(thirdOf({ x: 0.5, y: 0.5 })).toBe('중원');
    expect(thirdOf({ x: 0.9, y: 0.5 })).toBe('공격 진영');
  });
});
