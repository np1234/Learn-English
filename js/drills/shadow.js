// Shadow Mode.
//
// A systematic review of 44 studies found shadowing improves comprehensibility,
// intelligibility, accentedness, fluency and prosodic control. The gain comes
// from reproducing rhythm and intonation, not from individual sounds - so these
// are connected passages, and the feedback deliberately points at rhythm first.
//
// Three passes per passage: listen, speak along quietly, then perform it.

import { h, clear, renderWords, ltr } from '../ui.js';
import { speak, cancelSpeech, revokeUrl } from '../speech.js';
import { scoreAttempt, verdict } from '../scoring.js';
import { pickShadowPassages } from '../content/sentences.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, playSlow, renderMistakes } from './common.js';

export function mount(root, { level, count = 2, onFinish }) {
  const recentShadow = store.get().recentContent?.shadow || [];
  const passages = pickShadowPassages(level, count, recentShadow);

  let i = 0;
  let step = 'listen';
  let control = null;
  // Indexed by passage, so "Record again" replaces rather than double-counts.
  const results = [];
  const startedAt = Date.now();
  let lastUrl = null;

  function finish() {
    control?.cancel();
    cancelSpeech();
    const scored = results.filter((r) => r && r.accuracy !== null);
    const avg = scored.length ? scored.reduce((a, b) => a + b.accuracy, 0) / scored.length : null;

    store.recordSession({
      drill: 'shadow', track: 'speech',
      seconds: (Date.now() - startedAt) / 1000,
      accuracy: avg,
      detail: { passages: results.filter(Boolean).length },
    });
    if (avg !== null) store.recordAccuracy('speech', avg);
    // Passage strings double as their own ids (see content/pick.js) - record
    // whichever ones were actually presented this session, not just picked,
    // though here they're the same set (Shadow shows the whole session's
    // passages up front, unlike Listening which can end early).
    store.recordShown('shadow', passages);

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('sh.doneTitle')),
        h('p', { class: 'big-stat' }, t('sh.passageCount', { n: results.filter(Boolean).length })),
        h('p', { class: 'hint' }, t('sh.doneHint')),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function go(next) { step = next; render(); }

  function render() {
    control?.cancel();
    if (i >= passages.length) return finish();
    const text = passages[i];

    const head = h('div', { class: 'drill-head' },
      h('span', { class: 'pill' }, t('sh.passageOf', { i: i + 1, n: passages.length })),
      h('button', { class: 'link', type: 'button', onClick: finish }, t('d.endSession')),
    );

    const body = h('div', { class: 'card' }, head, ltr(h('p', { class: 'target passage' }, text)));

    if (step === 'listen') {
      body.append(
        h('div', { class: 'step' }, h('strong', {}, t('sh.step1')), ' ', t('sh.step1Text')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(text).catch(() => {}) }, t('sh.play')),
          // Bigger chunks than Repeat & Grade: rhythm is the point here, so the
          // pauses go between phrases rather than every few words.
          h('button', { class: 'btn ghost', type: 'button', onClick: () => playSlow(text, { chunkWords: 5, rate: 0.6 }) }, t('sh.playSlowly')),
        ),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => go('along') }, t('sh.nextStep')),
      );
    } else if (step === 'along') {
      body.append(
        h('div', { class: 'step' }, h('strong', {}, t('sh.step2')), ' ', t('sh.step2Text')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => playSlow(text, { chunkWords: 8, rate: 0.75 }) }, t('sh.playAlong')),
        ),
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => go('record') }, t('sh.nextStep')),
      );
    } else if (step === 'record') {
      const feedback = h('div', { class: 'feedback' });
      control = recordButton({
        wantTranscript: true,
        label: t('sh.recordVersion'),
        onError: (err) => clear(feedback).append(micError(err)),
        onResult: (result) => {
          revokeUrl(lastUrl);
          lastUrl = result.url;
          const scored = scoreAttempt(text, result.transcript, result.seconds);
          results[i] = { accuracy: scored.scored ? scored.accuracy : null };
          const v = verdict(scored.scored ? scored.accuracy : null);
          clear(feedback).append(
            h('div', { class: `verdict ${v.tone}` },
              h('strong', {}, t(v.key)),
              scored.scored ? ` - ${Math.round(scored.accuracy * 100)}%` : '',
              scored.wpm ? h('span', { class: 'wpm' }, ` ${scored.wpm} wpm`) : null,
            ),
            // See repeat.js's identical comment: append() stringifies arrays
            // and null instead of flattening/filtering them, so this must be
            // spread as separate, pre-filtered arguments, not one array literal.
            ...[
              scored.scored ? renderWords(scored) : null,
              scored.scored ? renderMistakes(scored) : null,
            ].filter(Boolean),
            comparePanel(text, result.url),
            h('div', { class: 'row' },
              h('button', { class: 'btn ghost', type: 'button', onClick: () => go('record') }, t('sh.recordAgain')),
              h('button', {
                class: 'btn primary', type: 'button',
                onClick: () => { i += 1; go('listen'); },
              }, i + 1 >= passages.length ? t('d.finish') : t('sh.nextPassage')),
            ),
          );
          feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
      });
      body.append(
        h('div', { class: 'step' }, h('strong', {}, t('sh.step3')), ' ', t('sh.step3Text')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(text).catch(() => {}) }, t('sh.hearOnceMore')),
        ),
        control.el,
        feedback,
      );
    }

    clear(root).append(body);
  }

  render();
  return () => { control?.cancel(); cancelSpeech(); revokeUrl(lastUrl); };
}
