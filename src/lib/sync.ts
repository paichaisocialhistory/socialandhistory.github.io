/**
 * 여러 카메라로 찍은 영상의 시간 맞추기.
 *
 * 영상마다 녹화 시작 시각이 다르므로, 각 영상에 "킥오프가 이 영상의 몇 초
 * 지점인가"(sync_offset_seconds)를 기록해 두고 그것을 기준으로 변환한다.
 */

/** 영상 재생 위치(초) → 경기 시간(초). 킥오프가 0초다. */
export function toMatchTime(videoSeconds: number, offsetSeconds: number): number {
  return videoSeconds - offsetSeconds;
}

/** 경기 시간(초) → 그 경기를 찍은 다른 영상의 재생 위치(초). */
export function toVideoTime(matchSeconds: number, offsetSeconds: number): number {
  return matchSeconds + offsetSeconds;
}

/**
 * A 영상의 한 지점을 B 영상의 재생 위치로 옮긴다.
 * B 영상이 그 시점을 담고 있지 않으면(음수가 되면) null.
 */
export function translateBetweenVideos(
  videoSeconds: number,
  fromOffset: number,
  toOffset: number,
): number | null {
  const target = toVideoTime(toMatchTime(videoSeconds, fromOffset), toOffset);
  return target < 0 ? null : target;
}

/**
 * 경기 시간을 "전반 12:30" 형태로 표시한다.
 * halfLengthMinutes 는 한 경기의 전·후반 길이(중학교는 보통 30~35분).
 * 킥오프 전(음수)은 "경기 전"으로 둔다.
 */
export function formatMatchTime(matchSeconds: number, halfLengthMinutes = 35): string {
  if (matchSeconds < 0) return '경기 전';

  const halfLength = halfLengthMinutes * 60;
  const half = matchSeconds < halfLength ? 1 : 2;
  const within = half === 1 ? matchSeconds : matchSeconds - halfLength;

  const m = Math.floor(within / 60);
  const s = Math.floor(within % 60);
  return `${half === 1 ? '전반' : '후반'} ${m}:${String(s).padStart(2, '0')}`;
}

/** "2:00", "-15", "120" 같은 입력을 초로. 해석할 수 없으면 null. */
export function parseOffset(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const negative = trimmed.startsWith('-');
  const body = negative ? trimmed.slice(1) : trimmed;

  const parts = body.split(':');
  if (parts.length > 2) return null;

  let seconds = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    seconds = seconds * 60 + Number(part);
  }

  return negative ? -seconds : seconds;
}
