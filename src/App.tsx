import { useEffect } from 'react';
import { CubeScene } from './components/Cube/CubeScene';
import { CubeNet } from './components/HUD/CubeNet';
import { GameHUD } from './components/HUD/GameHUD';
import { FloatingFeedback } from './components/HUD/FloatingFeedback';
import { MilestoneBurst } from './components/HUD/MilestoneBurst';
import { NearSolvedGlow } from './components/HUD/NearSolvedGlow';
import { ObjectiveBanner } from './components/HUD/ObjectiveBanner';
import { ObjectiveCompleteOverlay } from './components/HUD/ObjectiveCompleteOverlay';
import { OnboardingCoach } from './components/HUD/OnboardingCoach';
import { AlgorithmToast } from './components/HUD/AlgorithmToast';
import { RotationTray } from './components/HUD/RotationTray';
import { HintPanel } from './components/HUD/HintPanel';
import { MilestoneChips } from './components/HUD/MilestoneChips';
import { SettingsPanel } from './components/HUD/SettingsPanel';
import { DrillOverlay } from './components/HUD/DrillOverlay';
import { LevelSelect } from './components/LevelSelect/LevelSelect';
import { DailyLanding } from './components/DailyLanding/DailyLanding';
import { AlgorithmsPanel } from './components/Algorithms/AlgorithmsPanel';
import { useDevKeyboard } from './interaction/useDevKeyboard';
import { initAudio } from './audio/audio';
import { initHaptics } from './haptics/haptics';
import { warmKociembaSolver } from './game/kociembaSolver';
import { useGameStore } from './store/gameStore';
import { usePlayerStore } from './store/playerStore';
import { isSupabaseConfigured } from './auth/supabaseClient';
import { PlayerSignInModal } from './components/Player/PlayerSignInModal';
import { resolveBackground, type CubeBackground } from './cube/backgrounds';

/**
 * Route: when no level is loaded, show the level-select landing. Otherwise
 * render the cube playfield with HUD chrome. Audio + haptics init once so
 * they're ready before the first move fires.
 */
export default function App() {
  useDevKeyboard();
  useEffect(() => {
    initAudio();
    initHaptics();
    warmKociembaSolver();
    usePlayerStore.getState().hydrate();
  }, []);

  const currentLevelId = useGameStore((s) => s.currentLevel?.id ?? null);
  const menuView = useGameStore((s) => s.menuView);
  const showCubeNet = useGameStore((s) => s.settings.showCubeNet);
  const background = useGameStore((s) => resolveBackground(s.settings.backgroundId));

  // Require sign-in before any play (when Supabase is configured). Dev builds
  // without env vars skip the gate so the app is still playable offline.
  const player = usePlayerStore((s) => s.player);
  const hydrated = usePlayerStore((s) => s.hydrated);
  if (isSupabaseConfigured() && hydrated && !player) {
    return <PlayerSignInModal initialMode="signup" />;
  }

  if (!currentLevelId) {
    return (
      <div
        key={`menu-${menuView}`}
        className="fixed inset-0"
        style={{ animation: 'screenIn 380ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {menuView === 'daily' && <DailyLanding />}
        {menuView === 'learn' && <LevelSelect />}
        {menuView === 'algos' && <AlgorithmsPanel />}
        <style>{screenTransitionCss}</style>
      </div>
    );
  }

  const isVideoBg = background.kind === 'video' && !!background.videoSrc;
  return (
    <div
      key={`level-${currentLevelId}`}
      className="fixed inset-0 flex h-full w-full flex-col"
      style={{
        animation: 'screenIn 380ms cubic-bezier(0.16, 1, 0.3, 1)',
        // Video backgrounds paint via a stacked <video> + overlay pair below
        // (CSS `background` only carries the fallback color). Solid + image
        // kinds continue to use the CSS background shorthand.
        background: isVideoBg ? background.color : buildBackgroundCss(background),
        backgroundColor: background.color,
      }}
    >
      <style>{screenTransitionCss}</style>
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
      <div className="relative flex-1 overflow-hidden">
        {/*
          Inset the cube canvas from the top by the objective banner's
          height (plus safe-area). Keeps the cube's fit-to-viewport math
          from ever drawing pixels underneath the banner on portrait
          mobile, without shrinking the cube itself.
        */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: 'calc(1rem + max(env(safe-area-inset-top), 0px))' }}
        >
          <CubeScene />
        </div>
        <NearSolvedGlow />
        <MilestoneBurst />
        <ObjectiveBanner />
        <MilestoneChips />
        <HintPanel />
        <DrillOverlay />
        <FloatingFeedback />
        <AlgorithmToast />
        <OnboardingCoach />
        <RotationTray />
        <GameHUD.TopBarSlot />
      </div>
      <div
        className="relative shrink-0 px-4 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        {showCubeNet && <CubeNet />}
        {/* AlgorithmPalette hidden from UI — functionality preserved in the component and store. */}
        <GameHUD.BottomBarSlot />
      </div>
      <GameHUD.SolvedOverlaySlot />
      <ObjectiveCompleteOverlay />
      <SettingsPanel />
    </div>
  );
}

const screenTransitionCss = `
  @keyframes screenIn {
    from { opacity: 0; transform: scale(0.985); }
    to { opacity: 1; transform: scale(1); }
  }
`;

/**
 * Compose the CSS `background` shorthand for the level view. Layer order is
 * top-to-bottom in CSS: any overlay is painted above the image, and the fallback
 * solid color sits behind everything (visible until the image loads and behind
 * any letterboxed edges).
 */
function buildBackgroundCss(bg: CubeBackground): string {
  const layers: string[] = [];
  if (bg.overlay) layers.push(bg.overlay);
  if (bg.src) {
    const size = bg.size ?? 'cover';
    layers.push(`url("${bg.src}") center/${size} no-repeat`);
  }
  layers.push(bg.color);
  return layers.join(', ');
}
