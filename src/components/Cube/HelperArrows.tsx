import { useGameStore } from '../../store/gameStore';
import type { FaceLetter, Move } from '../../types/cube';
import { FACE_COLORS } from '../../cube/colors';

/**
 * Friendly hint badge. The BFS solver returns a raw Move like `{face: 'R',
 * turns: -1}`; beginners have no idea what "R'" means. We translate to a
 * colored face swatch + human direction ("clockwise", "counter-clockwise",
 * "half turn") plus a small arrow glyph.
 *
 * The badge is populated by the store's `hintMove` (set on Hint-button press
 * and cleared on any move / undo / level transition).
 */
export function HelperArrows() {
  const hint = useGameStore((s) => s.hintMove);
  const pending = useGameStore((s) => s.hintPending);
  const unavailable = useGameStore((s) => s.hintUnavailable);
  const phase = useGameStore((s) => s.phase);

  if (phase === 'solved') return null;

  if (pending) {
    return (
      <PillWrapper>
        <span className="text-[11px] uppercase tracking-[0.24em] text-black/75">
          Thinking…
        </span>
      </PillWrapper>
    );
  }

  if (unavailable) {
    return (
      <PillWrapper tone="dim">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/80">
          No hint yet — try a move
        </span>
      </PillWrapper>
    );
  }

  if (!hint) return null;

  return (
    <PillWrapper>
      <FaceSwatch face={hint.face} />
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-black/85">
        Turn the {FACE_LABEL[hint.face]}
      </span>
      <DirectionArrow turns={hint.turns} />
    </PillWrapper>
  );
}

const FACE_LABEL: Record<FaceLetter, string> = {
  U: 'top',
  D: 'bottom',
  L: 'left',
  R: 'right',
  F: 'front',
  B: 'back',
};

const FACE_SWATCH: Record<FaceLetter, string> = {
  U: FACE_COLORS.up,
  D: FACE_COLORS.down,
  L: FACE_COLORS.left,
  R: FACE_COLORS.right,
  F: FACE_COLORS.front,
  B: FACE_COLORS.back,
};

function PillWrapper({
  children,
  tone = 'bright',
}: {
  children: React.ReactNode;
  tone?: 'bright' | 'dim';
}) {
  const cls =
    tone === 'bright'
      ? 'bg-white/95 text-black shadow-xl shadow-black/40 ring-1 ring-black/10'
      : 'bg-white/15 text-white/90 backdrop-blur-md ring-1 ring-white/20';
  return (
    <div
      className={`pointer-events-none absolute left-1/2 top-14 z-[6] -translate-x-1/2 select-none rounded-full ${cls}`}
      style={{ animation: 'hintpop 260ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">{children}</div>
      <style>{`
        @keyframes hintpop {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}

function FaceSwatch({ face }: { face: FaceLetter }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 rounded-sm ring-1 ring-black/25"
      style={{ backgroundColor: FACE_SWATCH[face] }}
      aria-hidden="true"
    />
  );
}

function DirectionArrow({ turns }: { turns: Move['turns'] }) {
  if (turns === 2) {
    return (
      <span className="flex items-center gap-0.5 text-[13px] font-semibold text-black/80" aria-hidden="true">
        ↻↻
      </span>
    );
  }
  // Clockwise (+1) vs counter-clockwise (-1) viewed from the face itself.
  const glyph = turns === 1 ? '↻' : '↺';
  return (
    <span className="text-[15px] font-semibold text-black/80" aria-hidden="true">
      {glyph}
    </span>
  );
}
