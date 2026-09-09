// Listening comprehension track (Section 5 / track D).
//
// Every other drill is production (repeat/shadow/fluency/sales: say it) or
// reading (sales options, vocab prompts). Nothing tested understanding spoken
// English on its own, without also demanding he reproduce it - a genuinely
// different, receptive skill, and the one skill that needs no microphone at
// all (js/drills/listening.js never opens Capture). Comprehension always
// leads production (see placement.js's speechIdx, which already starts a
// notch below the written band for exactly this reason), so a dedicated
// listening track exercises the skill that is otherwise only ever a means to
// an end (hearing the model before repeating it).
//
// Same level-keyed shape family as sentences.js/vocab.js/sales.js: each entry
// is a short natural passage (2-4 sentences, English only) plus 2 comprehension
// questions authored answer-first (answer: 0), same convention as
// placement-items.js - and indeed shuffleOptions() from placement-items.js is
// reused as-is below rather than reimplemented, because a comprehension
// question is exactly that helper's assumed shape (one boolean-correct index),
// unlike sales.js's 3-tier quality field which needed its own shuffler.

import { fanOut, pickFresh } from './pick.js';

export const LEVELS = ['preA1', 'A1', 'A2', 'B1', 'B2'];

export const LISTENING_PASSAGES = {
  preA1: [
    {
      id: 'l-p1',
      text: 'This is Maria. She is from Spain. She lives in a small apartment near the city center. Every morning she drinks coffee and reads the news.',
      questions: [
        { prompt: 'Where is Maria from?', options: ['Spain', 'Italy', 'France', 'Portugal'], answer: 0 },
        { prompt: 'What does Maria do every morning?', options: ['She drinks coffee and reads the news', 'She goes to the gym', 'She calls her mother', 'She cooks dinner'], answer: 0 },
      ],
    },
    {
      id: 'l-p2',
      text: 'Tom has a dog named Max. Max is big and brown. Tom takes Max for a walk every evening after work.',
      questions: [
        { prompt: 'What color is Max?', options: ['Brown', 'Black', 'White', 'Gray'], answer: 0 },
        { prompt: 'When does Tom walk Max?', options: ['Every evening after work', 'Every morning before work', 'Only on weekends', 'Twice a day'], answer: 0 },
      ],
    },
    {
      id: 'l-p3',
      text: 'The shop opens at nine o\'clock and closes at six o\'clock. It is closed on Sundays.',
      questions: [
        { prompt: 'What time does the shop open?', options: ['Nine o\'clock', 'Six o\'clock', 'Eight o\'clock', 'Ten o\'clock'], answer: 0 },
        { prompt: 'Which day is the shop closed?', options: ['Sunday', 'Saturday', 'Friday', 'Monday'], answer: 0 },
      ],
    },
  ],
  A1: [
    {
      id: 'l-a1',
      text: 'Yesterday, Dana went to the supermarket after work. She bought bread, milk, and some fruit. She forgot to buy eggs, so she went back this morning.',
      questions: [
        { prompt: 'When did Dana go to the supermarket the first time?', options: ['Yesterday, after work', 'Yesterday morning', 'This morning', 'Last weekend'], answer: 0 },
        { prompt: 'What did Dana forget to buy?', options: ['Eggs', 'Bread', 'Milk', 'Fruit'], answer: 0 },
      ],
    },
    {
      id: 'l-a2',
      text: 'There is a new restaurant near the train station. It serves breakfast and lunch, but it does not open in the evening. Many people go there before work.',
      questions: [
        { prompt: 'What meals does the restaurant serve?', options: ['Breakfast and lunch', 'Lunch and dinner', 'Only breakfast', 'All three meals'], answer: 0 },
        { prompt: 'Where is the restaurant?', options: ['Near the train station', 'Near the airport', 'In the city center', 'Next to the school'], answer: 0 },
      ],
    },
    {
      id: 'l-a3',
      text: 'Ben usually drives to work, but his car broke down this week. He is taking the bus instead. The bus takes longer, but it is cheaper.',
      questions: [
        { prompt: 'Why is Ben taking the bus this week?', options: ['His car broke down', 'He sold his car', 'He likes the bus', 'His license expired'], answer: 0 },
        { prompt: 'What is one disadvantage of the bus, according to the passage?', options: ['It takes longer', 'It is more expensive', 'It does not run on time', 'It is uncomfortable'], answer: 0 },
      ],
    },
  ],
  A2: [
    {
      id: 'l-b1',
      text: 'Our team meeting was supposed to start at ten, but it started twenty minutes late because two people were stuck in traffic. We still managed to cover everything on the agenda.',
      questions: [
        { prompt: 'Why did the meeting start late?', options: ['Two people were stuck in traffic', 'The room was booked', 'The manager forgot', 'The agenda was too long'], answer: 0 },
        { prompt: 'What happened to the agenda?', options: ['Everything was covered', 'Half of it was skipped', 'It was postponed', 'It was cancelled'], answer: 0 },
      ],
    },
    {
      id: 'l-b2',
      text: 'I was wondering if you could send me the report before Friday. I know it is short notice, but the client moved the deadline up by a week.',
      questions: [
        { prompt: 'Why is the speaker asking for the report early?', options: ['The client moved the deadline up', 'The report was lost', 'The client cancelled the project', 'The team is going on vacation'], answer: 0 },
        { prompt: 'When does the speaker want the report?', options: ['Before Friday', 'Next Monday', 'By the end of the month', 'Today'], answer: 0 },
      ],
    },
    {
      id: 'l-b3',
      text: 'Prices at the new store are lower than at the mall, but the selection is smaller. If you know exactly what you want, it is worth checking there first.',
      questions: [
        { prompt: 'What is an advantage of the new store?', options: ['Lower prices', 'A bigger selection', 'Faster delivery', 'Longer opening hours'], answer: 0 },
        { prompt: 'What is a disadvantage of the new store?', options: ['A smaller selection', 'Higher prices', 'It is far away', 'Poor customer service'], answer: 0 },
      ],
    },
  ],
  B1: [
    {
      id: 'l-c1',
      text: 'Even though the presentation went well, a few clients raised concerns about the price. Our manager suggested we follow up individually rather than address it in the group call.',
      questions: [
        { prompt: 'What concern did some clients raise?', options: ['The price', 'The delivery time', 'The design', 'The contract length'], answer: 0 },
        { prompt: 'What did the manager suggest?', options: ['Following up with clients individually', 'Lowering the price immediately', 'Cancelling the group call', 'Sending a written apology'], answer: 0 },
      ],
    },
    {
      id: 'l-c2',
      text: 'If I had known the flight was delayed, I would have taken a later train to the airport. Instead, I spent three hours waiting at the gate for nothing.',
      questions: [
        { prompt: 'What actually happened to the speaker?', options: ['They waited three hours at the gate', 'They missed the flight', 'They took a later train', 'They cancelled the trip'], answer: 0 },
        { prompt: 'What does the speaker regret?', options: ['Not taking a later train', 'Booking the flight at all', 'Not checking in earlier', 'Forgetting their passport'], answer: 0 },
      ],
    },
    {
      id: 'l-c3',
      text: 'The new policy requires managers to approve any expense over two hundred dollars before it is booked, not after. A lot of people are still getting used to the change.',
      questions: [
        { prompt: 'What does the new policy require?', options: ['Approval before booking an expense over $200', 'Approval after any expense', 'No approval for small expenses', 'Weekly expense reports'], answer: 0 },
        { prompt: 'How are people reacting to the change?', options: ['Still getting used to it', 'Completely against it', 'They have not noticed', 'They asked for it'], answer: 0 },
      ],
    },
  ],
  B2: [
    {
      id: 'l-d1',
      text: 'Despite having far less experience than the other candidates, she was offered the position because she asked the most insightful questions during the interview and clearly understood the company\'s challenges.',
      questions: [
        { prompt: 'Why was she offered the position?', options: ['She asked the most insightful questions and understood the company\'s challenges', 'She had the most experience', 'She accepted a lower salary', 'She knew someone on the team'], answer: 0 },
        { prompt: 'How did her experience compare to the other candidates?', options: ['She had far less experience', 'She had similar experience', 'She had the most experience', 'It was not mentioned'], answer: 0 },
      ],
    },
    {
      id: 'l-d2',
      text: 'The board was reluctant to approve the budget increase, arguing that the projected returns were too speculative. It was only after the team presented data from a comparable market that they reconsidered.',
      questions: [
        { prompt: 'Why was the board reluctant at first?', options: ['The projected returns seemed too speculative', 'The budget was too small', 'The team missed the deadline', 'A competitor had already failed'], answer: 0 },
        { prompt: 'What changed the board\'s mind?', options: ['Data from a comparable market', 'A personal appeal from the CEO', 'Pressure from investors', 'A lower revised budget'], answer: 0 },
      ],
    },
    {
      id: 'l-d3',
      text: 'Let me play devil\'s advocate for a moment: if our biggest client left tomorrow, would the rest of the business actually survive, or are we more dependent on them than we like to admit?',
      questions: [
        { prompt: 'What is the speaker questioning?', options: ['How dependent the business is on its biggest client', 'Whether to hire a new client', 'The company\'s marketing strategy', 'Whether to raise prices'], answer: 0 },
        { prompt: 'What does "play devil\'s advocate" suggest about the speaker\'s intent?', options: ['Deliberately raising a difficult, uncomfortable question', 'Agreeing with everyone in the room', 'Changing the subject', 'Ending the meeting early'], answer: 0 },
      ],
    },
  ],
};

/**
 * Pick `n` passages for `level`, fanning outward (own level, then +1, -1, +2,
 * -2, ...) when a level runs dry - mirrors content/vocab.js's pickNew(). Now
 * shares that fan-out logic, plus a `excludeIds` (recently-shown) preference,
 * with Shadow/Fluency/Sales's pickers via content/pick.js - see that module's
 * header for why. `minPool` of `n * 3` (floor 6) means the candidate pool is
 * wider than a single session's draw, so exclusion has room to rotate through
 * before anything repeats, rather than just barely covering this session.
 */
export function pickPassages(level, n, excludeIds = []) {
  const effLevel = LISTENING_PASSAGES[level] ? level : 'A2';
  const pool = fanOut(LISTENING_PASSAGES, LEVELS, effLevel, Math.max(n * 3, 6), (p) => p.id);
  return pickFresh(pool, excludeIds, n, (p) => p.id);
}
