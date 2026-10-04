// Turns a recognition transcript into per-word feedback.
//
// The point of the normalisation below is to avoid false negatives. Telling a
// learner he mispronounced a word he actually said correctly is worse than
// staying quiet, so contractions, numbers, currency, spelling variants and
// filler are reconciled on BOTH sides before any comparison happens. Every
// case here was a measured false negative: "we'd" read perfectly scored 0.75,
// "forty nine" against "$49" scored 0.8, "OK" against "Okay" 0.75.
//
// Lookups use Maps, not plain objects: CONTRACTIONS['constructor'] on a plain
// object returns a function, which would have been spliced into the text.

const CONTRACTIONS = new Map(Object.entries({
  "i'm": 'i am', "i've": 'i have', "i'll": 'i will', "i'd": 'i would',
  "you're": 'you are', "you've": 'you have', "you'll": 'you will', "you'd": 'you would',
  "we're": 'we are', "we've": 'we have', "we'll": 'we will', "we'd": 'we would',
  "they're": 'they are', "they've": 'they have', "they'll": 'they will', "they'd": 'they would',
  "he's": 'he is', "he'll": 'he will', "he'd": 'he would',
  "she's": 'she is', "she'll": 'she will', "she'd": 'she would',
  "it's": 'it is', "it'll": 'it will', "it'd": 'it would',
  "that's": 'that is', "that'll": 'that will', "that'd": 'that would',
  "there's": 'there is', "there'll": 'there will', "there'd": 'there would',
  "here's": 'here is', "where's": 'where is', "how's": 'how is', "when's": 'when is',
  "what's": 'what is', "what'll": 'what will', "who's": 'who is', "who'll": 'who will', "who'd": 'who would',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "don't": 'do not', "doesn't": 'does not',
  "didn't": 'did not', "can't": 'can not', "cannot": 'can not',
  "won't": 'will not', "wouldn't": 'would not', "shouldn't": 'should not',
  "couldn't": 'could not', "haven't": 'have not', "hasn't": 'has not',
  "hadn't": 'had not', "mustn't": 'must not', "needn't": 'need not',
  "let's": 'let us', "y'all": 'you all', "ma'am": 'madam',
  "could've": 'could have', "would've": 'would have', "should've": 'should have', "might've": 'might have',
}));

// Spelling variants recognisers and authors disagree on. Applied to single
// tokens after punctuation is gone; multi-word forms are joined first.
const ALIASES = new Map(Object.entries({
  okay: 'ok', alright: 'all right',
  colour: 'color', favourite: 'favorite', centre: 'center', organise: 'organize',
  realise: 'realize', realised: 'realized', analyse: 'analyze', travelled: 'traveled',
  cancelled: 'canceled', programme: 'program', licence: 'license', behaviour: 'behavior',
}));

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
  'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const ORDINAL_WORD = new Map(Object.entries({
  one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth',
  nine: 'ninth', twelve: 'twelfth',
}));

function under1000(n) {
  const out = [];
  if (n >= 100) { out.push(ONES[Math.floor(n / 100)], 'hundred'); n %= 100; }
  if (n >= 20) { out.push(TENS[Math.floor(n / 10)]); n %= 10; if (n) out.push(ONES[n]); }
  else if (n > 0 || !out.length) out.push(ONES[n]);
  return out;
}

/** Integer to spoken words, the way a recogniser's digits would be read. */
export function numberToWords(n) {
  n = Math.floor(Math.abs(n));
  if (n < 1000) return under1000(n).join(' ');
  // Years are read in pairs ("twenty nineteen"), which is also how a
  // recogniser hears them - except 2000-2009 ("two thousand five").
  if (n >= 1100 && n <= 2099 && !(n >= 2000 && n <= 2009) && n % 100 !== 0) {
    return [...under1000(Math.floor(n / 100)), ...(n % 100 < 10 ? ['oh', ONES[n % 100]] : under1000(n % 100))].join(' ');
  }
  const out = [];
  const units = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  for (const [size, name] of units) {
    if (n >= size) { out.push(...under1000(Math.floor(n / size)), name); n %= size; }
  }
  if (n) out.push(...under1000(n));
  return out.join(' ');
}

function ordinalWords(n) {
  const words = numberToWords(n).split(' ');
  const last = words.pop();
  let ord;
  if (ORDINAL_WORD.has(last)) ord = ORDINAL_WORD.get(last);
  else if (last.endsWith('y')) ord = `${last.slice(0, -1)}ieth`;
  else ord = `${last}th`;
  return [...words, ord].join(' ');
}

