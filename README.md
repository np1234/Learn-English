# Speak English

A private English-learning web app: daily spoken practice, a placement test that
adapts, and progress you can see at any moment. No accounts, no backend, no cost.
Everything runs in the browser and saves on the device.

Built for one learner (Hebrew first language, iPhone, heading into sales).

---

## Sections 1-5 are built

**Working now**

- **Onboarding** - name, sound check, daily time budget per track, 3 or 6 month program,
  which weekdays count as practice days (Sun-Thu by default, changeable any time).
- **Sound check** - probes speech playback, microphone and recognition on the actual
  device, then tailors the app to what that device can really do.
- **Adaptive placement test** - ladders up and down a level bank, 6-12 items, about
  5 minutes. Simulated against learners at every level it places 80% exactly and
  99% within one level, with a deliberate slight bias toward placing low.
- **A designed 3-month program**, not just a daily log - see "The program is a
  curriculum, not a calendar" below.
- **Repeat & Grade** - sentences chosen to hit his weakest sounds; record, then get
  word-by-word feedback.
- **Shadow Mode** - three-pass shadowing (listen, speak along, perform) on connected
  passages, for rhythm and intonation.
- **Fluency Sprint** - the 4/3/2 technique, charting words-per-minute across the
  three retellings.
- **Quick practice** - two sentences, no timer, for a spare minute.
- **Progress** - a month calendar of what he actually did, current and longest
  streak, adherence, a recent-accuracy trend, per-skill levels, minutes, and a
  ranked list of the sounds he most needs to work on.
- **Missed-day recovery** - after a gap, Today names it honestly and offers a way
  back in via Quick practice, rather than silently resetting the streak with no
  acknowledgement.
- **Request box** - sends straight to Netanel by email.
- **Vocabulary** - a leveled, workplace-weighted word bank reviewed on a real FSRS spaced-
  repetition schedule (`js/srs.js`). New words and any word you got wrong last time are also
  spoken and scored, so pronunciation practice keeps happening even inside a vocabulary drill;
  everything else is a fast, silent self-rated recall. How many new words are introduced each day
  changes with the program phase - see "The vocabulary track is scheduled, not just a deck" below.
- **Sales Mode** - a short branching roleplay (track C): the customer raises an objection or
  question, he picks the best of 2-3 pre-written responses, then reads the one he picked out loud
  for the same word-level feedback as Repeat & Grade. See "Sales Mode grades judgment and
  pronunciation separately" below.
- **Listening** - a fourth track (D): short spoken passages with comprehension questions, no
  microphone required. The transcript stays hidden until after the questions, so it actually
  tests understanding rather than reading. See "Listening tests understanding on its own" below.

Every section listed above is real - nothing left as a placeholder.

---

## Run it locally

From this folder:

```bash
py -3 -m http.server 8123
```

Then open <http://localhost:8123>.

**Do not double-click `index.html`.** A `file://` page is not a *secure context*,
so the browser blocks the microphone outright and every speaking drill dies. This
is the single most likely reason recording "stops working" while editing. The app
now detects this case and says so explicitly instead of blaming a permission you
never denied.

(`python` on this machine is the Microsoft Store stub and always fails — `py -3`
is the real interpreter.)

## Put it online (GitHub Pages)

```bash
git init && git add -A && git commit -m "English app: section 1"
```

Then create an empty repo on GitHub and:

```bash
git remote add origin https://github.com/<you>/<repo>.git && git push -u origin main
```

Finally, in the repo: **Settings ▸ Pages ▸ Source: deploy from branch `main` / root**.

After a minute the app is live at `https://<you>.github.io/<repo>/`. Send him that
link. The URL is public but unlisted, and there is no server and no stored personal
data — progress never leaves his phone.

---

## Tell him these three things

1. **Open it in Safari.** Not as a home-screen app — audio recording breaks on the
   second launch when iOS runs it in standalone mode.
2. **Tap Allow** when it asks for the microphone.
3. **Use headphones** if he has them, especially for shadowing. iOS routes audio to
   the speaker while recording, so without headphones the model and his own voice
   fight each other.

---

