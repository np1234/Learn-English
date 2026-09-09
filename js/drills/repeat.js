// Repeat & Grade.
//
// The pushed-output drill: hear a model, produce it yourself, get immediate
// word-level feedback. Sentences are drawn to hit whichever pronunciation
// targets he is currently weakest at, so practice concentrates where it pays.

import { h, clear, renderWords, ltr } from '../ui.js';
import { speak } from '../speech.js';
import { scoreAttempt, verdict } from '../scoring.js';
import { pickSentences } from '../content/sentences.js';
import { tagScores } from '../phonetics.js';
import { contrastFor } from '../content/minimal-pairs.js';
import { t, phoneme } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, playSlow, playContrast, renderMistakes } from './common.js';
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
        attempts[i] = { text: s.text, accuracy: scored.scored ? scored.accuracy : null };
        // Each sound is credited only on the words that carry it.
        if (scored.scored) store.recordTagScores(tagScores(scored.words, s.tags));

        const v = verdict(scored.scored ? scored.accuracy : null);
        clear(feedback).append(
          h('div', { class: `verdict ${v.tone}` },
            h('strong', {}, t(v.key)),
            scored.scored ? ` - ${Math.round(scored.accuracy * 100)}%` : '',
          ),
          // Two independent, filtered arguments spread into append() - NOT a
          // single array literal. Element.append() does not flatten arrays or
          // filter null: it stringifies them (`[object HTMLElement],null`
          // literally rendered as text). That only ever showed up on a real
          // device with working ASR, since the mic is blocked in every
          // browser-pane session used to develop this app.
          ...[
            scored.scored ? renderWords(scored) : h('p', { class: 'hint small' }, t('d.compareByEar')),
            scored.scored ? renderMistakes(scored) : null,
          ].filter(Boolean),
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