/** Replace numeric expressions with words before punctuation is dropped. */
function spellNumbers(t) {
  t = t.replace(/(\d),(?=\d{3}\b)/g, '$1');                          // 1,000 -> 1000
  t = t.replace(/\$\s?(\d+)(?:\.(\d{2}))?/g, (_, d, c) =>             // $49.99
    `${numberToWords(+d)} dollars${c && +c ? ` ${numberToWords(+c)} cents` : ''}`);
  t = t.replace(/(\d+)\s?%/g, (_, d) => `${numberToWords(+d)} percent`);
  t = t.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) =>                // 9:30, 9:00
    `${numberToWords(+h)}${+m ? ` ${+m < 10 ? `oh ${numberToWords(+m)}` : numberToWords(+m)}` : " o'clock"}`);
  // "May 21" is said "May twenty-first": a bare day number after a month is
  // an ordinal, on both sides of the comparison.
  t = t.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b(?!\s?(?:st|nd|rd|th)\b)/g,
    (_, m, d) => `${m} ${ordinalWords(+d)}`);
  t = t.replace(/\b(\d+)(st|nd|rd|th)\b/g, (_, d) => ordinalWords(+d));
  t = t.replace(/\b(\d+)\.(\d+)\b/g, (_, a, b) =>
    `${numberToWords(+a)} point ${b.split('').map((x) => ONES[+x]).join(' ')}`);
  t = t.replace(/\b\d+\b/g, (d) => numberToWords(+d));
  return t;
}

// Recognition inserts these freely; they should not count against him.
export const FILLER = new Set(['uh', 'um', 'er', 'ah', 'eh', 'hmm', 'mmm', 'erm', 'uhm']);

