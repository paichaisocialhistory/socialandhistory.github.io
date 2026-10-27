"""
보정 오차가 결과에 얼마나 번지는지 잰다.

check_accuracy.py 의 오차가 0 에 가까운 것은 경기장 모서리를 픽셀 단위로 정확히
알고 있기 때문이다. 실제로는 교사가 화면을 손으로 클릭하므로 몇 픽셀씩 틀린다.
여기서는 네 모서리를 일부러 흔들어서, 클릭 오차가 경기장 좌표에서 몇 미터로
나타나는지 본다. 이 수치가 전술판을 실제로 쓸 수 있는지를 가른다.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from tactical_board import DEFAULT_CALIBRATION, build_homography, to_pitch


def main() -> None:
    out = Path(__file__).parent / "out"
    truth = json.loads((out / "ground_truth.json").read_text(encoding="utf-8"))["tracks"]
    detections = json.loads((out / "detections.json").read_text(encoding="utf-8"))["frames"]

    rng = np.random.default_rng(42)
    print(f"{'클릭오차(px)':>14}{'평균(m)':>10}{'중앙값(m)':>11}{'최악(m)':>10}")
    print("-" * 45)

    for jitter in (0, 2, 5, 10, 20):
        runs = []
        for _ in range(30):
            corners = (
                np.float32(DEFAULT_CALIBRATION)
                + rng.normal(0, jitter, (4, 2)).astype(np.float32)
            )
            homography = build_homography(corners.tolist())

            errors = []
            for frame in detections:
                for shirt, (px, py) in frame["players"].items():
                    got = to_pitch(np.float32([[px, py]]), homography)[0]
                    want = truth[shirt][frame["frame"]]
                    errors.append(float(np.hypot(got[0] - want[0], got[1] - want[1])))
            runs.append(errors)

        flat = np.concatenate(runs)
        print(f"{jitter:>14}{flat.mean():>10.2f}{np.median(flat):>11.2f}{flat.max():>10.2f}")

    print("\n해석: 경기장 길이가 105 m 이므로, 오차 1~2 m 는 전술 판단에 무리가 없고")
    print("      5 m 를 넘으면 구역(수비/중원/공격) 판단이 흔들리기 시작한다.")


if __name__ == "__main__":
    main()
