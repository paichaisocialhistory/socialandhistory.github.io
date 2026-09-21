/**
 * 구글 드라이브 공유 링크를 iframe 임베드용 미리보기 URL 로 바꾼다.
 * 파일은 DB 에 저장하지 않고 링크만 다루므로, 여기서 도메인도 함께 검증한다.
 */

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

export function extractDriveFileId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]+)/,
    /[?&]id=([A-Za-z0-9_-]+)/,
    /\/d\/([A-Za-z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isDriveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && DRIVE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/** 임베드 가능한 미리보기 URL. 링크를 해석할 수 없으면 null. */
export function toDrivePreviewUrl(url: string): string | null {
  if (!isDriveUrl(url)) return null;
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}
