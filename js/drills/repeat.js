// Repeat & Grade.
//
// The pushed-output drill: hear a model, produce it yourself, get immediate
// word-level feedback. Sentences are drawn to hit whichever pronunciation
// targets he is currently weakest at, so practice concentrates where it pays.

import { h, clear, ltr } from '../ui.js';
import { speak } from '../speech.js';
import { scoreAttempt, countsTowardStats } from '../scoring.js';
import { pickSentences } from '../content/sentences.js';
import { tagScores } from '../phonetics.js';
import { contrastFor } from '../content/minimal-pairs.js';
import { t, phoneme } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, playSlow, playContrast, attemptFeedback } from './common.js';
import { revokeUrl } from '../speech.js';

export function mount(root, { level, weakTags, count = 6, onFinish }) {
  const sentences = pickSentences(level, count, weakTags);
  let i = 0;
  // Keyed by sentence index, NOT appended: "Try again" must replace the earlier
  // attempt rather than have both count toward the session average.
  const attempts = [];
  const startedAt = Date.now();
  let control = null;
  let lastUrl = null;

  function finish() {
    control?.cancel();
    const tried = attempts.filter(Boolean).length;
    // Ending before a single attempt is not a practice session: recording one
    // used to count the day as practised, extend the streak and tick the
    // drill "Done" for a 4-second visit.
    if (!tried) return onFinish?.();
    const scored = attempts.filter((a) => a && a.accuracy !== null);
    const avg = scored.length
      ? scored.reduce((a, b) => a + b.accuracy, 0) / scored.length
      : null;

    store.recordSession({
      drill: 'repeat', track: 'speech',
      seconds: (Date.now() - startedAt) / 1000,
      accuracy: avg,
      detail: { sentences: attempts.filter(Boolean).length },
    });
    if (avg !== null) store.recordAccuracy('speech', avg);

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('d.sessionComplete')),
        h('p', { class: 'big-stat' }, avg === null
          ? t('d.recordedCount', { n: attempts.filter(Boolean).length })
          : `${Math.round(avg * 100)}%`),
        h('p', { class: 'hint' }, avg === null ? t('d.noScoring') : t('d.avgAccuracy')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function render() {
    control?.cancel();
    if (i >= sentences.length) return finish();

    const s = sentences[i];
    // Show the mouth position AND let him hear the contrast it protects, so
    // "TH" stops being an abstract label and becomes think-not-sink.
    const hints = s.tags
      .filter((tag) => weakTags.includes(tag) && phoneme(tag))
      .slice(0, 2)
      .map((tag) => {
        const p = phoneme(tag);
        const c = contrastFor(tag);
        return h('li', { class: 'hint-item' },
          h('strong', { class: 'hint-label' }, p.label),
          h('span', { class: 'hint-body' }, p.hint),
          c ? h('button', {
            class: 'btn tiny', type: 'button',
            onClick: () => playContrast(c.target, c.confusedWith),
          }, t('d.hearDifference'), ' ',
             ltr(h('span', { class: 'pair' }, `${c.target} / ${c.confusedWith}`))) : null,
        );
      });

    const feedback = h('div', { class: 'feedback' });

    control = recordButton({
      wantTranscript: true,
      onError: (err) => clear(feedback).append(micError(err)),
      onResult: (result) => {
        revokeUrl(lastUrl);
        lastUrl = result.url;
        const scored = scoreAttempt(s.text, result.transcript, result.seconds);
        // An attempt the recogniser only caught part of is shown but never
        // counted: its "missing" words were not judged, just not heard.
        const counts = countsTowardStats(scored);
        attempts[i] = { text: s.text, accuracy: counts ? scored.accuracy : null };
        // Each sound is credited only on the words that carry it.
        if (counts) store.recordTagScores(tagScores(scored.words, s.tags));

        clear(feedback).append(
          // attemptFeedback() returns a pre-filtered array to SPREAD - append()
          // stringifies arrays and null instead of flattening/filtering them.
          ...attemptFeedback(scored, result),
          comparePanel(s.text, result.url),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost', type: 'button', onClick: render }, t('d.tryAgain')),
            h('button', {
              class: 'btn primary', type: 'button',
              onClick: () => { i += 1; render(); },
            }, i + 1 >= sentences.length ? t('d.finish') : t('d.nextSentence')),
          ),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    });

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('d.sentenceOf', { i: i + 1, n: sentences.length })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
        ),
        ltr(h('p', { class: 'target' }, s.text)),
        hints.length ? h('ul', { class: 'hints' }, hints) : null,
        h('div', { class: 'row' },
          h('button', {
            class: 'btn ghost', type: 'button',
            onClick: () => speak(s.text).catch(() => {}),
          }, t('d.listen')),
          h('button', {
            class: 'btn ghost', type: 'button',
            // Chunked AND low-rate: rate alone is compressed to ~1.3x by many voices.
            onClick: () => playSlow(s.text),
          }, t('d.listenSlowly')),
        ),
        control.el,
        feedback,
      ),
    );
  }

  render();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
