# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A private English-learning web app for **one learner** (Elad: Hebrew L1, iPhone, moving into
sales). No accounts, no backend, no build step, no dependencies — plain HTML/CSS/ES modules
served as static files. Shipped in five sections, one at a time; **Section 1 (onboarding,
placement, three speech drills), Section 2 (a designed 3-month program, calendar, richer
progress), Section 3 (vocabulary, track B), Section 4 (Sales Mode, track C) and Section 5
(Listening comprehension, track D) are all done.** See `README.md` for the section roadmap and
"Listening comprehension track" / "Sales Mode track" below for how each works.

## Commands

```bash
py -3 -m http.server 8123
```

- `python` on this machine is the Microsoft Store stub and always exits 49 — **`py -3` is the
  real interpreter** (3.8.6). Node/npm are not installed, which is why there is no build step.
- **Never test by opening `index.html` directly.** A `file://` page is not a secure context, so
  `getUserMedia` is blocked and every speaking drill dies. Use `http://localhost:8123`;
  `localhost` counts as secure.

### Testing

**`http://localhost:<port>/tests/index.html`** runs ~57 in-browser tests (no dependencies; refuses
to run off localhost because it writes localStorage, which it snapshots and restores). Suites:
scoring, content integrity (tag bank, one-best sales turns, best-not-longest, volume), i18n parity,
program/DST, capture engine with fake media, **drills run in a hidden iframe with a fake
`getUserMedia`/`MediaRecorder`/`SpeechRecognition`** (scored, cut-off, no-words, blocked, zero-
attempt End session, retry counting, numbers/pitch/checkpoint), state migration, and the deploy
stamp. Read the result with `get_page_text` or `document.getElementById('summary')`. The drill
iframe imports plain module URLs, so on a port that has seen older code the browser can serve
stale modules - use one of the `english-app-fresh*` launch configs (each a new port) when results
look impossible. The app itself is immune once stamped (see "Deploy stamp").

There is no lint config and no CI. Ad-hoc checks: load the app in a browser and execute modules in
the page context — cache-bust the import when a file has changed on disk:

```js
const sc = await import('/js/scoring.js?v=2');
sc.scoreAttempt('I think the weather is very warm.', 'I sink the vether is very varm', 4);
```

Two traps when testing this way:

- **Any two import URLs that differ only by query string are separate module instances with
  separate module-level state** — not just `state.js`. Verified concretely: importing
  `i18n.js?x=1` and calling `setLang('he')` on it has zero effect on `common.js`'s internal
  `import '../i18n.js'` (no query string), because they're different instances of the same file.
  When testing anything language-dependent, cross-drill, or otherwise stateful, import every
  module under the SAME plain (non-cache-busted) path the app itself uses — mixing a
  cache-busted diagnostic import with the app's own plain import silently tests against a
  disconnected copy. To change app state instead, write `localStorage` directly and reload.
- After editing a file, the browser still holds the **old module** for the un-queried URL. A
  plain `fetch('/js/app.js')` is cached too. Hard-reload before trusting a check.
- Syntax-check everything by importing each module with a unique query string; a parse error
  rejects. Worth doing after any bulk edit — a stray apostrophe inside a Hebrew string in
  `i18n.js` silently broke five modules at once.
- `location.reload()` inside an evaluated script kills the inspector context. Reload in one
  call, assert in the next.
