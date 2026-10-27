'use client';

import { useState } from 'react';
import { PitchBoard } from './pitch-board';

/**
 * 분석 메모를 남길 때 경기장에서 위치를 찍는 입력란.
 * 선택은 선택사항이다 — 찍지 않으면 좌표 없이 저장된다.
 */
export function PitchPositionField() {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  return (
    <div>
      <span className="label">위치 (선택)</span>
      <PitchBoard
        mode="pick"
        value={point}
        onChange={setPoint}
        caption={
          point
            ? '경기장을 다시 누르면 위치가 바뀝니다.'
            : '경기장을 누르면 그 지점이 메모 위치로 저장됩니다. 건너뛰어도 됩니다.'
        }
      />

      <input type="hidden" name="pitch_x" value={point?.x ?? ''} />
      <input type="hidden" name="pitch_y" value={point?.y ?? ''} />

      {point ? (
        <button
          type="button"
          onClick={() => setPoint(null)}
          className="btn-secondary mt-2 !px-2.5 !py-1 !text-xs"
        >
          위치 지우기
        </button>
      ) : null}
    </div>
  );
}
