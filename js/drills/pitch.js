// Pitch practice (sales): one uninterrupted 60-90 second pitch, recorded, with
// pace, filler words and a short self-check. It reuses the same
// recorder/recogniser machinery as every drill and follows the same rule:
// the recording and the self-check always work; pace and filler counts only
// appear when recognition produced words.
//
// Honest limit: recognisers quietly delete "um"/"uh", so the filler count is a
// floor, not a measurement - it is only shown when above zero, and labelled so.

import { h, clear, ltr } from '../ui.js';
import { revokeUrl } from '../speech.js';
import { tokenize, wpm } from '../scoring.js';
import { pickPitch } from '../content/sales.js';
import { t } from '../i18n.js';
import * as store from '../state.js';
import { recordButton, comparePanel, micError, unscoredNote } from './common.js';

const FILLERS = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'uhm']);
const CHECKS = ['pt.check1', 'pt.check2', 'pt.check3'];

function countFillers(transcript) {
  if (!transcript) return 0;
  const raw = String(transcript).toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
  let n = raw.filter((w) => FILLERS.has(w)).length;
  const joined = ` ${raw.join(' ')} `;
  n += (joined.match(/ you know /g) || []).length;
  return n;
}

export function mount(root, { level, onFinish }) {
  const prompt = pickPitch(level, store.get().recentContent?.pitch || []);
  const startedAt = Date.now();
  let control = null;
  let lastUrl = null;
  let result = null;       // the attempt being reviewed
  const checks = [false, false, false];

  function leave() {
    control?.cancel();
    store.recordShown('pitch', [prompt]);
    onFinish?.();
  }

  function save() {
    control?.cancel();
    const words = result.transcript ? tokenize(result.transcript).length : 0;
    store.recordSession({
      drill: 'pitch', track: 'speech',
      seconds: (Date.now() - startedAt) / 1000,
      accuracy: null,
      detail: {
        spokenSeconds: Math.round(result.seconds), words,
        wpm: words ? wpm(words, result.seconds) : null,
        fillers: countFillers(result.transcript), checks: checks.filter(Boolean).length,
      },
    });
    store.recordShown('pitch', [prompt]);
    onFinish?.();
  }

  function renderReview() {
    const words = result.transcript ? tokenize(result.transcript).length : 0;
    const rate = words ? wpm(words, result.seconds) : null;
    const fillers = countFillers(result.transcript);
    const boxes = CHECKS.map((key, idx) => {
      const cb = h('input', { type: 'checkbox', id: `pt-c${idx}` });
      cb.addEventListener('change', () => { checks[idx] = cb.checked; });
      return h('label', { class: 'check-row', for: `pt-c${idx}` }, cb, ' ', t(key));
    });
    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' }, h('span', { class: 'pill' }, t('pt.title'))),
        ltr(h('p', { class: 'target' }, prompt)),
        h('div', { class: 'verdict good' },
          h('strong', {}, `${Math.round(result.seconds)} ${t('pt.seconds')}`),
          rate ? h('span', { class: 'wpm' }, ` · ${rate} wpm`) : null),
        rate ? null : unscoredNote(result.asr),
        fillers > 0 ? h('p', { class: 'hint small' }, t('pt.fillers', { n: fillers })) : null,
        comparePanel('', result.url),
        h('h3', {}, t('pt.selfCheck')),
        ...boxes,
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => { revokeUrl(lastUrl); lastUrl = null; result = null; renderBrief(); } }, t('d.tryAgain')),
          h('button', { class: 'btn primary', type: 'button', onClick: save }, t('d.finish')),
        ),
      ),
    );
  }

  function renderBrief() {
    control?.cancel();
    const feedback = h('div', { class: 'feedback' });
    control = recordButton({
      wantTranscript: true,
      label: t('pt.record'),
      onError: (err) => clear(feedback).append(micError(err)),
      onResult: (r) => {
        revokeUrl(lastUrl);
        lastUrl = r.url;
        result = r;
        renderReview();
      },
    });
    clear(root).append(
      h('div', { class: 'card' },
        h('div', { class: 'drill-head' },
          h('span', { class: 'pill' }, t('pt.title')),
          h('button', { class: 'link', type: 'button', onClick: leave }, t('d.exit'))),
        ltr(h('p', { class: 'target' }, prompt)),
        h('p', { class: 'hint' }, t('pt.brief')),
        control.el,
        feedback,
      ),
    );
  }

  renderBrief();
  return () => { control?.cancel(); revokeUrl(lastUrl); };
}
