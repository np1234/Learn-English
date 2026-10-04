// Vocabulary review - FSRS-scheduled recall, with new and lapsed cards also
// spoken and ASR-graded for pronunciation practice.
//
// New cards and any card whose last grade was AGAIN get the same
// record-and-grade step the speech drills use, so ASR sharpens the FSRS
// grade when it happens to be available - it never gates the grade (the
// tier-1/tier-2 rule in CLAUDE.md, applied to grading rather than scoring).
// Every other due card is a fast, silent recall step: four buttons, no mic.
// This mix is what keeps a 5-minute budget inside FSRS's real throughput
// while still surfacing pronunciation data on new vocabulary.

import { h, clear, ltr } from '../ui.js';
import { speak, revokeUrl } from '../speech.js';
import { scoreAttempt, countsTowardStats } from '../scoring.js';
import { tagScores } from '../phonetics.js';
import { byId } from '../content/vocab.js';
import { review, gradeFromAccuracy, AGAIN, HARD, GOOD, EASY } from '../srs.js';
import { buildQueue, isLapsed } from '../vocab.js';
import { t, posLabel } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, playSlow, attemptFeedback } from './common.js';

const GRADES = [
  { grade: AGAIN, key: 'vc.again', tone: 'weak' },
  { grade: HARD, key: 'vc.hard', tone: 'ok' },
  { grade: GOOD, key: 'vc.good', tone: 'good' },
  { grade: EASY, key: 'vc.easy', tone: 'great' },
];

// A card jumps back in ahead of its NEXT graded neighbour, not to the very
// end - srs.js schedules an AGAIN card ~10 minutes out, which is within
// this sitting, not "later today" in the loose sense.
const REQUEUE_OFFSET = 5;

// `level` isn't a param here - buildQueue() already reads profile.levels.vocab
// itself when it needs to draw new cards (see vocab.js), so there's nothing
// for the drill to plumb through separately.
export function mount(root, { onFinish }) {
  let queue = buildQueue(store.get(), new Date());
  let pos = 0;
  let phase = 'prompt'; // 'prompt' (gloss only, recall silently) -> 'answer' (revealed, grade)
  const startedAt = Date.now();
  const results = [];
  let control = null;
  let lastUrl = null;
  let suggested = null;

  function finish() {
    control?.cancel();
    const strong = results.filter((r) => r === GOOD || r === EASY).length;
    const accuracy = results.length ? strong / results.length : null;

    if (results.length) {
      store.recordSession({
        drill: 'vocab', track: 'vocab',
        seconds: (Date.now() - startedAt) / 1000,
        accuracy,
        detail: { reviewed: results.length, again: results.filter((r) => r === AGAIN).length },
      });
      if (accuracy !== null) store.recordAccuracy('vocab', accuracy);
    }

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('d.sessionComplete')),
        h('p', { class: 'big-stat' }, t('vc.reviewedCount', { n: results.length })),
        h('p', { class: 'hint' }, results.length ? t('vc.sessionHint') : t('vc.noneDueHint')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function gradeCard(card, grade) {
    const updated = review(card, grade);
    store.saveReview(updated);
    results.push(grade);
    if (grade === AGAIN) {
      const reinsertAt = Math.min(queue.length, pos + REQUEUE_OFFSET);
      queue.splice(reinsertAt, 0, updated);
    }
    pos += 1;
    phase = 'prompt';
    suggested = null;
    render();
  }

  function render() {
    control?.cancel();
    if (pos >= queue.length) return finish();
    const card = queue[pos];
    const entry = byId(card.id);
    if (!entry) { pos += 1; return render(); } // orphaned/renamed id: skip rather than crash

    const head = h('div', { class: 'drill-head' },
      h('span', { class: 'pill' }, t('vc.cardOf', { i: pos + 1, n: queue.length })),
      h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
    );

    const gloss = h('p', { class: 'vocab-gloss' }, entry.he,
      entry.pos ? h('span', { class: 'hint small' }, ` · ${posLabel(entry.pos)}`) : null);

    if (phase === 'prompt') {
      clear(root).append(
        h('div', { class: 'card vocab-card' },
          head,
          gloss,
          h('button', {
            class: 'btn primary wide', type: 'button',
            onClick: () => { phase = 'answer'; render(); },
          }, t('vc.reveal')),
        ),
      );
      return;
    }

    // phase === 'answer'
    const spoken = !card.reps || isLapsed(card);

    const gradeRow = h('div', { class: 'grade-row' });
    function renderGrades() {
      clear(gradeRow).append(
        ...GRADES.map(({ grade, key, tone }) => h('button', {
          class: `btn grade-btn ${tone} ${suggested === grade ? 'suggested' : ''}`, type: 'button',
          onClick: () => gradeCard(card, grade),
        }, t(key))),
      );
    }
    renderGrades();

    const body = [
      head,
      gloss,
      ltr(h('p', { class: 'vocab-answer' }, entry.word)),
      ltr(h('p', { class: 'hint vocab-example' }, entry.example)),
      h('div', { class: 'row' },
        h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(entry.example).catch(() => {}) }, t('d.listen')),
        h('button', { class: 'btn ghost', type: 'button', onClick: () => playSlow(entry.example) }, t('d.listenSlowly')),
      ),
    ];

    const feedback = h('div', { class: 'feedback' });

    if (spoken) {
      control = recordButton({
        wantTranscript: true,
        onError: (err) => clear(feedback).append(micError(err)),
        onResult: (result) => {
          revokeUrl(lastUrl);
          lastUrl = result.url;
          const scored = scoreAttempt(entry.example, result.transcript, result.seconds, { alternatives: result.alternatives, confidence: result.confidence });
          if (countsTowardStats(scored)) {
            store.recordTagScores(tagScores(scored.words));
            suggested = gradeFromAccuracy(scored.accuracy);
          }
          clear(feedback).append(
            // Pre-filtered array to spread - see common.js attemptFeedback().
            ...attemptFeedback(scored, result),
            comparePanel(entry.example, result.url),
          );
          renderGrades();
          feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
      });
      body.push(control.el);
    }

    body.push(feedback, gradeRow);
    clear(root).append(h('div', { class: 'card vocab-card' }, body));
  }

  render();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
