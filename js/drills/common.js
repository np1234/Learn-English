// Shared drill pieces: the record button and the model/self playback pair.
// Tap-to-start / tap-to-stop rather than hold-to-talk, because a tap is the most
// reliable way to satisfy the iOS user-gesture requirement for getUserMedia.

import { h, stopwatch, fmtClock, ltr, renderWords } from '../ui.js';
import { Capture, speak, speakSlow, cancelSpeech, browserFamily, detect, isIOS } from '../speech.js';
import { verdict } from '../scoring.js';
import { t, phoneme } from '../i18n.js';
import { wordTags } from '../phonetics.js';
import { contrastFor } from '../content/minimal-pairs.js';

/**
 * A record button that manages one Capture cycle.
 * Calls onResult({blob, url, seconds, transcript}) when the learner stops.
 */
export function recordButton({ onResult, onError, wantTranscript = true, label }) {
  const text = label || t('d.recordYourself');
  let capture = null;
  let watch = null;
  let busy = false;
  // Guards a real race: if cancel() runs WHILE cap.start() is still pending
  // (e.g. the very first mic permission prompt is up, and the learner
  // navigates away before answering it), capture is still null when cancel()
  // runs, so its capture?.release() is a no-op - then cap.start() resolves
  // later and the code below would open the mic with nothing left to ever
  // close it. This flag catches that: torndown is checked the instant
  // cap.start() resolves, before the mic is ever handed to the UI.
  let torndown = false;

  const timeEl = h('span', { class: 'rec-time' });
  const btn = h('button', { class: 'btn record', type: 'button' }, text);
  const wrap = h('div', { class: 'record-wrap' }, btn, timeEl);

  const reset = () => {
    btn.textContent = text;
    btn.classList.remove('recording');
    timeEl.textContent = '';
    busy = false;
  };

  btn.addEventListener('click', async () => {
    if (busy) return;

    if (capture) {
      // ---- stop
      busy = true;
      btn.textContent = t('d.processing');
      btn.classList.remove('recording');
      watch?.stop();
      const cap = capture;
      capture = null;
      try {
        const result = await cap.stop();
        reset();
        onResult?.(result);
      } catch (err) {
        reset();
        onError?.(err);
      }
      return;
    }

    // ---- start
    busy = true;
    cancelSpeech();
    try {
      const cap = new Capture({ wantTranscript });
      await cap.start();
      if (torndown) { cap.release(); return; }
      capture = cap;
      btn.textContent = t('d.stop');
      btn.classList.add('recording');
      watch = stopwatch((s) => { timeEl.textContent = fmtClock(s); });
      busy = false;
    } catch (err) {
      reset();
      onError?.(err);
    }
  });

  return {
    el: wrap,
    cancel() {
      torndown = true;
      watch?.stop();
      capture?.release();
      capture = null;
      reset();
    },
  };
}

/**
 * Model-vs-self playback. Hearing the two back to back is the core of
 * shadowing practice and works on every device, with or without recognition.
 */
export function comparePanel(modelText, selfUrl) {
  const audio = selfUrl ? h('audio', { src: selfUrl, preload: 'metadata' }) : null;

  // No model text (e.g. a free-speaking pitch) means no model button.
  const modelBtn = modelText ? h('button', {
    class: 'btn ghost', type: 'button',
    onClick: () => { speak(modelText).catch(() => {}); },
  }, t('d.playModel')) : null;

  const selfBtn = selfUrl
    ? h('button', {
        class: 'btn ghost', type: 'button',
        onClick: () => { cancelSpeech(); audio.currentTime = 0; audio.play().catch(() => {}); },
      }, t('d.playYourself'))
    : null;

  return h('div', { class: 'compare' },
    modelBtn,
    selfBtn,
    audio,
    selfUrl && modelText ? h('p', { class: 'hint small' }, t('d.compareHint')) : null,
  );
}

/**
 * Why the microphone did not start, in terms of the browser he is actually in.
 * The most common cause while editing is opening index.html as a file, which is
 * not a secure context, so that case is named explicitly rather than blamed on
 * a permission he never denied.
 */
export function micError(err) {
  const name = err?.name || '';
  const caps = detect();

  if (name === 'InsecureContextError' || caps.fileProtocol || !caps.secure) {
    return h('p', { class: 'error' }, t('mic.insecure'));
  }
  if (name === 'NotSupportedError') {
    return h('p', { class: 'error' }, t('mic.unsupported'));
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return h('p', { class: 'error' }, t('mic.notFound'));
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    const fam = browserFamily();
    const key = fam === 'safari' ? 'mic.blockedSafari'
              : fam === 'firefox' ? 'mic.blockedFirefox'
              : 'mic.blockedChrome';
    return h('p', { class: 'error' }, t(key));
  }
  return h('p', { class: 'error' }, t('mic.inUse'));
}

/**
 * "Listen slowly", tuned per drill. Defaults (rate 0.5, 2-word chunks) give
 * 2.73x normal duration; Shadow overrides with bigger chunks because rhythm
 * matters more there than isolating individual sounds.
 */
export function playSlow(text, opts = {}) {
  return speakSlow(text, opts).catch(() => {});
}

