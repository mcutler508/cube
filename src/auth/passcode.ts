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
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    let h = 0;
    for (let i = 0; i < passcode.length; i++) {
      h = (h << 5) - h + passcode.charCodeAt(i);
      h |= 0;
    }
    return `fallback-${h.toString(16)}`;
  }
  const encoded = new TextEncoder().encode(`cube-passcode:${passcode}`);
  const buf = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
