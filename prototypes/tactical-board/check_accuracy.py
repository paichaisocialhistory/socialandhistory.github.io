"""
복원한 좌표가 실제로 맞는지 숫자로 잰다.

make_sample_clip.py 가 '진짜' 경기장 좌표를 알고 있으므로, tactical_board.py 가
화면에서 복원한 좌표와 비교해 미터 단위 오차를 낼 수 있다. 이 수치가 작아야
전술판을 믿을 수 있다.

주의: 여기서 재는 것은 '좌표 변환의 정확도'뿐이다. 실제 경기에서는 선수를
찾아내는 단계(검출·추적)에서 오차가 훨씬 크게 생긴다.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

TOLERANCE_M = 0.10  # 좌표 변환만 보는 단계이므로 10 cm 이내를 기준으로 둔다.


def main() -> int:
    out = Path(__file__).parent / "out"
    truth = json.loads((out / "ground_truth.json").read_text(encoding="utf-8"))["tracks"]
    got = json.loads((out / "tactical.json").read_text(encoding="utf-8"))["tracks"]

    if sorted(truth) != sorted(got):
        print(f"FAIL: 선수 목록이 다릅니다 {sorted(truth)} vs {sorted(got)}")
        return 1

    print(f"{'선수':<6}{'평균오차(m)':>12}{'최대오차(m)':>12}{'판정':>8}")
    print("-" * 40)

    all_errors = []
    failed = False

    for shirt in sorted(truth, key=int):
        a = np.array(truth[shirt], dtype=float)
        b = np.array(got[shirt], dtype=float)
        if a.shape != b.shape:
            print(f"FAIL: {shirt}번 프레임 수가 다릅니다 {a.shape} vs {b.shape}")
            return 1

        errors = np.linalg.norm(a - b, axis=1)
        all_errors.append(errors)
        ok = errors.max() <= TOLERANCE_M
        failed |= not ok
        print(f"{shirt:<6}{errors.mean():>12.4f}{errors.max():>12.4f}{'OK' if ok else 'FAIL':>8}")

    combined = np.concatenate(all_errors)
    print("-" * 40)
    print(f"{'전체':<6}{combined.mean():>12.4f}{combined.max():>12.4f}")
    print(f"\n측정 지점 {combined.size}개 (선수 {len(truth)}명 × 프레임 {len(truth[next(iter(truth))])}개)")

    if failed:
        print(f"\n=> 실패: 허용 오차 {TOLERANCE_M} m 를 넘는 지점이 있습니다.")
        return 1

    print(f"\n=> 통과: 모든 지점이 허용 오차 {TOLERANCE_M} m 이내입니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
