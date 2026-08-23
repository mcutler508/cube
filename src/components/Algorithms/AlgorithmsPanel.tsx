import { ALGORITHMS } from '../../game/algorithms';
import { formatSequence } from '../../cube/notation';
import { useGameStore } from '../../store/gameStore';
import { MenuBackdrop } from '../HUD/MenuBackdrop';

/**
 * Trigger reference. Shows the six celebrated algorithms with their move
 * notation and a one-liner about what they do. When the player performs any
 * of these during play, an AlgorithmToast fires on the cube — this page just
 * tells them which ones exist.
 */
const DESCRIPTIONS: Record<string, string> = {
  sexy: 'The most repeated trigger in cubing. Cycles three corners on the top layer.',
  'reverse-sexy': 'Undoes a Sexy Move. Same feel, opposite direction.',
  sledgehammer: 'F/R commutator. Flips two edges on the front face.',
  'reverse-sledge': 'The mirror of Sledgehammer.',
  sune: 'OLL trigger. Orients three top corners in one shot.',
  'anti-sune': 'The mirror of Sune.',
};

export function AlgorithmsPanel() {
  const setMenuView = useGameStore((s) => s.setMenuView);

  return (
    <MenuBackdrop>
      <div
        className="mx-auto flex w-full max-w-lg flex-col px-6 pb-10 pt-10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 2.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 2.5rem)',
        }}
      >
        <button
          type="button"
          onClick={() => setMenuView('daily')}
          className="mb-4 self-start text-[10px] uppercase tracking-[0.28em] text-white/50 hover:text-white/85"
        >
          ← Back to Daily
        </button>
        <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">Triggers</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Algorithms
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Perform any of these during play and the toast fires. Chain the same
          one back-to-back and the counter climbs.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {ALGORITHMS.map((algo) => (
            <div
              key={algo.id}
              className="rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-sm font-semibold text-white">{algo.name}</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                  {algo.moves.length} moves
                </div>
              </div>
              <div className="mt-1.5 font-mono text-sm tracking-wide text-amber-200/90">
                {formatSequence(algo.moves)}
              </div>
              <div className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/45">
                {DESCRIPTIONS[algo.id] ?? ''}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-white/55 ring-1 ring-white/[0.06]">
          <span className="font-semibold text-white/75">Notation:</span>{' '}
          <span className="font-mono">R</span> = right face clockwise,{' '}
          <span className="font-mono">R'</span> = counter-clockwise,{' '}
          <span className="font-mono">R2</span> = half turn. Letters:{' '}
          <span className="font-mono">R L U D F B</span> = right, left, top,
          bottom, front, back.
        </div>
      </div>
    </MenuBackdrop>
  );
}
