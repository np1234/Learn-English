// Leveled sentence bank for the Speech drills.
// Every sentence is tagged with the Hebrew-L1 interference targets it exercises,
// so drills can be drawn to hit whatever the learner is currently weakest at.

import { fanOut, pickFresh } from './pick.js';

// Coaching labels and hints for these tags live in js/i18n.js, because they
// are translated. Sentences below reference the tags only.
export const PHONEME_TAGS = [
  'th_unvoiced', 'th_voiced', 'w', 'v', 'vowel_len',
  'ed_ending', 'articles', 'r', 'h', 'perfect',
];

export const LEVELS = ['preA1', 'A1', 'A2', 'B1', 'B2'];

export const SENTENCES = {
  preA1: [
    { text: 'This is my house.',            tags: ['th_voiced', 'h'] },
    { text: 'I have three brothers.',       tags: ['th_unvoiced', 'r', 'v'] },
    { text: 'What is your name?',           tags: ['w', 'r'] },
    { text: 'We live in a small village.',  tags: ['w', 'v', 'articles'] },
    { text: 'Thank you very much.',         tags: ['th_unvoiced', 'v', 'r'] },
    { text: 'The weather is very warm.',    tags: ['th_voiced', 'w', 'v', 'articles', 'r'] },
    { text: 'I want some water.',           tags: ['w', 'r'] },
    { text: 'She has a red hat.',           tags: ['h', 'articles', 'r'] },
    { text: 'Where do you work?',           tags: ['w', 'r'] },
    { text: 'That is a good idea.',         tags: ['th_voiced', 'articles'] },
    { text: 'I think it is here.',          tags: ['th_unvoiced', 'h', 'r'] },
    { text: 'He is my brother.',            tags: ['h', 'r'] },
    { text: 'Please sit here with me.',     tags: ['h', 'th_voiced', 'r'] },
    { text: 'We have a big white dog.',     tags: ['w', 'v', 'articles', 'h'] },
  ],
  A1: [
    { text: 'I walked to the shop this morning.',     tags: ['ed_ending', 'w', 'th_voiced', 'articles', 'r'] },
    { text: 'They watched a movie together.',         tags: ['ed_ending', 'th_voiced', 'v', 'articles', 'r'] },
    { text: 'We visited my grandmother last week.',   tags: ['ed_ending', 'w', 'v', 'r'] },
    { text: 'The three of them work with us.',        tags: ['th_unvoiced', 'th_voiced', 'w', 'r', 'articles'] },
    { text: 'Would you like a cup of coffee?',        tags: ['w', 'articles'] },
    { text: 'I need a new pair of shoes.',            tags: ['articles', 'r'] },
    { text: 'There is a river near the village.',     tags: ['th_voiced', 'r', 'v', 'articles'] },
    { text: 'She wants to have a warm shower.',       tags: ['w', 'h', 'v', 'articles', 'r'] },
    { text: 'This is the third time this week.',      tags: ['th_voiced', 'th_unvoiced', 'w', 'articles', 'r'] },
    { text: 'He arrived very early yesterday.',       tags: ['ed_ending', 'v', 'r', 'h'] },
    { text: 'Can you show me the way home?',          tags: ['w', 'h', 'articles'] },
    { text: 'We were both very tired.',               tags: ['w', 'th_unvoiced', 'v', 'r'] },
    { text: 'I helped my father with the garden.',    tags: ['ed_ending', 'h', 'th_voiced', 'r', 'articles'] },
    { text: 'Their house is white and very old.',     tags: ['th_voiced', 'h', 'w', 'v', 'r'] },
  ],
  A2: [
    { text: 'I have lived in this city for three years.',        tags: ['perfect', 'v', 'th_voiced', 'th_unvoiced', 'r'] },
    { text: 'The weather was worse than we expected.',           tags: ['w', 'th_voiced', 'ed_ending', 'articles', 'r'] },
    { text: 'She has worked there for over twelve years.',       tags: ['perfect', 'w', 'th_voiced', 'v', 'r'] },
    { text: 'I would rather walk than wait for the bus.',        tags: ['w', 'th_voiced', 'r', 'articles'] },
    { text: 'They finished the whole project last Thursday.',    tags: ['ed_ending', 'h', 'th_unvoiced', 'th_voiced', 'articles', 'r'] },
    { text: 'Thanks for everything you have done for us.',       tags: ['th_unvoiced', 'v', 'r'] },
    { text: 'We have never traveled that far before.',           tags: ['perfect', 'v', 'th_voiced', 'r'] },
    { text: 'This is worth thinking about very carefully.',      tags: ['th_voiced', 'th_unvoiced', 'w', 'v', 'r'] },
    { text: 'The whole world was watching that match.',          tags: ['h', 'w', 'th_voiced', 'articles', 'r'] },
    { text: 'I have already asked them three times.',            tags: ['perfect', 'th_voiced', 'th_unvoiced', 'r'] },
    { text: 'He wondered whether the answer was right.',         tags: ['w', 'th_voiced', 'ed_ending', 'r', 'articles'] },
    { text: 'We shared a room with two other students.',         tags: ['ed_ending', 'w', 'th_voiced', 'r', 'articles'] },
    { text: 'Everything they said was completely wrong.',        tags: ['th_voiced', 'w', 'r'] },
    { text: 'I need to leave this ship before it sinks.',        tags: ['vowel_len', 'th_voiced', 'v', 'r'] },
  ],
  B1: [
    { text: 'Although the weather was terrible, we still went walking.',  tags: ['th_voiced', 'w', 'r', 'articles'] },
    { text: 'I would have preferred to hear about it earlier.',           tags: ['w', 'h', 'v', 'r', 'ed_ending'] },
    { text: 'They have been working on this together for months.',        tags: ['perfect', 'w', 'th_voiced', 'h', 'r'] },
    { text: 'The whole thing was worth far more than they thought.',      tags: ['h', 'th_unvoiced', 'th_voiced', 'w', 'r', 'articles'] },
    { text: 'She realized that she had misunderstood the question.',      tags: ['ed_ending', 'th_voiced', 'h', 'articles', 'r'] },
    { text: 'We were wondering whether you would be available.',          tags: ['w', 'th_voiced', 'v', 'r'] },
    { text: 'There is nothing worse than waiting without news.',          tags: ['th_voiced', 'th_unvoiced', 'w', 'r'] },
    { text: 'I have thought about this very thoroughly.',                 tags: ['perfect', 'th_unvoiced', 'th_voiced', 'v', 'r'] },
    { text: 'The workers were rewarded for their hard work.',             tags: ['w', 'ed_ending', 'th_voiced', 'r', 'articles'] },
    { text: 'He avoided answering the most difficult questions.',         tags: ['ed_ending', 'v', 'h', 'r', 'articles'] },
    { text: 'Whatever happens, I will not change my mind.',               tags: ['w', 'h', 'v', 'r'] },
    { text: 'These three theories are worth reviewing.',                  tags: ['vowel_len', 'th_unvoiced', 'th_voiced', 'w', 'v', 'r'] },
    { text: 'We wondered whether the whole idea was worth pursuing further.', tags: ['w', 'ed_ending', 'th_voiced', 'th_unvoiced', 'h', 'r', 'articles'] },
    { text: 'He has already asked whether we could reschedule the whole meeting.', tags: ['perfect', 'h', 'ed_ending', 'th_voiced', 'w', 'r', 'articles'] },
  ],
  B2: [
    { text: 'Whatever the outcome, we would rather know the truth now.',            tags: ['w', 'th_voiced', 'th_unvoiced', 'r', 'articles'] },
    { text: 'The research showed that the theory was worth revisiting.',            tags: ['r', 'th_voiced', 'th_unvoiced', 'w', 'v', 'articles'] },
    { text: 'I have never worked with a more thorough team.',                       tags: ['perfect', 'v', 'w', 'th_unvoiced', 'r', 'articles'] },
    { text: 'They were thoroughly unprepared for what happened afterwards.',        tags: ['th_unvoiced', 'w', 'h', 'ed_ending', 'r'] },
    { text: 'Whether or not we agree, the weather will decide for us.',             tags: ['w', 'th_voiced', 'r', 'articles'] },
    { text: 'She has withdrawn from three separate negotiations this month.',       tags: ['perfect', 'w', 'th_voiced', 'th_unvoiced', 'r'] },
    { text: 'The whole world seemed to be watching, which was overwhelming.',       tags: ['h', 'w', 'th_voiced', 'v', 'articles', 'r'] },
    { text: 'I would have thought that they had already heard the news.',           tags: ['w', 'h', 'th_unvoiced', 'th_voiced', 'r', 'articles'] },
    { text: 'We have thoroughly reviewed every version of the agreement.',          tags: ['perfect', 'th_unvoiced', 'v', 'r', 'articles'] },
    { text: 'Nevertheless, their withdrawal was worth far more than we thought.',   tags: ['th_voiced', 'w', 'th_unvoiced', 'v', 'r'] },
    { text: 'Whatever the outcome, the whole team has worked incredibly hard throughout this quarter.', tags: ['w', 'th_voiced', 'h', 'perfect', 'th_unvoiced', 'r', 'articles'] },
    { text: 'I would rather we addressed this together than argued about it afterwards.', tags: ['r', 'th_voiced', 'w', 'ed_ending'] },
    { text: 'Whoever takes on this role will have their work cut out for them.',   tags: ['w', 'th_voiced', 'h', 'r'] },
    { text: 'Nevertheless, whoever wrote this report clearly understood the whole situation.', tags: ['th_voiced', 'w', 'r', 'h', 'articles'] },
  ],
};

