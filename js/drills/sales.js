// Sales Mode (Section 4 / track C).
//
// A short branching roleplay: the customer raises an objection or question
// each turn, the learner picks the best of 2-3 pre-written responses, then
// reads the CHOSEN line aloud (not the "best" one - reading someone else's
// line after a wrong pick would silently turn a judgment miss into an
// unrelated pronunciation exercise). Every option is a complete, sayable
// sentence, so scoreAttempt() against whichever one was picked is always an
// honest reference - see content/sales.js's header for the full reasoning.
//
// Grading follows the same "recognition is a bonus" rule the whole app
// applies to speech, but applied to Sales Mode's OWN grade: the multiple-
// choice pick (best/ok/weak) is a complete, ASR-independent signal on its
// own; the read-aloud's ASR accuracy only sweetens it when the device
// happens to score. See turnScore() below.

import { h, clear, ltr } from '../ui.js';
import { speak, revokeUrl } from '../speech.js';
import { scoreAttempt, countsTowardStats } from '../scoring.js';
import { tagScores } from '../phonetics.js';
import { pickScenario, shuffleTurnOptions } from '../content/sales.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, attemptFeedback } from './common.js';

const TAG_LABEL = { best: 'sl.tagBest', ok: 'sl.tagOk', weak: 'sl.tagWeak' };

/** Soft partial credit per pick, blended with speech accuracy only when ASR
 * actually scored - so a device with no recognition never drags the number
 * down, it just leaves the judgment signal to stand on its own. */
function turnScore(result) {
  const mc = result.quality === 'best' ? 1 : result.quality === 'ok' ? 0.6 : 0.2;
  return result.scored ? mc * 0.5 + result.accuracy * 0.5 : mc;
}

export function mount(root, { level, onFinish }) {
  const recentSales = store.get().recentContent?.sales || [];
  const scenario = pickScenario(level, recentSales);
  let turnIdx = 0;
  let phase = 'choose'; // 'choose' -> 'speak'
  let shuffled = null; // this turn's shuffled options, fixed once chosen from
  let chosenOption = null;
  // Keyed by turn index, NOT appended: "Try again" must replace the earlier
  // attempt at that turn rather than count the same turn twice.
  const results = [];
  const startedAt = Date.now();
  let control = null;
  let lastUrl = null;

  function finish() {
    control?.cancel();
    const done = results.filter(Boolean);
    const accuracy = done.length
      ? done.reduce((a, r) => a + turnScore(r), 0) / done.length
      : null;

    if (done.length) {
      store.recordSession({
        drill: 'sales', track: 'sales',
        seconds: (Date.now() - startedAt) / 1000,
        accuracy,
        detail: {
          scenario: scenario.id,
          turns: done.length,
          best: done.filter((r) => r.quality === 'best').length,
          ok: done.filter((r) => r.quality === 'ok').length,
          weak: done.filter((r) => r.quality === 'weak').length,
          spoken: done.filter((r) => r.scored).length,
        },
      });
      if (accuracy !== null) store.recordAccuracy('sales', accuracy);
    }
    // Recorded even with zero turns completed: the customer's opening line
    // is already on screen the moment the scenario mounts, so it's been
    // "shown" regardless of whether he answered anything.
    store.recordShown('sales', [scenario.id]);

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('sl.scenarioDone')),
        h('p', { class: 'big-stat' }, t('sl.turnsCount', { n: done.length })),
        h('p', { class: 'hint' }, t('sl.sessionHint')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function renderChoose() {
    control?.cancel();
    const turn = scenario.turns[turnIdx];
    shuffled = shuffleTurnOptions(turn.options);

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('sl.turnOf', { i: turnIdx + 1, n: scenario.turns.length })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        h('div', { class: 'sales-customer' },
          h('span', { class: 'label' }, t('sl.customerSays')),
          ltr(h('p', { class: 'target' }, turn.customerLine)),
          h('button', {
            class: 'btn ghost tiny', type: 'button',
            onClick: () => speak(turn.customerLine).catch(() => {}),
          }, t('d.listen')),
        ),
        h('p', { class: 'label spaced' }, t('sl.howRespond')),
        h('div', { class: 'options' }, shuffled.map((opt) => h('button', {
          class: 'option', type: 'button',
          onClick: () => { chosenOption = opt; phase = 'speak'; render(); },
        }, ltr(h('span', {}, opt.text))))),
      ),
    );
  }

  function renderSpeak() {
    control?.cancel();
    const feedback = h('div', { class: 'feedback' });

    control = recordButton({
      wantTranscript: true,
      onError: (err) => clear(feedback).append(micError(err)),
      onResult: (result) => {
        revokeUrl(lastUrl);
        lastUrl = result.url;
        const scored = scoreAttempt(chosenOption.text, result.transcript, result.seconds);
        const counts = countsTowardStats(scored);
        if (counts) store.recordTagScores(tagScores(scored.words));
        results[turnIdx] = {
          quality: chosenOption.quality,
          scored: counts,
          accuracy: counts ? scored.accuracy : null,
        };

        const lastTurn = turnIdx + 1 >= scenario.turns.length;
        clear(feedback).append(
          // Pre-filtered array to spread - see common.js attemptFeedback().
          ...attemptFeedback(scored, result),
          comparePanel(chosenOption.text, result.url),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost', type: 'button', onClick: render }, t('d.tryAgain')),
            h('button', {
              class: 'btn primary', type: 'button',
              onClick: () => { turnIdx += 1; chosenOption = null; phase = 'choose'; render(); },
            }, lastTurn ? t('d.finish') : t('sl.nextTurn')),
          ),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    });

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('sl.turnOf', { i: turnIdx + 1, n: scenario.turns.length })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        h('div', { class: `choice-tag ${chosenOption.quality}` }, t(TAG_LABEL[chosenOption.quality])),
        h('div', { class: 'hint-item' },
          h('span', { class: 'hint-body' }, chosenOption.why),
        ),
        h('p', { class: 'label spaced' }, t('sl.nowSayIt')),
        ltr(h('p', { class: 'target' }, chosenOption.text)),
        control.el,
        feedback,
      ),
    );
  }

  function render() {
    if (turnIdx >= scenario.turns.length) return finish();
    if (phase === 'speak') return renderSpeak();
    return renderChoose();
  }

  render();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
