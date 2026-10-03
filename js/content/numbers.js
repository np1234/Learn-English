// Numbers practice - generated, not authored.
//
// Numbers are the single most sales-critical thing a Hebrew speaker mishears
// and mispronounces in English: thirteen/thirty, fourteen/forty ... nineteen/
// ninety differ only in where the stress falls, and a wrong price or date
// costs a deal. Items are generated on demand so the drill never runs out.
//
// Every item carries `spoken` - the exact words, which is what the model voice
// says and what scoreAttempt() grades a read-aloud against. (The digits form
// is only what is SHOWN: scoring.js can reconcile "$1,250" with its spoken
// form, but a stable words target keeps the word-by-word feedback readable.)

import { numberToWords } from '../scoring.js';

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
function shuffle(a) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) { const j = rnd(i + 1); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
const fmt = (n) => n.toLocaleString('en-US');

function timeWords(h, m) {
  if (m === 0) return `${numberToWords(h)} o'clock`;
  return `${numberToWords(h)} ${m < 10 ? `oh ${numberToWords(m)}` : numberToWords(m)}`;
}

/** Four distinct options with the correct one first (callers shuffle). */
function uniqueOptions(correct, candidates) {
  const out = [correct];
  for (const c of candidates) if (!out.includes(c) && out.length < 4) out.push(c);
  return out;
}

// teen / ty pairs - the confusion that matters most.
function teenItem(style) {
  const k = 13 + rnd(6); // 13-18
  const ty = (k % 10) * 10;
  const nums = uniqueOptions(k, [ty, k - 1, k + 1, ty + 5, 19 - (k - 13)]).slice(0, 4);
  const show = (n) => (style === 'percent' ? `${n}%` : style === 'dollars' ? `$${n}` : String(n));
  const spokenOf = (n) => (style === 'percent' ? `${numberToWords(n)} percent` : style === 'dollars' ? `${numberToWords(n)} dollars` : numberToWords(n));
  return { kind: 'teen', answer: show(k), options: nums.map(show), spoken: spokenOf(k) };
}

function swapAdjacent(str, i) {
  const a = str.split('');
  [a[i], a[i + 1]] = [a[i + 1], a[i]];
  return a.join('');
}

function priceItem() {
  const v = 120 + rnd(8800);
  const s = String(v);
  const cands = [];
  for (let i = 0; i < s.length - 1; i++) if (s[i] !== s[i + 1]) cands.push(Number(swapAdjacent(s, i)));
  cands.push(v + 10, v - 10, v + 100);
  const opts = uniqueOptions(v, shuffle(cands).filter((x) => x > 0));
  return { kind: 'price', answer: `$${fmt(v)}`, options: opts.map((n) => `$${fmt(n)}`), spoken: `${numberToWords(v)} dollars` };
}

function timeItem() {
  const h = 1 + rnd(12);
  const m = pick([15, 50, 45, 40, 30, 13, 5]);
  const alt = { 15: 50, 50: 15, 45: 40, 40: 45, 30: 13, 13: 30, 5: 50 }[m];
  const fm = (hh, mm) => `${hh}:${String(mm).padStart(2, '0')}`;
  const otherH = h === 12 ? 11 : h + 1;
  const opts = uniqueOptions(fm(h, m), [fm(h, alt), fm(otherH, m), fm(h, 5), fm(otherH, alt)]);
  return { kind: 'time', answer: fm(h, m), options: opts, spoken: timeWords(h, m) };
}

function dateItem() {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const ord = (n) => {
    const w = numberToWords(n).split(' ');
    const last = w.pop();
    const map = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
    const o = map[last] || (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
    return [...w, o].join(' ');
  };
  const d = 11 + rnd(19); // 11-29: includes the teen/ty-ish ordinals
  const month = pick(months);
  const alt = d <= 19 ? (d % 10) * 10 : null;
  const dayOpts = uniqueOptions(d, [alt && alt <= 31 ? alt : d + 10 > 31 ? d - 10 : d + 10, d + 1, d - 1, d + 3].filter((x) => x > 0 && x <= 31));
  const show = (n) => `${month} ${n}`;
  return { kind: 'date', answer: show(d), options: dayOpts.map(show), spoken: `${month} ${ord(d)}` };
}

/** One "hear it, pick it" item: { kind, answer, options (shuffled), spoken }. */
export function makeListenItem() {
  const make = pick([
    () => teenItem('plain'), () => teenItem('dollars'), () => teenItem('percent'),
    priceItem, priceItem, timeItem, dateItem,
  ]);
  const item = make();
  return { ...item, options: shuffle(item.options) };
}

/** One "read it aloud" item: { kind, show, spoken }. */
export function makeSpeakItem() {
  const kind = pick(['price', 'percent', 'time', 'date', 'teen']);
  if (kind === 'price') { const v = 150 + rnd(9000); return { kind, show: `$${fmt(v)}`, spoken: `${numberToWords(v)} dollars` }; }
  if (kind === 'percent') { const v = 5 + rnd(90); return { kind, show: `${v}%`, spoken: `${numberToWords(v)} percent` }; }
  if (kind === 'time') { const h = 1 + rnd(12); const m = pick([0, 15, 30, 45, 50, 13, 40]); return { kind, show: `${h}:${String(m).padStart(2, '0')}`, spoken: timeWords(h, m) }; }
  if (kind === 'date') { const it = dateItem(); return { kind, show: it.answer, spoken: it.spoken }; }
  const k = 13 + rnd(6);
  return { kind, show: String(k), spoken: numberToWords(k) };
}
