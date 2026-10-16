/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer, type Cue } from './video-player';

const cues: Cue[] = [
  { id: 'a', seconds: 750, note: '좋은 침투', byline: '박 코치' },
  { id: 'b', seconds: 83, note: '수비 전환 늦음' },
];

/** YouTube IFrame API 를 흉내 낸다. 실제 유튜브 없이 클릭→이동 배선을 검증한다. */
function installFakeYouTube() {
  const seekTo = vi.fn();
  const playVideo = vi.fn();

  window.YT = {
    Player: class {
      seekTo = seekTo;
      playVideo = playVideo;
      destroy = vi.fn();
      constructor(_el: HTMLElement, options: { events?: { onReady?: () => void } }) {
        // 실제 API 도 비동기로 onReady 를 부른다.
        setTimeout(() => options.events?.onReady?.(), 0);
      }
    },
  } as unknown as typeof window.YT;

  return { seekTo, playVideo };
}

afterEach(() => {
  cleanup();
  delete window.YT;
});

describe('VideoPlayer — YouTube', () => {
  it('메모를 누르면 그 시점으로 이동해 재생한다', async () => {
    const { seekTo, playVideo } = installFakeYouTube();
    const user = userEvent.setup();

    render(<VideoPlayer source={{ kind: 'youtube', id: 'dQw4w9WgXcQ' }} title="1R" cues={cues} />);

    const button = (await screen.findByRole('button', {
      name: /12:30 장면으로 이동/,
    })) as HTMLButtonElement;

    // 플레이어가 준비되기 전에는 눌리지 않고, 준비되면 활성화된다.
    await vi.waitFor(() => expect(button.disabled).toBe(false));

    await user.click(button);

    expect(seekTo).toHaveBeenCalledWith(750, true);
    expect(playVideo).toHaveBeenCalled();
  });

  it('장면 시각을 mm:ss 로 보여 준다', async () => {
    installFakeYouTube();
    render(<VideoPlayer source={{ kind: 'youtube', id: 'dQw4w9WgXcQ' }} title="1R" cues={cues} />);

    expect(await screen.findByText('12:30')).toBeDefined();
    expect(screen.getByText('01:23')).toBeDefined();
    expect(screen.getByText('좋은 침투')).toBeDefined();
    expect(screen.getByText('박 코치')).toBeDefined();
  });

  it('메모가 없으면 안내 문구를 보여 준다', async () => {
    installFakeYouTube();
    render(
      <VideoPlayer
        source={{ kind: 'youtube', id: 'dQw4w9WgXcQ' }}
        title="1R"
        cues={[]}
        emptyMessage="아직 회원님 장면이 없습니다."
      />,
    );

    expect(await screen.findByText('아직 회원님 장면이 없습니다.')).toBeDefined();
  });
});

describe('VideoPlayer — 구글 드라이브', () => {
  it('시점 이동 대신 원본 링크를 열고, 제약을 안내한다', () => {
    render(<VideoPlayer source={{ kind: 'drive', id: 'ABC123' }} title="구영상" cues={cues} />);

    // 드라이브는 버튼이 아니라 새 창 링크로 렌더된다.
    expect(screen.queryByRole('button')).toBeNull();
    const link = screen.getAllByRole('link')[0] as HTMLAnchorElement;
    expect(link.href).toBe('https://drive.google.com/file/d/ABC123/view');
    expect(link.target).toBe('_blank');

    expect(screen.getByText(/특정 시점부터 재생하는 기능을 지원하지 않습니다/)).toBeDefined();
  });

  it('드라이브 미리보기 iframe 을 띄운다', () => {
    render(<VideoPlayer source={{ kind: 'drive', id: 'ABC123' }} title="구영상" cues={[]} />);
    const iframe = document.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('https://drive.google.com/file/d/ABC123/preview');
  });
});