// Prompts for the 4/3/2 Fluency Sprint. The same content is retold three times
// under shrinking time limits, which is what drives the speech-rate gain.
export const FLUENCY_PROMPTS = {
  preA1: [
    'Describe your family. Who are they, and what do they do?',
    'Describe the room you are sitting in right now.',
    'What do you do on a normal day, from morning to night?',
  ],
  A1: [
    'Describe your home town. What is it like, and what can you do there?',
    'Tell the story of your last holiday, from beginning to end.',
    'Describe your best friend and how you met.',
  ],
  A2: [
    'Tell me about a job you have had. What did you do every day?',
    'Describe something you bought recently and why you chose it.',
    'Tell the story of a day that did not go as planned.',
  ],
  B1: [
    'Describe a decision you made that changed something in your life.',
    'Explain something you are good at, as if you were teaching a beginner.',
    'Tell me about a time you had to convince someone of something.',
  ],
  B2: [
    'Argue for or against working from home. Give reasons and examples.',
    'Describe a problem in your industry and how you would solve it.',
    'Tell me about a time you disagreed with someone and how it ended.',
  ],
};

// Longer, prosodically richer passages for Shadow Mode - rhythm and intonation
// matter more here than individual sounds.
export const SHADOW_PASSAGES = {
  preA1: [
    'Hello. My name is David. I live in a small city with my family.',
    'I get up at seven. I have coffee, and then I go to work.',
  ],
  A1: [
    'On Sunday we usually stay at home. We cook something together, and in the afternoon we go for a walk by the river.',
    'I started this job about a year ago. At first it was difficult, but now I really like it.',
  ],
  A2: [
    'I have been living here for almost three years now. When I first arrived I did not know anyone, and honestly, the first few months were hard.',
    'The thing I like most about my work is that every day is different. Some days are quiet, and other days everything happens at once.',
  ],
  B1: [
    'What surprised me most was how quickly things changed. One week everything was normal, and the next week we were all working from home, wondering what would happen next.',
    'If I could give one piece of advice, it would be this: start before you feel ready. You will never feel completely ready, and waiting only makes it harder.',
  ],
  B2: [
    'There is a difference between being busy and being effective, and it took me far too long to understand that. For years I measured my work by how full my calendar looked, rather than by what actually moved forward.',
    'The most useful thing I learned was to ask better questions. Instead of trying to have all the answers, I started listening properly, and the conversations became far more productive.',
  ],
};

