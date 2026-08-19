import { useEffect, useMemo, useState } from 'react';
import { computeNet, type FaceLetter } from '../../cube/net';
import { useGameStore } from '../../store/gameStore';
import { useGameEvent } from '../../animation/triggers';
import { ALGORITHMS } from '../../game/algorithms';
import { applyMoves } from '../../cube/cubeState';
import { useActiveTheme } from '../../cube/themes';

/**
 * A compact 2D "unfolded net" showing all six faces of the cube at once,
 * derived from the live game state. Read-only reference — useful when the 3D
 * cube's back sides are hidden.
 *
 * The net doubles as a tactical display:
 *   - Solved faces glow subtly for the duration they stay solved.
 *   - Face / cross / row / layer completions each trigger a distinct pulse:
 *     small strip for a row, "+" for a cross, full face for a face, face + bands
 *     for a layer. Broken events get a quieter dim pulse (not punishing).
 */
type FaceFlash = { face: FaceLetter; kind: 'completed' | 'broken'; key: number };
type RowFlash = { face: FaceLetter; row: 0 | 1 | 2; key: number };
type CrossFlash = { face: FaceLetter; key: number };
type LayerFlash = { face: FaceLetter; key: number };

const FLASH_MS = 700;

export function CubeNet() {
  const cubies = useGameStore((s) => s.cubeState.cubies);
  const solved = useGameStore((s) => s.solvedFaces);
  const previewId = useGameStore((s) => s.previewAlgorithmId);
  const palette = useActiveTheme().colors;
  const currentNet = useMemo(() => computeNet({ cubies }, palette), [cubies, palette]);

  // When an algorithm is being previewed, compute what the cube would look
  // like after applying it and diff against the current net so the changed
  // cells can be highlighted.
  const { displayNet, changed, previewName } = useMemo(() => {
    if (!previewId) return { displayNet: currentNet, changed: null, previewName: null };
    const algo = ALGORITHMS.find((a) => a.id === previewId);
    if (!algo) return { displayNet: currentNet, changed: null, previewName: null };
    const ghostState = applyMoves({ cubies }, algo.moves);
    const ghostNet = computeNet(ghostState, palette);
    const diff = new Map<FaceLetter, boolean[][]>();
    const faces: FaceLetter[] = ['U', 'D', 'L', 'R', 'F', 'B'];
    for (const f of faces) {
      const mask: boolean[][] = [[false, false, false], [false, false, false], [false, false, false]];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (currentNet[f][r][c] !== ghostNet[f][r][c]) mask[r][c] = true;
        }
      }
      diff.set(f, mask);
    }
    return { displayNet: ghostNet, changed: diff, previewName: algo.name };
  }, [previewId, currentNet, cubies, palette]);

  const net = displayNet;

  const [faceFlash, setFaceFlash] = useState<FaceFlash | null>(null);
  const [rowFlash, setRowFlash] = useState<RowFlash | null>(null);
  const [crossFlash, setCrossFlash] = useState<CrossFlash | null>(null);
  const [layerFlash, setLayerFlash] = useState<LayerFlash | null>(null);

  useGameEvent('faceCompleted', (e) => {
    setFaceFlash({ face: e.face, kind: 'completed', key: performance.now() });
  });
  useGameEvent('faceBroken', (e) => {
    setFaceFlash({ face: e.face, kind: 'broken', key: performance.now() });
  });
  useGameEvent('rowCompleted', (e) => {
    setRowFlash({ face: e.face, row: e.row, key: performance.now() });
  });
  useGameEvent('crossCompleted', (e) => {
    setCrossFlash({ face: e.face, key: performance.now() });
  });
  useGameEvent('layerCompleted', (e) => {
    setLayerFlash({ face: e.face, key: performance.now() });
  });

  useEffect(() => {
    if (!faceFlash) return;
    const t = window.setTimeout(() => setFaceFlash(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [faceFlash]);
  useEffect(() => {
    if (!rowFlash) return;
    const t = window.setTimeout(() => setRowFlash(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [rowFlash]);
  useEffect(() => {
    if (!crossFlash) return;
    const t = window.setTimeout(() => setCrossFlash(null), FLASH_MS);
    return () => window.clearTimeout(t);
  }, [crossFlash]);
  useEffect(() => {
    if (!layerFlash) return;
    const t = window.setTimeout(() => setLayerFlash(null), FLASH_MS + 100);
    return () => window.clearTimeout(t);
  }, [layerFlash]);

  return (
    <div className="pointer-events-none relative flex items-center justify-center">
      <div className="pointer-events-auto relative flex items-center gap-3 rounded-2xl bg-black/40 px-2 py-2 backdrop-blur-xl ring-1 ring-white/10">
        <NetSvg
          net={net}
          solvedFaces={solved}
          faceFlash={faceFlash}
          rowFlash={rowFlash}
          crossFlash={crossFlash}
          layerFlash={layerFlash}
          previewChanged={changed}
        />
        {previewName && (
          <div
            className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-300/95 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.2em] text-black shadow"
            style={{ animation: 'previewpulse 1.4s ease-in-out infinite' }}
          >
            Preview · {previewName}
          </div>
        )}
      </div>
      <style>{`
        @keyframes previewpulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; box-shadow: 0 0 12px rgba(255,220,140,0.7); }
        }
      `}</style>
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

/**
 * For each face, the (face, cell) pairs on adjacent faces that light up on a
 * layerCompleted flash. Mirrors the LAYER_ADJACENT_BANDS table in detections.ts
 * (kept local to avoid pulling detection helpers into a rendering module).
 */
const LAYER_BANDS: Record<FaceLetter, Array<{ face: FaceLetter; cells: Array<[0 | 1 | 2, 0 | 1 | 2]> }>> = {
  U: [
    { face: 'F', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'B', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'L', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'R', cells: [[0, 0], [0, 1], [0, 2]] },
  ],
  D: [
    { face: 'F', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'B', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'L', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'R', cells: [[2, 0], [2, 1], [2, 2]] },
  ],
  F: [
    { face: 'U', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'D', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'L', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'R', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
  B: [
    { face: 'U', cells: [[0, 0], [0, 1], [0, 2]] },
    { face: 'D', cells: [[2, 0], [2, 1], [2, 2]] },
    { face: 'L', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'R', cells: [[0, 2], [1, 2], [2, 2]] },
  ],
  L: [
    { face: 'U', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'D', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'F', cells: [[0, 0], [1, 0], [2, 0]] },
    { face: 'B', cells: [[0, 2], [1, 2], [2, 2]] },
  ],
  R: [
    { face: 'U', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'D', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'F', cells: [[0, 2], [1, 2], [2, 2]] },
    { face: 'B', cells: [[0, 0], [1, 0], [2, 0]] },
  ],
};

const CROSS_CELLS: Array<[0 | 1 | 2, 0 | 1 | 2]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, 2],
  [2, 1],
];

function NetSvg({
  net,
  solvedFaces,
  faceFlash,
  rowFlash,
  crossFlash,
  layerFlash,
  previewChanged,
}: {
  net: ReturnType<typeof computeNet>;
  solvedFaces: FaceLetter[];
  faceFlash: FaceFlash | null;
  rowFlash: RowFlash | null;
  crossFlash: CrossFlash | null;
  layerFlash: LayerFlash | null;
  previewChanged: Map<FaceLetter, boolean[][]> | null;
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

  // Build per-face highlight cell sets: layer flashes contribute cells on
  // adjacent faces, so a single layerCompleted event lights up 5 faces.
  const layerHighlights = new Map<FaceLetter, Array<[0 | 1 | 2, 0 | 1 | 2]>>();
  if (layerFlash) {
    // Own face — all 9 cells
    layerHighlights.set(layerFlash.face, [
      [0, 0], [0, 1], [0, 2],
      [1, 0], [1, 1], [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);
    for (const band of LAYER_BANDS[layerFlash.face]) {
      layerHighlights.set(band.face, band.cells);
    }
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full max-w-[200px]"
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
          faceFlash={faceFlash?.face === face ? faceFlash : null}
          rowFlash={rowFlash?.face === face ? rowFlash : null}
          crossFlash={crossFlash?.face === face ? crossFlash : null}
          layerCells={layerHighlights.get(face) ?? null}
          layerKey={layerFlash?.key ?? null}
          previewMask={previewChanged?.get(face) ?? null}
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
        @keyframes netCellPulse {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes netStripPulse {
          0% { opacity: 0; transform: scale(0.98); }
          35% { opacity: 1; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.06); }
        }
        @keyframes previewCellPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
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
  faceFlash,
  rowFlash,
  crossFlash,
  layerCells,
  layerKey,
  previewMask,
}: {
  label: string;
  x: number;
  y: number;
  size: number;
  cell: number;
  gap: number;
  grid: string[][];
  solved: boolean;
  faceFlash: FaceFlash | null;
  rowFlash: RowFlash | null;
  crossFlash: CrossFlash | null;
  layerCells: Array<[0 | 1 | 2, 0 | 1 | 2]> | null;
  layerKey: number | null;
  previewMask: boolean[][] | null;
}) {
  const solvedGlow = solved ? 'rgba(160, 240, 190, 0.55)' : 'rgba(255,255,255,0.08)';
  const strokeWidth = solved ? 1.1 : 0.6;

  const cellRect = (r: 0 | 1 | 2, c: 0 | 1 | 2) => ({
    x: c * (cell + gap),
    y: r * (cell + gap),
    width: cell,
    height: cell,
  });

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

      {/* Preview: highlight cells that will change under the previewed algo. */}
      {previewMask && (
        <g>
          {previewMask.map((row, r) =>
            row.map((changed, c) =>
              changed ? (
                <rect
                  key={`p-${r}-${c}`}
                  {...cellRect(r as 0 | 1 | 2, c as 0 | 1 | 2)}
                  rx={1.6}
                  fill="none"
                  stroke="rgba(255, 220, 140, 1)"
                  strokeWidth={1.4}
                  style={{
                    animation: 'previewCellPulse 900ms ease-in-out infinite',
                    filter: 'drop-shadow(0 0 2px rgba(255,220,140,0.9))',
                  }}
                />
              ) : null,
            ),
          )}
        </g>
      )}

      {/* Row flash: highlight the 3 cells of that row. */}
      {rowFlash && (
        <g
          key={`row-${rowFlash.key}`}
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            animation: 'netStripPulse 520ms ease-out forwards',
          }}
        >
          {[0, 1, 2].map((c) => {
            const rect = cellRect(rowFlash.row, c as 0 | 1 | 2);
            return (
              <rect
                key={c}
                {...rect}
                rx={1.6}
                fill="none"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={1.2}
                style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.9))' }}
              />
            );
          })}
        </g>
      )}

      {/* Cross flash: outline the "+" cells. */}
      {crossFlash && (
        <g
          key={`cross-${crossFlash.key}`}
          style={{
            transformOrigin: `${size / 2}px ${size / 2}px`,
            animation: 'netStripPulse 600ms ease-out forwards',
          }}
        >
          {CROSS_CELLS.map(([r, c], i) => {
            const rect = cellRect(r, c);
            return (
              <rect
                key={i}
                {...rect}
                rx={1.6}
                fill="none"
                stroke="rgba(180, 240, 255, 0.95)"
                strokeWidth={1.3}
                style={{ filter: 'drop-shadow(0 0 2.5px rgba(180, 240, 255, 0.9))' }}
              />
            );
          })}
        </g>
      )}

      {/* Layer flash: brighten own cells + adjacent-band cells. */}
      {layerCells && layerKey !== null && (
        <g
          key={`layer-${layerKey}`}
          style={{ animation: 'netCellPulse 720ms ease-out forwards' }}
        >
          {layerCells.map(([r, c], i) => {
            const rect = cellRect(r, c);
            return (
              <rect
                key={i}
                {...rect}
                rx={1.6}
                fill="rgba(255, 255, 255, 0.45)"
              />
            );
          })}
        </g>
      )}

      {/* Face flash: ring around the whole face. */}
      {faceFlash && faceFlash.kind === 'completed' && (
        <rect
          key={`flash-${faceFlash.key}`}
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
      {faceFlash && faceFlash.kind === 'broken' && (
        <rect
          key={`flash-${faceFlash.key}`}
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
