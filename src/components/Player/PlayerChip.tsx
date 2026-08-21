import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { isSupabaseConfigured } from '../../auth/supabaseClient';
import { PlayerSignInModal } from './PlayerSignInModal';

/**
 * Landing header affordance. Hidden entirely when Supabase env isn't
 * configured so dev builds without keys stay clean. Guests can play without
 * ever signing in — this is purely opt-in identity.
 */
export function PlayerChip() {
  if (!isSupabaseConfigured()) return null;
  return <PlayerChipInner />;
}

function PlayerChipInner() {
  const player = usePlayerStore((s) => s.player);
  const hydrated = usePlayerStore((s) => s.hydrated);
  const signOut = usePlayerStore((s) => s.signOut);
  const [modal, setModal] = useState<null | 'signin' | 'signup'>(null);
  const [popover, setPopover] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!popover) return;
    function onClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setPopover(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [popover]);

  if (!hydrated) {
    return (
      <div className="h-7 w-16 animate-pulse rounded-full bg-white/[0.06]" aria-hidden="true" />
    );
  }

  if (!player) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModal('signin')}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/85 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
        >
          Sign in
        </button>
        {modal && <PlayerSignInModal initialMode={modal} onClose={() => setModal(null)} />}
      </>
    );
  }

  const initial = player.name.charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setPopover((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] py-1 pl-1 pr-3 text-xs text-white/85 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:text-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.14] text-[10px] font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[8rem] truncate">{player.name}</span>
      </button>

      {popover && (
        <div className="absolute right-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl bg-[#12141a] p-1 text-sm text-white/85 shadow-xl ring-1 ring-white/10">
          <div className="truncate px-3 py-2 text-[11px] text-white/50">Signed in as {player.name}</div>
          <button
            type="button"
            onClick={() => {
              setPopover(false);
              signOut();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/[0.08] hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
