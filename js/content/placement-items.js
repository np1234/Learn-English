// Placement test item bank, organised by CEFR level.
// The test ladders up and down this bank rather than asking everything, so it
// stays short (~6-8 minutes) while still separating Pre-A1 from B2.
//
// Item types:
//   choice   - written grammar / usage / vocabulary item
//   listen   - spoken prompt (TTS); he picks the natural reply. Tests listening.
//   readaloud- read a sentence aloud (scored by ASR when available)
//   speak    - free spoken response (recorded; self-assessed)

export const ITEMS = {
  preA1: [
    { id: 'p1', type: 'choice', skill: 'grammar',
      prompt: 'She ___ a doctor.',
      options: ['is', 'are', 'am', 'be'], answer: 0 },
    { id: 'p2', type: 'choice', skill: 'vocab',
      prompt: 'Which one do you drink?',
      options: ['water', 'chair', 'shoe', 'table'], answer: 0 },
    { id: 'p3', type: 'listen', skill: 'listening',
      audio: 'Where do you live?',
      prompt: 'Choose the natural reply.',
      options: ['In Tel Aviv.', 'I am fine, thanks.', 'It is Monday.', 'Yes, I do.'], answer: 0 },
    { id: 'p4', type: 'choice', skill: 'grammar',
      prompt: 'I ___ two sisters.',
      options: ['have', 'has', 'am', 'is'], answer: 0 },
    { id: 'p5', type: 'choice', skill: 'vocab',
      prompt: 'The opposite of "big" is ___.',
      options: ['small', 'tall', 'old', 'new'], answer: 0 },
    { id: 'p6', type: 'listen', skill: 'listening',
      audio: 'How old are you?',
      prompt: 'Choose the natural reply.',
      options: ['I am twenty-five.', 'I live here.', 'My name is Dan.', 'It is red.'], answer: 0 },
  ],
  A1: [
    { id: 'a1', type: 'choice', skill: 'grammar',
      prompt: 'They ___ to the beach yesterday.',
      options: ['went', 'go', 'going', 'goes'], answer: 0 },
    { id: 'a2', type: 'choice', skill: 'vocab',
      prompt: 'The opposite of "expensive" is ___.',
      options: ['cheap', 'heavy', 'quiet', 'late'], answer: 0 },
    { id: 'a3', type: 'listen', skill: 'listening',
      audio: 'What time does the shop open?',
      prompt: 'Choose the natural reply.',
      options: ['At nine o’clock.', 'It is very big.', 'By bus.', 'Because it is closed.'], answer: 0 },
    { id: 'a4', type: 'choice', skill: 'grammar',
      prompt: 'There ___ some milk in the fridge.',
      options: ['is', 'are', 'have', 'be'], answer: 0 },
    { id: 'a5', type: 'choice', skill: 'vocab',
      prompt: 'A person who works in a hospital is a ___.',
      options: ['nurse', 'driver', 'farmer', 'pilot'], answer: 0 },
    { id: 'a6', type: 'listen', skill: 'listening',
      audio: 'How did you get here?',
      prompt: 'Choose the natural reply.',
      options: ['By train.', 'At six.', 'It is fine.', 'Two weeks.'], answer: 0 },
  ],
  A2: [
    { id: 'b1', type: 'choice', skill: 'grammar',
      prompt: 'I ___ here since 2019.',
      options: ['have lived', 'live', 'lived', 'am living'], answer: 0 },
    { id: 'b2', type: 'choice', skill: 'vocab',
      prompt: 'If something is "affordable", it is ___.',
      options: ['not too expensive', 'very heavy', 'extremely rare', 'badly made'], answer: 0 },
    { id: 'b3', type: 'listen', skill: 'listening',
      audio: 'Would you mind opening the window?',
      prompt: 'Choose the natural reply.',
      options: ['Not at all.', 'Yes, I minded.', 'It is a window.', 'I opened yesterday.'], answer: 0 },
    { id: 'b4', type: 'choice', skill: 'grammar',
      prompt: 'She is better ___ maths than me.',
      options: ['at', 'in', 'on', 'for'], answer: 0 },
    { id: 'b5', type: 'choice', skill: 'vocab',
      prompt: 'To "postpone" a meeting means to ___.',
      options: ['move it to a later time', 'cancel it completely', 'make it shorter', 'attend it'], answer: 0 },
    { id: 'b6', type: 'choice', skill: 'grammar',
      prompt: 'If it rains, we ___ at home.',
      options: ['will stay', 'stayed', 'would stay', 'have stayed'], answer: 0 },
  ],
  B1: [
    { id: 'c1', type: 'choice', skill: 'grammar',
      prompt: 'If I ___ more time, I would learn another language.',
      options: ['had', 'have', 'will have', 'am having'], answer: 0 },
    { id: 'c2', type: 'choice', skill: 'vocab',
      prompt: '"Reluctant" means ___.',
      options: ['unwilling', 'excited', 'careless', 'talkative'], answer: 0 },
    { id: 'c3', type: 'listen', skill: 'listening',
      audio: 'I was wondering if you could give me a hand.',
      prompt: 'Choose the natural reply.',
      options: ['Sure, what do you need?', 'My hand is fine.', 'I gave it already.', 'No, I am wondering too.'], answer: 0 },
    { id: 'c4', type: 'choice', skill: 'grammar',
      prompt: 'He denied ___ the document.',
      options: ['seeing', 'to see', 'see', 'saw'], answer: 0 },
    { id: 'c5', type: 'choice', skill: 'vocab',
      prompt: 'If a deadline is "tight", there is ___.',
      options: ['very little time', 'plenty of time', 'no deadline at all', 'an easy task'], answer: 0 },
    { id: 'c6', type: 'choice', skill: 'grammar',
      prompt: 'By the time we arrived, the meeting ___.',
      options: ['had finished', 'finished', 'has finished', 'was finishing'], answer: 0 },
  ],
  B2: [
    { id: 'd1', type: 'choice', skill: 'grammar',
      prompt: '___ having little experience, she handled it well.',
      options: ['Despite', 'Although', 'However', 'Because'], answer: 0 },
    { id: 'd2', type: 'choice', skill: 'vocab',
      prompt: 'To "mitigate" a risk is to ___.',
      options: ['reduce it', 'ignore it', 'cause it', 'measure it'], answer: 0 },
    { id: 'd3', type: 'choice', skill: 'grammar',
      prompt: 'I would rather you ___ tell anyone.',
      options: ['did not', 'do not', 'will not', 'are not'], answer: 0 },
    { id: 'd4', type: 'choice', skill: 'vocab',
      prompt: 'A "compelling" argument is one that is ___.',
      options: ['very convincing', 'rather boring', 'poorly made', 'far too long'], answer: 0 },
    { id: 'd5', type: 'listen', skill: 'listening',
      audio: 'Let me play devil’s advocate for a moment.',
      prompt: 'Choose the natural reply.',
      options: ['Go ahead, I would like to hear the other side.', 'I do not believe in the devil.', 'You can play later.', 'That is my advocate.'], answer: 0 },
    { id: 'd6', type: 'choice', skill: 'grammar',
      prompt: 'Had I known earlier, I ___ differently.',
      options: ['would have acted', 'will act', 'had acted', 'would act'], answer: 0 },
  ],
};

// Spoken items, asked once at the end regardless of the ladder result.
// The read-aloud sentence is deliberately loaded with Hebrew-L1 trouble sounds
// (TH, W, V, R) so the first pronunciation reading is informative.
export const SPEAKING_ITEMS = [
  {
    id: 's1', type: 'readaloud', skill: 'speaking',
    prompt: 'Read this sentence aloud, clearly and at a natural speed.',
    text: 'The three brothers thought the weather was worse than they expected.',
    tags: ['th_unvoiced', 'th_voiced', 'w', 'v', 'r'],
  },
  {
    id: 's2', type: 'speak', skill: 'speaking',
    prompt: 'Speak for about 30 seconds: where are you from, and what do you do?',
    text: null,
  },
];

/** Every option list above is written answer-first; shuffle at display time. */
export function shuffleOptions(item) {
  const idx = item.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    options: idx.map((i) => item.options[i]),
    answer: idx.indexOf(item.answer),
  };
}
