export type PitchPoint = { x: number; y: number };

/**
 * 폼에서 온 경기장 좌표를 해석한다.
 * - 둘 다 비어 있으면 null (위치 없이 저장)
 * - 하나만 있거나 0~1 밖이면 'invalid'
 */
export function parsePitchPoint(
  rawX: string | null,
  rawY: string | null,
): PitchPoint | null | 'invalid' {
  if (rawX === null && rawY === null) return null;
  if (rawX === null || rawY === null) return 'invalid';

  const x = Number(rawX);
  const y = Number(rawY);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'invalid';
  if (x < 0 || x > 1 || y < 0 || y > 1) return 'invalid';

  return { x, y };
}

/** 0~1 비율 좌표를 실제 경기장 미터로. 기본값은 표준 규격 105 x 68 m. */
export function toMeters(point: PitchPoint, length = 105, width = 68) {
  return { x: point.x * length, y: point.y * width };
}

/** 경기장을 세로 3등분(수비/중원/공격)한 구역 이름. */
export function thirdOf(point: PitchPoint): '수비 진영' | '중원' | '공격 진영' {
  if (point.x < 1 / 3) return '수비 진영';
  if (point.x < 2 / 3) return '중원';
  return '공격 진영';
}