- **The plain `js/app.js` URL (no query string) can stay cached hard enough to survive
  `location.reload(true)`, a brand-new tab, and even a brand-new browser preview session** -
  confirmed via the Resource Timing API (`transferSize: 0` on the stale load, and a
  `decodedBodySize` smaller than the file's real current size). None of the usual tricks fixed
  it. What actually works: serve from a **different port** (a origin with zero cache history is
  guaranteed fresh). If a change genuinely isn't showing up in the browser no matter what you
  try, suspect this before suspecting the code - verify the served bytes with a cache-busted
  `fetch()`/`import()` (which correctly bypass this) against what you expect first.

The browser pane blocks microphone access, so **recording and speech recognition can only be
verified on a real device.** Only the failure paths are testable here.

## Architecture

### The one rule: recognition is a bonus, never a dependency

iOS speech recognition is unreliable (`continuous = true` never returns on iPhone; sources
conflict on whether it works there at all). So every drill has two tiers:

- **Tier 1, always works** — `speechSynthesis` plays the model, `MediaRecorder` captures him,
  and he compares the two by ear. This alone is a complete, evidence-backed product.
- **Tier 2, when ASR happens to work** — `scoreAttempt()` diffs the transcript against the
  target for word-level feedback.

`scoreAttempt()` returns `{scored: false, accuracy: null}` rather than throwing when there is no
transcript. **Any new drill must render sensibly for `scored: false`** — no dead buttons, no
apology copy. The Sound Check probes the real device and stores the outcome in `profile.caps`.

### Speech engine (`js/speech.js`)

- **Never use `speak(text, {rate})` for slow playback.** Windows/Chrome SAPI compresses `rate`
  hard — measured as ratios against normal speed: `0.7`→**0.90×** (no slower at all), `0.5`→1.32×,
  `0.3`→1.67×. Use **`speakSlow()`**, which drops the rate *and* splits into chunks spoken as
  separate utterances, each ending in a comma so the engine inserts a real pause. Default
  `rate 0.5` + 2-word chunks = **2.73×**. Shadow overrides to 5–8 word chunks because rhythm is
  the point there. One word per chunk is too slow to sit through.
- **How recording and recognition are combined is a per-device fact** (`speech.js` "capture
  strategy"): `both-rec-first`, `both-asr-first` (recognition starts synchronously inside the tap,
  before `getUserMedia`), `asr-only`, `record-only`. `auto` (default) uses one of the two "both"
  orders and `app.js`'s `learnFromCapture()` flips it after two silent misses in a row (a real
  recording, recognition supported, no error, no words). `#/diag` (Speech Lab, linked from More)
  lets the learner or Netanel test each strategy on the phone, pin one into `caps.captureMode`,
  and copy a report (device, caps, `captureLog` of the last 20 attempts with event timelines).
  **iOS behaviour cannot be verified in the browser pane (mic blocked) - the Speech Lab is the
  way to measure it, never assert it.**
- **Recognition restarts until the Capture is stopped, for every drill** (`keepAlive` is kept only
  for API compatibility). `continuous=false` ends at the first pause, which used to truncate a
  hesitant reading or any Shadow passage and grade the unheard tail as "missing". It never
  restarts after a fatal error (`not-allowed`, `service-not-allowed`, `audio-capture`, `network`,
  ...) - that used to loop ~8 restarts/second. Interim text is kept as a fallback when no final
  result arrives (interim is only requested off iOS; a non-final result iOS sends anyway is kept
  the same way).
- **`stop()` ends recognition FIRST, then the recorder, then releases the tracks.** Ending the
  recorder/audio session before the recogniser delivers its final result can drop the only
  transcript on iOS. `start()` releases the mic if anything throws (a failed `MediaRecorder.start`
  used to leave the track live and the indicator on).
- `capture.stop()` returns `asr: {status, error}` (`ok | no-speech | blocked | network |
  audio-capture | unsupported | disabled | error`) and `diag`; drills show `unscoredNote(asr)` -
  a reason he can act on - instead of the old blanket "scoring is not available on this device".
- Recording URLs are object URLs — call `revokeUrl()` when replacing or tearing one down.
- **Everything audio must start inside a user gesture** (iOS drops un-gestured `speak()` and
  `getUserMedia()`). `speak()`/`speakSlow()` run synchronously once `primeVoices()` has resolved
  the voice; do not add an `await` before the `synth.speak()` call.
- `Capture` runs the recorder and recognition together and lets recognition fail silently.
  Always `release()` — iOS leaves the mic indicator on otherwise.
- `micError()` is browser-aware and names the `file://` case explicitly. Do not replace it with
  a generic message.
- **Every `new Capture(); await cap.start();` call site must guard against a real race:** if
  whatever's holding the reference is torn down (navigation, teardown) WHILE the very first mic
  permission prompt is still pending, `capture` is still `null` when teardown runs, so its
  `capture?.release()` is a no-op - then `cap.start()` resolves afterward and, unguarded, opens
  the mic with nothing left to ever close it (confirmed with a real MediaStream in a test
  harness: the track stayed `live` indefinitely under the old code). Snapshot a `torndown`
  flag/generation counter before the `await`, and check it immediately after - see
  `recordButton()` in `common.js`, `renderRound()` in `fluency.js`, and `renderSpeaking()` in
  `app.js` for the three existing instances of this guard. `probeMic()` in `speech.js` has the
  same theoretical exposure but was left unguarded on purpose - it self-releases within ~3
  seconds regardless, so the fix wasn't worth the extra complexity there.

### Dates are LOCAL, not UTC

`today()` uses `toLocaleDateString('en-CA')`, deliberately not `toISOString()`. In Israel the UTC
day rolls over at 02:00–03:00 local, so a late-night session would count as the previous day and
break the streak. Anything date-keyed must go through `today()`.

