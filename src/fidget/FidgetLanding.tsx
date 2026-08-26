import { useGameStore } from '../store/gameStore';
import { buildBackgroundCss, resolveBackground } from '../cube/backgrounds';
import { FidgetScene } from './FidgetScene';

/**
 * Full-screen host for the fidget mode. Renders the iridescent cube canvas
 * edge-to-edge on top of the user's chosen play-field background (same
 * setting the puzzle mode uses via `settings.backgroundId`) so the fidget
 * inherits whatever atmosphere the user picked from the settings gear.
 *
 * Video backgrounds are rendered as a <video> element behind the canvas
 * (CSS `background` can't carry a video), with an overlay div for the
 * theme's darken/vignette above the video and below the canvas.
 */
export function FidgetLanding() {
  const setMenuView = useGameStore((s) => s.setMenuView);
  const background = useGameStore((s) => resolveBackground(s.settings.backgroundId));
  const isVideoBg = background.kind === 'video' && !!background.videoSrc;

  return (
    <div
      className="fixed inset-0 h-full w-full overflow-hidden"
      style={{
        background: isVideoBg ? background.color : buildBackgroundCss(background),
        backgroundColor: background.color,
      }}
    >
      {isVideoBg && (
        <>
          <video
            key={background.videoSrc}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            src={background.videoSrc}
            poster={background.src}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          {background.overlay && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: background.overlay }}
            />
          )}
        </>
      )}

      <FidgetScene />

      <button
        type="button"
        onClick={() => setMenuView('daily')}
        className="absolute left-4 top-4 rounded-full bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80 ring-1 ring-white/15 backdrop-blur transition-all hover:bg-white/[0.14] active:scale-95"
        style={{ top: 'calc(1rem + max(env(safe-area-inset-top), 0px))' }}
      >
        ← Back
      </button>

      <div
        className="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-[0.3em] text-white/40"
        style={{ bottom: 'calc(1.5rem + max(env(safe-area-inset-bottom), 0px))' }}
      >
        Swipe: spin inner · Hold + flick: spin outer · Two-finger drag: rotate
      </div>
    </div>
  );
}
