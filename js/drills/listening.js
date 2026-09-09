// Listening comprehension (Section 5 / track D).
//
// The one drill that never opens the microphone - comprehension is tested by
// picking an answer, not by producing speech, so it works even on a device
// where caps.mic is false. The passage's transcript is deliberately withheld
// until AFTER its questions are answered: showing the text first would let
// him read instead of listen, defeating the point of the drill. Play/replay
// is unlimited before answering, exactly like every other drill's "hear the
// model again" affordance.
//
// `level` isn't a param here, matching drills/vocab.js's precedent: this
// drill reads profile.levels.listening and profile.budget.listening itself
// via store.get(), so there's nothing extra for app.js's hostDrill() to plumb
// through ctx.

import { h, clear, ltr } from '../ui.js';
import { speak } from '../speech.js';
import { pickPassages } from '../content/listening.js';
import { shuffleOptions } from '../content/placement-items.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { playSlow } from './common.js';

// ~2 minutes per passage (listening + 2 questions), same capping spirit as
// vocab.js's MIN_QUEUE/MAX_QUEUE - but no SRS/backlog machinery is needed
// here since, like Sales Mode, each session is a fresh, independent set.
function passageCount(minutes) {
  return Math.max(1, Math.min(4, Math.round((minutes || 5) / 2)));
}

export function mount(root, { onFinish }) {
  const p = store.get();
  const passages = pickPassages(
    p.levels.listening,
    passageCount(p.budget?.listening),
    p.recentContent?.listening || [],
  );
  let pIdx = 0;
  let qIdx = 0;
  let correctCount = 0;
  let totalCount = 0;
  const startedAt = Date.now();

  function finish() {
    const accuracy = totalCount ? correctCount / totalCount : null;
    if (totalCount) {
      store.recordSession({
        drill: 'listening', track: 'listening',
        seconds: (Date.now() - startedAt) / 1000,
        accuracy,
        detail: { passages: passages.length, questions: totalCount, correct: correctCount },
      });
      if (accuracy !== null) store.recordAccuracy('listening', accuracy);
    }
    // The whole picked batch, not just whichever passages he reached before
    // ending early - same reasoning as shadow.js/sales.js: it was already
    // this session's candidate set, so showing it again immediately next
    // time would be exactly the repeat this is meant to avoid.
    store.recordShown('listening', passages.map((psg) => psg.id));

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('ls.doneTitle')),
        h('p', { class: 'big-stat' }, t('ls.scoreLine', { correct: correctCount, total: totalCount })),
        h('p', { class: 'hint' }, t('ls.sessionHint')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function renderListen() {
    const passage = passages[pIdx];
    qIdx = 0;

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('ls.passageOf', { i: pIdx + 1, n: passages.length })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        h('p', { class: 'hint' }, t('ls.listenPrompt')),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onClick: () => speak(passage.text).catch(() => {}) }, t('d.listen')),
          h('button', { class: 'btn ghost', type: 'button', onClick: () => playSlow(passage.text) }, t('d.listenSlowly')),
        ),
        h('button', {
          class: 'btn ghost wide', type: 'button',
          onClick: () => renderQuestion(passage),
        }, t('ls.ready')),
      ),
    );
  }

  function renderQuestion(passage) {
    const q = passage.questions[qIdx];
    const shuffled = shuffleOptions(q);
    const feedback = h('div', { class: 'feedback' });
    const lastQuestion = qIdx + 1 >= passage.questions.length;

    const optionButtons = shuffled.options.map((opt, idx) => h('button', {
      class: 'option', type: 'button',
      onClick: () => {
        const correct = idx === shuffled.answer;
        totalCount += 1;
        if (correct) correctCount += 1;
        optionButtons.forEach((b) => { b.disabled = true; });

        clear(feedback).append(
          h('div', { class: `verdict ${correct ? 'great' : 'weak'}` },
            h('strong', {}, t(correct ? 'ls.correct' : 'ls.incorrect'))),
          // append() stringifies a raw null argument as literal text "null"
          // instead of skipping it (unlike h()'s own children, which filter
          // null/undefined/false) - so the maybe-absent explanation must be
          // filtered out before reaching append(), not passed through directly.
          ...(!correct
            ? [h('p', { class: 'hint small' }, t('ls.correctWas'), ' ', ltr(h('span', {}, shuffled.options[shuffled.answer])))]
            : []),
          h('button', {
            class: 'btn primary wide', type: 'button',
            onClick: () => {
              qIdx += 1;
              if (qIdx < passage.questions.length) renderQuestion(passage);
              else renderTranscript(passage);
            },
          }, lastQuestion ? t('ls.showTranscript') : t('ls.nextQuestion')),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    }, ltr(h('span', {}, opt))));

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('ls.questionOf', { i: qIdx + 1, n: passage.questions.length })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        ltr(h('p', { class: 'target' }, q.prompt)),
        h('div', { class: 'options' }, optionButtons),
        feedback,
      ),
    );
  }

  function renderTranscript(passage) {
    const lastPassage = pIdx + 1 >= passages.length;
    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('ls.transcriptTitle')),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        ltr(h('p', { class: 'target' }, passage.text)),
        h('button', {
          class: 'btn primary wide', type: 'button',
          onClick: () => {
            pIdx += 1;
            if (pIdx < passages.length) renderListen();
            else finish();
          },
        }, lastPassage ? t('d.finish') : t('ls.nextPassage')),
      ),
    );
  }

  renderListen();
  // No Capture, no timers: app.js's show() already cancels any pending
  // speech synthesis on every navigation, so there is nothing else to
  // release here - unlike every other drill, which must guard a mic/timer.
  return () => {};
}
