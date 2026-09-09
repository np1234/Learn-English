// FSRS-lite: a compact implementation of the Free Spaced Repetition Scheduler.
//
// Spaced practice is the single best-evidenced lever in this whole app - a
// meta-analysis across 48 experiments and 3,411 second-language learners found a
// medium-to-large advantage for spacing over massed practice. FSRS is used in
// preference to SM-2 because it needs roughly 20-30% fewer reviews for the same
// retention by modelling stability and difficulty per item.
//
// Written inline with no dependencies: this app has no build step.

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.0310,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.5870, 0.2272, 2.8755,
];

const DECAY = -0.5;
const FACTOR = 19 / 81;
const REQUEST_RETENTION = 0.9;
const DAY_MS = 86400000;

// Grades, as the UI presents them.
export const AGAIN = 1, HARD = 2, GOOD = 3, EASY = 4;

const clampD = (d) => Math.min(10, Math.max(1, d));

/** Probability of recall after `elapsedDays` at stability `s`. */
export function retrievability(elapsedDays, s) {
  if (!s || s <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / s, DECAY);
}

/** Days until recall probability falls to REQUEST_RETENTION. */
function intervalFor(s) {
  const days = (s / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(days));
}

export function newCard(id, meta = {}) {
  return {
    id,
    meta,
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    due: Date.now(),
    lastReview: null,
  };
}

function initialStability(grade) {
  return Math.max(0.1, W[grade - 1]);
}

function initialDifficulty(grade) {
  return clampD(W[4] - (grade - 3) * W[5]);
}

function nextDifficulty(d, grade) {
  const next = d - W[6] * (grade - 3);
  // Mean-reversion toward the "easy" baseline keeps difficulty from drifting.
  return clampD(W[7] * initialDifficulty(EASY) + (1 - W[7]) * next);
}

function stabilityAfterRecall(d, s, r, grade) {
  const hard = grade === HARD ? W[15] : 1;
  const easy = grade === EASY ? W[16] : 1;
  const inc = Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) *
              (Math.exp(W[10] * (1 - r)) - 1) * hard * easy;
  return s * (1 + inc);
}

function stabilityAfterLapse(d, s, r) {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) *
         Math.exp(W[14] * (1 - r));
}

/**
 * Apply one review. Returns a NEW card object; the input is not mutated.
 * `grade` is AGAIN | HARD | GOOD | EASY.
 */
export function review(card, grade, now = Date.now()) {
  const c = { ...card };

  if (!c.reps || !c.stability) {
    c.stability = initialStability(grade);
    c.difficulty = initialDifficulty(grade);
  } else {
    const elapsedDays = c.lastReview ? (now - c.lastReview) / DAY_MS : 0;
    const r = retrievability(elapsedDays, c.stability);
    c.difficulty = nextDifficulty(c.difficulty, grade);
    c.stability = grade === AGAIN
      ? stabilityAfterLapse(c.difficulty, c.stability, r)
      : stabilityAfterRecall(c.difficulty, c.stability, r, grade);
    if (grade === AGAIN) c.lapses = (c.lapses || 0) + 1;
  }

  c.stability = Math.max(0.1, c.stability);
  c.reps = (c.reps || 0) + 1;
  c.lastReview = now;
  // A lapse comes back inside the same session rather than tomorrow.
  c.due = grade === AGAIN ? now + 10 * 60 * 1000 : now + intervalFor(c.stability) * DAY_MS;
  c.intervalDays = grade === AGAIN ? 0 : intervalFor(c.stability);
  return c;
}

export function isDue(card, now = Date.now()) {
  return !card.due || card.due <= now;
}

export function dueCards(cards, now = Date.now()) {
  return cards.filter((c) => isDue(c, now)).sort((a, b) => (a.due || 0) - (b.due || 0));
}

/** Map a pronunciation accuracy (0-1) onto a review grade. */
export function gradeFromAccuracy(accuracy) {
  if (accuracy === null || accuracy === undefined) return GOOD; // unscored attempt
  if (accuracy >= 0.9) return EASY;
  if (accuracy >= 0.75) return GOOD;
  if (accuracy >= 0.5) return HARD;
  return AGAIN;
}
