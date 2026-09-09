// Adaptive placement test.
//
// Rather than asking a fixed 40-question exam, this ladders: two items at the
// current level, then move up, down, or settle. That reaches a defensible band
// in about a dozen items, which keeps the first run under ~8 minutes - long
// enough to be accurate, short enough that he actually finishes it.

import { ITEMS, SPEAKING_ITEMS, shuffleOptions } from './content/placement-items.js';
import { LEVELS } from './content/sentences.js';

const START_INDEX = 2;      // A2 - the most informative place to start
const BLOCK = 2;            // items asked before each decision
const MIN_ITEMS = 6;        // never place him on thinner evidence than this
const MAX_ITEMS = 12;

export class PlacementTest {
  constructor() {
    this.idx = START_INDEX;
    this.asked = [];          // {item, level, correct, presented}
    this.block = [];          // correctness within the current block
    this.usedIds = new Set();
    this.settled = false;
    this.speakingResults = [];
    this.speakingIndex = 0;
  }

  get totalAnswered() { return this.asked.length; }

  /** Estimated total, for the progress bar. */
  get estimatedTotal() { return MAX_ITEMS + SPEAKING_ITEMS.length; }

  /** What to show next: a quiz item, a speaking item, or done. */
  next() {
    if (!this.settled) {
      const item = this._nextQuizItem();
      if (item) return { phase: 'quiz', item, answered: this.asked.length };
      this.settled = true;
    }
    if (this.speakingIndex < SPEAKING_ITEMS.length) {
      return {
        phase: 'speaking',
        item: SPEAKING_ITEMS[this.speakingIndex],
        answered: this.asked.length + this.speakingIndex,
      };
    }
    return { phase: 'done' };
  }

  _nextQuizItem() {
    if (this.asked.length >= MAX_ITEMS) return null;
    const level = LEVELS[this.idx];
    const pool = (ITEMS[level] || []).filter((i) => !this.usedIds.has(i.id));
    if (!pool.length) return null;

    const item = pool[Math.floor(Math.random() * pool.length)];
    this.usedIds.add(item.id);
    const presented = shuffleOptions(item);
    this.pending = { item, level, presented };
    return { ...item, options: presented.options, _answer: presented.answer };
  }

  /** Record the answer to the pending quiz item and advance the ladder. */
  answer(chosenIndex) {
    if (!this.pending) return;
    const correct = chosenIndex === this.pending.presented.answer;
    this.asked.push({
      id: this.pending.item.id,
      skill: this.pending.item.skill,
      level: this.pending.level,
      correct,
    });
    this.block.push(correct);
    this.pending = null;

    if (this.block.length >= BLOCK) {
      const hits = this.block.filter(Boolean).length;
      this.block = [];
      if (hits === BLOCK && this.idx < LEVELS.length - 1) {
        this.idx += 1;
      } else if (hits === 0 && this.idx > 0) {
        this.idx -= 1;
      } else if (this.asked.length >= MIN_ITEMS) {
        // A split block means we have found his level - but only trust it once
        // there is enough evidence behind it.
        this.settled = true;
      }
      // Otherwise stay at this level and ask another block.
    }
    return correct;
  }

  recordSpeaking(result) {
    this.speakingResults.push(result);
    this.speakingIndex += 1;
  }

  /** Final per-skill levels plus the detail behind them. */
  results() {
    const rate = (skill) => {
      const rows = this.asked.filter((a) => a.skill === skill);
      return rows.length ? rows.filter((r) => r.correct).length / rows.length : null;
    };

    // Estimate the band from ALL the evidence rather than from wherever the
    // ladder happened to stop. Stopping position is biased upward: a learner
    // reaches a level, half-fails it, and the walk ends there - which would
    // place him a full level above what he can actually do. Instead, take the
    // highest level he actually held his own at.
    const perLevel = LEVELS.map((lvl) => {
      const rows = this.asked.filter((a) => a.level === lvl);
      return { lvl, n: rows.length, rate: rows.length ? rows.filter((r) => r.correct).length / rows.length : null };
    });

    let band = -1;
    perLevel.forEach((row, i) => {
      // Strictly more than half: with two items that means both. Placing a
      // shade low is the right error - the adaptive step raises him quickly,
      // whereas being placed too high makes every drill feel impossible.
      if (row.n >= 2 && row.rate > 0.5) band = i;
    });
    if (band === -1) {
      // Nothing was held convincingly - fall back to the lowest level tried.
      const tried = perLevel.filter((r) => r.n > 0).map((r) => LEVELS.indexOf(r.lvl));
      band = tried.length ? Math.max(0, Math.min(...tried) - 1) : this.idx;
    }

    const overall = this.asked.length
      ? this.asked.filter((a) => a.correct).length / this.asked.length
      : 0.5;

    const readAloud = this.speakingResults.find((r) => r.type === 'readaloud');
    // Production almost always lags comprehension, so speech starts a notch
    // below the written band unless the read-aloud actually verified otherwise.
    let speechIdx = band - 1;
    if (readAloud?.scored && readAloud.accuracy >= 0.8) speechIdx = band;
    else if (readAloud?.scored && readAloud.accuracy < 0.5) speechIdx = band - 2;

    const vocabRate = rate('vocab');
    let vocabIdx = band;
    if (vocabRate !== null && vocabRate < 0.5) vocabIdx = band - 1;

    // Same "not held convincingly, ease down one" rule as vocab above -
    // this rate was already being computed into `detail` and then discarded,
    // never actually seeding a level the way every other measured rate does.
    const listeningRate = rate('listening');
    let listeningIdx = band;
    if (listeningRate !== null && listeningRate < 0.5) listeningIdx = band - 1;

    const clamp = (i) => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))];

    return {
      band: LEVELS[band],
      levels: {
        speech: clamp(speechIdx),
        vocab: clamp(vocabIdx),
        sales: clamp(band - 1),   // a specialised register: start conservative
        listening: clamp(listeningIdx),
      },
      detail: {
        overall,
        grammar: rate('grammar'),
        vocab: vocabRate,
        listening: listeningRate,
        readAloud: readAloud || null,
        itemsAsked: this.asked.length,
        perLevel,
      },
    };
  }
}
