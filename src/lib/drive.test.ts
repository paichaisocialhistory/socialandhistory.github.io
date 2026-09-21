import { describe, expect, it } from 'vitest';
import { extractDriveFileId, isDriveUrl, toDrivePreviewUrl } from './drive';
import { formatTimestamp, parseTimestamp } from './format';

describe('구글 드라이브 링크', () => {
  it('공유 링크에서 파일 ID를 뽑아낸다', () => {
    expect(extractDriveFileId('https://drive.google.com/file/d/ABC-123_x/view?usp=sharing')).toBe(
      'ABC-123_x',
    );
    expect(extractDriveFileId('https://drive.google.com/open?id=ZZZ999')).toBe('ZZZ999');
  });

  it('구글 드라이브 도메인만 허용한다', () => {
    expect(isDriveUrl('https://drive.google.com/file/d/abc/view')).toBe(true);
    expect(isDriveUrl('https://docs.google.com/file/d/abc/view')).toBe(true);
    expect(isDriveUrl('https://evil.example.com/file/d/abc/view')).toBe(false);
    expect(isDriveUrl('http://drive.google.com/file/d/abc/view')).toBe(false);
    expect(isDriveUrl('not a url')).toBe(false);
  });

  it('미리보기 임베드 URL로 바꾼다', () => {
    expect(toDrivePreviewUrl('https://drive.google.com/file/d/abc/view?usp=sharing')).toBe(
      'https://drive.google.com/file/d/abc/preview',
    );
    expect(toDrivePreviewUrl('https://example.com/video.mp4')).toBeNull();
  });
});

describe('타임스탬프', () => {
  it('초를 mm:ss 로 표시한다', () => {
    expect(formatTimestamp(0)).toBe('00:00');
    expect(formatTimestamp(83)).toBe('01:23');
    expect(formatTimestamp(3723)).toBe('1:02:03');
  });

  it('입력 문자열을 초로 바꾼다', () => {
    expect(parseTimestamp('83')).toBe(83);
    expect(parseTimestamp('1:23')).toBe(83);
    expect(parseTimestamp('1:02:03')).toBe(3723);
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('')).toBeNull();
  });
});
