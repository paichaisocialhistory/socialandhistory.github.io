import { readFlag } from './env';

/**
 * 단계별 선택 기능 on/off.
 *
 * 서버 컴포넌트/서버 액션에서만 읽는다. 플래그를 끄면 관련 메뉴와 라우트가 노출되지
 * 않고(라우트는 404), 1단계 기능(팀/선수등록/경기/순위)은 그대로 동작한다.
 */
export type Features = {
  /** 2단계: 능력치 · 코치 메모 · 시즌 기록 + 승인 워크플로우 */
  playerAbilities: boolean;
  /** 3단계: 구글 드라이브 영상 연동 + 타임스탬프 분석 메모 */
  videos: boolean;
  /** 선수 데이터베이스를 로그인하지 않은 방문자에게도 공개할지 여부 */
  publicPlayerDirectory: boolean;
};

export function getFeatures(): Features {
  return {
    playerAbilities: readFlag(
      process.env.NEXT_PUBLIC_ENABLE_PLAYER_ABILITIES ?? process.env.ENABLE_PLAYER_ABILITIES,
      false,
    ),
    videos: readFlag(
      process.env.NEXT_PUBLIC_ENABLE_VIDEOS ?? process.env.ENABLE_VIDEOS,
      false,
    ),
    publicPlayerDirectory: readFlag(
      process.env.NEXT_PUBLIC_PUBLIC_PLAYER_DIRECTORY ?? process.env.PUBLIC_PLAYER_DIRECTORY,
      true,
    ),
  };
}
