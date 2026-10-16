/**
 * 경기 영상 링크 해석.
 *
 * - YouTube(일부공개): 시점 재생과 구간 이동을 지원한다. 학생 화면에서 메모를 누르면
 *   해당 장면으로 바로 이동할 수 있다.
 * - 구글 드라이브: 기존에 등록한 영상을 계속 재생하기 위해 유지한다. 드라이브
 *   미리보기는 외부에서 재생 위치를 제어할 수 없어 시점 재생을 지원하지 않는다.
 */

export type VideoSource =
  | { kind: 'youtube'; id: string }
  | { kind: 'drive'; id: string };

export const VIDEO_SOURCE_LABEL: Record<VideoSource['kind'], string> = {
  youtube: 'YouTube',
  drive: '구글 드라이브',
};

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

/** YouTube 영상 ID는 11자이며 URL 안전 문자만 쓴다. */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function parseUrl(url: string): URL | null {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

function youtubeIdFrom(parsed: URL): string | null {
  const candidates: (string | null)[] = [parsed.searchParams.get('v')];

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (parsed.hostname.endsWith('youtu.be')) {
    candidates.push(segments[0] ?? null);
  }
  // /embed/ID, /live/ID, /shorts/ID
  const keyed = segments.findIndex((s) => ['embed', 'live', 'shorts', 'v'].includes(s));
  if (keyed >= 0) candidates.push(segments[keyed + 1] ?? null);

  for (const candidate of candidates) {
    if (candidate && YOUTUBE_ID.test(candidate)) return candidate;
  }
  return null;
}

function driveIdFrom(parsed: URL): string | null {
  const patterns = [/\/file\/d\/([A-Za-z0-9_-]+)/, /\/d\/([A-Za-z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = parsed.pathname.match(pattern);
    if (match) return match[1];
  }

  const id = parsed.searchParams.get('id');
  return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : null;
}

/** 지원하는 영상 링크를 해석한다. 해석할 수 없으면 null. */
export function parseVideoSource(url: string): VideoSource | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (YOUTUBE_HOSTS.has(parsed.hostname)) {
    const id = youtubeIdFrom(parsed);
    return id ? { kind: 'youtube', id } : null;
  }

  if (DRIVE_HOSTS.has(parsed.hostname)) {
    const id = driveIdFrom(parsed);
    return id ? { kind: 'drive', id } : null;
  }

  return null;
}

/** 시점 지정 재생이 가능한 소스인지. 드라이브는 불가능하다. */
export function supportsSeeking(source: VideoSource): boolean {
  return source.kind === 'youtube';
}

export type EmbedOptions = {
  /** 재생을 시작할 초. YouTube 에서만 반영된다. */
  startSeconds?: number;
  /** 재생 위치를 코드로 제어해야 하면 true (YouTube IFrame API 사용). */
  enableJsApi?: boolean;
  /** 브라우저 주소 (origin). enableJsApi 와 함께 쓸 때만 의미가 있다. */
  origin?: string;
};

/**
 * iframe 에 넣을 임베드 URL.
 *
 * YouTube 는 쿠키를 덜 남기는 youtube-nocookie.com 도메인을 쓴다. 미성년자가 보는
 * 화면이므로 추적 요소를 줄이기 위한 선택이다.
 */
export function toEmbedUrl(source: VideoSource, options: EmbedOptions = {}): string {
  if (source.kind === 'drive') {
    return `https://drive.google.com/file/d/${source.id}/preview`;
  }

  const params = new URLSearchParams();
  // 재생 종료 후 외부 영상 추천을 끈다.
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');

  if (options.startSeconds && options.startSeconds > 0) {
    params.set('start', String(Math.floor(options.startSeconds)));
  }
  if (options.enableJsApi) {
    params.set('enablejsapi', '1');
    if (options.origin) params.set('origin', options.origin);
  }

  return `https://www.youtube-nocookie.com/embed/${source.id}?${params.toString()}`;
}

/** 사람이 직접 열어 볼 원본 링크. */
export function toWatchUrl(source: VideoSource, startSeconds?: number): string {
  if (source.kind === 'drive') {
    return `https://drive.google.com/file/d/${source.id}/view`;
  }

  const suffix = startSeconds && startSeconds > 0 ? `&t=${Math.floor(startSeconds)}s` : '';
  return `https://www.youtube.com/watch?v=${source.id}${suffix}`;
}