export function normalize(text) {
  if (!text) return '';
  let t = String(text).toLowerCase();
  t = t.replace(/[‘’ʼ`]/g, "'");              // curly/modifier apostrophes to straight
  t = t.replace(/\bo\.?\s?k\.?(?=\s|$|[,!?])/g, 'ok');  // o.k. / o k -> ok
  t = t.replace(/\bper cent\b/g, 'percent').replace(/\be-mail/g, 'email');
  t = spellNumbers(t);
  t = t.replace(/[^a-z0-9'\s]/g, ' ');            // drop punctuation; hyphens split compounds
  t = t.replace(/\s+/g, ' ').trim();
  t = t.split(' ').map((w) => (CONTRACTIONS.has(w) ? CONTRACTIONS.get(w) : w)).join(' ');
  t = t.split(' ').map((w) => (ALIASES.has(w) ? ALIASES.get(w) : w)).join(' ');
  // Remaining apostrophes are possessives or stray marks ("employee's" vs a
  // recogniser's "employees"): the difference is inaudible, so drop them.
  t = t.replace(/'/g, '');
  return t.replace(/\s+/g, ' ').trim();
}

export function tokenize(text) {
  const n = normalize(text);
  return n ? n.split(' ').filter((w) => w && !FILLER.has(w)) : [];
}

// True homophones, one class per row. Audibly identical, so a recogniser
// choosing the other spelling says nothing about his pronunciation. Pairs a
// Hebrew speaker really confuses (live/leave, ship/sheep, wet/vet, think/sink,
// full/fool) are deliberately NOT here - those are the errors being trained.
// weather/whether and which/witch are included: wh- vs w- is no distinction
// a Hebrew L1 speaker makes, so it cannot be graded.
const HOMOPHONE_CLASSES = [
  ['to', 'too', 'two'], ['their', 'there'], ['hear', 'here'], ['write', 'right'],
  ['for', 'four', 'fore'], ['no', 'know'], ['by', 'buy', 'bye'], ['would', 'wood'],
  ['new', 'knew'], ['one', 'won'], ['our', 'hour'], ['see', 'sea'], ['be', 'bee'],
  ['sun', 'son'], ['whole', 'hole'], ['week', 'weak'], ['meet', 'meat'],
  ['sale', 'sail'], ['sent', 'cent', 'scent'], ['plain', 'plane'], ['peace', 'piece'],
  ['wait', 'weight'], ['way', 'weigh'], ['which', 'witch'], ['whether', 'weather'],
  ['wear', 'where'], ['threw', 'through'], ['pair', 'pear'], ['road', 'rode'],
  ['tail', 'tale'], ['mail', 'male'], ['steal', 'steel'], ['bear', 'bare'],
  ['allowed', 'aloud'], ['break', 'brake'], ['board', 'bored'], ['course', 'coarse'],
  ['flour', 'flower'], ['higher', 'hire'], ['principal', 'principle'],
  ['wine', 'whine'], ['your', 'youre'],
];
const HOMOPHONE = new Map();
for (const cls of HOMOPHONE_CLASSES) for (const w of cls) if (!HOMOPHONE.has(w)) HOMOPHONE.set(w, cls[0]);
const canon = (w) => HOMOPHONE.get(w) || w;
const sameWord = (a, b) => a === b || canon(a) === canon(b);

/** 1 = identical ... 0 = nothing in common (normalised edit distance). */
function similarity(a, b) {
  if (a === b) return 1;
  const n = a.length, m = b.length;
  if (!n || !m) return 0;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return 1 - prev[m] / Math.max(n, m);
}

const NEAR_SIMILARITY = 0.75;   // a substitution this close (same first letter) is "near"
const MIN_SUB_COST = 0.3;       // a substitution never beats an exact match

function isNear(target, heard) {
  return target[0] === heard[0] && similarity(target, heard) >= NEAR_SIMILARITY;
}

/**
 * Word-level alignment (weighted edit distance with backtrace).
 * Returns one entry per TARGET word: ok | near | wrong | missing.
 *
 * Substitutions cost by how different the words are, so with several
 * adjacent errors each heard word pairs with the target word it most
 * resembles instead of an arbitrary neighbour. A target pair heard as one
 * word ("any more" / "anymore") or the reverse ("into" / "in to") is correct.
 */
export function align(targetWords, saidWords) {
  const n = targetWords.length;
  const m = saidWords.length;
  const INF = 1e9;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const mv = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(''));
  d[0][0] = 0;
  const relax = (i, j, cost, move) => {
    if (cost < d[i][j] - 1e-9) { d[i][j] = cost; mv[i][j] = move; }
  };
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      // Order = tie-break preference: diagonal, merge/split, missing, insertion.
      if (i > 0 && j > 0) {
        const t = targetWords[i - 1], s = saidWords[j - 1];
        const cost = sameWord(t, s) ? 0 : Math.max(MIN_SUB_COST, 1 - similarity(t, s));
        relax(i, j, d[i - 1][j - 1] + cost, 'diag');
      }
      if (i > 1 && j > 0 && sameWord(targetWords[i - 2] + targetWords[i - 1], saidWords[j - 1])) {
        relax(i, j, d[i - 2][j - 1], 'merge');
      }
      if (i > 0 && j > 1 && sameWord(targetWords[i - 1], saidWords[j - 2] + saidWords[j - 1])) {
        relax(i, j, d[i - 1][j - 2], 'split');
      }
      if (i > 0) relax(i, j, d[i - 1][j] + 1, 'miss');
      if (j > 0) relax(i, j, d[i][j - 1] + 1, 'ins');
    }
  }

  const out = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const move = mv[i][j];
    if (move === 'diag') {
      const t = targetWords[i - 1], s = saidWords[j - 1];
      const status = sameWord(t, s) ? 'ok' : isNear(t, s) ? 'near' : 'wrong';
      out.push({ word: t, status, heard: s });
      i--; j--;
    } else if (move === 'merge') {
      const s = saidWords[j - 1];
      out.push({ word: targetWords[i - 1], status: 'ok', heard: s });
      out.push({ word: targetWords[i - 2], status: 'ok', heard: s });
      i -= 2; j--;
    } else if (move === 'split') {
      out.push({ word: targetWords[i - 1], status: 'ok', heard: `${saidWords[j - 2]} ${saidWords[j - 1]}` });
      i--; j -= 2;
    } else if (move === 'miss') {
      out.push({ word: targetWords[i - 1], status: 'missing', heard: null });
      i--;
    } else {
      j--; // an inserted word in the transcript: ignore it
    }
  }
  return out.reverse();
}

const NEAR_CREDIT = 0.5;
const weightOf = (words) =>
  words.reduce((a, w) => a + (w.status === 'ok' ? 1 : w.status === 'near' ? NEAR_CREDIT : 0), 0);

// The engine's own confidence below this means the transcript is a guess;
// grading it into levels/per-sound stats would punish him for the recogniser.
const MIN_CONFIDENCE = 0.35;

/**
 * Pick, per final result, the hypothesis that best matches the target. Only
 * runs when the segments' best guesses reproduce the transcript exactly (so
 * interim fallbacks and odd restarts never mix in) and only has candidates when
 * the engine reported usable confidences (see speech.js pickAlternatives).
 * Returns {said, used} or null.
 */
function chooseAlternatives(target, said, segments) {
  if (!Array.isArray(segments) || !segments.some((s) => s && s.length > 1)) return null;
  const toks = segments.map((s) => tokenize(s[0].text));
  if (toks.flat().join(' ') !== said.join(' ')) return null;
  const choice = segments.map(() => 0);
  const tokensOf = (k, a) => (a === 0 ? toks[k] : tokenize(segments[k][a].text));
  const build = () => segments.flatMap((s, k) => tokensOf(k, choice[k]));
  let best = weightOf(align(target, build()));
  segments.forEach((seg, k) => {
    for (let a = 1; a < seg.length; a++) {
      const keep = choice[k];
      choice[k] = a;
      const w = weightOf(align(target, build()));
      if (w > best + 1e-9) best = w; else choice[k] = keep;
    }
  });
  const used = choice.filter((c) => c !== 0).length;
  return used ? { said: build(), used } : null;
}

// When the recogniser only caught part of an attempt, the unheard words come
// out "missing" - which used to be graded as a hard failure and fed straight
// into level stepping and the per-sound stats. These thresholds decide when
// an attempt is too incomplete to be judged at all.
const MIN_WORDS_FOR_CUTOFF = 5;
const CUTOFF_TAIL_SHARE = 0.4;    // trailing run of missing words
const MIN_HEARD_SHARE = 0.5;      // words recognised at all, right or wrong

/**
 * Score one spoken attempt against a target sentence.
 *
 * `scored: false` when there is no usable transcript (the normal case on
 * devices where recognition does not work) - callers fall back to Record &
 * Compare. `unreliable` (with `scored: true`) marks an attempt the recogniser
 * plainly only caught part of: it is shown, but must NOT be recorded into
 * levels or per-sound stats, because the "missing" words were never judged.
 */
export function scoreAttempt(targetText, transcript, seconds, opts = {}) {
  const target = tokenize(targetText);
  let said = transcript ? tokenize(transcript) : [];
  if (!transcript || !target.length || !said.length) {
    return {
      scored: false,
      accuracy: null,
      unreliable: false,
      coverage: null,
      words: target.map((w) => ({ word: w, status: 'unknown', heard: null })),
      wpm: seconds ? wpm(target.length, seconds) : null,
      transcript: transcript || null,
    };
  }
  const alt = chooseAlternatives(target, said, opts.alternatives);
  if (alt) said = alt.said;
  const words = align(target, said);
  const lowConfidence = typeof opts.confidence === 'number' && opts.confidence > 0 && opts.confidence < MIN_CONFIDENCE;
  if (lowConfidence) for (const w of words) if (w.status === 'wrong' || w.status === 'near') w.uncertain = true;
  const heard = words.filter((w) => w.status !== 'missing').length;
  let tail = 0;
  for (let k = words.length - 1; k >= 0 && words[k].status === 'missing'; k--) tail += 1;
  const coverage = heard / target.length;
  let unreliable = false;
  let reason = null;
  if (target.length >= MIN_WORDS_FOR_CUTOFF && tail / target.length >= CUTOFF_TAIL_SHARE) {
    unreliable = true; reason = 'cutoff';
  } else if (target.length >= 4 && coverage < MIN_HEARD_SHARE) {
    unreliable = true; reason = 'partial';
  }
  return {
    scored: true,
    accuracy: weightOf(words) / target.length,
    unreliable,
    lowConfidence,
    usedAlternatives: alt ? alt.used : 0,
    reason,
    coverage,
    words,
    wpm: seconds ? wpm(said.length || target.length, seconds) : null,
    transcript,
  };
}

/** True when an attempt may feed levels and per-sound stats. */
export function countsTowardStats(scored) {
  return !!scored && scored.scored && !scored.unreliable && !scored.lowConfidence;
}

export function wpm(wordCount, seconds) {
  if (!seconds || seconds <= 0) return null;
  return Math.round((wordCount / seconds) * 60);
}

/** Returns a translation KEY plus a tone; the view decides the wording. */
export function verdict(accuracy, { unreliable = false } = {}) {
  if (unreliable) return { key: 'v.partial', tone: 'neutral' };
  if (accuracy === null || accuracy === undefined) return { key: 'v.recorded', tone: 'neutral' };
  if (accuracy >= 0.9) return { key: 'v.excellent', tone: 'great' };
  if (accuracy >= 0.75) return { key: 'v.good', tone: 'good' };
  if (accuracy >= 0.5) return { key: 'v.gettingThere', tone: 'ok' };
  return { key: 'v.tryAgain', tone: 'weak' };
}
