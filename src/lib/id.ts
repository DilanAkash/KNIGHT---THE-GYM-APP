const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Time-ordered id. The timestamp prefix means ids sort chronologically, which
 * saves an ORDER BY on a few hot queries. Local-only app, single writer —
 * collision risk here is not worth a crypto dependency.
 */
export function createId(prefix = ''): string {
  let stamp = '';
  let t = Date.now();
  while (t > 0) {
    stamp = ALPHABET[t % 36] + stamp;
    t = Math.floor(t / 36);
  }
  let rand = '';
  for (let i = 0; i < 8; i += 1) {
    rand += ALPHABET[Math.floor(Math.random() * 36)];
  }
  return `${prefix}${stamp}${rand}`;
}
