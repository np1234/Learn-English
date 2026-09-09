// Turns a recognition transcript into per-word feedback.
//
// The point of the normalisation below is to avoid false negatives. Telling a
// learner he mispronounced a word he actually said correctly is worse than
// staying quiet, so contractions, digits and filler are reconciled before any
// comparison happens.

const CONTRACTIONS = {
  "i'm": 'i am', "i've": 'i have', "i'll": 'i will', "i'd": 'i would',
  "you're": 'you are', "you've": 'you have', "you'll": 'you will',
  "we're": 'we are', "we've": 'we have', "we'll": 'we will',
  "they're": 'they are', "they've": 'they have', "they'll": 'they will',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
  "there's": 'there is', "what's": 'what is', "who's": 'who is',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "don't": 'do not', "doesn't": 'does not',
  "didn't": 'did not', "can't": 'can not', "cannot": 'can not',
  "won't": 'will not', "wouldn't": 'would not', "shouldn't": 'should not',
  "couldn't": 'could not', "haven't": 'have not', "hasn't": 'has not',
  "hadn't": 'had not', "let's": 'let us',
};

const NUMBERS = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
  '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
  '11': 'eleven', '12': 'twelve', '13': 'thirteen', '20': 'twenty',
  '25': 'twenty five', '30': 'thirty', '100': 'hundred',
};

// Recognition inserts these freely; they should not count against him.
const FILLER = new Set(['uh', 'um', 'er', 'ah', 'eh', 'hmm', 'mmm']);

export function normalize(text) {
  if (!text) return '';
  let t = String(text).toLowerCase();
  t = t.replace(/[‘’]/g, "'");                 // curly to straight
  t = t.replace(/[^a-z0-9'\s]/g, ' ');                   // drop punctuation
  t = t.replace(/\s+/g, ' ').trim();
  t = t.split(' ').map((w) => CONTRACTIONS[w] ?? w).join(' ');
  t = t.split(' ').map((w) => NUMBERS[w] ?? w).join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

export function tokenize(text) {
  const n = normalize(text);
  return n ? n.split(' ').filter((w) => !FILLER.has(w)) : [];
}

/**
 * Word-level alignment by Levenshtein backtrace.
 * Returns one entry per TARGET word: ok | wrong | missing.
 */
export function align(targetWords, saidWords) {
  const n = targetWords.length;
  const m = saidWords.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = targetWords[i - 1] === saidWords[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }

  const out = [];
  let i = n, j = m;
  while (i > 0) {
    const cost = j > 0 && targetWords[i - 1] === saidWords[j - 1] ? 0 : 1;
    if (j > 0 && d[i][j] === d[i - 1][j - 1] + cost) {
      out.push({ word: targetWords[i - 1], status: cost === 0 ? 'ok' : 'wrong', heard: saidWords[j - 1] });
      i--; j--;
    } else if (d[i][j] === d[i - 1][j] + 1) {
      out.push({ word: targetWords[i - 1], status: 'missing', heard: null });
      i--;
    } else {
      j--; // an inserted word in the transcript: ignore it
    }
  }
  return out.reverse();
}

/**
 * Score one spoken attempt against a target sentence.
 * Returns null when there is no transcript, which is the normal case on devices
 * where recognition does not work - callers fall back to Record & Compare.
 */
export function scoreAttempt(targetText, transcript, seconds) {
  const target = tokenize(targetText);
  if (!transcript || !target.length) {
    return {
      scored: false,
      accuracy: null,
      words: target.map((w) => ({ word: w, status: 'unknown', heard: null })),
      wpm: seconds ? wpm(target.length, seconds) : null,
      transcript: transcript || null,
    };
  }
  const said = tokenize(transcript);
  const words = align(target, said);
  const ok = words.filter((w) => w.status === 'ok').length;
  return {
    scored: true,
    accuracy: target.length ? ok / target.length : 0,
    words,
    wpm: seconds ? wpm(said.length || target.length, seconds) : null,
    transcript,
  };
}

export function wpm(wordCount, seconds) {
  if (!seconds || seconds <= 0) return null;
  return Math.round((wordCount / seconds) * 60);
}

/** Returns a translation KEY plus a tone; the view decides the wording. */
export function verdict(accuracy) {
  if (accuracy === null || accuracy === undefined) return { key: 'v.recorded', tone: 'neutral' };
  if (accuracy >= 0.9) return { key: 'v.excellent', tone: 'great' };
  if (accuracy >= 0.75) return { key: 'v.good', tone: 'good' };
  if (accuracy >= 0.5) return { key: 'v.gettingThere', tone: 'ok' };
  return { key: 'v.tryAgain', tone: 'weak' };
}
