import { useEffect, useRef, useState } from 'react';
import { generatePlayerId, usePlayerStore } from '../../store/playerStore';
import { normalizeHandle } from '../../auth/handle';
import {
  isValidEmail,
  signIn,
  signUp,
  type SignInError,
  type SignUpError,
} from '../../auth/players';

type Mode = 'signin' | 'signup';

interface Props {
  initialMode?: Mode;
  /** When omitted, the modal is non-dismissable (used as a required sign-in gate). */
  onClose?: () => void;
}

export function PlayerSignInModal({ initialMode = 'signin', onClose }: Props) {
  const dismissable = Boolean(onClose);
  const setPlayer = usePlayerStore((s) => s.setPlayer);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handle = normalizeHandle(name);
  const passcodeValid = /^\d{4}$/.test(passcode);
  const emailValid = mode === 'signup' ? isValidEmail(email) : true;
  const canSubmit = handle.length > 0 && emailValid && passcodeValid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const id = generatePlayerId();
        const result = await signUp(id, handle, email, passcode);
        if (!result.ok) {
          setError(signUpErrorMessage(result.error));
          return;
        }
        setPlayer({
          id: result.player!.id,
          name: result.player!.name,
          tutorialCompleted: result.player!.tutorial_completed,
        });
        onClose?.();
      } else {
        const result = await signIn(handle, passcode);
        if (!result.ok) {
          setError(signInErrorMessage(result.error));
          return;
        }
        setPlayer({
          id: result.player!.id,
          name: result.player!.name,
          tutorialCompleted: result.player!.tutorial_completed,
        });
        onClose?.();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={
        dismissable
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur'
          : 'fixed inset-0 z-50 flex items-center justify-center bg-[#08090d] p-4'
      }
      onClick={dismissable ? onClose : undefined}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-[#12141a] p-6 text-white shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.4em] text-white/50">
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              {mode === 'signup' ? 'Pick a handle' : 'Welcome back'}
            </h2>
          </div>
          {dismissable && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-white/50 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L8.94 10l-4.72 4.72a.75.75 0 1 0 1.06 1.06L10 11.06l4.72 4.72a.75.75 0 1 0 1.06-1.06L11.06 10l4.72-4.72a.75.75 0 0 0-1.06-1.06L10 8.94 5.28 4.22z" />
              </svg>
            </button>
          )}
        </div>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Handle</span>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoCapitalize="off"
              autoComplete="off"
              spellCheck={false}
              className="mt-1 w-full rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:bg-white/[0.08] focus:ring-white/25"
              placeholder="up to 20 characters"
            />
          </label>

          {mode === 'signup' && (
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                autoCapitalize="off"
                autoComplete="email"
                spellCheck={false}
                className="mt-1 w-full rounded-lg bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/10 focus:bg-white/[0.08] focus:ring-white/25"
                placeholder="you@example.com"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              4-digit passcode
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mt-1 w-full rounded-lg bg-white/[0.05] px-3 py-2 text-center text-xl tracking-[0.5em] text-white outline-none ring-1 ring-white/10 focus:bg-white/[0.08] focus:ring-white/25"
              placeholder="0000"
            />
          </label>

          {error && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/30">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
          >
            {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-white/50">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signin');
                }}
                className="text-white/85 underline underline-offset-2 hover:text-white"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signup');
                }}
                className="text-white/85 underline underline-offset-2 hover:text-white"
              >
                Create an account
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/35">
          The passcode is a 4-digit PIN — not a real password. It lets you sign back in
          on other devices. Don't reuse a passcode you care about.
        </p>
      </div>
    </div>
  );
}

function signUpErrorMessage(err: SignUpError | undefined): string {
  switch (err) {
    case 'name-taken':
      return 'That handle is already taken. Try another.';
    case 'email-taken':
      return 'That email is already registered. Sign in instead?';
    case 'invalid-name':
      return 'Enter a handle to continue.';
    case 'inappropriate-name':
      return 'Please pick a different handle.';
    case 'invalid-email':
      return 'Enter a valid email address.';
    case 'invalid-passcode':
      return 'Passcode must be 4 digits.';
    case 'unconfigured':
      return "Sign-in isn't configured on this build.";
    case 'network':
    default:
      return "Couldn't reach the server. Try again in a moment.";
  }
}

function signInErrorMessage(err: SignInError | undefined): string {
  switch (err) {
    case 'not-found':
      return "We couldn't find that handle. Check the spelling or create an account.";
    case 'wrong-passcode':
      return "That passcode doesn't match.";
    case 'invalid-name':
      return 'Enter your handle to continue.';
    case 'invalid-passcode':
      return 'Passcode must be 4 digits.';
    case 'unconfigured':
      return "Sign-in isn't configured on this build.";
    case 'network':
    default:
      return "Couldn't reach the server. Try again in a moment.";
  }
}