## How it is put together

Plain HTML, CSS and ES modules. No build step, no dependencies, no framework.

```
index.html
css/styles.css
js/
  i18n.js         Hebrew/English interface strings; content stays English
  app.js          shell, routing, onboarding, placement UI, progress
  state.js        profile and progress, localStorage, export/import
  speech.js       TTS, microphone capture, speech recognition
  scoring.js      transcript alignment, accuracy, words-per-minute
  phonetics.js    per-word sound tagging, so each sound is graded on its own words
  srs.js          FSRS scheduler, generic - no calendar or app-specific logic
  vocab.js        the vocabulary track: intake arc, due queue, stats (the program.js of track B)
  program.js      the 3-month curriculum: phases, daily plan, streak, calendar
  placement.js    adaptive ladder and band estimation
  drills/         shadow, repeat, fluency, vocab, sales, listening, shared record button
  content/        sentence bank, vocabulary bank, sales scenario bank, listening passages,
                  minimal pairs, placement items
```

### The one design rule

**Speech recognition is a bonus, never a dependency.** iOS support for it is
unreliable — `continuous` mode never returns on iPhone, and reports conflict on
whether it works at all. So every drill has two tiers:

- **Tier 1, always available:** the app speaks the model, records him, and plays the
  two back to back. Self-monitoring against a model is the actual mechanism behind
  shadowing, and it needs no recognizer.
- **Tier 2, when recognition works:** automatic word-level scoring on top.

If recognition is missing the app says so once, quietly, and stops mentioning it.
No dead buttons, no apologies.

### Interface language

The interface is **Hebrew by default**; everything he *practises* stays English.
Sentences, passages, prompts and answer options are never translated — that is the
input he is here for. What is translated is the scaffolding: buttons, instructions,
error messages, and above all the pronunciation coaching.

That last one is the whole reason for the split. *"Tongue tip lightly between the
teeth, breathe out"* is the highest-value text in the app, and it does nothing for a
learner who is busy decoding it. At A1–A2, English instructions compete with the
task itself for working memory.

Switch language on the welcome screen or in **More ▸ Interface language**. The whole
layout mirrors to right-to-left for Hebrew, while English content stays left-to-right
inside it. Moving to full English later is a real milestone worth waiting for.

### Slow playback is chunked, not slowed

"Listen slowly" does **not** just lower `rate`. The Windows voices Chrome uses
compress that property heavily. Measured on this machine, same sentence, as a
ratio against normal speed:

| approach | actual slowdown |
|---|---|
| `rate: 0.7` alone | **0.90×** (no slower at all) |
| `rate: 0.5` alone | 1.32× |
| `rate: 0.3` alone | 1.67× |
| `rate: 0.75` + 3-word chunks | 1.85× |
| **`rate: 0.5` + 2-word chunks** | **2.73×**  ← the default |

So the sentence is broken into short chunks spoken as separate utterances, each
ending in a comma so the engine inserts a real pause, *and* the rate is dropped.
One word per chunk was tried and is too slow to sit through.

Chunking is also the better teaching tool: uniformly stretched audio smears the
prosody he is meant to be copying, whereas chunking keeps each phrase natural and
gives him time between them. Repeat & Grade uses 2-word chunks; Shadow Mode uses
5-8 at a higher rate, because there rhythm is the point.

### How grading works, and what it can and cannot see

Scores are **deterministic and monotonic** — the same attempt always produces the
same number, and more errors never score higher.

Each sound is credited **only on the words that actually contain it**
(`js/phonetics.js`). Say *"the vether was very varm"* and the app records
`w = 0.33` (weather✗ was✓ warm✗) while `v` stays at **1.00**, because *very* was
said correctly. Previously the whole sentence's accuracy was credited to every
tag it carried, which made the "sounds to work on" list close to noise.

The honest limitation: this measures **whether a listener would understand the
word**, not a phoneme-level analysis of his mouth. That is intelligibility, which
is the construct the ASR-feedback research actually targets — but a recogniser
also auto-corrects toward real words, so a near-miss can still be scored correct.
Treat the number as "was I understood", and use Record & Compare for the finer
judgement.

