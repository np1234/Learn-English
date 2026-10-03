// Single source of truth for the learner profile and all progress.
//
// PERSISTENCE CONTRACT - read this before changing the shape below.
//
// Progress lives in localStorage, which is keyed by ORIGIN, not by file
// contents. So editing and re-deploying the app to the same URL keeps every
// bit of his progress; it even survives renaming the GitHub repo, because
// https://user.github.io/a/ and .../b/ share one origin. Only moving to a
// different domain loses it, which is what export/import is for.
//
// The thing that CAN destroy progress is a careless schema change here. Two
// guards against that:
//   1. loading deep-merges defaults under the stored data, so adding a nested
//      field later can never blank out a sibling that already exists;
//   2. every load snapshots the last good profile, so a bad migration can be
//      rolled back from the More tab instead of starting from zero.

import { LEVELS } from './content/sentences.js';
import { computeStreak } from './program.js';

const KEY = 'englishApp.profile.v1';
const SNAPSHOT_KEY = 'englishApp.profile.snapshot';
const SNAPSHOT_PREV_KEY = 'englishApp.profile.snapshot.prev';
const SNAPSHOT_AT_KEY = 'englishApp.profile.snapshotAt';
const SCHEMA_VERSION = 9;

/**
 * Today's date in the LEARNER'S timezone, as YYYY-MM-DD.
 * Deliberately not toISOString(), which is UTC: in Israel that rolls the day
 * over at 02:00-03:00 local, so a late-night session would count as yesterday
 * and quietly break the streak. en-CA formats as YYYY-MM-DD.
 */
function today(at = Date.now()) {
  return new Date(at).toLocaleDateString('en-CA');
}

function defaults() {
  return {
    version: SCHEMA_VERSION,
    // One learner for now, so the name is pre-filled rather than asked coldly.
    name: 'Elad',
    lang: 'he',                 // interface language; practice content stays English
    createdAt: new Date().toISOString(),
    onboarded: false,
    // captureMode: how recording and recognition are combined on THIS device
    // (see speech.js "capture strategy"); captureLearned is the order `auto`
    // currently uses; asrReason is why recognition failed in the last probe.
    caps: {
      tts: null, mic: null, asr: null, checkedAt: null,
      captureMode: 'auto', captureLearned: 'rec-first', asrReason: null,
    },
    // Compact diagnostics of the last attempts, newest last, plus running
    // totals - so a silent recognition failure on his phone is visible in the
    // export instead of vanishing. See recordCapture().
    captureLog: [],
    captureStats: { graded: 0, ungraded: 0, silentMisses: 0 },
    budget: { speech: 15, vocab: 5, sales: 10, listening: 5 },
    programMonths: 3,
    // Scheduled practice weekdays, 0=Sun..6=Sat; default Sun-Thu (Israel's
    // work week). `startedAt` anchors the program's week/phase numbering -
    // see program.js. Deliberately NOT nested under programMonths/budget:
    // the persistence contract forbids renaming a stored field, and this is
    // new, not a rename.
    program: { startedAt: null, days: [0, 1, 2, 3, 4] },
    levels: { speech: 'A2', vocab: 'A2', sales: 'A1', listening: 'A2' },
    placement: { done: false, takenAt: null, results: null },
    recent: { speech: [], vocab: [], sales: [], listening: [] },
    // Last few items shown per thin content bank (Shadow/Fluency/Sales/
    // Listening pickers), so a 2-3-item-per-level pool doesn't repeat the
    // exact same content every session - see content/pick.js and
    // recordShown() below. Not used by Repeat & Grade or Vocabulary: those
    // pools are large enough (70+ sentences, 224 FSRS-scheduled words) that
    // this problem doesn't apply to them.
    recentContent: { shadow: [], fluency: [], sales: [], listening: [], pitch: [] },
    // Progress checkpoints: [{ slot, week, at, accuracy|null, wpm|null }].
    checkpoints: [],
    phonemes: {},
    sessions: [],
    reviews: [],
    stats: { streak: 0, lastActiveDate: null, totalSeconds: 0, drillsDone: 0 },
    requests: [],
    lastBackupPrompt: null,
  };
}

