// Progress checkpoint: the SAME read-aloud sentence the placement test used,
// repeated at the program's quarter marks (see program.js checkpointWeeks), so
// accuracy and reading pace are directly comparable over the months.
//
// An attempt the recogniser only partly caught is never saved - it would make
// a good week look like a bad one. With no recognition at all he can still
// log the checkpoint as done (no score), keeping the recording-only tier whole.

import { h, clear, ltr } from '../ui.js';
import { revokeUrl } from '../speech.js';
import { scoreAttempt, countsTowardStats } from '../scoring.js';
import { SPEAKING_ITEMS } from '../content/placement-items.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, attemptFeedback } from './common.js';

export const CHECKPOINT_TEXT = SPEAKING_ITEMS[0].text;

export function mount(root, { slot, week, onFinish }) {
  let control = null;
  let lastUrl = null;

  function renderAttempt() {
    control?.cancel();
    const feedback = h('div', { class: 'feedback' });
    control = recordButton({
      wantTranscript: true,
      onError: (err) => clear(feedback).append(micError(err)),
      onResult: (result) => {
        revokeUrl(lastUrl);
        lastUrl = result.url;
        const scored = scoreAttempt(CHECKPOINT_TEXT, result.transcript, result.seconds, { alternatives: result.alternatives, confidence: result.confidence });
        const counts = countsTowardStats(scored);
        const words = scored.scored ? scored.words.filter((w) => w.status !== 'missing').length : 0;
        const rate = counts && result.seconds > 0 ? Math.round((words / result.seconds) * 60) : null;
        clear(feedback).append(
          ...attemptFeedback(scored, result),
          comparePanel(CHECKPOINT_TEXT, result.url),
          h('div', { class: 'row' },
            h('button', { class: 'btn ghost', type: 'button', onClick: renderAttempt }, t('d.tryAgain')),
            // A partial catch cannot be saved as a score; everything else can
            // (an unscored one is logged as completed, without a number).
            scored.unreliable ? null : h('button', {
              class: 'btn primary', type: 'button',
              onClick: () => {
                store.recordCheckpoint({
                  slot, week, accuracy: counts ? scored.accuracy : null, wpm: rate,
                });
                store.recordSession({
                  drill: 'checkpoint', track: 'speech', seconds: result.seconds,
                  accuracy: counts ? scored.accuracy : null, detail: { week },
                });
                control?.cancel();
                onFinish?.();
              },
            }, t('cp.save')),
          ),
        );
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      },
    });
    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('cp.title', { week })),
          h('button', { class: 'link', type: 'button', onClick: () => { control?.cancel(); onFinish?.(); } }, t('d.exit'))),
        h('p', { class: 'hint' }, t('cp.brief')),
        ltr(h('p', { class: 'target' }, CHECKPOINT_TEXT)),
        control.el,
        feedback,
      ),
    );
  }

  renderAttempt();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
