"""
전술판 변환: 카메라 화면 좌표 → 위에서 내려다본 경기장 좌표.

쓰는 기술은 호모그래피 하나다. 경기장은 평면이므로, 화면에서 경기장 네 모서리를
한 번만 찍어 주면 화면의 어떤 점이든 경기장 좌표(미터)로 바꿀 수 있다.
동작 인식도, 학습도 필요 없다.

입력: detections.json  (프레임별 선수 발 위치, 화면 픽셀 좌표)
출력: tactical.json    (프레임별 선수 위치, 경기장 미터 좌표)
      top_down.png     (전술판 그림)
      overlay.png      (원본 화면에 보정점을 표시한 그림)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

PITCH_L, PITCH_W = 105.0, 68.0

# 경기장 네 모서리를 화면에서 찍은 좌표.
# 운영에서는 교사가 화면을 네 번 클릭해 만든다. 카메라가 고정이면 한 번만 하면 된다.
DEFAULT_CALIBRATION = [
    [280.0, 180.0],   # 왼쪽 위  (자기 진영 왼쪽 코너)
    [1010.0, 180.0],  # 오른쪽 위
    [1255.0, 660.0],  # 오른쪽 아래
    [25.0, 660.0],    # 왼쪽 아래
]


def build_homography(image_corners: list[list[float]]) -> np.ndarray:
    """화면 네 점 → 경기장 네 모서리(미터)로 보내는 행렬."""
    src = np.float32(image_corners)
    dst = np.float32([[0, 0], [PITCH_L, 0], [PITCH_L, PITCH_W], [0, PITCH_W]])
    return cv2.getPerspectiveTransform(src, dst)


def to_pitch(points: np.ndarray, homography: np.ndarray) -> np.ndarray:
    pts = points.reshape(-1, 1, 2).astype(np.float32)
    return cv2.perspectiveTransform(pts, homography).reshape(-1, 2)


def draw_top_down(tracks: dict[str, list[list[float]]], path: Path) -> None:
    """전술판 그림. 선은 배경으로 물러나고 선수 궤적만 눈에 들어오게."""
    scale = 9  # 1 m = 9 px
    margin = 30
    w, h = int(PITCH_L * scale) + margin * 2, int(PITCH_W * scale) + margin * 2
    img = np.full((h, w, 3), 251, np.uint8)

    line = (214, 216, 220)

    def m2px(x: float, y: float) -> tuple[int, int]:
        return int(margin + x * scale), int(margin + y * scale)

    cv2.rectangle(img, m2px(0, 0), m2px(PITCH_L, PITCH_W), line, 2)
    cv2.line(img, m2px(PITCH_L / 2, 0), m2px(PITCH_L / 2, PITCH_W), line, 2)
    cv2.circle(img, m2px(PITCH_L / 2, PITCH_W / 2), int(9.15 * scale), line, 2)
    cv2.rectangle(img, m2px(0, 13.85), m2px(16.5, 54.15), line, 2)
    cv2.rectangle(img, m2px(PITCH_L - 16.5, 13.85), m2px(PITCH_L, 54.15), line, 2)

    mark = (214, 120, 42)  # 데이터 색 (BGR) — 웹 전술판과 같은 파랑 계열
    for shirt, path_pts in tracks.items():
        pts = np.array([m2px(x, y) for x, y in path_pts], np.int32)
        cv2.polylines(img, [pts], False, mark, 2, cv2.LINE_AA)
        # 궤적 끝 = 마지막 위치
        cv2.circle(img, tuple(pts[-1]), 7, mark, -1, cv2.LINE_AA)
        cv2.circle(img, tuple(pts[-1]), 7, (251, 251, 251), 2, cv2.LINE_AA)
        cv2.putText(
            img, shirt, (pts[-1][0] + 11, pts[-1][1] + 5),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (40, 40, 40), 2, cv2.LINE_AA,
        )

    cv2.imwrite(str(path), img)


def draw_overlay(video: Path, corners: list[list[float]], path: Path) -> None:
    """보정점이 경기장 모서리에 제대로 찍혔는지 눈으로 확인하는 그림."""
    cap = cv2.VideoCapture(str(video))
    ok, frame = cap.read()
    cap.release()
    if not ok:
        return

    pts = np.int32(corners)
    cv2.polylines(frame, [pts], True, (60, 200, 255), 2, cv2.LINE_AA)
    for i, (x, y) in enumerate(pts):
        cv2.circle(frame, (int(x), int(y)), 9, (60, 200, 255), -1, cv2.LINE_AA)
        cv2.putText(
            frame, str(i + 1), (int(x) + 12, int(y) - 8),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (60, 200, 255), 2, cv2.LINE_AA,
        )
    cv2.imwrite(str(path), frame)


def main() -> None:
    here = Path(__file__).parent
    parser = argparse.ArgumentParser()
    parser.add_argument("--detections", type=Path, default=here / "out" / "detections.json")
    parser.add_argument("--video", type=Path, default=here / "out" / "sample_match.mp4")
    parser.add_argument("--out", type=Path, default=here / "out")
    args = parser.parse_args()

    data = json.loads(args.detections.read_text(encoding="utf-8"))
    homography = build_homography(DEFAULT_CALIBRATION)

    tracks: dict[str, list[list[float]]] = {}
    for frame in data["frames"]:
        for shirt, (px, py) in frame["players"].items():
            x, y = to_pitch(np.float32([[px, py]]), homography)[0]
            tracks.setdefault(shirt, []).append([round(float(x), 3), round(float(y), 3)])

    args.out.mkdir(exist_ok=True)
    (args.out / "tactical.json").write_text(
        json.dumps(
            {"units": "meters", "pitch": {"length": PITCH_L, "width": PITCH_W}, "tracks": tracks},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    draw_top_down(tracks, args.out / "top_down.png")
    draw_overlay(args.video, DEFAULT_CALIBRATION, args.out / "overlay.png")

    print(f"선수 {len(tracks)}명, 프레임 {len(data['frames'])}개 변환 완료")
    print(f"  {args.out / 'tactical.json'}")
    print(f"  {args.out / 'top_down.png'}")
    print(f"  {args.out / 'overlay.png'}")


if __name__ == "__main__":
    main()
