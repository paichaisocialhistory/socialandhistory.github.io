'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { formatTimestamp } from '@/lib/format';
import { toEmbedUrl, toWatchUrl, type VideoSource } from '@/lib/video-source';

/** 클릭하면 이동할 장면 하나. */
export type Cue = {
  id: string;
  seconds: number;
  note: string;
  byline?: string | null;
};

type YouTubePlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  destroy: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      host?: string;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = 'https://www.youtube.com/iframe_api';

/** YouTube IFrame API 를 한 번만 불러온다. */
function useYouTubeApi(enabled: boolean) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (window.YT?.Player) {
      setReady(true);
      return;
    }

    let cancelled = false;
    // API 준비 신호는 전역 콜백으로만 온다. 폴링으로 받아 중복 등록을 피한다.
    const timer = window.setInterval(() => {
      if (window.YT?.Player && !cancelled) {
        window.clearInterval(timer);
        setReady(true);
      }
    }, 100);

    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = API_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return ready;
}

export function VideoPlayer({
  source,
  title,
  cues,
  startSeconds = 0,
  emptyMessage = '아직 분석 메모가 없습니다.',
}: {
  source: VideoSource;
  title: string;
  cues: Cue[];
  startSeconds?: number;
  emptyMessage?: string;
}) {
  const isYouTube = source.kind === 'youtube';
  const apiReady = useYouTubeApi(isYouTube);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [activeCue, setActiveCue] = useState<string | null>(null);

  useEffect(() => {
    if (!isYouTube || !apiReady || !mountRef.current || playerRef.current) return;

    playerRef.current = new window.YT!.Player(mountRef.current, {
      host: 'https://www.youtube-nocookie.com',
      videoId: source.id,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        start: Math.floor(startSeconds),
      },
      events: { onReady: () => setPlayerReady(true) },
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
    };
  }, [isYouTube, apiReady, source.id, startSeconds]);

  const jumpTo = useCallback((cue: Cue) => {
    setActiveCue(cue.id);
    const player = playerRef.current;
    if (!player) return;
    player.seekTo(cue.seconds, true);
    player.playVideo();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div>
        <div
          className="relative w-full overflow-hidden rounded-lg bg-black"
          style={{ aspectRatio: '16 / 9' }}
        >
          {isYouTube ? (
            <div ref={mountRef} className="absolute inset-0 h-full w-full" />
          ) : (
            <iframe
              src={toEmbedUrl(source, { startSeconds })}
              title={title}
              allow="autoplay"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          )}
        </div>

        {!isYouTube ? (
          <p className="muted mt-2 text-xs leading-relaxed">
            구글 드라이브 영상은 특정 시점부터 재생하는 기능을 지원하지 않습니다. 아래 메모의
            시각을 보고 직접 이동해 주세요. 장면 바로가기가 필요하면 영상을 YouTube 일부공개로
            올린 뒤 다시 등록하세요.
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          장면 바로가기
          {cues.length > 0 ? <span className="muted font-normal"> · {cues.length}건</span> : null}
        </h3>

        {cues.length === 0 ? (
          <p className="muted py-6 text-center text-sm">{emptyMessage}</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {cues.map((cue) => {
              const isActive = activeCue === cue.id;
              const content = (
                <>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-pitch-600 dark:text-pitch-200">
                    {formatTimestamp(cue.seconds)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">{cue.note}</span>
                    {cue.byline ? (
                      <span className="muted block text-xs">{cue.byline}</span>
                    ) : null}
                  </span>
                </>
              );

              const className = `flex w-full gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                isActive ? 'bg-pitch-100 dark:bg-pitch-900' : 'hover:bg-black/5 dark:hover:bg-white/10'
              }`;

              return (
                <li key={cue.id}>
                  {isYouTube ? (
                    <button
                      type="button"
                      onClick={() => jumpTo(cue)}
                      className={className}
                      disabled={!playerReady}
                      aria-label={`${formatTimestamp(cue.seconds)} 장면으로 이동: ${cue.note}`}
                    >
                      {content}
                    </button>
                  ) : (
                    // 드라이브는 시점 이동이 불가능하므로 원본을 새 창으로 연다.
                    <a
                      href={toWatchUrl(source, cue.seconds)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={className}
                    >
                      {content}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