/** Pick `count` sentences from `level`, preferring ones that hit `weakTags`. */
export function pickSentences(level, count, weakTags = []) {
  const pool = (SENTENCES[level] || SENTENCES.A2).slice();
  const score = (s) => s.tags.filter((t) => weakTags.includes(t)).length;
  // Shuffle first so equal-scoring sentences vary between sessions.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  pool.sort((a, b) => score(b) - score(a));
  return pool.slice(0, count);
}

/**
 * Pick one random entry from a level-keyed bank, fanning out to neighboring
 * levels for a wider pool and avoiding `excludeIds` (recently shown) when
 * possible - see content/pick.js. `minPool` of 6 means a 3-prompt/level bank
 * like FLUENCY_PROMPTS reaches into a second level before repeating, rather
 * than cycling the same 3 prompts alone.
 */
export function pickOne(bank, level, excludeIds = []) {
  const effLevel = bank[level] ? level : 'A2';
  let pool = fanOut(bank, LEVELS, effLevel, 6);
  if (!pool.length) pool = Object.values(bank).flat();
  return pickFresh(pool, excludeIds, 1)[0];
}

/**
 * Pick `n` Shadow Mode passages for `level`. SHADOW_PASSAGES has only 2
 * passages per level - the thinnest pool in the app - so without fan-out
 * `count: 2` (Shadow's default) shows the ENTIRE level's pool in session 1
 * and repeats it verbatim, reshuffled, every session after. Fanning out to
 * a 6-item candidate pool and excluding whatever ran recently fixes that
 * without needing new content authored.
 */
export function pickShadowPassages(level, n, excludeIds = []) {
  const effLevel = SHADOW_PASSAGES[level] ? level : 'A2';
  const pool = fanOut(SHADOW_PASSAGES, LEVELS, effLevel, Math.max(n * 3, 6));
  return pickFresh(pool, excludeIds, n);
}
