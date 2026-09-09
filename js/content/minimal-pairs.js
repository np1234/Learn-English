// Minimal pairs targeted at Hebrew-L1 interference.
// Ordered by impact on intelligibility: getting TH and W/V wrong changes words,
// which costs comprehension far more than a general accent does.

export const MINIMAL_PAIRS = [
  {
    id: 'th_unvoiced',
    title: 'think vs sink',
    why: 'Hebrew has no TH, so it usually comes out as "t" or "s". These are different words in English.',
    pairs: [
      ['think', 'sink'], ['thick', 'sick'], ['thank', 'sank'],
      ['thin', 'sin'], ['three', 'tree'], ['thought', 'taught'],
      ['math', 'mass'], ['path', 'pass'], ['faith', 'face'],
    ],
  },
  {
    id: 'th_voiced',
    title: 'they vs day',
    why: 'The voiced TH often becomes "d" or "z". It is the most common sound in English function words.',
    pairs: [
      ['they', 'day'], ['then', 'den'], ['there', 'dare'],
      ['though', 'dough'], ['breathe', 'breeze'], ['other', 'udder'],
      ['worthy', 'wordy'],
    ],
  },
  {
    id: 'w',
    title: 'west vs vest',
    why: 'Hebrew vav is a V sound, and there is no W. Lips round for W, and touch the teeth for V.',
    pairs: [
      ['west', 'vest'], ['wine', 'vine'], ['wet', 'vet'],
      ['worse', 'verse'], ['while', 'vile'], ['wary', 'vary'],
      ['wail', 'veil'], ['went', 'vent'],
    ],
  },
  {
    id: 'vowel_len',
    title: 'ship vs sheep',
    why: 'Hebrew has about 5 vowels; English has around 12. Length and tongue position change the word.',
    pairs: [
      ['ship', 'sheep'], ['bit', 'beat'], ['fit', 'feet'],
      ['live', 'leave'], ['sit', 'seat'], ['this', 'these'],
      ['fill', 'feel'], ['chip', 'cheap'],
    ],
  },
  {
    id: 'h',
    title: 'hand vs and',
    why: 'Hebrew ה/ח do not match the English H, which leads to dropping it (or adding one where it does not belong) - classic English h-dropping pairs, each a real, different word.',
    pairs: [
      ['hand', 'and'], ['heel', 'eel'], ['heart', 'art'],
      ['hour', 'our'], ['hall', 'all'], ['hear', 'ear'],
      ['hat', 'at'], ['high', 'eye'],
    ],
  },
];

// ed_ending, articles and perfect are deliberately NOT here, and never will
// be by extending TAG_TO_PAIR below - they are suffix/grammar issues, not
// word-level sound confusions the way th/w/v/vowel-length/h are. Getting an
// -ed ending wrong, skipping an article, or misusing present perfect does not
// turn one real English word into a different real English word, so there is
// no minimal PAIR to illustrate - forcing one would be exactly the "invented
// phonetics" common.js's renderMistakes() already refuses to do for a plain
// vocabulary miss. `r` is excluded for the same reason from the other
// direction: a Hebrew-influenced English R is an accent-quality issue (it
// changes how a word sounds, not which word it is), unlike th/w/v/vowel
// length, which each genuinely collide two different English words.

export function pairsFor(id) {
  return MINIMAL_PAIRS.find((p) => p.id === id) || null;
}

// A pronunciation target maps to the contrast that demonstrates it. W and V are
// the same contrast seen from either side, so both point at west/vest.
const TAG_TO_PAIR = {
  th_unvoiced: 'th_unvoiced',
  th_voiced: 'th_voiced',
  w: 'w',
  v: 'w',
  vowel_len: 'vowel_len',
  h: 'h',
};

/** One illustrative [wrong-sounding, right] pair for a tag, or null. */
export function contrastFor(tag) {
  const set = pairsFor(TAG_TO_PAIR[tag]);
  if (!set) return null;
  const pair = set.pairs[0];
  // For W the list reads [w-word, v-word]; flip it when teaching V.
  const [a, b] = tag === 'v' ? [pair[1], pair[0]] : pair;
  return { target: a, confusedWith: b, all: set.pairs };
}
