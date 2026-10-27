"""
검증용 가짜 경기 영상을 만든다.

실제 경기 영상이 없어도 좌표 변환이 맞는지 확인할 수 있도록, 선수의 '진짜'
경기장 좌표를 우리가 정해 놓고 그것을 카메라 시점으로 투영해 그린다.
나중에 tactical_board.py 가 복원한 좌표와 이 진짜 값을 비교하면
오차를 숫자로 잴 수 있다.
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np

PITCH_L, PITCH_W = 105.0, 68.0  # 표준 경기장 (m)
FRAME_W, FRAME_H = 1280, 720
FPS = 25
SECONDS = 6


def camera_matrix() -> np.ndarray:
    """경기장 네 모서리를 관중석 높이에서 비스듬히 본 화면으로 보내는 행렬."""
    pitch_corners = np.float32(
        [[0, 0], [PITCH_L, 0], [PITCH_L, PITCH_W], [0, PITCH_W]]
    )
    # 원근 때문에 먼 쪽(위)이 좁고 가까운 쪽(아래)이 넓다.
    image_corners = np.float32(
        [[280, 180], [1010, 180], [1255, 660], [25, 660]]
    )
    return cv2.getPerspectiveTransform(pitch_corners, image_corners)


def project(points: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    pts = points.reshape(-1, 1, 2).astype(np.float32)
    return cv2.perspectiveTransform(pts, matrix).reshape(-1, 2)


def player_tracks() -> dict[str, np.ndarray]:
    """선수 5명의 경기장 좌표(미터) 궤적. 프레임마다 한 점."""
    frames = FPS * SECONDS
    t = np.linspace(0, 1, frames)

    return {
        # 오른쪽으로 전진하는 윙어
        "7": np.stack([20 + 70 * t, 12 + 6 * np.sin(6 * t)], axis=1),
        # 중앙을 지키는 미드필더
        "8": np.stack([48 + 10 * np.sin(3 * t), 34 + 8 * np.cos(3 * t)], axis=1),
        # 왼쪽 측면 수비
        "3": np.stack([25 + 18 * t, 56 - 4 * np.sin(4 * t)], axis=1),
        # 최전방 공격수
        "9": np.stack([70 + 25 * t, 30 + 14 * np.sin(5 * t)], axis=1),
        # 골키퍼
        "1": np.stack([6 + 2 * t, 34 + 2 * np.sin(2 * t)], axis=1),
    }


def draw_pitch_lines(frame: np.ndarray, matrix: np.ndarray) -> None:
    line = (205, 215, 205)

    def seg(a, b):
        pts = project(np.float32([a, b]), matrix).astype(int)
        cv2.line(frame, tuple(pts[0]), tuple(pts[1]), line, 2, cv2.LINE_AA)

    seg([0, 0], [PITCH_L, 0])
    seg([PITCH_L, 0], [PITCH_L, PITCH_W])
    seg([PITCH_L, PITCH_W], [0, PITCH_W])
    seg([0, PITCH_W], [0, 0])
    seg([PITCH_L / 2, 0], [PITCH_L / 2, PITCH_W])

    circle = np.float32(
        [
            [PITCH_L / 2 + 9.15 * np.cos(a), PITCH_W / 2 + 9.15 * np.sin(a)]
            for a in np.linspace(0, 2 * np.pi, 48)
        ]
    )
    cv2.polylines(frame, [project(circle, matrix).astype(np.int32)], True, line, 2, cv2.LINE_AA)


def main() -> None:
    out_dir = Path(__file__).parent / "out"
    out_dir.mkdir(exist_ok=True)

    matrix = camera_matrix()
    tracks = player_tracks()
    frames = FPS * SECONDS

    writer = cv2.VideoWriter(
        str(out_dir / "sample_match.mp4"),
        cv2.VideoWriter_fourcc(*"mp4v"),
        FPS,
        (FRAME_W, FRAME_H),
    )

    detections: list[dict] = []

    for i in range(frames):
        frame = np.full((FRAME_H, FRAME_W, 3), (62, 110, 70), np.uint8)
        draw_pitch_lines(frame, matrix)

        per_frame = {}
        for shirt, path in tracks.items():
            ground = path[i]
            # 선수는 발이 땅에 닿는다 — 발 위치를 투영해야 좌표가 맞는다.
            foot = project(ground.reshape(1, 2), matrix)[0]
            per_frame[shirt] = [float(foot[0]), float(foot[1])]

            colour = (60, 60, 230) if shirt != "1" else (40, 200, 240)
            cv2.circle(frame, (int(foot[0]), int(foot[1])), 7, colour, -1, cv2.LINE_AA)
            # 키를 가진 사람처럼 보이도록 발 위로 몸통을 세운다.
            cv2.line(
                frame,
                (int(foot[0]), int(foot[1])),
                (int(foot[0]), int(foot[1]) - 26),
                colour,
                5,
                cv2.LINE_AA,
            )

        detections.append({"frame": i, "players": per_frame})
        writer.write(frame)

    writer.release()

    # 진짜 좌표(정답지)와 화면 좌표(검출 결과인 척하는 입력)를 따로 저장한다.
    (out_dir / "ground_truth.json").write_text(
        json.dumps(
            {
                "pitch": {"length_m": PITCH_L, "width_m": PITCH_W},
                "tracks": {k: v.tolist() for k, v in tracks.items()},
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (out_dir / "detections.json").write_text(
        json.dumps({"fps": FPS, "frames": detections}, ensure_ascii=False), encoding="utf-8"
    )

    print(f"영상 저장: {out_dir / 'sample_match.mp4'} ({frames} 프레임)")
    print(f"선수 {len(tracks)}명, 정답 좌표와 화면 좌표 저장 완료")


if __name__ == "__main__":
    main()