**Iterating dates has its own trap, separate from the UTC one above.** `program.js`'s calendar
walks (streak, `dayHistory`, `missedRun`) originally stepped with `date.getTime() + n * 86400000`.
That's wrong across a DST change: Israel's fall-back day has 25 local hours, so a fixed-ms step
from local midnight lands at 23:00 the *same* calendar day instead of crossing into the next one —
confirmed concretely, it silently duplicated one date in `dayHistory()`'s output and dropped the
day after it. Fixed by stepping with `Date.prototype.setDate()` instead, which is DST-aware
because it operates on local calendar fields, not absolute time. `dayIndex()`'s one-shot
`(end - start) / DAY_MS` division is fine as-is — the rounding error from at most one DST
transition never approaches the half-day threshold that would flip `Math.round()` — the trap is
specifically in *iterative* stepping.

### Persistence contract (`js/state.js`) — read before changing the profile shape

`localStorage` is keyed by **origin**, so redeploying edited code to the same URL keeps all of
the learner's progress (it survives repo renames too). The danger is not redeploys but schema
edits:

- Loading **deep-merges** defaults *underneath* stored data. A shallow merge would wipe
  siblings — adding a field to `budget` would have silently dropped `budget.sales`.
- Each load snapshots the last good profile (`restoreSnapshot()`) so a bad migration is
  recoverable.

