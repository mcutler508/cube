import { getSupabase } from './supabaseClient';
import { containsProfanity, normalizeHandle } from './handle';
import { hashPasscode, isValidPasscode } from './passcode';

export interface PlayerRow {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
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

export interface SignUpResult {
  ok: boolean;
  player?: PlayerRow;
  error?: SignUpError;
}

export interface SignInResult {
  ok: boolean;
  player?: PlayerRow;
  error?: SignInError;
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
      .select('id, name, email, created_at, updated_at')
      .single();
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') {
        // Unique-violation could be on name_lower or email_lower — sniff the
        // error text to tell them apart so the UI can surface the right hint.
        const msg = `${error.message ?? ''} ${(error as { details?: string }).details ?? ''}`;
        if (/email/i.test(msg)) return { ok: false, error: 'email-taken' };
        return { ok: false, error: 'name-taken' };
      }
      console.warn('[players] signUp error', error.message);
      return { ok: false, error: 'network' };
    }
    return { ok: true, player: data as PlayerRow };
  } catch (err) {
    console.warn('[players] signUp threw', err);
    return { ok: false, error: 'network' };
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
    const { data, error } = await client
      .from('players')
      .select('id, name, email, created_at, updated_at, passcode_hash')
      .eq('name_lower', handle.toLowerCase())
      .maybeSingle();
    if (error) {
      console.warn('[players] signIn error', error.message);
      return { ok: false, error: 'network' };
    }
    if (!data) return { ok: false, error: 'not-found' };
    const stored = (data as { passcode_hash?: string | null }).passcode_hash;
    if (!stored || stored !== passcode_hash) return { ok: false, error: 'wrong-passcode' };
    const { passcode_hash: _omit, ...rest } = data as PlayerRow & { passcode_hash: string };
    return { ok: true, player: rest };
  } catch (err) {
    console.warn('[players] signIn threw', err);
    return { ok: false, error: 'network' };
  }
}
