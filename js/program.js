// The program is a designed curriculum arc, not a flat daily rotation.
//
// Three phases over the program window - Foundation, Building, Integration -
// each changing (a) which two drills run each day and (b) how narrowly
// Repeat & Grade concentrates on weak sounds. Foundation withholds Fluency
// Sprint on purpose: drilling speed on sounds that are still wrong just
// automates the error, so accuracy comes first (the same ordering already
// encoded in drills/common.js's bestTag() priority list). Building introduces
// speed and rhythm once accuracy has a base. Integration broadens back out
// and leans on all three so the gains hold up with less scaffolding. The
// evidence behind that ordering - shadowing's rhythm/prosody gains, the 4/3/2
// speech-rate findings, pushed-output research - is the same evidence already
// cited in README.md; this module just sequences it instead of running every
// drill every day regardless of where he is in the program.
//
// Everything here is a PURE function over data the caller already has
// (profile.sessions, profile.program, profile.programMonths, profile.budget).
// Nothing about the plan, phase, streak or calendar is itself stored, so
// nothing can drift from what actually happened - see the persistence
// contract at the top of state.js. This module deliberately does not import
// state.js (state.js will import THIS module to derive the streak), so a
// small today()-equivalent is duplicated below rather than shared.

const DAY_MS = 86400000;
const WEEK_DAYS = 7;
const WEEKS_PER_MONTH = 4.345;
// Sessions are capped at 800 in state.js; that bounds how far back a real
// streak/calendar walk ever needs to go, so it's reused here as a safe
// iteration ceiling against runaway loops on a corrupt date.
const MAX_WALK_DAYS = 800;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Same YYYY-MM-DD-in-local-time format as state.js's today() - deliberately
 * not toISOString(), so a late-night Israel session lands on the right date. */
function ymd(d) {
  return new Date(d).toLocaleDateString('en-CA');
}

