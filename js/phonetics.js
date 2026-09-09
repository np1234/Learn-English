// Which pronunciation targets does an individual WORD exercise?
//
// This exists to make grading honest. Previously a sentence's whole accuracy was
// credited to every tag it carried, so fumbling one word in "I have three
// brothers" marked down the V in "have" that was said perfectly. Scores per
// sound were therefore close to noise.
//
// Now each tag is scored only on the words that actually contain it. English
// spelling maps to these particular sounds regularly enough for that to work,
// provided the irregular cases below are named explicitly.

// TH is voiced in most function words and in medial -ther- words; unvoiced
// almost everywhere else. There is no rule that predicts it from spelling, so
// the voiced set is enumerated and everything else with "th" is unvoiced.
const TH_VOICED = new Set([
  'the', 'this', 'that', 'these', 'those', 'they', 'them', 'their', 'theirs',
  'there', 'then', 'than', 'though', 'although', 'thus', 'therefore', 'thereby',
  'together', 'other', 'others', 'another', 'mother', 'father', 'brother',
  'brothers', 'weather', 'whether', 'rather', 'either', 'neither', 'further',
  'gather', 'breathe', 'smooth', 'with', 'within', 'without', 'worthy',
  'northern', 'southern', 'clothes', 'bathe', 'thereafter', 'nevertheless',
]);

// Silent or non-/h/ "h": the letter is written but not pronounced as /h/.
const SILENT_H = new Set(['hour', 'hours', 'honest', 'honestly', 'honour', 'honor', 'heir']);

// "wh" spellings pronounced /h/, not /w/.
const WH_AS_H = new Set(['who', 'whose', 'whom', 'whole', 'wholly']);

// Written w that is not pronounced. "wr-" is handled by the pattern; these are
// the irregular ones. Note the r in "wrote" IS pronounced - only the w is not.
const SILENT_W = new Set(['answer', 'answers', 'answered', 'answering', 'two', 'sword', 'swords']);

// Words ending in -ed that are NOT past-tense endings.
const NOT_ED_PAST = new Set([
  'need', 'red', 'bed', 'wed', 'shed', 'fed', 'led', 'bled', 'sped', 'sled',
  'indeed', 'deed', 'seed', 'feed', 'speed', 'agreed', 'greed', 'breed',
  'freed', 'exceed', 'succeed', 'proceed', 'bred', 'fled', 'ted',
]);

const ARTICLES = new Set(['a', 'an', 'the']);

// The length/quality contrasts Hebrew's smaller vowel inventory collapses.
// Only words where the contrast actually carries meaning are listed, so the
// tag means something when it is recorded.
const VOWEL_LEN = new Set([
  'ship', 'sheep', 'bit', 'beat', 'fit', 'feet', 'live', 'leave', 'sit', 'seat',
  'these', 'fill', 'feel', 'chip', 'cheap', 'eat', 'ease',
  'full', 'fool', 'pull', 'pool', 'look', 'food', 'foot',
  'bad', 'bed', 'man', 'men', 'sat', 'set', 'head', 'bat', 'bet',
  'pan', 'pen', 'sad', 'bean',
]);

// Tags that describe a whole clause rather than any single word.
export const SENTENCE_LEVEL_TAGS = new Set(['perfect']);

/** The pronunciation targets a single word exercises. */
export function wordTags(raw) {
  const w = String(raw || '').toLowerCase().replace(/[^a-z']/g, '');
  const tags = new Set();
  if (!w) return tags;

  // --- TH
  if (w.includes('th')) {
    tags.add(TH_VOICED.has(w) ? 'th_voiced' : 'th_unvoiced');
  }

  // --- W is pronounced wherever the letter is followed by a vowel, at any
  // position ("west", "always", "sandwich"). It is NOT pronounced in "wr-"
  // (no vowel follows the w), word-finally in vowel digraphs ("saw", "new"),
  // in the /h/-initial "wh" words, or in a handful of irregulars.
  if (!WH_AS_H.has(w) && !SILENT_W.has(w) && /wh?[aeiouy]/.test(w)) tags.add('w');

  // --- V
  if (w.includes('v')) tags.add('v');

  // --- R (American English is rhotic: a written r is pronounced, including
  // after a silent w in "wrote" / "wrong")
  if (/r/.test(w)) tags.add('r');

  // --- H
  if (/^h/.test(w) && !SILENT_H.has(w)) tags.add('h');
  if (WH_AS_H.has(w)) tags.add('h');

  // --- -ed endings
  if (/ed$/.test(w) && w.length > 3 && !NOT_ED_PAST.has(w)) tags.add('ed_ending');

  // --- articles
  if (ARTICLES.has(w)) tags.add('articles');

  // --- vowel length
  if (VOWEL_LEN.has(w)) tags.add('vowel_len');

  return tags;
}

/**
 * Score each tag against ONLY the words that carry it.
 *
 * `words` is the aligned output of scoring.align(): [{word, status}].
 * Returns [{tag, accuracy, n}] where n is how many words the score rests on.
 * A tag with no matching word is omitted rather than guessed at - recording a
 * number we cannot justify is what made the old per-sound view meaningless.
 */
export function tagScores(words, sentenceTags = []) {
  const buckets = new Map();

  for (const entry of words) {
    for (const tag of wordTags(entry.word)) {
      if (!buckets.has(tag)) buckets.set(tag, { hit: 0, n: 0 });
      const b = buckets.get(tag);
      b.n += 1;
      if (entry.status === 'ok') b.hit += 1;
    }
  }

  const out = [];
  for (const [tag, b] of buckets) {
    if (!b.n) continue;
    out.push({ tag, accuracy: b.hit / b.n, n: b.n });
  }

  // Clause-level tags cannot be pinned to a word, so they take the whole
  // sentence's accuracy - which is the right granularity for grammar anyway.
  const total = words.length;
  const ok = words.filter((x) => x.status === 'ok').length;
  for (const tag of sentenceTags) {
    if (SENTENCE_LEVEL_TAGS.has(tag) && total) {
      out.push({ tag, accuracy: ok / total, n: total });
    }
  }
  return out;
}
