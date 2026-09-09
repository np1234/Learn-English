// Shared content-selection helper for thin, level-keyed content banks
// (Shadow passages, Fluency prompts, Sales scenarios, Listening passages).
//
// Two problems, one cause: several of these banks only have 2-3 items per
// level, and every picker drew fresh with plain Math.random() and no memory
// of what ran last session - so a learner sitting at one level for weeks
// (which is the normal case) sees the exact same 2 Shadow passages, reshuffled,
// every single day. content/listening.js's pickPassages() already solved half
// of this with cross-level fan-out; this module generalizes that pattern and
// adds the other half - excluding whatever was shown most recently - so every
// thin bank gets both fixes instead of reimplementing them per file.
//
// `keyFn` lets the same helpers work over plain-string banks (Shadow,
// Fluency - the string itself is a stable id) and object banks with an
// explicit `.id` (Sales, Listening) without normalizing either one's shape.

/**
 * Collect items from `bank[level]`, then bank[level+1], bank[level-1], ...
 * outward, until at least `minPool` distinct items are gathered or the bank
 * is exhausted. `minPool` should be bigger than what a single session picks
 * - otherwise fan-out never actually triggers, since the current level alone
 * already satisfies a same-sized request.
 */
export function fanOut(bank, LEVELS, level, minPool, keyFn = (x) => x) {
  const idx = Math.max(0, LEVELS.indexOf(level));
  const offsets = [0];
  for (let d = 1; d < LEVELS.length; d++) offsets.push(d, -d);

  const pool = [];
  const seen = new Set();
  for (const off of offsets) {
    const lvl = LEVELS[idx + off];
    if (!lvl || !bank[lvl]) continue;
    for (const item of bank[lvl]) {
      const key = keyFn(item);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(item);
    }
    if (pool.length >= minPool) break;
  }
  return pool;
}

/**
 * Pick `n` items from `pool`, preferring ones not in `excludeKeys` (the
 * recently-shown list). Falls back to the full pool when exclusion would
 * leave fewer than `n` candidates - a stale or oversized exclusion list
 * must never block a session outright, just steer it away from repeats
 * while there's still room to.
 */
export function pickFresh(pool, excludeKeys, n, keyFn = (x) => x) {
  const fresh = pool.filter((item) => !excludeKeys.includes(keyFn(item)));
  const source = fresh.length >= n ? fresh : pool;
  const shuffled = source.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}
