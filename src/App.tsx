import { useEffect } from 'react';
import { CubeScene } from './components/Cube/CubeScene';
import { HelperArrows } from './components/Cube/HelperArrows';
import { CubeNet } from './components/HUD/CubeNet';
import { GameHUD } from './components/HUD/GameHUD';
import { FloatingFeedback } from './components/HUD/FloatingFeedback';
import { MilestoneBurst } from './components/HUD/MilestoneBurst';
import { NearSolvedGlow } from './components/HUD/NearSolvedGlow';
import { ObjectiveBanner } from './components/HUD/ObjectiveBanner';
import { ObjectiveCompleteOverlay } from './components/HUD/ObjectiveCompleteOverlay';
import { OnboardingCoach } from './components/HUD/OnboardingCoach';
import { AlgorithmToast } from './components/HUD/AlgorithmToast';
import { LevelSelect } from './components/LevelSelect/LevelSelect';
import { DailyLanding } from './components/DailyLanding/DailyLanding';
import { useDevKeyboard } from './interaction/useDevKeyboard';
import { initAudio } from './audio/audio';
import { initHaptics } from './haptics/haptics';
import { useGameStore } from './store/gameStore';

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
  }, []);

  const currentLevelId = useGameStore((s) => s.currentLevel?.id ?? null);
  const menuView = useGameStore((s) => s.menuView);
  if (!currentLevelId) {
    return (
      <div
        key={`menu-${menuView}`}
        className="fixed inset-0"
        style={{ animation: 'screenIn 380ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {menuView === 'daily' ? <DailyLanding /> : <LevelSelect />}
        <style>{screenTransitionCss}</style>
      </div>
    );
  }

  return (
    <div
      key={`level-${currentLevelId}`}
      className="fixed inset-0 flex h-full w-full flex-col"
      style={{ animation: 'screenIn 380ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <style>{screenTransitionCss}</style>
      <div className="relative flex-1 overflow-hidden">
        {/*
          Inset the cube canvas from the top by the objective banner's
          height (plus safe-area). Keeps the cube's fit-to-viewport math
          from ever drawing pixels underneath the banner on portrait
          mobile, without shrinking the cube itself.
        */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{ top: 'calc(1.75rem + max(env(safe-area-inset-top), 0px))' }}
        >
          <CubeScene />
        </div>
        <NearSolvedGlow />
        <MilestoneBurst />
        <HelperArrows />
        <ObjectiveBanner />
        <FloatingFeedback />
        <AlgorithmToast />
        <OnboardingCoach />
        <GameHUD.TopBarSlot />
      </div>
      <div
        className="relative shrink-0 border-t border-white/5 bg-[#0a0b0f]/95 px-4 pt-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      >
        <CubeNet />
        <GameHUD.BottomBarSlot />
      </div>
      <GameHUD.SolvedOverlaySlot />
      <ObjectiveCompleteOverlay />
    </div>
  );
}

const screenTransitionCss = `
  @keyframes screenIn {
    from { opacity: 0; transform: scale(0.985); }
    to { opacity: 1; transform: scale(1); }
  }
`;
