import { describe, expect, it } from 'vitest';
import {
  formatMatchTime,
  parseOffset,
  toMatchTime,
  toVideoTime,
  translateBetweenVideos,
} from './sync';

describe('경기 시간 변환', () => {
  it('킥오프 전부터 녹화했으면 그만큼 빼서 경기 시간을 낸다', () => {
    // 킥오프 2분 전 녹화 시작 → 재생 12:30 은 경기 10:30
    expect(toMatchTime(750, 120)).toBe(630);
  });

  it('킥오프 뒤에 녹화를 시작했으면 오프셋이 음수다', () => {
    expect(toMatchTime(750, -30)).toBe(780);
  });

  it('경기 시간을 다시 재생 위치로 되돌린다', () => {
    expect(toVideoTime(toMatchTime(750, 120), 120)).toBe(750);
  });
});

describe('translateBetweenVideos', () => {
  it('A 영상의 한 지점을 B 영상 위치로 옮긴다', () => {
    // A: 킥오프가 120초 지점, B: 킥오프가 137초 지점 → 17초 차이
    expect(translateBetweenVideos(750, 120, 137)).toBe(767);
  });

  it('반대 방향으로도 같은 값이 나온다', () => {
    const inB = translateBetweenVideos(750, 120, 137)!;
    expect(translateBetweenVideos(inB, 137, 120)).toBe(750);
  });

  it('오프셋이 같으면 그대로다', () => {
    expect(translateBetweenVideos(750, 60, 60)).toBe(750);
  });

  it('B 영상이 그 시점을 담고 있지 않으면 null', () => {
    // B 는 킥오프 10초 뒤에야 녹화를 시작했는데, 경기 시작 전 장면을 옮기려는 경우
    expect(translateBetweenVideos(0, 300, -10)).toBeNull();
  });
});

describe('formatMatchTime', () => {
  it('전·후반으로 나눠 표시한다', () => {
    expect(formatMatchTime(630)).toBe('전반 10:30');
    expect(formatMatchTime(35 * 60)).toBe('후반 0:00');
    expect(formatMatchTime(35 * 60 + 125)).toBe('후반 2:05');
  });

  it('경기 길이를 바꾸면 전·후반 경계도 바뀐다', () => {
    expect(formatMatchTime(30 * 60, 30)).toBe('후반 0:00');
    expect(formatMatchTime(30 * 60, 35)).toBe('전반 30:00');
  });

  it('킥오프 전은 경기 전으로 표시한다', () => {
    expect(formatMatchTime(-5)).toBe('경기 전');
  });
});

describe('parseOffset', () => {
  it('분:초와 초를 모두 받는다', () => {
    expect(parseOffset('2:00')).toBe(120);
    expect(parseOffset('120')).toBe(120);
    expect(parseOffset('0:17')).toBe(17);
  });

  it('음수 오프셋을 받는다', () => {
    expect(parseOffset('-0:30')).toBe(-30);
    expect(parseOffset('-30')).toBe(-30);
  });

  it('해석할 수 없으면 null', () => {
    expect(parseOffset('')).toBeNull();
    expect(parseOffset('이분')).toBeNull();
    expect(parseOffset('1:2:3')).toBeNull();
  });
});