### His progress survives your edits

`localStorage` is keyed by **origin**, not by file contents. So editing the code and
re-deploying to the same GitHub Pages URL leaves every bit of his progress untouched
— streak, levels, phoneme history, the lot. It even survives renaming the repo,
because `https://you.github.io/a/` and `.../b/` share one origin. Only moving to a
different domain loses it.

The real risk is not your edits but the **schema**. Two guards in `js/state.js`:

1. Loading **deep-merges** defaults underneath the stored data, so adding a nested
   field in a later version can never blank out a sibling that already exists. (A
   shallow merge would: adding a field to `budget` would have wiped `budget.sales`.)
2. Every load takes a **snapshot** of the last good profile first, so a bad migration
   can be rolled back rather than starting from zero.

Bump `SCHEMA_VERSION` and add a case to `migrate()` when you change the shape. Never
rename or remove a stored field without a migration step.

Verified against a profile carrying a 23-day streak, 683 minutes and 87 sessions: all
history preserved, missing fields backfilled, existing values left alone.

iOS Safari can still clear stored data after very long inactivity, so
**More ▸ Copy my progress** exports everything as JSON and the same screen restores it.

### The program is a curriculum, not a calendar

The point of Section 2 was not to add a log of what he did - it was to pre-think an actual
learning strategy for the 3 (or 6) month window and encode it, so the weeks are not
interchangeable. `js/program.js` splits the program into three phases:

- **Foundation** (first 2-4 weeks) - only Repeat & Grade and Shadow run, and Repeat & Grade
  concentrates hard on his one or two weakest sounds. Fluency Sprint is withheld on purpose:
  drilling speed on sounds that are still wrong just automates the error.
- **Building** (the middle) - Fluency Sprint joins the rotation once accuracy has a base, and
  Repeat & Grade widens back to its usual three weak sounds.
- **Integration** (last 2-4 weeks) - all three drills cycle through evenly, and Repeat & Grade
  casts a much wider net across his weak-sound list, so practice stops concentrating on
  whichever 2-3 sounds are currently lowest and covers the fuller curriculum instead.

Every day's plan, the calendar, the streak and the "days practised" adherence number are all
computed fresh from `profile.sessions` every time they're shown - nothing about the plan is
authored or cached, so nothing can silently drift from what he actually did. If he misses days,
the streak resets honestly (no invented unbroken run), but Today names the gap and offers a
two-sentence way back in rather than just quietly moving on.

### The vocabulary track is scheduled, not just a deck

`js/srs.js` implements FSRS (spaced repetition that adapts each word's review interval to how
well he actually remembers it) as a generic, standalone module with no calendar logic and no
opinion about drills. `js/vocab.js` is where that becomes an actual curriculum, the same way
`program.js` turns the sentence bank into one for speech:

- **New words per day changes with the program phase.** Foundation introduces only 3/day, because
  that phase is deliberately concentrated on sounds and vocabulary shouldn't compete for the same
  attention. Building ramps to 5. Integration drops to 0 and consolidates instead - a word
  introduced with two weeks left in the program gets logged, not learned.
- **A due backlog throttles new words toward zero before it throttles anything else.** After a
  missed week, working down what's already due takes priority over piling more on top of it -
  the same honesty `missedRun()` brings to the speech streak, applied to spaced repetition.
- **New words and any word graded wrong last time are also spoken and ASR-scored**, exactly like
  the speech drills' word-level feedback; every other due word is a fast, silent self-rating
  (Again / Hard / Good / Easy). That mix is what makes FSRS's real throughput - dozens of cards a
  session - fit inside a 5-minute daily budget instead of the 8-10 a full record-and-score cycle
  would allow.
- **The due queue respects local calendar days, not literal 24-hour clocks** - a word reviewed
  late one evening is due again first thing the next morning, the same `today()` discipline the
  streak and the calendar already use, for the same DST/timezone reasons.

### Sales Mode grades judgment and pronunciation separately

