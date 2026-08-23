import { useState } from 'react';
import { useGameEvent } from '../../animation/triggers';
import { formatMove } from '../../cube/notation';

/**
 * Big centered letter over the cube on every player move — U, R, U', F2, etc.
 * Appears with a punch and fades out over ~600ms so it never lingers between
 * quick moves during a drill. Scramble/undo moves are ignored (the readout
 * is a player-facing "you just did X" indicator).
 */

const FADE_MS = 600;

interface Flash {
  id: number;
  label: string;
}

let nextId = 1;

export function MoveReadout() {
  const [flash, setFlash] = useState<Flash | null>(null);

  useGameEvent('moveCompleted', (e) => {
    const label = formatMove(e.move);
    setFlash({ id: nextId++, label });
    window.setTimeout(() => {
      setFlash((current) => (current && current.id === nextId - 1 ? null : current));
    }, FADE_MS);
  });

  if (!flash) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[9] flex items-center justify-center">
      <span
        key={flash.id}
        className="select-none font-mono font-semibold text-white"
        style={{
          fontSize: 'clamp(5rem, 22vw, 11rem)',
          letterSpacing: '-0.04em',
          textShadow:
            '0 0 34px rgba(0, 0, 0, 0.55), 0 0 12px rgba(255, 191, 59, 0.35)',
          animation: `moveReadoutPulse ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        }}
      >
        {flash.label}
      </span>
      <style>{`
        @keyframes moveReadoutPulse {
          0%   { opacity: 0; transform: scale(0.72); }
          22%  { opacity: 1; transform: scale(1.06); }
          55%  { opacity: 0.9; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.98); }
        }
      `}</style>
    </div>
  );
}