**When changing the shape: bump `SCHEMA_VERSION` and add a case to `migrate()`.** Never rename
or remove a stored field without a migration step. `SCHEMA_VERSION` is 9 (v8 added `caps.captureMode/captureLearned/asrReason`, `captureLog`,
`captureStats`; v9 added `checkpoints` and `recentContent.pitch` - all no-op migrations, nested
defaults) and was 7 as of the v6→v7
migration that added `profile.recentContent` (see "Thin content pools repeat less" below) — a
plain new nested default with nothing to move. Like the v4, v5 and v6 cases before it, this one is
deliberately a no-op — kept only to document that v7 is a real shape change and satisfy the
"always bump" rule. The v5→v6 migration added the listening track the same way
(`budget.listening`/`levels.listening`/`recent.listening`). The v4→v5 migration added the sales track the same way
(`recent.sales`; `budget.sales`/`levels.sales` already existed from earlier work, unused until
Section 4 wired a real drill to them). The v2→v3 migration that added `profile.program` (Section
2's schedule/start-date frame) is the worked example with actual data to move: it backfills
`startedAt` from the earliest date already on record (`createdAt`, falling back to
`placement.takenAt`) rather than "now", so a migrated profile's week/phase numbering reflects when
he actually started, not when the migration happened to run.

**`lastBackupPrompt` sat declared and completely unused from v1 through v5** — the same
"field waiting for its feature" pattern `budget.sales`/`levels.sales` show above, just longer-
lived. `viewToday()` now reads and writes it: once real history exists (`sessions.length >= 5`)
and either it was never set or 14+ days have passed, a small card points at `#/more`'s existing
backup flow, stamping `lastBackupPrompt` the moment it's shown so it nags at most every two weeks.

One more deep-merge subtlety worth knowing before adding another array-typed field: `deepMerge`
treats arrays as scalars (the `!Array.isArray` guards skip the recursive branch for them), so a
stored array replaces the default wholesale rather than merging element-by-element. That's the
right behaviour for `program.days` — a set of scheduled weekdays should just be whatever was last
saved — but it means an array field never gets partial defaults the way an object field does.

### Interface language (`js/i18n.js`)

Hebrew by default, and the page flips to `dir="rtl"`. The split is deliberate and load-bearing:

- **Translated:** buttons, instructions, errors, and the pronunciation coaching (a hint he has
  to decode is a hint wasted).
- **Never translated:** sentences, passages, prompts, answer options — that is the input he is
  here for.

So: user-facing strings go through `t('key')`, and **English content must be wrapped in `ltr()`**
(from `ui.js`) or it mirrors inside the RTL page. `verdict()` in `scoring.js` returns a
translation *key*, not text. Every key must exist in both `he` and `en`.

### Adaptive placement (`js/placement.js`)

The ladder (two items, then move up/down) only *selects* items. The final band is estimated from
**all responses** — the highest level where he scored strictly above half with at least 2 items —
because settling wherever the walk stopped is biased upward by a full level. Simulated: 80%
exact, 99% within one level, 6–12 items. It is intentionally biased slightly **low**; the
adaptive step raises him quickly, whereas being placed too high makes every drill impossible.

Options in `content/placement-items.js` are authored **answer-first** and shuffled by
`shuffleOptions()` at display time — `answer: 0` everywhere is correct, not a bug.

### Drill contract

Each drill exports `mount(root, ctx)` and returns a teardown function that must cancel any
recorder and timer. `app.js` builds one `ctx` — `{ level, weakTags, onFinish }` — and each drill
destructures only what it needs (`repeat` also takes `count`, which is how Quick practice reuses
it with `count: 2`). `app.js` stores the teardown and calls it on every navigation.

Drills report results through `state.js`: `recordSession`, `recordAccuracy` (drives the level
step), and `recordTagScores` (per-sound, fed from `phonetics.tagScores()`) — the last is what
makes the app serve more of whatever he is worst at.

### Program curriculum (`js/program.js`)

The 3 (or 6) month program is a designed arc, not a flat rotation of the three speech drills.
`totalWeeks(programMonths)` (≈4.345 weeks/month) splits into three phases via `phaseBounds()`:
**Foundation** (first 2–4 weeks, capped even on a 6-month program — concentrated accuracy work
stops paying off well before week 6), **Integration** (last 2–4 weeks), and **Building** in
between. Two things change by phase, both consumed in `app.js`'s `hostDrill()` and `viewToday()`:

- **Which two drills `planFor()` offers each day.** Foundation is Repeat & Grade + Shadow only —
  Fluency Sprint is withheld on purpose, because drilling speed on sounds that are still wrong
  just automates the error (the same accuracy-before-speed ordering already encoded in
  `common.js`'s `bestTag()` priority list). Building anchors Repeat & Grade daily and alternates
  Shadow/Fluency by day index. Integration cycles a **fixed 6-day table** of drill pairs (not
  independent `idx % 2` / `idx % 3` rotations — those collide into a same-drill-both-slots day
  every 6th day on a regular schedule; caught by a 200-day scripted check before shipping).
- **How narrowly Repeat & Grade's sentence pool concentrates on weak sounds**, via
  `tagLimitForPhase(phase)` → the `limit` passed to `store.weakTags()`: 2 in Foundation (narrow
  and intense), 3 in Building (today's long-standing default), 5 in Integration (a wide net, since
  `pickSentences()` scores by tag overlap — a longer weak-tag list stops 2–3 sounds monopolising
  the set). Integration deliberately does **not** claim to "revisit sounds that were weak earlier"
  — `profile.phonemes[tag]` is a running weighted mean, not a history, so that distinction can't
  be made honestly from the data this app keeps. Same discipline as the "no fabricated coaching"
  rule below, applied to curriculum design rather than a single mistake card.

Everything else `program.js` exports — `computeStreak`, `dayHistory`, `adherence`, `missedRun`,
`programFrame` — is a **pure function over `profile.sessions` + `profile.program` +
`profile.programMonths`**. Phase, plan, streak and the Progress calendar are all recomputed on
every read; nothing about them is itself stored, so nothing can drift from what actually
happened. `program.js` deliberately does not import `state.js` (which imports `program.js` to
derive the streak on every `recordSession()`), so its own tiny `today()`-equivalent (`ymd()`) is
duplicated rather than shared — a real circular import between the two.

**`missedRun()` must be bounded by `program.startedAt`.** Its backward walk counts consecutive
scheduled days with nothing recorded, which is unbounded for a profile with zero sessions ever —
there's nothing to break the loop until it hits `MAX_WALK_DAYS`. Caught by actually running
onboarding end to end rather than only unit-testing against synthetic histories that always had
at least one session: a brand-new profile reported "you missed 571 days" on day one. There is no
such thing as a missed day before the program began, so the walk stops at `startedAt`.

**`programFrame().complete` was computed and thrown away from Section 2 through Section 4** —
`phaseFor()` stays pinned to `'integration'` past the end of the program, so nothing ever
distinguished "still in the final phase" from "the whole program is over," and `viewToday()` just
kept running the Integration plan forever with no acknowledgement. It now checks `frame.complete`
and shows a congratulatory card (days practised this cycle via `adherence()`, all-time longest
streak, all-time minutes) with one action — reset `program.startedAt` to now and go to `#/budget`
to start a fresh cycle. Like the missed-days card below it, this keeps showing every day the
program stays finished (a pure recomputed fact, not stored state), and clears only once he
actually starts a new one.

### Grading attribution (`js/phonetics.js`)

`wordTags(word)` says which pronunciation targets a single word exercises, and `tagScores()`
credits each tag **only on the words that carry it**. This is load-bearing: crediting the whole
sentence's accuracy to every tag (the original behaviour) made the per-sound view meaningless.

If you add or retag sentences, run the bank check — every declared tag must be carried by a real
word in that sentence, and the 40-case classifier suite must still pass. English spelling maps to
these particular sounds regularly, but the irregulars are enumerated (`wr-` has a silent w and a
*pronounced* r; "two"/"answer"/"sword" have silent w; "hour"/"honest" have silent h; "said" is
not an -ed ending).

### Per-word mistake feedback (`js/drills/common.js` `renderMistakes()`)

Every scored word already carried `{word, status, heard}`, but `heard` — the "what you said
instead" data — was surfaced in exactly one place in the whole app: an HTML `title` attribute in
`ui.js`'s `renderWords()`. `title` is a hover tooltip; this app has no hover (mobile-first,
iPhone Safari). So the explanation existed in the data from day one and was never once visible.
`renderMistakes(scored)` fixes that: one always-visible card per `wrong`/`missing` word, no
tap-to-reveal (a tap-hidden explanation is the same failure mode, just moved), placed alongside
the existing `renderWords()` row in both `repeat.js` and `shadow.js`.

Before touching this, the alignment itself (`align()`/`scoreAttempt()` in `scoring.js`) was
verified independent per word against 7 adversarial cases — repeated words, insertions,
deletions, and three *adjacent* consecutive errors — with zero cross-contamination. The bug was
purely display; `scoring.js` was not touched.

**One coaching tag per word, not every tag it carries.** A word like "weather" carries three
covered sounds at once (`th_voiced`, `w`, `r`); showing all of them under every wrong word could
stack many blocks under one attempt. `bestTag()` picks the single highest-impact sound per word
via a fixed priority order (`th_unvoiced, th_voiced, w, v, vowel_len, r, h, ed_ending, articles`
— sounds that change the word outrank sounds that just make it sound foreign, matching the
curriculum's existing intelligibility ordering). This makes every card deterministic: the same
word always surfaces the same correction.

**No fabricated coaching.** A `missing` word never gets phonetic coaching — there's no `heard`
audio to diagnose a sound against, only a plain honest message about pace/volume/skipping. A
`wrong` word whose `wordTags()` carry nothing covered (an ordinary vocabulary miss) gets the same
kind of plain fallback rather than invented phonetics.

### Content targeting

Sentences in `content/sentences.js` are tagged with Hebrew-L1 interference targets
(`th_unvoiced`, `w`, `v`, `vowel_len`, `ed_ending`, `articles`, `r`, `h`, `perfect`).
`weakTags()` ranks his weakest, and `pickSentences()` prefers sentences hitting them. Coaching
labels/hints for these tags live in `i18n.js`, not with the sentences.

**`content/minimal-pairs.js` covers 5 of these 10 tags on purpose, not by omission.** `th_unvoiced`,
`th_voiced`, `w`/`v` and `vowel_len` each collide two genuinely different English words, and `h`
joins them (h-dropping pairs like heel/eel, hand/and — added in Section 5). The other four never
will: `ed_ending`, `articles` and `perfect` are suffix/grammar issues with no word-level sound
confusion to illustrate, and `r` is an accent-quality issue rather than a same-language word
collision. Forcing a pair for any of those four would be exactly the "invented phonetics"
`renderMistakes()` already refuses to do for a plain vocabulary miss (see below) — `contrastFor()`
returning `null` for them is the honest behaviour, not a gap to fill.

### Thin content pools repeat less (`js/content/pick.js`)

Repeat & Grade now draws from ~40 sentences/level (older 14 hand-tagged, the rest authored as plain
text with tags DERIVED from `phonetics.wordTags()`) and Vocabulary from a 330-word FSRS deck. When
this module was written the thin banks were `SHADOW_PASSAGES` at **2 passages per level**,
`FLUENCY_PROMPTS` 3, `SALES_SCENARIOS` 2 (across just 4 levels); they are now 8, 8 and 21
scenarios total, but the mechanism still matters (a level's pool is still far smaller than ~65
practice days of draws).
Before this module existed, each picker drew from its own exact level with plain
`Math.random()` and no memory between sessions — for Shadow specifically, `mount()`'s default
`count: 2` requests exactly as many passages as the level's *entire* pool, so the whole bank was
shown in session 1 and every session after was a **100% verbatim repeat**, just reshuffled, for as
long as that level held (which can be the whole 3-6 month program). Sales was nearly as bad: two
scripted customers, seen within a week, then replayed dozens of times.

`content/pick.js` fixes this the same way `content/vocab.js` and `content/listening.js` already
handled their own versions of it — reused rather than reimplemented four times:

- **`fanOut(bank, LEVELS, level, minPool, keyFn)`** collects items outward from `level` (own level,
  then +1, -1, +2, -2, ...) until at least `minPool` distinct items are gathered. `minPool` must be
  bigger than a single session's pick count, or fan-out never actually triggers — the current
  level alone already satisfies a same-sized request. Shadow and Listening ask for
  `max(count * 3, 6)`; Fluency and Sales (which each pick exactly one item) ask for a flat `6`.
- **`pickFresh(pool, excludeIds, n, keyFn)`** picks `n` items from that pool, preferring ones not
  in `excludeIds`. Falls back to the full pool once exclusion would leave fewer than `n`
  candidates — a small pool must never hard-block a session, it just steers away from repeats
  while there's room to.
- **`keyFn`** lets both functions work over plain-string banks (Shadow, Fluency — the string
  itself is a stable id) and object banks with an explicit `.id` (Sales, Listening) without
  normalizing either shape to match the other.

**`profile.recentContent`** (`{ shadow, fluency, sales, listening }`, each a plain array of ids)
is the persisted memory `excludeIds` reads from — `state.js`'s `recordShown(track, ids)` appends
to it and caps it at 8 entries (`RECENT_CONTENT_CAP`), a rolling window rather than a full
history: long enough to span several sessions, short enough that a level's fanned-out pool (which
can be as small as 6 items) still has room to come back around instead of excluding forever. Each
drill calls `store.get().recentContent?.[track]` when picking and `store.recordShown(track, ids)`
in `finish()` — recorded even on an early exit via "End session"/"Exit", because the content was
already on screen the moment it mounted, not just when a session completes cleanly (see
`sales.js`'s `finish()`, which records the scenario id unconditionally, unlike `recordSession()`
right above it which only fires if at least one turn was actually attempted).

This does not manufacture new content or eliminate repetition — a 2-passage-per-level Shadow pool
fanned out to 6 will still repeat once all 6 have been shown and stay in the 8-entry window. It
does turn "repeats from session 2 onward, forever" into "a full rotation through a ~3x wider pool
before anything repeats" — verified by simulating 10 consecutive sessions per track: Shadow and
Sales both went from a hard ceiling of 2 distinct items to 6 distinct items seen, with Sales
dropping to zero immediate back-to-back repeats across the run.

### Vocabulary track (`js/vocab.js`, `js/drills/vocab.js`, `js/content/vocab.js`)

`js/srs.js` is a complete, unit-tested FSRS scheduler and is deliberately left untouched — the
two gaps between it and the rest of this app are closed in `js/vocab.js` instead, which plays the
same role for track B that `program.js` plays for the speech track: pure functions over
`profile.reviews` + `profile.program` + `profile.budget`, nothing stored, recomputed on every
read.

- **`srs.js` is timestamp-based; this app is local-calendar-based.** `isDue()` compares
  `card.due <= now` in milliseconds, so a card reviewed at 22:00 with a 1-day interval is not due
  (by `srs.isDue`'s own math) until 22:00 the next day — opening the app at 08:00 would wrongly
  show it as not due yet. `vocab.dueToday()` evaluates against the **end of the local day**
  instead, the same discipline as `state.today()` / `program.ymd()`. Anything that checks whether
  a review card is due must go through `dueToday()`, never call `srs.isDue()` against a bare
  `Date.now()`.
- **AGAIN re-queues a card ~10 minutes out — within the same sitting**, not "tomorrow" in the
  loose sense. `vocab.buildQueue()` returns a snapshot at session start; `drills/vocab.js` keeps
  its own in-memory queue and splices a graded-Again card back in 5 positions ahead, because a
  static list returned once can't represent "come back soon".
- **`vocab.isLapsed(card)`** reads `card.reps > 0 && card.intervalDays === 0` — `intervalDays` is
  only ever set to 0 by `srs.review()` on an AGAIN grade, so this recovers "last grade was Again"
  from data `srs.js` already stores, with no extra bookkeeping.
- **The intake arc** (`vocab.newPerDay(phase)`) is the vocabulary analogue of
  `tagLimitForPhase()`: Foundation introduces only 3 new words/day so vocabulary doesn't compete
  with the sounds work that phase concentrates on; Building ramps to 5; Integration drops to 0 and
  consolidates instead — a card introduced with two weeks left gets logged, not learned, the same
  reasoning Foundation uses to withhold Fluency Sprint. Intake is additionally throttled toward
  zero as the due backlog grows (`BACKLOG_TAPER_START`/`BACKLOG_STOP` in `vocab.js`) — the
  vocabulary equivalent of `missedRun()`'s honesty: after a gap, working down the backlog takes
  priority over adding to it.
- **`content/vocab.js`'s entry `id` is the FSRS card id and is stored in `profile.reviews`
  forever.** Treat it exactly like a stored field under the persistence contract above: add new
  entries freely, but never rename or remove an existing `id` — doing so orphans that card's whole
  review history the same way renaming a profile field would silently drop it.
- **Grading follows the tier-1/tier-2 rule, applied to FSRS grades rather than scores.** Only new
  cards and lapsed cards (see `isLapsed` above) get a spoken, ASR-scored step; `scoreAttempt()`'s
  accuracy feeds `srs.gradeFromAccuracy()` as a *suggested* grade, but the four Again/Hard/Good/
  Easy buttons are always the actual input — ASR sharpens the grade, it never gates it. Every
  other due card is a fast, silent self-rated recall with no mic at all, which is what keeps a
  5-minute budget inside FSRS's real throughput (roughly 30+ cards/session for silent recall vs.
  8–10 for a full record cycle).
- **`levels.vocab`** is set once by placement but was never steppable before this track existed —
  `drills/vocab.js` now calls `store.recordAccuracy('vocab', …)` using the fraction of cards
  graded Good/Easy. This is self-rated, softer evidence than the speech tracks' ASR accuracy, but
  `recordAccuracy` already needs 4 sessions before it moves and uses conservative thresholds
  (0.85 up / 0.6 down), and the alternative was a level that could never move at all.

(`js/content/minimal-pairs.js` is fully wired — `contrastFor()` powers both the pre-attempt
coaching hints and the post-attempt mistake cards below.)

### Sales Mode track (`js/drills/sales.js`, `js/content/sales.js`)

Track C, the last of the three non-speech tracks alongside vocabulary. Structurally the odd one
out — every other drill is linear (play a target, record, grade); Sales Mode is a short branching
roleplay: each turn the customer raises an objection or question, the learner picks the best of
2-3 pre-written responses, then reads the one they picked aloud for the same `scoreAttempt()`
word-level feedback as Repeat & Grade.

- **He reads the option he picked, never the "best" one.** Reading someone else's line after a
  weaker pick would silently turn a sales-judgment miss into an unrelated pronunciation exercise.
  Every option in `content/sales.js` is a complete, real, sayable sentence — including the weak
  ones — so whichever one was picked is always an honest reference text for `scoreAttempt()`.
- **Options are shuffled by a local `shuffleTurnOptions()`, not `placement-items.js`'s
  `shuffleOptions()`.** That helper assumes exactly one boolean-correct `answer` index; Sales
  Mode's 3-tier `quality` field (`best`/`ok`/`weak`) per option doesn't fit it, so a small
  Fisher-Yates was written locally rather than stretching the existing helper to fit.
- **Grading is a blend, applying the tier-1/tier-2 rule to Sales Mode's own composite score, not
  just to speech.** `turnScore()` gives soft partial credit for the pick (1.0/0.6/0.2 for
  best/ok/weak — not pass/fail, since this is a judgment call) and folds in speech accuracy only
  when ASR actually scored that turn (`mc*0.5 + accuracy*0.5`); when it didn't, `mc` alone stands
  as the full score, so a no-recognition device never drags the number down.
- **`why` coaching is Hebrew, authored directly in `content/sales.js`**, unlike
  `content/sentences.js`'s English-only tags. Sentence coaching is generic-per-tag and lives in
  `i18n.js`'s `PHONEME` block, reused everywhere that tag appears; a sales option's "why" is
  bespoke per option with no shared tag to hang a translated string off, so it follows
  `content/vocab.js`'s precedent of carrying its own `he` field directly on the content instead.
- **Budget-gated in `program.js`'s `planFor()`, not phase-gated, and with no FSRS-style intake
  pacing.** Sales Mode is a different skill axis than the phonetic-accuracy speech track (judgment
  and delivery, not sound correctness), so — unlike Foundation withholding Fluency Sprint — there
  is no "automating a wrong sound" risk to gate against; it runs on `budget.sales` from day one,
  exactly like vocab. And unlike vocab's FSRS deck, each session picks one fresh scripted scenario
  (`pickScenario()`), so there is no growing backlog to throttle.
- **`levels.sales`** starts at A1 (one notch below `speech`/`vocab`'s A2 — `placement.js` sets it
  conservatively, one band below the estimated written level, with no read-aloud evidence
  factored in) and steps the same way every other track does: `recordAccuracy('sales', …)` needs
  4 accumulated sessions in `recent.sales` before it moves.

### Listening comprehension track (`js/drills/listening.js`, `js/content/listening.js`)

Track D, Section 5. Every other drill is production (repeat/shadow/fluency/sales: say it) or
reading (sales options, vocab prompts). Nothing tested understanding spoken English *on its own*,
without also demanding he reproduce it — a different, receptive skill. Two things made this the
concrete choice for Section 5 rather than a guess:

- **`content/placement-items.js` already tags one item per level `skill: 'listening'`**, and
  `placement.js`'s `results()` was already computing `rate('listening')` into `detail` — and then
  discarding it, never actually seeding a level the way `rate('vocab')` does for `levels.vocab`.
  `results()` now seeds `levels.listening` the same way: `band`, or `band - 1` if the rate came in
  under 0.5.
- **It's the one drill that never opens the microphone.** Comprehension is tested by picking an
  answer, not by producing speech, so `drills/listening.js` has no `Capture` at all and works even
  on a device where `caps.mic` is false — the tier-1/tier-2 rule taken to its logical end for a
  track that has no production component to begin with.

Two content decisions worth knowing before touching it:

- **The transcript is withheld until after its questions are answered**, not shown up front like
  every other drill's target text. Showing it before the questions would let him read instead of
  listen, defeating the point; it's revealed afterward purely for review.
- **Lightweight exposure tracking, short of vocab's real FSRS deck.** `content/listening.js`'s
  `pickPassages()` fans outward by level the same way `content/vocab.js`'s `pickNew()` does, and
  also takes `excludeIds` — see "Thin content pools repeat less" below. This isn't a spaced-
  repetition schedule like vocab's (no due dates, no per-item history), just a short rolling
  memory of what ran recently, enough to stop the same passages resurfacing back-to-back.

**Budget-gated in `planFor()`, not phase-gated** — same reasoning as Sales Mode: comprehension is
a different skill axis than phonetic production, so there's no "automating a wrong sound" risk to
withhold it against, and it runs on `budget.listening` from day one.

### Scoring honesty (`js/scoring.js`) — added after the iPhone grading regression

- Normalisation is applied to BOTH target and transcript: full contraction table (we'd, you'd,
  it'll ...), numbers → words (`numberToWords`: cardinals, `$49`, `15%`, `9:30`, `9:00` →
  "nine o'clock", ordinals, years, bare day after a month → ordinal), ok/okay, hyphen compounds
  split, possessive apostrophes dropped. Lookups are `Map`s (a plain object returns functions for
  words like "constructor"). Every case came from a measured false negative.
- `scoreAttempt()` returns `unreliable` (+ `reason: cutoff | partial`) when the recogniser plainly
  only caught part of an attempt (trailing run of missing ≥40%, or <50% of words heard). Drills
  show it as "only part of it was heard", do NOT record it into `recordTagScores` /
  `recordAccuracy` / placement (use `countsTowardStats(scored)`), and never offer to save it as a
  checkpoint. A genuine mispronunciation is not unreliable.
- Shared feedback is `attemptFeedback(scored, result)` in `drills/common.js` - spread its returned
  array into `append()` (append stringifies arrays/null).

### Zero-attempt sessions never count

Repeat/Shadow/Fluency/Numbers/Sales/Vocab/Listening record a session only if at least one attempt
exists; ending early is a plain exit. (They used to record a 4-second session, extend the streak
and tick the drill "Done".) Sales keys its results by turn so "Try again" replaces, not adds.

### Numbers, Pitch and Checkpoints (Section 6 additions)

- **Numbers** (`drills/numbers.js`, generated by `content/numbers.js`): 6 hear-it-pick-it items
  with teen/ty and digit-swap distractors + 3 read-aloud items graded against `spoken` words.
  Reachable from Today's spare-moment card (not budget-gated); records `drill:'numbers'`.
- **Pitch** (`drills/pitch.js`, prompts in `content/sales.js` `PITCH_PROMPTS`): free 60-90 s
  recording; pace only if words were recognised, filler count is a floor (recognisers delete
  um/uh), 3-item self-check. Uses `comparePanel('', url)` (empty model text = no model button).
- **Checkpoints** (`drills/checkpoint.js`, `program.js` `checkpointWeeks`/`dueCheckpoint`): the
  placement read-aloud sentence repeated at weeks [1, ~⅓, ~⅔, last] (week 1 skipped when
  placement already scored it). Due card on Today, history on Progress, stored in
  `profile.checkpoints`. Audio is not persisted (localStorage cannot hold it) - only scores.

### Deploy stamp (`tools/stamp.py`)

Plain ES modules are cached per URL and Pages serves with a short max-age, so right after a push a
phone could hold a NEW `app.js` beside an OLD `speech.js` and white-screen on a missing export.
`py -3 tools/stamp.py` writes an import map into `index.html` (between `stamp:` markers) mapping
every `./js/*.js` to itself `?v=<sha1 of LF-normalised bytes>`, plus versioned css and entry URLs.
**Run it before every commit that touches `js/` or `css/`**; the `deploy` tests fail if it is
stale. iOS < 16.4 ignores import maps and behaves as before.

## Conventions

- ES modules loaded directly by the browser; no bundler, no transpiler. Keep it dependency-free.
- DOM is built with the `h()` hyperscript helper in `ui.js`, not template strings.
- CSS uses logical properties (`text-align: start`, `padding-inline-start`) so the layout mirrors
  in Hebrew. Anything with a fixed direction needs `.ltr`.
- Comments explain *why*, especially where the code works around a measured browser behaviour.
  Those workarounds look like overengineering until you know the measurement — keep the note.
- Do not promote "Add to Home Screen": `MediaRecorder` breaks on the second launch of an
  installed iOS PWA.
- **`--ok` is amber (`#d18616`), not green.** It's the "getting there" verdict tier and matches
  `.word.missing`'s background — green is `--great`. Reads as a false-friend name; verified this
  before using `--ok` for missing-word styling in `renderMistakes()`, since amber is actually the
  correct, consistent choice there.