/**
 * Fill in anything the stored profile is missing, at every depth.
 *
 * Arrays are treated as scalars, not merged element-by-element (the
 * `!Array.isArray` guards below skip the recursive branch for them) - a
 * stored array replaces the default wholesale. That is deliberate for
 * `program.days`: a set of scheduled weekdays should not "merge" with the
 * default, it should just be whatever was last saved.
 */
function deepMerge(base, stored) {
  if (!stored || typeof stored !== 'object') return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(stored)) {
    if (v === undefined) continue;
    const b = base[k];
    if (v && typeof v === 'object' && !Array.isArray(v) &&
        b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = deepMerge(b, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Carry older stored profiles forward. Never drops data. */
function migrate(stored) {
  const v = stored.version || 1;
  if (v < 2) {
    // v1 had no interface language and no name default.
    if (!stored.lang) stored.lang = 'he';
    if (!stored.name) stored.name = 'Elad';
  }
  if (v < 3) {
    // v2 had no program frame. Anchor it to the earliest date on record
    // rather than "now", so week/phase numbering reflects when he actually
    // started, not when this migration happened to run.
    if (!stored.program?.startedAt) {
      stored.program = {
        ...stored.program,
        startedAt: stored.createdAt || stored.placement?.takenAt || new Date().toISOString(),
      };
    }
  }
  if (v < 4) {
    // v3 had no vocabulary track. `reviews` was already declared (just
    // unused) and `recent.vocab` is a new nested default field, so
    // deepMerge() backfills both with no data to move - this case exists
    // only to document that v4 IS a real shape change and satisfy the
    // "always bump on a shape change" rule, not because anything here
    // needs rewriting.
  }
  if (v < 5) {
    // v4 had no sales track. `budget.sales`/`levels.sales` already existed
    // (unused until Section 4 wired a real drill to them) and `recent.sales`
    // is a new nested default field, so deepMerge() backfills it with no
    // data to move - this case exists only to document that v5 IS a real
    // shape change and satisfy the "always bump on a shape change" rule,
    // same as v4's no-op case above.
  }
  if (v < 6) {
    // v5 had no listening track. `budget.listening`/`levels.listening`/
    // `recent.listening` are all new nested defaults with nothing to move,
    // so this case exists only to document that v6 IS a real shape change,
    // same as the v4 and v5 no-op cases above.
  }
  if (v < 7) {
    // v6 had no recentContent (see defaults() above) - another new nested
    // default with nothing to move, same no-op pattern as v4/v5/v6.
  }
  if (v < 8) {
    // v7 had no capture strategy or diagnostics. caps.captureMode/
    // captureLearned/asrReason, captureLog and captureStats are new nested
    // defaults with nothing to move, so deepMerge() backfills them - this
    // case exists to document that v8 IS a real shape change, same as the
    // v4-v7 no-op cases above.
  }
  if (v < 9) {
    // v8 had no checkpoints and no recentContent.pitch - both new nested
    // defaults with nothing to move, so deepMerge() backfills them; this case
    // documents that v9 IS a real shape change, like the v4-v8 no-ops.
  }
  stored.version = SCHEMA_VERSION;
  return stored;
}

let profile = null;

function takeSnapshot(stored) {
  try {
    const last = Number(localStorage.getItem(SNAPSHOT_AT_KEY)) || 0;
    const versionChange = (stored.version || 1) !== SCHEMA_VERSION;
    if (!versionChange && Date.now() - last < 86400000) return;
    const cur = localStorage.getItem(SNAPSHOT_KEY);
    if (cur) localStorage.setItem(SNAPSHOT_PREV_KEY, cur);
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(stored));
    localStorage.setItem(SNAPSHOT_AT_KEY, String(Date.now()));
  } catch { /* full or blocked */ }
}

export function load() {
  if (profile) return profile;
  let stored = null;
  try {
    const raw = localStorage.getItem(KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }

  if (stored) {
    // Keep a good copy before touching anything - but NOT on every load:
    // overwriting each time meant a second reload after a bad migration
    // replaced the good copy with the bad one. Snapshot when the schema is
    // about to change or at most once a day, rotating the old one to .prev.
    takeSnapshot(stored);
    profile = deepMerge(defaults(), migrate(stored));
  } else {
    profile = defaults();
  }
  return profile;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch {
    // Quota or private-mode failure. The app keeps working in memory.
    return false;
  }
}

export function get() { return load(); }

export function update(patch) {
  load();
  Object.assign(profile, patch);
  save();
  return profile;
}

export function reset() {
  profile = defaults();
  save();
  return profile;
}

/** Roll back to the copy taken at the start of the previous session. */
export function hasSnapshot() {
  try { return !!localStorage.getItem(SNAPSHOT_KEY); } catch { return false; }
}

export function restoreSnapshot({ previous = false } = {}) {
  const raw = localStorage.getItem(previous ? SNAPSHOT_PREV_KEY : SNAPSHOT_KEY);
  if (!raw) throw new Error('no-snapshot');
  profile = deepMerge(defaults(), migrate(JSON.parse(raw)));
  save();
  return profile;
}

// ---------------------------------------------------------------- levels

export function levelIndex(level) {
  const i = LEVELS.indexOf(level);
  return i === -1 ? 2 : i;
}

export function stepLevel(level, delta) {
  const i = Math.max(0, Math.min(LEVELS.length - 1, levelIndex(level) + delta));
  return LEVELS[i];
}

/**
 * Adaptive step for a track. Sustained strong accuracy moves him up; a run of
 * weak accuracy eases him down. Deliberately slow to react - level thrash is
 * far more demoralising than being one level off.
 */
export function recordAccuracy(track, accuracy) {
  const p = load();
  const arr = p.recent[track] || (p.recent[track] = []);
  arr.push(accuracy);
  if (arr.length > 6) arr.shift();
  if (arr.length >= 4) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (avg >= 0.85) {
      p.levels[track] = stepLevel(p.levels[track], 1);
      p.recent[track] = [];
    } else if (avg < 0.6) {
      p.levels[track] = stepLevel(p.levels[track], -1);
      p.recent[track] = [];
    }
  }
  save();
  return p.levels[track];
}

// ------------------------------------------------------------- phonemes

/**
 * Record per-sound results from one attempt.
 *
 * Takes [{tag, accuracy, n}] from phonetics.tagScores(), where each tag is
 * scored ONLY on the words that actually contain it. The previous version
 * credited the whole sentence's accuracy to every tag, so one fumbled word
 * dragged down sounds the learner had said perfectly - which made the whole
 * "sounds to work on" list close to noise.
 *
 * `n` (how many words back the score) is used as the weight, so a tag observed
 * across four words counts for more than one seen once.
 */
export function recordTagScores(scores) {
  const p = load();
  for (const { tag, accuracy, n } of scores) {
    if (!tag || typeof accuracy !== 'number') continue;
    const weight = Math.max(1, Math.round(n || 1));
    const e = p.phonemes[tag] || (p.phonemes[tag] = { attempts: 0, score: 0 });
    e.attempts += weight;
    // Weighted running mean, so a bad day cannot erase a month of progress.
    e.score += (accuracy - e.score) * (weight / e.attempts);
  }
  save();
}

// ------------------------------------------------------ capture diagnostics

const CAPTURE_LOG_CAP = 20;

/**
 * Persist one attempt's diagnostics (from speech.js's onCaptureFinished).
 * `graded` is whether recognition produced a transcript. `silentMiss` marks
 * the one case that should change strategy: a real recording, recognition
 * supported and not blocked, yet no words - the signature of a start-order or
 * audio-session conflict rather than a permission problem.
 */
export function recordCapture(diag) {
  const p = load();
  const graded = !!diag.transcript;
  const status = diag.asr?.status;
  const silentMiss = !graded && status === 'no-speech' && diag.blobBytes > 0 && !diag.heardSpeech && diag.seconds >= 1.5;
  const stats = p.captureStats || (p.captureStats = { graded: 0, ungraded: 0, silentMisses: 0 });
  if (graded) { stats.graded += 1; stats.silentMisses = 0; }
  else if (status !== 'disabled') { stats.ungraded += 1; if (silentMiss) stats.silentMisses += 1; }
  const log = p.captureLog || (p.captureLog = []);
  log.push({
    at: diag.at, mode: diag.mode, seconds: diag.seconds, bytes: diag.blobBytes,
    words: diag.transcript ? diag.transcript.split(/\s+/).length : 0,
    status, error: diag.asr?.error || null, restarts: diag.restarts, errors: diag.errors,
    events: (diag.events || []).slice(0, 30),
  });
  if (log.length > CAPTURE_LOG_CAP) p.captureLog = log.slice(-CAPTURE_LOG_CAP);
  save();
  return { graded, silentMiss, stats };
}

// ------------------------------------------------------------ checkpoints

/** Save one progress checkpoint, replacing a retake of the same slot. */
export function recordCheckpoint({ slot, week, accuracy, wpm }) {
  const p = load();
  const list = (p.checkpoints || []).filter((c) => c.slot !== slot);
  list.push({ slot, week, at: Date.now(), accuracy: accuracy ?? null, wpm: wpm ?? null });
  list.sort((a, b) => a.slot - b.slot);
  p.checkpoints = list;
  save();
}

// -------------------------------------------------------- recent content

// Long enough to span several sessions' worth of picks (Shadow/Listening
// draw up to a few items per session) without growing unbounded; short
// enough that a bank finishing its fan-out pool (content/pick.js's minPool)
// still has room to come back around rather than excluding forever.
const RECENT_CONTENT_CAP = 8;

/** Record that `ids` were just shown for `track` (one of the keys in
 * profile.recentContent), so content/pick.js's pickers steer away from them
 * next time. A rolling window, not a full history - see RECENT_CONTENT_CAP. */
export function recordShown(track, ids) {
  const p = load();
  const cur = p.recentContent[track] || (p.recentContent[track] = []);
  p.recentContent[track] = [...cur, ...ids].slice(-RECENT_CONTENT_CAP);
  save();
}

/** The pronunciation targets he is currently weakest at, worst first. */
export function weakTags(limit = 3) {
  const p = load();
  // `perfect` is a clause-level grammar tag, not a sound to coach.
  const entries = Object.entries(p.phonemes).filter(([tag, e]) => tag !== 'perfect' && e.attempts >= 2);
  if (!entries.length) return ['th_unvoiced', 'w', 'v'].slice(0, limit);
  entries.sort((a, b) => a[1].score - b[1].score);
  return entries.slice(0, limit).map(([tag]) => tag);
}

// -------------------------------------------------------------- sessions

export function recordSession({ drill, track, seconds, accuracy, detail }) {
  const p = load();
  p.sessions.push({
    date: today(), at: Date.now(), drill, track,
    seconds: Math.round(seconds || 0),
    accuracy: accuracy ?? null,
    detail: detail ?? null,
  });
  if (p.sessions.length > 800) p.sessions = p.sessions.slice(-800);

  p.stats.totalSeconds += Math.round(seconds || 0);
  p.stats.drillsDone += 1;

  const d = today();
  p.stats.lastActiveDate = d;
  // Schedule-aware and re-derived from the session log itself, not from
  // "yesterday === lastActiveDate" - that ignores rest days and, worse, only
  // ever gets recomputed when a session happens, so it goes stale (still
  // reads "12 day streak" after an idle week). Still WRITTEN here so it is
  // available to the one place that reads it without re-deriving (the More
  // tab's request-by-email) - views that show it on screen should call
  // computeStreak() themselves so they are right even without a fresh session.
  p.stats.streak = computeStreak(p.sessions, p.program.days, Date.now()).current;
  save();
}

export function minutesToday() {
  const p = load();
  const d = today();
  const s = p.sessions.filter((x) => x.date === d)
    .reduce((a, b) => a + (b.seconds || 0), 0);
  return Math.round(s / 60);
}

// -------------------------------------------------------------- vocabulary

/** Read-only access to the FSRS review deck; write through saveReview(). */
export function getReviews() {
  return load().reviews;
}

/** Write one FSRS card back - replacing it by id if present, appending if new. */
export function saveReview(card) {
  const p = load();
  const idx = p.reviews.findIndex((c) => c.id === card.id);
  if (idx === -1) p.reviews.push(card);
  else p.reviews[idx] = card;
  save();
}

// -------------------------------------------------------- export/import

export function exportJSON() {
  return JSON.stringify(load(), null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !parsed.version) {
    throw new Error('bad-file');
  }
  profile = deepMerge(defaults(), migrate(parsed));
  save();
  return profile;
}

export { today };
