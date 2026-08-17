import { useEffect, useMemo, useState } from 'react';
import { computeNet, type FaceLetter } from '../../cube/net';
import { useGameStore } from '../../store/gameStore';
import { useGameEvent } from '../../animation/triggers';

/**
 * A compact 2D "unfolded net" showing all six faces of the cube at once,
 * derived from the live game state. Read-only reference — useful when the 3D
 * cube's back sides are hidden.
 *
 * The net doubles as a tactical display:
 *   - solved faces glow subtly to reward completion.
 *   - a fresh face-complete event triggers a brief pulse on that face.
 *   - a face-broken event triggers a quieter dim pulse (not punishing).
 */
export function CubeNet() {
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const solved = useGameStore((s) => s.solvedFaces);
  const net = useMemo(() => computeNet({ cubies }), [cubies]);

  // Track "just changed" face events so we can flash the corresponding face.
  const [flashFace, setFlashFace] = useState<{
    face: FaceLetter;
    kind: 'completed' | 'broken';
    key: number;
  } | null>(null);
  useGameEvent('faceCompleted', (e) => {
    setFlashFace({ face: e.face, kind: 'completed', key: performance.now() });
  });
  useGameEvent('faceBroken', (e) => {
    setFlashFace({ face: e.face, kind: 'broken', key: performance.now() });
  });
  useEffect(() => {
    if (!flashFace) return;
    const t = window.setTimeout(() => setFlashFace(null), 700);
    return () => window.clearTimeout(t);
  }, [flashFace]);

  return (
    <div className="pointer-events-none flex items-center justify-center">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-black/40 px-3 py-3 backdrop-blur-xl ring-1 ring-white/10">
        <NetSvg net={net} solvedFaces={solved} flashFace={flashFace} />
      </div>
    </div>
  );
}

const FACE_LABEL: Record<FaceLetter, string> = {
  U: 'U',
  D: 'D',
  L: 'L',
  R: 'R',
  F: 'F',
  B: 'B',
};

function NetSvg({
  net,
  solvedFaces,
  flashFace,
}: {
  net: ReturnType<typeof computeNet>;
  solvedFaces: FaceLetter[];
  flashFace: { face: FaceLetter; kind: 'completed' | 'broken'; key: number } | null;
}) {
  const CELL = 12;
  const GAP = 1.4;
  const FACE_GAP = 3;
  const faceSize = CELL * 3 + GAP * 2;

  const facePos: Record<FaceLetter, [number, number]> = {
    U: [faceSize + FACE_GAP, 0],
    L: [0, faceSize + FACE_GAP],
    F: [faceSize + FACE_GAP, faceSize + FACE_GAP],
    R: [(faceSize + FACE_GAP) * 2, faceSize + FACE_GAP],
    B: [(faceSize + FACE_GAP) * 3, faceSize + FACE_GAP],
    D: [faceSize + FACE_GAP, (faceSize + FACE_GAP) * 2],
  };
  const width = (faceSize + FACE_GAP) * 4 - FACE_GAP;
  const height = (faceSize + FACE_GAP) * 3 - FACE_GAP;
  const solvedSet = new Set(solvedFaces);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full max-w-[420px]"
      aria-label="Unfolded cube net"
    >
      {(Object.keys(facePos) as FaceLetter[]).map((face) => (
        <Face
          key={face}
          label={FACE_LABEL[face]}
          x={facePos[face][0]}
          y={facePos[face][1]}
          size={faceSize}
          cell={CELL}
          gap={GAP}
          grid={net[face]}
          solved={solvedSet.has(face)}
          flash={flashFace?.face === face ? flashFace : null}
        />
      ))}
      <style>{`
        @keyframes netCompletePulse {
          0% { opacity: 0; transform: scale(0.9); }
          40% { opacity: 1; transform: scale(1.06); }
          100% { opacity: 0; transform: scale(1.14); }
        }
        @keyframes netBrokenPulse {
          0% { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </svg>
  );
}

function Face({
  label,
  x,
  y,
  size,
  cell,
  gap,
  grid,
  solved,
  flash,
}: {
  label: string;
  x: number;
  y: number;
  size: number;
  cell: number;
  gap: number;
  grid: string[][];
  solved: boolean;
  flash: { face: FaceLetter; kind: 'completed' | 'broken'; key: number } | null;
}) {
  const solvedGlow = solved ? 'rgba(160, 240, 190, 0.55)' : 'rgba(255,255,255,0.08)';
  const strokeWidth = solved ? 1.1 : 0.6;

  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-1.2}
        y={-1.2}
        width={size + 2.4}
        height={size + 2.4}
        rx={2.6}
        fill="#0d0f13"
        stroke={solvedGlow}
        strokeWidth={strokeWidth}
        style={{ transition: 'stroke 250ms ease-out, stroke-width 250ms ease-out' }}
      />
      {solved && (
        <rect
          x={-1.2}
          y={-1.2}
          width={size + 2.4}
          height={size + 2.4}
          rx={2.6}
          fill="none"
          stroke="rgba(160, 240, 190, 0.35)"
          strokeWidth={0.5}
          style={{ filter: 'blur(1.2px)' }}
        />
      )}
      {grid.map((row, r) =>
        row.map((color, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * (cell + gap)}
            y={r * (cell + gap)}
            width={cell}
            height={cell}
            rx={1.6}
            fill={color}
            style={{ transition: 'fill 260ms ease-out' }}
          />
        )),
      )}
      {flash && flash.kind === 'completed' && (
        <rect
          key={`flash-${flash.key}`}
          x={-1.2}
          y={-1.2}
          width={size + 2.4}
          height={size + 2.4}
          rx={2.6}
          fill="none"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth={1.6}
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            animation: 'netCompletePulse 620ms ease-out forwards',
            filter: 'drop-shadow(0 0 3px rgba(160,240,190,0.9))',
          }}
        />
      )}
      {flash && flash.kind === 'broken' && (
        <rect
          key={`flash-${flash.key}`}
          x={-1.2}
          y={-1.2}
          width={size + 2.4}
          height={size + 2.4}
          rx={2.6}
          fill="rgba(255, 255, 255, 0.05)"
          style={{ animation: 'netBrokenPulse 500ms ease-out forwards' }}
        />
      )}
      <text
        x={size + 3.6}
        y={-2}
        fontSize={3.4}
        fill="rgba(255,255,255,0.32)"
        fontFamily="ui-monospace, SFMono-Regular, monospace"
        textAnchor="end"
        letterSpacing="0.06em"
      >
        {label}
      </text>
    </g>
  );
}
