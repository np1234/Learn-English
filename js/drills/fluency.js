// Fluency Sprint - the 4/3/2 technique.
//
// The same content is retold three times under shrinking time limits. Studies of
// 4/3/2 find speech rate rises measurably from the first delivery to the third:
// the content is already worked out, so attention shifts from what to say to how
// to say it. A short planning period first is included because pre-task planning
// independently improves fluency and complexity.
//
// The ratio stays 4:3:2; the absolute lengths scale with level, because four
// minutes of unbroken speech is punishing at A1.

import { h, clear, countdown, fmtClock, ltr } from '../ui.js';
import { Capture, cancelSpeech, revokeUrl } from '../speech.js';
import { tokenize, wpm } from '../scoring.js';
import { FLUENCY_PROMPTS, pickOne } from '../content/sentences.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { micError, unscoredNote } from './common.js';

const ROUND_SECONDS = {
  preA1: [80, 60, 40],
  A1: [80, 60, 40],
  A2: [120, 90, 60],
  B1: [120, 90, 60],
  B2: [240, 180, 120],
};

const PLAN_SECONDS = 30;

export function mount(root, { level, onFinish }) {
  const recentFluency = store.get().recentContent?.fluency || [];
  const prompt = pickOne(FLUENCY_PROMPTS, level, recentFluency);
  const limits = ROUND_SECONDS[level] || ROUND_SECONDS.A2;
  const rounds = [];
  const startedAt = Date.now();

  let capture = null;
  let ticker = null;
  // Bumped every time cleanup() runs (every screen transition). Guards the
  // same race as common.js's recordButton: if the learner navigates away
  // while the FIRST mic permission prompt is still pending, cap.start()
  // resolves after cleanup() already ran, and without this check the mic
  // would open with no code path left to ever release it.
  let gen = 0;

  function cleanup() {
    gen++;
    ticker?.stop();
    ticker = null;
    capture?.release();
    capture = null;
    cancelSpeech();
  }

  /** Called when leaving the drill entirely; round audio can go then. */
  function dispose() {
    cleanup();
    for (const r of rounds) revokeUrl(r.url);
  }

  function finish() {
    cleanup();
    store.recordShown('fluency', [prompt]);
    // Leaving before a single round is recorded is not a practice session.
    if (!rounds.length) return onFinish?.();
    const rates = rounds.map((r) => r.wpm).filter((x) => typeof x === 'number');
    const gain = rates.length >= 2 ? rates[rates.length - 1] - rates[0] : null;

    store.recordSession({
      drill: 'fluency', track: 'speech',
      seconds: (Date.now() - startedAt) / 1000,
      accuracy: null,
      detail: { rounds: rounds.length, wpm: rates },
    });

    clear(root).append(
      h('div', { class: 'card summary' },
        h('h2', {}, t('fl.doneTitle')),
        rates.length
          ? h('div', { class: 'wpm-chart' }, ...rates.map((r, idx) => h('div', { class: 'wpm-bar' },
              h('div', { class: 'bar', style: `height:${Math.min(100, (r / Math.max(...rates, 1)) * 100)}%` }),
              h('span', { class: 'wpm-val' }, r),
              h('span', { class: 'wpm-lbl' }, t('fl.round', { i: idx + 1 })),
            )))
          : h('p', { class: 'hint' }, t('fl.noSpeech')),
        gain !== null
          ? h('p', { class: 'hint' }, gain > 0 ? t('fl.gainUp', { n: gain }) : t('fl.gainFlat'))
          : null,
        h('button', { class: 'btn primary wide', type: 'button', onClick: () => onFinish?.() }, t('d.done')),
      ),
    );
  }

  function renderBrief() {
    cleanup();
    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('fl.title')),
          h('button', { class: 'link', type: 'button', onClick: () => onFinish?.() }, t('d.exit')),
        ),
        ltr(h('p', { class: 'target' }, prompt)),
        h('p', { class: 'hint' }, t('fl.brief', {
          a: fmtClock(limits[0]), b: fmtClock(limits[1]), c: fmtClock(limits[2]),
        })),
        h('button', { class: 'btn primary wide', type: 'button', onClick: renderPlan },
          t('fl.startPlanning', { n: PLAN_SECONDS })),
      ),
    );
  }

  function renderPlan() {
    cleanup();
    const clock = h('p', { class: 'clock' }, fmtClock(PLAN_SECONDS));
    const cd = countdown(PLAN_SECONDS, (left) => { clock.textContent = fmtClock(left); });
    ticker = cd;
    cd.promise.then(() => { if (ticker === cd) renderRound(0); });

    clear(root).append(
      h('div', { class: 'card' },
        h('span', { class: 'pill' }, t('fl.planning')),
        ltr(h('p', { class: 'target' }, prompt)),
        clock,
        h('p', { class: 'hint' }, t('fl.planHint')),
        h('button', { class: 'btn ghost wide', type: 'button', onClick: () => { cd.stop(); renderRound(0); } }, t('fl.ready')),
      ),
    );
  }

  function renderRound(n) {
    cleanup();
    const limit = limits[n];
    const clock = h('p', { class: 'clock' }, fmtClock(limit));
    const status = h('p', { class: 'hint' }, t('fl.tapStart'));
    const feedback = h('div', { class: 'feedback' });

    const stopBtn = h('button', { class: 'btn record', type: 'button', disabled: true }, t('d.stop'));
    const startBtn = h('button', { class: 'btn primary wide', type: 'button' }, t('fl.startRound', { i: n + 1 }));

    async function stopRound() {
      if (!capture) return;
      ticker?.stop();
      ticker = null;
      stopBtn.disabled = true;
      stopBtn.textContent = t('d.processing');
      const cap = capture;
      capture = null;
      const result = await cap.stop();

      const words = result.transcript ? tokenize(result.transcript).length : 0;
      const rate = words ? wpm(words, result.seconds) : null;
      rounds.push({ round: n + 1, seconds: result.seconds, words, wpm: rate, url: result.url });

      clear(feedback).append(
        h('div', { class: 'verdict good' },
          h('strong', {}, rate ? t('fl.wpm', { n: rate }) : t('fl.recorded')),
        ),
        rate ? null : unscoredNote(result.asr),
        result.url ? h('audio', { src: result.url, controls: '' }) : null,
        h('button', {
          class: 'btn primary wide', type: 'button',
          onClick: () => (n + 1 < limits.length ? renderRound(n + 1) : finish()),
        }, n + 1 < limits.length ? t('fl.nextRound', { t: fmtClock(limits[n + 1]) }) : t('fl.seeResult')),
      );
      startBtn.remove();
      stopBtn.remove();
      feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      const myGen = gen;
      try {
        // keepAlive: a 2-minute answer contains many pauses, and without
        // restarting recognition the transcript stops at the first one -
        // which made words-per-minute read ~7 instead of ~105.
        const cap = new Capture({ wantTranscript: true, keepAlive: true });
        await cap.start();
        if (myGen !== gen) { cap.release(); return; }
        capture = cap;
        startBtn.remove();
        stopBtn.disabled = false;
        status.textContent = t('fl.keepGoing');
        const cd = countdown(limit, (left) => { clock.textContent = fmtClock(left); });
        ticker = cd;
        cd.promise.then(() => { if (capture) stopRound(); });
      } catch (err) {
        startBtn.disabled = false;
        clear(feedback).append(micError(err));
      }
    });

    stopBtn.addEventListener('click', stopRound);

    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('fl.roundOf', { i: n + 1, n: limits.length, t: fmtClock(limit) })),
          h('button', { class: 'link', type: 'button', onClick: finish }, t('d.exit')),
        ),
        ltr(h('p', { class: 'target' }, prompt)),
        clock,
        status,
        startBtn,
        stopBtn,
        feedback,
      ),
    );
  }

  renderBrief();
  return dispose;
}