function localDayStart(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Add `n` calendar days in LOCAL time - NOT `d.getTime() + n * DAY_MS`. Israel's
 * DST fall-back day has 25 local hours; a fixed-ms step from local midnight
 * lands at 23:00 the same calendar day instead of crossing into the next one,
 * which silently duplicated a date (and dropped the day after it) across that
 * boundary. setDate() is DST-aware because it operates on local calendar
 * fields, not absolute time.
 */
function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// ---------------------------------------------------------------- calendar

/** Whole local days between `startedAt` and `date` (0 on the start day). */
export function dayIndex(startedAt, date = new Date()) {
  if (!startedAt) return 0;
  const start = localDayStart(new Date(startedAt));
  const at = localDayStart(new Date(date));
  return Math.round((at - start) / DAY_MS);
}

/** Is this weekday one of the scheduled practice days? Falls back to Sun-Thu. */
export function isScheduled(programDays, date = new Date()) {
  const days = programDays && programDays.length ? programDays : [0, 1, 2, 3, 4];
  return days.includes(new Date(date).getDay());
}

// ------------------------------------------------------------------ phases

export function totalWeeks(programMonths) {
  return Math.max(1, Math.round((programMonths || 3) * WEEKS_PER_MONTH));
}

/**
 * 1-indexed week ranges per phase, e.g. { foundation: [1,3], building: [4,10],
 * integration: [11,13] } for a 13-week (3-month) program.
 *
 * Foundation and Integration are capped at 2-4 weeks even on a 6-month
 * program: concentrated accuracy work stops paying off well before week 6,
 * and the closing phase should not thin out just because the program is
 * long. Whatever is left in the middle is Building.
 */
export function phaseBounds(weeks) {
  const foundation = clamp(Math.round(weeks * 0.25), 2, 4);
  const integration = clamp(Math.round(weeks * 0.2), 2, 4);
  const building = Math.max(1, weeks - foundation - integration);
  return {
    foundation: [1, foundation],
    building: [foundation + 1, foundation + building],
    integration: [foundation + building + 1, weeks],
  };
}

/** Which phase a given 1-indexed program-week falls in. Past the end, stays Integration. */
export function phaseFor(week, weeks) {
  const b = phaseBounds(weeks);
  if (week <= b.foundation[1]) return 'foundation';
  if (week <= b.building[1]) return 'building';
  return 'integration';
}

/**
 * How many weak-sound tags Repeat & Grade draws on (see pickSentences in
 * content/sentences.js, which scores sentences by overlap with this list).
 * Foundation: narrow and intense. Integration: a wide net so no 2-3 sounds
 * can monopolise the set - see program.js's module comment for why this
 * stops short of claiming to "revisit sounds that were weak earlier": the
 * stored phoneme scores are a running mean, not a history, so that
 * distinction cannot honestly be made from the data this app keeps.
 */
export function tagLimitForPhase(phase) {
  if (phase === 'foundation') return 2;
  if (phase === 'integration') return 5;
  return 3;
}

/** Full program frame for a date: week number, phase, its range, program end. */
export function programFrame(profile, date = new Date()) {
  const startedAt = profile.program?.startedAt || profile.createdAt || new Date().toISOString();
  const weeks = totalWeeks(profile.programMonths);
  const idx = dayIndex(startedAt, date);
  const week = clamp(Math.floor(idx / WEEK_DAYS) + 1, 1, weeks);
  const phase = phaseFor(week, weeks);
  const bounds = phaseBounds(weeks);
  const endDate = addDays(localDayStart(new Date(startedAt)), weeks * WEEK_DAYS);
  return {
    week,
    totalWeeks: weeks,
    phase,
    phaseRange: bounds[phase],
    endDate,
    complete: idx >= weeks * WEEK_DAYS,
  };
}

// -------------------------------------------------------------- daily plan

// Foundation: only two drill types, every day - simple enough to sit through
// while the first weeks concentrate on accuracy.
const FOUNDATION_PAIR = ['repeat', 'shadow'];

// Building: Repeat & Grade anchors every day; the second slot alternates
// Shadow/Fluency by day index once accuracy has a base to build speed on.
const BUILDING_SECOND = ['shadow', 'fluency'];

// Integration: a fixed 6-day cycle (not independent mod-2/mod-3 rotations,
// which collide into same-drill days on a regular schedule) covering Repeat,
// Shadow and Fluency evenly - 4 of 6 days each - with no day ever repeating
// a drill in both slots.
const INTEGRATION_CYCLE = [
  ['repeat', 'fluency'],
  ['shadow', 'fluency'],
  ['repeat', 'shadow'],
  ['fluency', 'shadow'],
  ['repeat', 'fluency'],
  ['shadow', 'repeat'],
];

/**
 * Today's plan: [{ drill, minutes }] - the two-drill speech pair, plus a
 * third, parallel vocabulary slot when budget.vocab is set, plus a fourth,
 * parallel sales slot when budget.sales is set. Deterministic in `date`, so
 * a reload mid-session reproduces the identical plan - nothing here is
 * stored. Minutes split budget.speech 60/40, floored at 3 each so a small
 * budget still yields two honest slots.
 *
 * Vocabulary, Sales Mode and Listening are NOT part of the speech pair
 * rotation above - none of them compete with repeat/shadow/fluency for a
 * slot. Vocabulary stays unaware of profile.reviews (the due count is
 * Today's business, not the plan's - see vocab.js). Sales Mode (track C) is
 * a fixed-length scripted scenario picked fresh each session, not a growing
 * deck like vocab's FSRS queue, so unlike vocab it needs no due-count/
 * backlog awareness at all - and unlike the speech pair, it is a different
 * skill axis entirely (conversational judgment, not phonetic accuracy), so
 * it is not phase-gated either: Foundation withholds Fluency Sprint because
 * drilling speed on still-wrong sounds automates the error, a concern
 * specific to the accuracy-focused speech track that simply doesn't apply
 * here. Listening (track D) is budget-gated the same way, for the same
 * reason: comprehension is a receptive skill, not phonetic production, so
 * there is no "automating a wrong sound" risk to withhold it against either,
 * and - like Sales Mode - each session is a fresh, independent set of
 * passages rather than a backlog that needs pacing.
 */
export function planFor(profile, date = new Date()) {
  const frame = programFrame(profile, date);
  const idx = Math.max(0, dayIndex(profile.program?.startedAt, date));
  const budget = Math.max(0, profile.budget?.speech || 0);

  let pair;
  if (frame.phase === 'foundation') pair = FOUNDATION_PAIR;
  else if (frame.phase === 'building') pair = ['repeat', BUILDING_SECOND[idx % 2]];
  else pair = INTEGRATION_CYCLE[idx % INTEGRATION_CYCLE.length];

  const plan = [];
  if (budget > 0) {
    const minA = Math.max(3, Math.round(budget * 0.6));
    const minB = Math.max(3, budget - minA);
    plan.push({ drill: pair[0], minutes: minA }, { drill: pair[1], minutes: minB });
  }

  const vocabMinutes = Math.max(0, profile.budget?.vocab || 0);
  if (vocabMinutes > 0) plan.push({ drill: 'vocab', minutes: vocabMinutes });

  const salesMinutes = Math.max(0, profile.budget?.sales || 0);
  if (salesMinutes > 0) plan.push({ drill: 'sales', minutes: salesMinutes });

  const listeningMinutes = Math.max(0, profile.budget?.listening || 0);
  if (listeningMinutes > 0) plan.push({ drill: 'listening', minutes: listeningMinutes });

  return plan;
}

// ------------------------------------------------------------ streak & log

function activeDateSet(sessions) {
  return new Set(sessions.map((s) => s.date));
}

/**
 * Schedule-aware streak. A rest day is skipped - neither breaking nor
 * extending the run - so resting on a day off never costs him anything. If
 * `date` itself is a scheduled day with no session yet, that's treated as
 * still in progress rather than a break (this is what makes the number right
 * to show mid-day, before he's done anything).
 */
export function computeStreak(sessions, programDays, date = new Date()) {
  const active = activeDateSet(sessions);
  const days = programDays && programDays.length ? programDays : [0, 1, 2, 3, 4];
  const todayKey = ymd(date);

  let current = 0;
  let cursor = localDayStart(date);
  for (let i = 0; i < MAX_WALK_DAYS; i++) {
    const key = ymd(cursor);
    if (days.includes(cursor.getDay())) {
      if (active.has(key)) current += 1;
      else if (key !== todayKey) break; // a scheduled day with nothing on it: the run is over
      // else: today, not yet practiced - in progress, don't break and don't count.
    }
    cursor = addDays(cursor, -1);
  }

  let longest = current;
  const allDates = [...active].sort();
  if (allDates.length) {
    let run = 0;
    let day = localDayStart(new Date(allDates[0]));
    const end = localDayStart(date);
    for (let i = 0; i < MAX_WALK_DAYS && day <= end; i++) {
      if (days.includes(day.getDay())) {
        if (active.has(ymd(day))) { run += 1; longest = Math.max(longest, run); }
        else run = 0;
      }
      day = addDays(day, 1);
    }
  }

  return { current, longest };
}

/**
 * Consecutive scheduled days before `date` (not counting today) with nothing
 * recorded. Stops at `startedAt` - there is no such thing as a "missed" day
 * before the program began. Without this bound, a brand-new profile with
 * zero sessions ever has nothing to break the backward walk, so it ran the
 * full MAX_WALK_DAYS ceiling and reported ~571 "missed" days on day one -
 * caught by actually running fresh onboarding end to end, not just unit
 * checks against synthetic histories that always had at least one session.
 */
export function missedRun(sessions, programDays, date = new Date(), startedAt = null) {
  const active = activeDateSet(sessions);
  const days = programDays && programDays.length ? programDays : [0, 1, 2, 3, 4];
  const start = startedAt ? localDayStart(new Date(startedAt)) : null;
  let missed = 0;
  let cursor = addDays(localDayStart(date), -1);
  for (let i = 0; i < MAX_WALK_DAYS; i++) {
    if (start && cursor < start) break;
    if (days.includes(cursor.getDay())) {
      if (active.has(ymd(cursor))) break;
      missed += 1;
    }
    cursor = addDays(cursor, -1);
  }
  return missed;
}

/** Per-day record from `from` to `to` inclusive, for the calendar grid. */
export function dayHistory(sessions, programDays, from, to) {
  const days = programDays && programDays.length ? programDays : [0, 1, 2, 3, 4];
  const byDate = new Map();
  for (const s of sessions) {
    const e = byDate.get(s.date) || { minutes: 0, drills: [] };
    e.minutes += Math.round((s.seconds || 0) / 60);
    e.drills.push(s.drill);
    byDate.set(s.date, e);
  }

  const out = [];
  let cursor = localDayStart(new Date(from));
  const end = localDayStart(new Date(to));
  for (let i = 0; i < MAX_WALK_DAYS && cursor <= end; i++) {
    const key = ymd(cursor);
    const rec = byDate.get(key);
    out.push({
      date: key,
      minutes: rec ? rec.minutes : 0,
      drills: rec ? rec.drills : [],
      scheduled: days.includes(cursor.getDay()),
      met: !!rec,
    });
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Days practised out of days scheduled since the program started, through `date`. */
export function adherence(sessions, program, date = new Date()) {
  const startedAt = program?.startedAt;
  if (!startedAt) return { practised: 0, scheduledSoFar: 0, pct: 0 };
  const hist = dayHistory(sessions, program.days, startedAt, date);
  const scheduledSoFar = hist.filter((d) => d.scheduled).length;
  const practised = hist.filter((d) => d.scheduled && d.met).length;
  return { practised, scheduledSoFar, pct: scheduledSoFar ? Math.round((practised / scheduledSoFar) * 100) : 0 };
}

export { ymd };
