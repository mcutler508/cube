/**
 * SHA-256 passcode hashing. Not security-grade — a 4-digit passcode is
 * brute-forceable — but enough to keep a handle tied to a device that knows
 * the code. Salt prefix scopes hashes to this app so a passcode reused on
 * another Supabase project produces a different hash.
 */

export function isValidPasscode(passcode: string): boolean {
  return /^\d{4}$/.test(passcode);
}

export async function hashPasscode(passcode: string): Promise<string> {
  // No non-crypto fallback: a djb2 hash would produce a value shaped nothing
  // like a SHA-256 hex digest, so any deploy over plain HTTP (where
  // `crypto.subtle` is unavailable) would silently break every sign-in for
  // accounts that were created in a secure context. Fail loudly instead.
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('passcode hashing requires a secure context (HTTPS or localhost)');
  }
  const encoded = new TextEncoder().encode(`cube-passcode:${passcode}`);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
