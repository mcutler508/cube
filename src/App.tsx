import { useEffect } from 'react';
import { CubeScene } from './components/Cube/CubeScene';
import { HelperArrows } from './components/Cube/HelperArrows';
import { CubeNet } from './components/HUD/CubeNet';
import { GameHUD } from './components/HUD/GameHUD';
import { NearSolvedGlow } from './components/HUD/NearSolvedGlow';
import { useDevKeyboard } from './interaction/useDevKeyboard';
import { initAudio } from './audio/audio';
import { initHaptics } from './haptics/haptics';

/**
 * Layout: the 3D cube fills the top flex-1 section; below it, a compact
 * unfolded net panel gives you eyes on the hidden faces. HUD chrome (timer,
 * progress meter, difficulty chip, streak badge, buttons) is absolutely
 * positioned within those regions. Audio + haptic hooks initialise once so
 * they can react to game events as soon as the first move fires.
 */
export default function App() {
  useDevKeyboard();
  useEffect(() => {
    initAudio();
    initHaptics();
  }, []);

  return (
    <div className="fixed inset-0 flex h-full w-full flex-col">
      <div className="relative flex-1 overflow-hidden">
        <CubeScene />
        <NearSolvedGlow />
        <HelperArrows />
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
    </div>
  );
}
