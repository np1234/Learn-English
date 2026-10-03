// Numbers practice (sales-critical): hear a number, price, time or date and pick
// it; then read a few aloud. Teen/ty pairs (13/30 ... 19/90) and digit swaps are
// built into the distractors because those are the mistakes that cost a deal.
//
// Like every drill, the speaking half follows the tier-1/tier-2 rule: the
// recording and playback always work; a score appears only when recognition
// produced words (and is never recorded as unreliable partial input).

import { h, clear, ltr } from '../ui.js';
import { speak, revokeUrl } from '../speech.js';
import { scoreAttempt } from '../scoring.js';
import { makeListenItem, makeSpeakItem } from '../content/numbers.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, playSlow, attemptFeedback } from './common.js';

const LISTEN_COUNT = 6;
const SPEAK_COUNT = 3;

export function mount(root, { onFinish }) {
  const items = [
    ...Array.from({ length: LISTEN_COUNT }, () => ({ type: 'listen', ...makeListenItem() })),
    ...Array.from({ length: SPEAK_COUNT }, () => ({ type: 'speak', ...makeSpeakItem() })),
  ];
  let i = 0;
  let correct = 0;
  let listened = 0;
  let spoken = 0;
  let control = null;
  let lastUrl = null;
  const startedAt = Date.now();

  function finish() {
    control?.cancel();
    const attempted = listened + spoken;
    // Leaving before answering anything is not a practice session.
    if (!attempted) return onFinish?.();
    store.recordSession({
      drill: 'numbers', track: 'listening',
      seconds: (Date.now() - startedAt) / 1000,
      accuracy: listened ? correct / listened : null,
      detail: { heard: listened, correct, spoken },
    });
    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('d.sessionComplete')),
        h('p', { class: 'big-stat' }, t('ls.scoreLine', { correct, total: listened })),
        h('p', { class: 'hint' }, t('nm.doneHint')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function head() {
    return h('div', { class: 'drill-head' },
      h('span', { class: 'pill' }, t('nm.itemOf', { i: i + 1, n: items.length })),
      h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
    );
  }

  function next() { i += 1; render(); }

  function renderListen(item) {
    const feedback = h('div', { class: 'feedback' });
    let answered = false;
    const buttons = item.options.map((opt) => h('button', {
      class: 'option', type: 'button',
      onClick: () => {
        if (answered) return;
        answered = true;
        listened += 1;
        const ok = opt === item.answer;
        if (ok) correct += 1;
        buttons.forEach((b) => { b.disabled = true; });
        clear(feedback).append(
          h('div', { class: `verdict ${ok ? 'great' : 'weak'}` }, h('strong', {}, t(ok ? 'ls.correct' : 'ls.incorrect'))),
          ok ? null : h('p', { class: 'hint small' }, t('ls.correctWas'), ' ', ltr(h('span', {}, item.answer))),
          h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(item.spoken).catch(() => {}) }, t('d.listen')),
          h('button', { class: 'btn primary wide', type: 'button', onClick: next }, i + 1 >= items.length ? t('d.finish') : t('ls.nextQuestion')),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    }, ltr(h('span', {}, opt))));

    clear(root).append(
      h('div', { class: 'card' },
        head(),
        h('p', { class: 'hint' }, t('nm.listenPrompt')),
        h('div', { class: 'row' },
          h('button', { class: 'btn primary', type: 'button', onClick: () => speak(item.spoken).catch(() => {}) }, t('d.listen')),
          h('button', { class: 'btn ghost', type: 'button', onClick: () => playSlow(item.spoken, { chunkWords: 1 }) }, t('d.listenSlowly')),
        ),
        h('div', { class: 'options' }, buttons),
        feedback,
      ),
    );
  }

  function renderSpeak(item) {
    control?.cancel();
    const feedback = h('div', { class: 'feedback' });
    control = recordButton({
      wantTranscript: true,
      onError: (err) => clear(feedback).append(micError(err)),
      onResult: (result) => {
        revokeUrl(lastUrl);
        lastUrl = result.url;
        const scored = scoreAttempt(item.spoken, result.transcript, result.seconds);
        spoken += 1;
        clear(feedback).append(
          ...attemptFeedback(scored, result),
          comparePanel(item.spoken, result.url),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost', type: 'button', onClick: () => renderSpeak(item) }, t('d.tryAgain')),
            h('button', { class: 'btn primary', type: 'button', onClick: next }, i + 1 >= items.length ? t('d.finish') : t('d.nextSentence')),
          ),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    });
    clear(root).append(
      h('div', { class: 'card' },
        head(),
        h('p', { class: 'hint' }, t('nm.sayPrompt')),
        ltr(h('p', { class: 'target big-number' }, item.show)),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(item.spoken).catch(() => {}) }, t('d.playModel')),
        ),
        control.el,
        feedback,
      ),
    );
  }

  function render() {
    control?.cancel();
    if (i >= items.length) return finish();
    const item = items[i];
    if (item.type === 'listen') renderListen(item);
    else renderSpeak(item);
  }

  render();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
