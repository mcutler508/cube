import { useEffect } from 'react';
import { CubeScene } from './components/Cube/CubeScene';
import { HelperArrows } from './components/Cube/HelperArrows';
import { CubeNet } from './components/HUD/CubeNet';
import { GameHUD } from './components/HUD/GameHUD';
import { NearSolvedGlow } from './components/HUD/NearSolvedGlow';
import { ObjectiveBanner } from './components/HUD/ObjectiveBanner';
import { ObjectiveCompleteOverlay } from './components/HUD/ObjectiveCompleteOverlay';
import { LevelSelect } from './components/LevelSelect/LevelSelect';
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

  const hasLevel = useGameStore((s) => s.currentLevel !== null);
  if (!hasLevel) return <LevelSelect />;

  return (
    <div className="fixed inset-0 flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <CubeScene />
        <NearSolvedGlow />
        <HelperArrows />
        <ObjectiveBanner />
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
