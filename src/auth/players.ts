import { getSupabase } from './supabaseClient';
import { containsProfanity, normalizeHandle } from './handle';
import { hashPasscode, isValidPasscode } from './passcode';

export interface PlayerRow {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
  tutorial_completed: boolean;
}

export type SignUpError =
  | 'name-taken'
  | 'email-taken'
  | 'invalid-name'
  | 'inappropriate-name'
  | 'invalid-email'
  | 'invalid-passcode'
  | 'unconfigured'
  | 'network';

// Deliberately permissive — matches the RFC-ish shape (something@something.tld)
// without trying to be a full validator. Real verification is a delivery test.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim()) && email.trim().length <= 254;
}

export type SignInError =
  | 'not-found'
  | 'wrong-passcode'
  | 'invalid-name'
  | 'invalid-passcode'
  | 'unconfigured'
  | 'network';

export type UpdateNameError =
  | 'invalid-name'
  | 'inappropriate-name'
  | 'name-taken'
  | 'unconfigured'
  | 'network';

export type SignUpResult =
  | { ok: true; player: PlayerRow }
  | { ok: false; error: SignUpError };

export type SignInResult =
  | { ok: true; player: PlayerRow }
  | { ok: false; error: SignInError };

/**
 * Postgres errors in the `42xxx` class cover syntax, schema, and permission
 * problems (42703 undefined column, 42P01 undefined table, 42501 RLS /
 * insufficient privilege). These aren't network failures — surfacing them as
 * "network" hides configuration drift. Callers should map them to the
 * `unconfigured` error so the UI hints at "sign-in isn't configured on this
 * build" and the underlying code shows up in the console for the developer.
 */
function isPostgresConfigError(code: string | undefined): boolean {
  return typeof code === 'string' && /^42/.test(code);
}

export async function signUp(
  id: string,
  name: string,
  email: string,
  passcode: string,
): Promise<SignUpResult> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'unconfigured' };
  const handle = normalizeHandle(name);
  if (!handle) return { ok: false, error: 'invalid-name' };
  if (containsProfanity(handle)) return { ok: false, error: 'inappropriate-name' };
  const trimmedEmail = email.trim();
  if (!isValidEmail(trimmedEmail)) return { ok: false, error: 'invalid-email' };
  if (!isValidPasscode(passcode)) return { ok: false, error: 'invalid-passcode' };
  const passcode_hash = await hashPasscode(passcode);

  try {
    const { data, error } = await client
      .from('players')
      .insert({ id, name: handle, email: trimmedEmail, passcode_hash })
      .select('id, name, email, created_at, updated_at, tutorial_completed')
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        // Unique-violation on `name` or `email` — sniff the error text to
        // tell them apart so the UI can surface the right hint. (`name` is
        // pre-lowercased by normalizeHandle, so this constraint fires on
        // exact-match handle collisions.)
        const msg = `${error.message ?? ''} ${(error as { details?: string }).details ?? ''}`;
        if (/email/i.test(msg)) return { ok: false, error: 'email-taken' };
        return { ok: false, error: 'name-taken' };
      }
      if (isPostgresConfigError(code)) {
        console.error('[players] signUp schema/permission error', code, error.message, error);
        return { ok: false, error: 'unconfigured' };
      }
      console.error('[players] signUp error', code, error.message, error);
      return { ok: false, error: 'network' };
    }
    return { ok: true, player: data as PlayerRow };
  } catch (err) {
    console.error('[players] signUp threw', err);
    return { ok: false, error: 'network' };
  }
}

/**
 * Best-effort write: flag the account as having finished the first-run
 * tutorial. Silent on any failure — the local player-store flag is the
 * canonical source of truth within this session, and the next sign-in will
 * re-fetch. Called once the player clears learn-02.
 */
export async function markTutorialCompleted(playerId: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  try {
    const { error } = await client
      .from('players')
      .update({ tutorial_completed: true })
      .eq('id', playerId);
    if (error) {
      const code = (error as { code?: string }).code;
      console.error('[players] markTutorialCompleted error', code, error.message, error);
    }
  } catch (err) {
    console.error('[players] markTutorialCompleted threw', err);
  }
}

export async function signIn(name: string, passcode: string): Promise<SignInResult> {
  const client = getSupabase();
  if (!client) return { ok: false, error: 'unconfigured' };
  const handle = normalizeHandle(name);
  if (!handle) return { ok: false, error: 'invalid-name' };
  if (!isValidPasscode(passcode)) return { ok: false, error: 'invalid-passcode' };
  const passcode_hash = await hashPasscode(passcode);

  try {
    // Handle is already lowercased by normalizeHandle, so an exact-match
    // lookup on `name` is safe. `.limit(1)` + read-first-row (rather than
    // `.maybeSingle()`) is defensive: if a legacy duplicate row exists in
    // the DB we'd rather sign the account in than brick it with a PostgREST
    // "multiple rows returned" 406.
    const { data, error } = await client
      .from('players')
      .select('id, name, email, created_at, updated_at, tutorial_completed, passcode_hash')
      .eq('name', handle)
      .limit(1);
    if (error) {
      const code = (error as { code?: string }).code;
      if (isPostgresConfigError(code)) {
        console.error('[players] signIn schema/permission error', code, error.message, error);
        return { ok: false, error: 'unconfigured' };
      }
      console.error('[players] signIn error', code, error.message, error);
      return { ok: false, error: 'network' };
    }
    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) return { ok: false, error: 'not-found' };
    const stored = (row as { passcode_hash?: string | null }).passcode_hash;
    if (!stored || stored !== passcode_hash) return { ok: false, error: 'wrong-passcode' };
    // Strip the passcode hash before returning the row upward — nothing in
    // the store or UI has any business seeing it.
    const full = row as PlayerRow & { passcode_hash: string };
    const player: PlayerRow = {
      id: full.id,
      name: full.name,
      email: full.email,
      created_at: full.created_at,
      updated_at: full.updated_at,
      tutorial_completed: full.tutorial_completed,
    };
    return { ok: true, player };
  } catch (err) {
    console.error('[players] signIn threw', err);
    return { ok: false, error: 'network' };
  }
}
