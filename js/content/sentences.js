// Leveled sentence bank for the Speech drills.
// Every sentence is tagged with the Hebrew-L1 interference targets it exercises,
// so drills can be drawn to hit whatever the learner is currently weakest at.

import { fanOut, pickFresh } from './pick.js';
import { wordTags } from '../phonetics.js';

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

// Sentences below this line are authored as plain text (optionally with
// 'perfect' for clause-level grammar) and their sound tags are DERIVED from
// phonetics.wordTags(), so a declared tag can never drift from what a real
// word in the sentence carries - the same invariant the older hand-tagged
// bank is checked against (tests/index.html).
const MORE_SENTENCES = {
  preA1: [
    "Nice to meet you.",
    "How are you today?",
    "I work in sales.",
    "This is my phone number.",
    "Can you help me, please?",
    "I have a meeting at nine.",
    "The price is ten dollars.",
    "We sell very good coffee.",
    "What time is the meeting?",
    "I will call you tomorrow.",
    "Thank you for your time.",
    "Here is my business card.",
    "I have two good customers.",
    "We open at eight every day.",
    "Please wait a moment.",
    "He works with my brother.",
    "That is a very big house.",
    "The weather is nice today.",
    "I live with my wife.",
    "Where is the white van?",
    "They have three new products.",
    "My father drives a truck.",
    "I think this one is better.",
    "We have a very busy week.",
    "It is Thursday afternoon.",
    "Have a good weekend.",
  ],
  A1: [
    "I called three customers this morning.",
    "We offer a free trial for thirty days.",
    "The meeting started at ten past nine.",
    "Could you send me the price list, please?",
    "I visited your website yesterday.",
    "We have helped over two hundred companies.",
    "My manager wants a short report.",
    "Our team works from nine to five.",
    "I would like to book a demo for Wednesday.",
    "The delivery arrived on Thursday.",
    "She answered the phone very quickly.",
    "We moved to a bigger office last year.",
    "Thank you for waiting, I am here now.",
    "He asked about the monthly payment.",
    "I have a question about the contract.",
    "The customer wanted a better price.",
    "We worked with them for three years.",
    "This is the third email I sent today.",
    "Please check your inbox for the offer.",
    "Our new version is very easy to use.",
    "They visited our stand at the fair.",
    "I will send the invoice on Friday.",
    "We want to help your team grow.",
    "He checked the numbers twice.",
    "Which plan works best for you?",
    "I walked into the office and said hello.",
  ],
  A2: [
    ["I have worked in sales for about five years.", 'perfect'],
    ["We have already sent you the proposal.", 'perfect'],
    "Thanks for your patience, I really appreciate it.",
    ["The client has not replied to my email yet.", 'perfect'],
    "Let me walk you through the main features.",
    "Our prices are lower than most of our competitors.",
    "I would like to follow up on our last conversation.",
    ["Many customers have told us the same thing.", 'perfect'],
    "What is the biggest challenge for your team?",
    "We can start the trial whenever you are ready.",
    "Would you like me to explain how it works?",
    "The price includes training and support.",
    ["I have never seen a company grow so fast.", 'perfect'],
    ["She has been working with this client since March.", 'perfect'],
    "That is exactly what we wanted to hear.",
    "We checked every detail before the launch.",
    "Could we move the meeting to Thursday afternoon?",
    "I will have the answer for you by Wednesday.",
    "This plan is a better fit for a growing team.",
    "Both options have their advantages.",
    "The first three months are the most important.",
    ["They have asked for a discount twice already.", 'perfect'],
    "I understand why the price worries you.",
    "Our customers value reliable service above everything.",
    "We discussed three different ways to solve it.",
    "He promised that the work would be finished by Friday.",
  ],
  B1: [
    ["I have been following up with them for weeks.", 'perfect'],
    "If the timing is not right, I completely understand.",
    ["We have helped similar companies reduce their costs.", 'perfect'],
    "Before we go further, I want to make sure we are aligned.",
    "What would need to happen for this to move forward?",
    "The main reason customers choose us is reliability.",
    "I would have called earlier if I had known.",
    "Our implementation usually takes about three weeks.",
    "Let me check whether that is possible and get back to you.",
    "We are working hard to improve the response time.",
    "That is a very valid concern, and I am glad you raised it.",
    "Their proposal was thorough, but it did not include training.",
    "The whole process should not take more than a month.",
    ["I have prepared a short summary of everything we discussed.", 'perfect'],
    "Would it be helpful if I introduced you to a customer in your industry?",
    "We have to be careful not to promise more than we can deliver.",
    ["Most of our growth has come from referrals.", 'perfect'],
    "I would rather be honest than make a promise I cannot keep.",
    "The numbers show a clear improvement over the last quarter.",
    "He suggested that we review the agreement together.",
    "Can you walk me through how your team decides?",
    "I wanted to thank you for the time you gave us.",
    "We are very flexible about the payment schedule.",
    "The report highlights three areas where we can improve.",
    ["Whether we win this deal or not, I have learned a lot.", 'perfect'],
    "It is worth thinking about the long-term value rather than the price.",
  ],
  B2: [
    "Having reviewed the numbers, I believe we can offer a better structure.",
    "I would appreciate it if we could finalize the terms by Friday.",
    ["We have consistently exceeded our targets for the past three quarters.", 'perfect'],
    "What I am hearing is that timing matters more than price.",
    "Rather than discounting, we would prefer to add value to the package.",
    ["Our commitment to the customer has never been just a slogan.", 'perfect'],
    "Should the pilot succeed, we would be happy to extend it across the whole organization.",
    "I want to be transparent about what we can and cannot promise.",
    ["Several stakeholders have raised concerns about the integration timeline.", 'perfect'],
    "Let me summarize where we stand and what remains to be decided.",
    "The renewal rate demonstrates that our customers genuinely value the service.",
    "We would welcome the opportunity to address those concerns directly.",
    "It would be a mistake to evaluate the proposal on price alone.",
    "Whichever option you choose, we will support the transition thoroughly.",
    ["The three of us have worked together on every major account.", 'perfect'],
    "I would not recommend this approach if I did not believe in it.",
    "There is a risk that the schedule will slip, and we have a plan for it.",
    "Having heard your concerns, I think a phased rollout is the wisest path.",
    "We are confident that the results will speak for themselves.",
    "Let us agree on the criteria before we evaluate the vendors.",
    "Their willingness to compromise was what ultimately persuaded us.",
    "This is the kind of partnership that benefits both sides over time.",
    "I would be grateful if you could share the feedback with the whole team.",
    "Without a clear owner, even the best strategy will eventually fail.",
    ["We have never missed a deadline on a project of this size.", 'perfect'],
    "Their thoughtful questions revealed exactly what the customer valued.",
  ],
};

