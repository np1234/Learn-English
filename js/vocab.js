// Track B curriculum: the program.js of vocabulary.
//
// Pure functions over profile.reviews + profile.program + profile.budget and
// the word bank in content/vocab.js. Nothing here is stored - the due queue,
// the intake count and the stats are all recomputed on every read, exactly
// like program.js, so nothing about them can drift from what
// profile.reviews actually records.
//
// Three gaps versus srs.js, all closed here rather than in srs.js itself
// (srs.js stays untouched and generic):
//
// 1. srs.js is timestamp-based (`card.due <= Date.now()`), but the rest of
//    this app is local-calendar-based (state.js's today(), program.js's
//    ymd()) precisely because Israel's UTC day rolls over at 02:00-03:00
//    local. A card reviewed at 22:00 with a 1-day interval is not due (by
//    srs.isDue's own math) until 22:00 the next day - so opening the app at
//    08:00 the next morning would show it as not due yet, which is wrong:
//    it IS due that calendar day. dueToday() below evaluates against the
//    end of the local day instead, the same discipline as today()/ymd().
// 2. AGAIN re-queues a card ~10 minutes out (see srs.js's review()) - i.e.
//    within the same sitting, not "tomorrow". buildQueue() returns a
//    snapshot; the drill itself re-inserts a graded-Again card a few
//    positions later in its own in-memory queue, because a static list
//    returned once at the start of a session can't represent "come back
//    soon" - see js/drills/vocab.js.
// 3. srs.js has no notion of a "day's quota" at all - newPerDay() is a
//    concept THIS module invents, so nothing tracks how many new cards were
//    already introduced today. Without gap 3's fix, re-entering the drill
//    twice in one day (finishing early, or just going back for more) would
//    hand out a full fresh newPerDay(phase) again, since intakeFor() only
//    ever looked at the due backlog - confirmed concretely: a full Foundation
//    session (3 new words, all graded Good) followed immediately by a second
//    same-day session drew 3 MORE brand-new words instead of recognizing the
//    day's quota was already spent. Every freshly created card is stamped
//    with today's date in its `meta` (srs.review() carries meta through
//    untouched, so it survives every future grade), and intakeFor()
//    subtracts that count from the day's quota before applying backlog
//    throttling.

import { isDue, newCard } from './srs.js';
import { pickNew } from './content/vocab.js';
import { programFrame } from './program.js';

