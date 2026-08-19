import { useEffect, useRef } from 'react';
import { drawReticle, type ReticleStyle } from '../../cube/reticleStyles';

const TILE = 68;
const DPR_TARGET = 2;

/**
 * Picker card for a direction-indicator style. Uses the same procedural
 * drawReticle routine as the runtime CanvasTexture (see reticleStyles.ts)
 * so the preview never drifts from what actually renders on the cube.
 */
export function ReticlePreview({
  style,
  selected,
  onSelect,
}: {
  style: ReticleStyle;
  selected: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_TARGET);
    const pixels = TILE * dpr;
    canvas.width = pixels;
    canvas.height = pixels;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(pixels / 100, pixels / 100);
    drawReticle(ctx, style.id);
    // Tint the white marks cyan so the picker preview matches how the reticle
    // reads in-game (material.emissive is cyan on top of a white alpha mask).
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#7ee9ff';
    ctx.fillRect(0, 0, 100, 100);
    ctx.globalCompositeOperation = 'source-over';
  }, [style.id]);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${style.label} reticle`}
      className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition-colors ${
        selected
          ? 'bg-white/10 ring-2 ring-emerald-400/80'
          : 'bg-white/[0.04] ring-1 ring-white/5 hover:bg-white/[0.07]'
      }`}
    >
      {selected && (
        <span
          aria-hidden
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-black"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 5.2l2.2 2.2L8.5 2.4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{
          width: TILE,
          height: TILE,
          background: '#1e5fb8',
          boxShadow:
            'inset 0 0 0 1px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -8px 14px rgba(0,0,0,0.18)',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: TILE,
            height: TILE,
            filter:
              'drop-shadow(0 0 2px rgba(126,233,255,0.9)) drop-shadow(0 0 4px rgba(126,233,255,0.45))',
          }}
        />
      </div>
      <div className="text-[11px] font-medium leading-tight text-white/90">
        {style.label}
      </div>
    </button>
  );
}
