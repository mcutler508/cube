/**
 * Handle normalization + profanity filter. Ported from TimeTrace's auth.ts.
 * The word list is intentionally short — false positives ("scunthorpe"
 * problem) are worse than missing edge cases. Short tokens (<=3 chars)
 * require whole-handle match to avoid swallowing innocent names.
 */

export function normalizeHandle(name: string): string {
  // Lowercase at the client so we write a single canonical form to Supabase.
  // This makes the unique constraint on `players.name` sufficient to prevent
  // case-collision duplicates (e.g. "MikeC" vs "mikec") and lets sign-in use
  // a plain `.eq('name', handle)` filter without needing ilike or a separate
  // `name_lower` column. Tradeoff: the displayed handle is always lowercase.
  return name.trim().toLowerCase().slice(0, 20);
}

const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole',
  'bastard', 'whore', 'slut', 'wank', 'twat', 'jerkoff', 'jackoff',
  'nigger', 'nigga', 'faggot', 'fagot', 'retard', 'retarded', 'tranny',
  'kike', 'spic', 'chink', 'gook', 'wetback', 'beaner', 'paki',
  'rape', 'rapist', 'pedo', 'pedophile', 'molest', 'nazi', 'hitler',
  'cum', 'jizz', 'boner', 'penis', 'vagina', 'anal', 'anus', 'fellatio',
  'fap', 'milf', 'incel', 'kkk',
];

const SHORT_BANNED = ['ass', 'tit', 'fag'];

function leetNormalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[8]/g, 'b')
    .replace(/[(]/g, 'c')
    .replace(/[3]/g, 'e')
    .replace(/[6]/g, 'g')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[2]/g, 'z')
    .replace(/[^a-z]/g, '');
}

export function containsProfanity(name: string): boolean {
  const normalized = leetNormalize(name);
  if (!normalized) return false;
  for (const word of BANNED_WORDS) {
    if (normalized.includes(word)) return true;
  }
  for (const word of SHORT_BANNED) {
    if (normalized === word) return true;
  }
  return false;
}
