import { describe, expect, it } from 'vitest';
import { parseVideoSource, supportsSeeking, toEmbedUrl, toWatchUrl } from './video-source';

describe('parseVideoSource — YouTube', () => {
  it('여러 형태의 링크에서 영상 ID를 찾는다', () => {
    const forms = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&feature=share',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ];

    for (const url of forms) {
      expect(parseVideoSource(url), url).toEqual({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    }
  });

  it('11자가 아닌 ID는 거부한다', () => {
    expect(parseVideoSource('https://www.youtube.com/watch?v=short')).toBeNull();
  });

  it('시점 재생을 지원한다', () => {
    expect(supportsSeeking({ kind: 'youtube', id: 'dQw4w9WgXcQ' })).toBe(true);
  });

  it('추적을 줄인 nocookie 도메인으로 임베드한다', () => {
    const url = toEmbedUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ' });
    expect(url.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?')).toBe(true);
    expect(url).toContain('rel=0');
  });

  it('시작 시점과 JS 제어 옵션을 반영한다', () => {
    const url = toEmbedUrl(
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
      { startSeconds: 750.7, enableJsApi: true, origin: 'https://league.example.kr' },
    );
    expect(url).toContain('start=750');
    expect(url).toContain('enablejsapi=1');
    expect(url).toContain('origin=https%3A%2F%2Fleague.example.kr');
  });

  it('0초나 음수는 start 를 붙이지 않는다', () => {
    expect(toEmbedUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ' }, { startSeconds: 0 })).not.toContain('start=');
    expect(toEmbedUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ' }, { startSeconds: -5 })).not.toContain('start=');
  });

  it('원본 보기 링크에 시점을 붙인다', () => {
    expect(toWatchUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ' }, 83)).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=83s',
    );
  });
});

describe('parseVideoSource — 구글 드라이브', () => {
  it('기존 공유 링크를 계속 해석한다', () => {
    expect(parseVideoSource('https://drive.google.com/file/d/ABC-123_x/view?usp=sharing')).toEqual({
      kind: 'drive',
      id: 'ABC-123_x',
    });
    expect(parseVideoSource('https://drive.google.com/open?id=ZZZ999')).toEqual({
      kind: 'drive',
      id: 'ZZZ999',
    });
  });

  it('시점 재생을 지원하지 않는다', () => {
    expect(supportsSeeking({ kind: 'drive', id: 'ABC' })).toBe(false);
  });

  it('시작 시점을 넘겨도 미리보기 URL 은 변하지 않는다', () => {
    expect(toEmbedUrl({ kind: 'drive', id: 'ABC' }, { startSeconds: 750 })).toBe(
      'https://drive.google.com/file/d/ABC/preview',
    );
  });
});

describe('parseVideoSource — 허용하지 않는 링크', () => {
  it('다른 도메인과 http 는 거부한다', () => {
    expect(parseVideoSource('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoSource('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoSource('그냥 문자열')).toBeNull();
    expect(parseVideoSource('')).toBeNull();
  });
});