function derive(entry) {
  const [text, ...extra] = Array.isArray(entry) ? entry : [entry];
  const tags = new Set(extra);
  for (const w of text.toLowerCase().split(/[^a-z']+/)) {
    if (w) for (const tag of wordTags(w)) tags.add(tag);
  }
  return { text, tags: [...tags] };
}

for (const [level, entries] of Object.entries(MORE_SENTENCES)) {
  const have = new Set(SENTENCES[level].map((x) => x.text));
  for (const entry of entries) {
    const made = derive(entry);
    if (!have.has(made.text)) SENTENCES[level].push(made);
  }
}

// Prompts for the 4/3/2 Fluency Sprint. The same content is retold three times
// under shrinking time limits, which is what drives the speech-rate gain.
export const FLUENCY_PROMPTS = {
  preA1: [
    'Describe your family. Who are they, and what do they do?',
    'Describe the room you are sitting in right now.',
    'What do you do on a normal day, from morning to night?',
    "Tell me about your job. What do you do every day?",
    "Describe your favorite food and how you make it.",
    "Talk about your weekend. What do you usually do?",
    "Describe a person you work with.",
    "Describe your phone. What do you use it for?",
  ],
  A1: [
    'Describe your home town. What is it like, and what can you do there?',
    'Tell the story of your last holiday, from beginning to end.',
    'Describe your best friend and how you met.',
    "Introduce yourself to a new customer: who you are, and what you sell.",
    "Describe a product you know well. What is it, and who uses it?",
    "Tell me about your last working day, from morning to evening.",
    "Explain how to get from your home to your office.",
    "Describe a shop you like, and say why you go there.",
  ],
  A2: [
    'Tell me about a job you have had. What did you do every day?',
    'Describe something you bought recently and why you chose it.',
    'Tell the story of a day that did not go as planned.',
    "Pitch a product you know to a customer who has only two minutes.",
    "Tell me about a customer who was difficult. What happened, and what did you do?",
    "Describe your company to someone who has never heard of it.",
    "Explain why a customer should choose you instead of a competitor.",
    "Tell the story of your best working day.",
  ],
  B1: [
    'Describe a decision you made that changed something in your life.',
    'Explain something you are good at, as if you were teaching a beginner.',
    'Tell me about a time you had to convince someone of something.',
    "A customer says your product is too expensive. Explain how you would respond.",
    "Describe how you prepare for an important meeting with a new client.",
    "Tell me about a mistake at work and what you learned from it.",
    "Explain a complicated idea from your job to someone with no experience.",
    "Make the case for why a company should invest in training for its sales team.",
  ],
  B2: [
    'Argue for or against working from home. Give reasons and examples.',
    'Describe a problem in your industry and how you would solve it.',
    'Tell me about a time you disagreed with someone and how it ended.',
    "Present a business proposal in two minutes: the problem, your solution, and the next step.",
    "You are losing an important customer. Explain how you would try to win them back.",
    "Compare two ways of finding new customers, and argue for the one you prefer.",
    "Describe a negotiation you were part of, and what you would do differently today.",
    "Explain how a team should handle a customer complaint that has become public.",
  ],
};

// Longer, prosodically richer passages for Shadow Mode - rhythm and intonation
// matter more here than individual sounds.
export const SHADOW_PASSAGES = {
  preA1: [
    'Hello. My name is David. I live in a small city with my family.',
    'I get up at seven. I have coffee, and then I go to work.',
    "My name is Elad. I work in sales. I talk to people every day, and I like my job.",
    "This is my team. We work in a small office. We drink coffee together in the morning.",
    "I have a big meeting today. I am a little nervous, but I am ready.",
    "My friend has a shop. He sells shoes and bags. His customers are very happy.",
    "On Friday I go to my mother's house. We eat dinner, and we talk about the week.",
    "It is a sunny day. I walk to work, and I say hello to my neighbors.",
  ],
  A1: [
    'On Sunday we usually stay at home. We cook something together, and in the afternoon we go for a walk by the river.',
    'I started this job about a year ago. At first it was difficult, but now I really like it.',
    "Last week I called a new customer. At first she did not have time, but then we talked for twenty minutes.",
    "I usually prepare for a meeting the day before. I read my notes, and I write three questions.",
    "My office is near the train station. Every morning I buy a coffee, and I read the news on the train.",
    "When a customer is angry, I try to stay calm. I listen first, and then I offer a solution.",
    "We sell software for small companies. It saves time, and it is easy to learn.",
    "Yesterday I made six calls. Two people said no, one said maybe, and three wanted more information.",
  ],
  A2: [
    'I have been living here for almost three years now. When I first arrived I did not know anyone, and honestly, the first few months were hard.',
    'The thing I like most about my work is that every day is different. Some days are quiet, and other days everything happens at once.',
    "The best salespeople I know are not the loudest. They ask good questions, and they listen carefully before they say anything.",
    "When a customer says the price is too high, I do not argue. I ask what they are comparing it with, and the conversation changes.",
    "I used to be afraid of speaking English on the phone. Now I prepare a few key sentences, and I feel much more confident.",
    "A good follow-up email is short. It thanks the customer, repeats the main point, and suggests one clear next step.",
    "Last month we lost a big deal, and it was frustrating. But we learned that we had talked too much about features and too little about problems.",
    "Before every call I ask myself one question: what does this person need to hear from me today?",
  ],
  B1: [
    'What surprised me most was how quickly things changed. One week everything was normal, and the next week we were all working from home, wondering what would happen next.',
    'If I could give one piece of advice, it would be this: start before you feel ready. You will never feel completely ready, and waiting only makes it harder.',
    "Most objections are not really about price. They are about risk, and the customer wants to feel that choosing us is a safe decision.",
    "I have learned that silence is a powerful tool. After you ask a hard question, wait, and let the other person think.",
    "When we started working with this client, they were skeptical. Over six months we earned their trust by doing exactly what we promised.",
    "The most important part of a presentation is the first minute. If you do not show the customer why they should care, nothing else matters.",
    "Our competitors keep lowering their prices, but customers who leave for a cheaper option often come back once they see the difference in service.",
    "I used to rush to answer every concern. Now I pause, repeat the concern in my own words, and only then respond.",
  ],
  B2: [
    'There is a difference between being busy and being effective, and it took me far too long to understand that. For years I measured my work by how full my calendar looked, rather than by what actually moved forward.',
    'The most useful thing I learned was to ask better questions. Instead of trying to have all the answers, I started listening properly, and the conversations became far more productive.',
    "Negotiation is rarely about winning a single point. It is about finding a structure in which both sides feel they have gained something worth keeping.",
    "What separates a good account manager from a great one is anticipation: knowing about a problem before the customer has to raise it.",
    "When you present to senior executives, they rarely want detail. They want a clear recommendation, the reasoning behind it, and an honest account of the risks.",
    "The deals I regret are the ones where I ignored my doubts. If a customer is not a good fit, saying so early protects everyone.",
    "Trust is built in small moments: returning a call on time, admitting a mistake, and telling a customer when something is not right for them.",
    "A strong pitch tells a story. It begins with a problem the customer recognizes, builds toward a solution, and ends with a specific, reasonable request.",
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
