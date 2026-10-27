'use client';

import { useId, useState } from 'react';
import { formatTimestamp } from '@/lib/format';

/**
 * 경기장 전술판.
 *
 * 좌표는 0~1 비율이다. x = 공격 방향(0 자기 진영 → 1 상대 진영),
 * y = 터치라인 사이(0 왼쪽 → 1 오른쪽). 경기장 선은 배경으로 물러나고
 * 데이터(메모 위치)만 눈에 들어오도록 그렸다.
 */

export type PitchMarker = {
  id: string;
  x: number;
  y: number;
  note: string;
  seconds?: number;
  byline?: string | null;
};

// 표준 경기장 비율 105 x 68 m
const W = 1050;
const H = 680;

function PitchLines() {
  const line = {
    fill: 'none',
    stroke: 'var(--pitch-line)',
    strokeWidth: 2,
  } as const;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--pitch-surface)" />
      <rect x={14} y={14} width={W - 28} height={H - 28} {...line} />
      <line x1={W / 2} y1={14} x2={W / 2} y2={H - 14} {...line} />
      <circle cx={W / 2} cy={H / 2} r={91} {...line} />
      <circle cx={W / 2} cy={H / 2} r={4} fill="var(--pitch-line)" />
      {/* 페널티 구역 */}
      <rect x={14} y={H / 2 - 201} width={165} height={402} {...line} />
      <rect x={W - 179} y={H / 2 - 201} width={165} height={402} {...line} />
      {/* 골 구역 */}
      <rect x={14} y={H / 2 - 92} width={55} height={184} {...line} />
      <rect x={W - 69} y={H / 2 - 92} width={55} height={184} {...line} />
      <circle cx={124} cy={H / 2} r={4} fill="var(--pitch-line)" />
      <circle cx={W - 124} cy={H / 2} r={4} fill="var(--pitch-line)" />
    </svg>
  );
}

export function PitchBoard({
  markers = [],
  mode = 'display',
  value,
  onChange,
  caption,
}: {
  markers?: PitchMarker[];
  mode?: 'display' | 'pick';
  value?: { x: number; y: number } | null;
  onChange?: (point: { x: number; y: number }) => void;
  caption?: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const titleId = useId();

  function handlePick(event: React.MouseEvent<HTMLButtonElement>) {
    if (mode !== 'pick' || !onChange) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    onChange({
      x: Math.min(1, Math.max(0, Number(x.toFixed(4)))),
      y: Math.min(1, Math.max(0, Number(y.toFixed(4)))),
    });
  }

  const activeMarker = markers.find((marker) => marker.id === active) ?? null;

  return (
    <figure className="viz-pitch m-0">
      <div
        className="relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: `${W} / ${H}`, borderColor: 'var(--pitch-line)' }}
      >
        <PitchLines />

        {mode === 'pick' ? (
          <button
            type="button"
            onClick={handlePick}
            className="absolute inset-0 h-full w-full cursor-crosshair"
            aria-label="경기장에서 위치를 선택하세요"
          />
        ) : null}

        {/* 선택한 위치 미리보기 */}
        {value ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${value.x * 100}%`,
              top: `${value.y * 100}%`,
              background: 'var(--viz-mark)',
              boxShadow: '0 0 0 2px var(--pitch-surface)',
            }}
          />
        ) : null}

        {markers.map((marker) => (
          <button
            key={marker.id}
            type="button"
            onMouseEnter={() => setActive(marker.id)}
            onMouseLeave={() => setActive((id) => (id === marker.id ? null : id))}
            onFocus={() => setActive(marker.id)}
            onBlur={() => setActive((id) => (id === marker.id ? null : id))}
            // 점 자체는 작게, 누르거나 가리키는 영역은 넉넉하게 둔다.
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
            aria-describedby={active === marker.id ? titleId : undefined}
          >
            <span
              className="block rounded-full transition-all"
              style={{
                width: active === marker.id ? 14 : 10,
                height: active === marker.id ? 14 : 10,
                background: 'var(--viz-mark)',
                boxShadow: '0 0 0 2px var(--pitch-surface)',
              }}
            />
            <span className="sr-only">
              {marker.seconds !== undefined ? `${formatTimestamp(marker.seconds)} ` : ''}
              {marker.note}
            </span>
          </button>
        ))}

        {activeMarker ? (
          <div
            id={titleId}
            role="tooltip"
            className="pointer-events-none absolute z-10 max-w-[14rem] -translate-x-1/2 rounded-md px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${Math.min(80, Math.max(20, activeMarker.x * 100))}%`,
              top: `calc(${activeMarker.y * 100}% + 1.25rem)`,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            {activeMarker.seconds !== undefined ? (
              <span className="font-mono font-semibold tabular-nums">
                {formatTimestamp(activeMarker.seconds)}
              </span>
            ) : null}
            <p className="mt-0.5">{activeMarker.note}</p>
            {activeMarker.byline ? <p className="muted mt-0.5">{activeMarker.byline}</p> : null}
          </div>
        ) : null}

        {/* 공격 방향 */}
        <span
          aria-hidden="true"
          className="muted pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] tracking-wide"
        >
          공격 방향 →
        </span>
      </div>

      {caption ? <figcaption className="muted mt-2 text-xs">{caption}</figcaption> : null}
    </figure>
  );
}