Sales Mode (track C, `js/drills/sales.js` + `js/content/sales.js`) is a short branching
roleplay: a customer raises an objection or question, and he picks the best of 2-3
pre-written responses (authored answer-first, shuffled at display time), then reads the
line he picked out loud for the same `scoreAttempt()`/word-level feedback every other
drill gives.

Two decisions keep the two signals honest and separate:

- **He reads the option he picked, not the "correct" one.** Making him read someone
  else's line after a weaker pick would silently turn a sales-judgment miss into an
  unrelated pronunciation exercise. Every option is a complete, real sentence, so
  whichever one he picked is always a fair reference for scoring the readback.
- **The multiple-choice pick is graded on its own, and only "sweetened" by speech
  accuracy when recognition actually works** - the same tier-1/tier-2 discipline that
  governs every drill in the app, applied to Sales Mode's own composite score rather
  than just to speech.

Unlike Repeat/Shadow/Fluency, Sales Mode isn't phase-gated - it runs on its own budget
slot from day one, alongside vocabulary, because it's a different skill axis (judgment,
not phonetic accuracy) and there's no "automating a wrong sound" risk to withhold it
against. And unlike vocabulary, it needs no spaced-repetition pacing: each session picks
one fresh scripted scenario, not a growing deck with a backlog to throttle.

### Listening tests understanding on its own

Every other drill asks him to produce English - repeat it, shadow it, retell it, say the
sales line he picked. Listening (track D, `js/drills/listening.js`) is the odd one out on
purpose: he hears a short passage, then answers comprehension questions about it, with no
speaking involved at all. That also makes it the one drill that works with no microphone -
there is nothing to record.

Two decisions keep it an honest test of understanding rather than a reading exercise:

- **The transcript is hidden until after the questions are answered.** Showing the text
  up front would let him read the answers instead of listening for them. He can replay
  the audio as many times as he likes before answering - just never read it.
- **The placement test already measured this and used to throw the result away.** One
  item per level in the placement test is a listening item (play audio, pick the natural
  reply), and the test was already computing a listening accuracy rate internally - it
  just never turned into an actual starting level the way vocabulary and sales do. It now
  does, the same way every other measured signal from placement seeds a level.

Like Sales Mode, Listening runs on its own budget slot from day one rather than being
phase-gated: it is a receptive skill, not phonetic production, so there is no
"automating a wrong sound" risk to withhold it against, and each session is a fresh set
of passages rather than a growing deck.

---

## Why these drills

Every drill is here because of a specific finding, not a hunch.

| Drill | Technique | Evidence |
|---|---|---|
| Shadow Mode | Shadowing | Systematic review of 44 studies: gains in comprehensibility, intelligibility, accentedness, fluency, prosody |
| Vocabulary review (FSRS) | Spaced practice | Kim & Webb (2022) meta-analysis, 48 experiments, 3,411 learners: medium-to-large effect |
| Fluency Sprint | 4/3/2 | Speech rate rises measurably from the first telling to the third |
| Planning timer | Pre-task planning | Yuan & Ellis (2003): planning improves fluency and complexity |
| Repeat & Grade | Pushed output | Izumi (2002): output plus input beats input alone |
| Word highlighting | ASR as feedback | Learners repair when errors are flagged; 16-week study, +1.07 vs +0.32 on a 5-point scale |
| Listening comprehension | Comprehensible input | Krashen's Input Hypothesis: understanding input, independent of producing it, is a distinct and necessary driver of acquisition - the same reasoning behind speech always starting a level below the written band in placement |

### The Hebrew-specific part

Sentences are tagged by the sounds Hebrew speakers actually struggle with, and the
app serves more of whatever he is worst at. In priority order:

1. **θ / ð** — absent in Hebrew (*think* → "tink/sink", *this* → "dis/zis")
2. **w / v** — Hebrew ו is /v/ and there is no /w/ (*west* → "vest")
3. **Vowel length** — Hebrew has ~5 vowels, English ~12 (*ship* / *sheep*)
4. **-ed endings** — the /t/, /d/, /ɪd/ split
5. **a / an / the** — no indefinite article in Hebrew
6. **English /ɹ/** vs the Hebrew uvular ר
7. **Present perfect** — no Hebrew equivalent