function localDayEnd(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// Same YYYY-MM-DD-in-local-time format as state.js's today() / program.js's
// ymd() - duplicated rather than imported, matching program.js's own
// precedent (see its module comment) for the same reason: keeping this
// module a leaf with no dependency on state.js.
function ymd(date) {
  return new Date(date).toLocaleDateString('en-CA');
}

/** How many cards already in `reviews` were first introduced on `now`'s local day. */
function introducedToday(reviews, now) {
  const todayKey = ymd(now);
  return reviews.filter((c) => c.meta?.introducedOn === todayKey).length;
}

/**
 * Cards due by the end of `now`'s local calendar day, oldest-due first -
 * see gap 1 in the module comment above. Never compare card.due against a
 * bare Date.now(); always go through here.
 */
export function dueToday(reviews, now = new Date()) {
  const end = localDayEnd(now);
  return reviews.filter((c) => isDue(c, end)).sort((a, b) => (a.due || 0) - (b.due || 0));
}

/** A card whose most recent grade was AGAIN - srs.js sets intervalDays to 0
 * only on an AGAIN grade, so this reads that back without any extra state. */
export function isLapsed(card) {
  return !!card.reps && card.intervalDays === 0;
}

/**
 * New cards introduced per day, by program phase - the vocabulary analogue
 * of program.js's tagLimitForPhase(). Foundation stays light because sounds
 * are the focus in the opening weeks and vocabulary should not compete for
 * that attention; Building ramps once that base exists, mirroring where the
 * speech track also broadens; Integration stops adding new cards entirely
 * and consolidates what is already there - the same reasoning as
 * withholding Fluency Sprint in Foundation: a card introduced with two
 * weeks left in the program gets logged, not learned.
 */
export function newPerDay(phase) {
  if (phase === 'foundation') return 3;
  if (phase === 'building') return 5;
  return 0; // integration
}

// Backlog thresholds that throttle intake down to zero - the vocabulary
// equivalent of missedRun()'s honesty about what "caught up" means. After a
// missed week the due pile is the priority; adding new cards on top of a
// large backlog is exactly how spaced-repetition decks die.
const BACKLOG_TAPER_START = 15;
const BACKLOG_STOP = 40;

/**
 * How many NEW cards to introduce today: the phase's daily quota, minus
 * whatever of that quota is already spent (see gap 3 above), then throttled
 * by the current due backlog.
 */
export function intakeFor(profile, now = new Date()) {
  const frame = programFrame(profile, now);
  const base = newPerDay(frame.phase);
  if (!base) return 0;
  const reviews = profile.reviews || [];
  const remaining = Math.max(0, base - introducedToday(reviews, now));
  if (!remaining) return 0;
  const backlog = dueToday(reviews, now).length;
  if (backlog >= BACKLOG_STOP) return 0;
  if (backlog <= BACKLOG_TAPER_START) return remaining;
  const fraction = 1 - (backlog - BACKLOG_TAPER_START) / (BACKLOG_STOP - BACKLOG_TAPER_START);
  return Math.max(0, Math.min(remaining, Math.round(base * fraction)));
}

const MIN_QUEUE = 4;
const MAX_QUEUE = 24;
// New and lapsed cards cost a full record-and-grade cycle; every other due
// card is a fast silent tap. Weighting the spoken ones 2x keeps the queue
// size honest about what budget.vocab minutes can actually fit, at roughly
// 6 fast cards per minute.
const SPOKEN_WEIGHT = 2;
const CARDS_PER_MINUTE = 6;

/**
 * Today's review queue, oldest-due first, capped by budget.vocab and
 * topped up with new cards when there's room. Returns full card objects;
 * new entries are NOT yet in profile.reviews (srs.newCard() only, not
 * persisted) until the drill grades them for the first time.
 */
export function buildQueue(profile, now = new Date()) {
  const reviews = profile.reviews || [];
  const due = dueToday(reviews, now);
  const minutes = Math.max(0, profile.budget?.vocab || 0);
  const cap = Math.max(MIN_QUEUE, Math.min(MAX_QUEUE, Math.round(minutes * CARDS_PER_MINUTE)));

  const queue = [];
  let weight = 0;
  for (const card of due) {
    const cost = isLapsed(card) ? SPOKEN_WEIGHT : 1;
    if (weight + cost > cap) break;
    queue.push(card);
    weight += cost;
  }

  if (weight < cap) {
    const seenIds = new Set(reviews.map((c) => c.id));
    const level = profile.levels?.vocab || 'A2';
    const room = Math.floor((cap - weight) / SPOKEN_WEIGHT);
    const wantNew = Math.min(intakeFor(profile, now), room);
    if (wantNew > 0) {
      const fresh = pickNew(level, wantNew, seenIds)
        .map((entry) => newCard(entry.id, { level, introducedOn: ymd(now) }));
      queue.push(...fresh);
    }
  }

  return queue;
}

/** Cards budget.vocab has room for today - what Today's task badge shows. */
export function queueSize(profile, now = new Date()) {
  return buildQueue(profile, now).length;
}

const MATURE_STABILITY_DAYS = 21;

/** Learned / mature / due-tomorrow counts, for the Progress vocabulary card. */
export function stats(reviews, now = new Date()) {
  const learned = reviews.filter((c) => c.reps > 0).length;
  const mature = reviews.filter((c) => (c.stability || 0) >= MATURE_STABILITY_DAYS).length;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueTomorrow = Math.max(0, dueToday(reviews, tomorrow).length - dueToday(reviews, now).length);
  return { learned, mature, dueTomorrow };
}