/** Speak a minimal pair as a contrast: "think ... sink ... think". */
export function playContrast(target, confusedWith) {
  return speakSlow(`${target}. ${confusedWith}. ${target}.`, { rate: 0.5, chunkWords: 1 })
    .catch(() => {});
}

/**
 * One always-visible detail card per wrong/missing word: what was heard
 * instead (or that nothing was heard), plus - when the word carries a coached
 * sound - the specific mouth-position hint and the audio contrast. Each word
 * is judged only on itself (scored.words already comes out of an independent
 * per-word alignment in scoring.js), so a mistake on one word never borrows
 * or spreads to the coaching shown for another. Returns null for a clean
 * attempt, so a perfect sentence adds no extra chrome.
 *
 * A word can carry more than one covered sound at once (e.g. "weather" is
 * th_voiced + w + r together) - showing all of them, on every wrong word,
 * would stack far too many coaching blocks under one attempt. Pick the single
 * highest-impact sound per word instead, in the same intelligibility order
 * used to prioritise the pronunciation curriculum elsewhere in the app: TH
 * and W/V change the word outright, so they outrank sounds that just make it
 * sound foreign.
 */
const TAG_PRIORITY = ['th_unvoiced', 'th_voiced', 'w', 'v', 'vowel_len', 'r', 'h', 'ed_ending', 'articles'];

function bestTag(word) {
  const tags = wordTags(word);
  for (const tag of TAG_PRIORITY) {
    if (tags.has(tag) && phoneme(tag)) return tag;
  }
  return null;
}

export function renderMistakes(scored) {
  const bad = scored.words.filter((w) => w.status === 'wrong' || w.status === 'missing');
  if (!bad.length) return null;

  const items = bad.map((w) => {
    // Missing words have no heard audio to diagnose a sound against, so they
    // never get phonetic coaching - only a plain, honest explanation.
    const tag = w.status === 'wrong' ? bestTag(w.word) : null;

    const head = h('div', { class: `miss-head ${w.status}` },
      ltr(h('span', { class: 'miss-word' }, w.word)),
      h('span', { class: 'miss-said' }, w.status === 'missing' ? t('d.notHeard') : t('d.youSaid')),
      w.status === 'wrong' ? ltr(h('span', { class: 'miss-heard' }, w.heard)) : null,
    );

    let body;
    if (tag) {
      const p = phoneme(tag);
      const c = contrastFor(tag);
      body = h('div', { class: 'hint-item flat' },
        h('strong', { class: 'hint-label' }, p.label),
        h('span', { class: 'hint-body' }, p.hint),
        c ? h('button', {
          class: 'btn tiny', type: 'button',
          onClick: () => playContrast(c.target, c.confusedWith),
        }, t('d.hearDifference'), ' ',
           ltr(h('span', { class: 'pair' }, `${c.target} / ${c.confusedWith}`))) : null,
      );
    } else {
      // Plain vocabulary miss, or a missing word: no sound to blame, so no
      // invented phonetics - just an honest, actionable line.
      body = h('p', { class: 'miss-plain' },
        w.status === 'missing' ? t('d.missedWordHint') : t('d.wrongWordHint'));
    }

    return h('div', { class: 'miss-item' }, head, body);
  });

  return h('div', { class: 'mistakes' }, h('p', { class: 'mistakes-title' }, t('d.mistakeDetails')), items);
}

/**
 * Why an attempt was not graded, in words he can act on - never the old
 * blanket "scoring is not available on this device", which was shown even
 * when the recogniser merely missed a quiet start or the network blipped.
 */
export function unscoredNote(asr) {
  const status = asr?.status || 'no-speech';
  let key = `asr.${status}`;
  if (status === 'blocked' && isIOS) key = 'asr.blockedIOS';
  if (!['disabled', 'unsupported', 'blocked', 'network', 'audio-capture', 'error', 'no-speech', 'ok'].includes(status)) key = 'asr.error';
  if (status === 'ok') key = 'asr.no-speech'; // transcript was only filler
  return h('p', { class: 'hint small asr-note' }, t(key));
}

/**
 * The shared top half of every graded attempt: verdict, word row, and either
 * the per-word mistake cards or - when the recogniser only caught part of it -
 * a plain "try again" note instead of misleading red words. Returns an array
 * of nodes, already filtered, to spread into append() (append() stringifies
 * arrays and null instead of flattening/filtering them).
 */
export function attemptFeedback(scored, result, { showWpm = false } = {}) {
  const v = verdict(scored.scored ? scored.accuracy : null, { unreliable: scored.unreliable });
  const nodes = [
    h('div', { class: `verdict ${v.tone}` },
      h('strong', {}, t(v.key)),
      scored.scored && !scored.unreliable ? ` - ${Math.round(scored.accuracy * 100)}%` : '',
      showWpm && scored.wpm && scored.scored ? h('span', { class: 'wpm' }, ` ${scored.wpm} wpm`) : null,
    ),
  ];
  if (scored.scored) {
    nodes.push(renderWords(scored));
    if (scored.unreliable) nodes.push(h('p', { class: 'hint small asr-note' }, t('d.partialHint')));
    else nodes.push(renderMistakes(scored));
  } else {
    nodes.push(unscoredNote(result?.asr));
  }
  return nodes.filter(Boolean);
}
