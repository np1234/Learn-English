// Speech engine: text-to-speech, microphone recording, and speech recognition.
//
// Every quirk handled here is a real, measured browser behaviour:
//   - speechSynthesis.speak() is silently dropped outside a user gesture (iOS).
//   - getVoices() often returns [] on first call; voices arrive via an event.
//   - SpeechRecognition with continuous=true never returns on iPhone.
//   - MediaRecorder needs audio/mp4 on iOS <= 18.3, webm/opus after.
//   - Safari sometimes never fires an utterance's onend, so speak() self-times-out.
//   - `rate` is heavily compressed by the Windows SAPI voices Chrome uses:
//     asking for 0.7 gives 0.90x and asking for 0.3 gives only 1.67x. Slow
//     playback therefore combines a low rate WITH chunking; see speakSlow().
//   - continuous=false stops recognition at the first pause, so long-form
//     capture restarts it (Capture keepAlive) instead.
//
// Design rule: recognition is a BONUS. Nothing here may make a drill impossible
// when recognition is missing or broken.

export const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;

/** Which browser family, for accurate "how to unblock the mic" instructions. */
export function browserFamily() {
  const ua = navigator.userAgent;
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\//.test(ua)) return 'chrome';         // Edge uses Chrome's permission UI
  if (/Chrome\/|Chromium\//.test(ua) && !/OPR\//.test(ua)) return 'chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
  return 'chrome';
}

export function detect() {
  return {
    tts: typeof window.speechSynthesis !== 'undefined',
    mic: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    asr: !!SR,
    secure: window.isSecureContext,
    // file:// pages are NOT a secure context, so the mic is blocked outright.
    // This is the usual reason recording "just doesn't work" while editing.
    fileProtocol: location.protocol === 'file:',
  };
}

// ------------------------------------------------------------------ TTS

let voicePromise = null;
let cachedVoice = null;   // once known, speak() needs no await and stays in-gesture

function pickVoice() {
  const all = window.speechSynthesis.getVoices() || [];
  const en = all.filter((v) => /^en/i.test(v.lang));
  // Deliberately NOT falling back to all[0] here. On a device whose OS voice
  // list starts out non-English (plausible for a Hebrew-interface app before
  // an English voice pack has loaded - Android in particular often needs one
  // downloaded separately), returning any early voice would silently lock the
  // whole app onto a wrong-language voice for content that must be English.
  // Returning null instead keeps englishVoice() waiting/retrying; only its
  // final timeout accepts a non-English voice, as a genuine last resort.
  if (!en.length) return null;
  // Prefer a local voice: no network round-trip, and it keeps working offline.
  return en.find((v) => v.localService && /US|GB/i.test(v.lang)) ||
         en.find((v) => v.localService) || en[0];
}

/** Resolve an English voice, tolerating Safari's empty first getVoices(). */
export function englishVoice() {
  if (voicePromise) return voicePromise;
  voicePromise = new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve(null);

    const found = pickVoice();
    if (found) { cachedVoice = found; return resolve(found); }

    const onChange = () => {
      const v = pickVoice();
      if (v) {
        window.speechSynthesis.removeEventListener('voiceschanged', onChange);
        clearTimeout(timer);
        cachedVoice = v;
        resolve(v);
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChange);
    const timer = setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange);
      // Genuinely timed out waiting for an English voice: any voice at all
      // beats silence, so fall back to whatever the device has.
      const all = window.speechSynthesis.getVoices() || [];
      cachedVoice = pickVoice() || all[0] || null;
      resolve(cachedVoice);
    }, 2000);
  });
  return voicePromise;
}

/** Warm the voice list up early so later taps can speak synchronously. */
export function primeVoices() { englishVoice().catch(() => {}); }

function utter(text, voice, rate, pitch) {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice?.lang || 'en-US';
  u.rate = rate;
  u.pitch = pitch;
  return u;
}

function settleOn(u, words, rate, resolve, reject) {
  let done = false;
  const finish = (fn, arg) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    fn(arg);
  };
  u.onend = () => finish(resolve);
  u.onerror = (e) => {
    // "interrupted" and "canceled" are normal when the user moves on.
    if (e.error === 'interrupted' || e.error === 'canceled') return finish(resolve);
    finish(reject, new Error(e.error || 'tts-error'));
  };
  // Safety net: Safari occasionally never delivers onend.
  const timer = setTimeout(() => finish(resolve), Math.max(4000, (words * 900) / rate));
}

/**
 * Speak `text` at normal pace. Call it from inside a user gesture on iOS.
 * Once the voice list is known this runs synchronously, so the gesture holds.
 */
export function speak(text, { rate = 1, pitch = 1 } = {}) {
  if (!window.speechSynthesis) return Promise.reject(new Error('no-tts'));
  cancelSpeech();
  const words = text.trim().split(/\s+/).length;

  const run = (voice) => new Promise((resolve, reject) => {
    const u = utter(text, voice, rate, pitch);
    settleOn(u, words, rate, resolve, reject);
    window.speechSynthesis.speak(u);
  });

  return cachedVoice ? run(cachedVoice) : englishVoice().then(run);
}

/**
 * Slow, segmented playback for "Listen slowly".
 *
 * This does NOT just lower `rate`, because the Windows SAPI voices ignore it
 * almost entirely (measured above) and iOS compresses it too. Instead the
 * sentence is broken into short chunks spoken as separate utterances, each
 * ending in a comma so the engine inserts a genuine pause.
 *
 * Measured on this machine (ratios against normal speed, same sentence):
 *   rate 0.7 alone .............. 0.90x  (i.e. no slower at all)
 *   rate 0.5 alone .............. 1.32x
 *   rate 0.3 alone .............. 1.67x
 *   rate 0.75 + 3-word chunks ... 1.85x
 *   rate 0.5  + 2-word chunks ... 2.73x  <- the default
 * One word per chunk was tried and is too slow to sit through.
 *
 * That is also the better teaching tool: uniformly stretched audio smears the
 * prosody he is supposed to be copying, whereas chunking keeps each phrase
 * sounding natural and simply gives him time to process between them.
 *
 * All utterances are queued synchronously, so one tap covers the whole phrase
 * and iOS never sees an un-gestured speak().
 */
export function speakSlow(text, { rate = 0.5, chunkWords = 2 } = {}) {
  if (!window.speechSynthesis) return Promise.reject(new Error('no-tts'));
  cancelSpeech();

  const words = text.trim().split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkWords) {
    chunks.push(words.slice(i, i + chunkWords).join(' '));
  }

  const run = (voice) => new Promise((resolve, reject) => {
    chunks.forEach((chunk, i) => {
      const last = i === chunks.length - 1;
      // Strip any existing trailing punctuation before adding the pause comma,
      // so we never produce "warm.,".
      const body = last ? chunk : chunk.replace(/[,.;:!?]+$/, '') + ',';
      const u = utter(body, voice, rate, 1);
      if (last) settleOn(u, words.length * 2, rate, resolve, reject);
      window.speechSynthesis.speak(u);
    });
    if (!chunks.length) resolve();
  });

  return cachedVoice ? run(cachedVoice) : englishVoice().then(run);
}

export function cancelSpeech() {
  try { window.speechSynthesis?.cancel(); } catch { /* nothing to cancel */ }
}

// ------------------------------------------------------------- recording

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/mp4',                 // iOS 14.5 - 18.3 (AAC)
    'audio/webm;codecs=opus',    // Chrome, and iOS 18.4+
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  for (const t of candidates) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* keep trying */ }
  }
  return '';
}

/**
 * One capture attempt: records audio and, when available, transcribes it.
 * Recognition runs alongside the recorder and is allowed to fail silently -
 * the recording is what the drill actually depends on.
 */
export class Capture {
  constructor({ wantTranscript = true, lang = 'en-US', keepAlive = false } = {}) {
    this.wantTranscript = wantTranscript && !!SR;
    this.lang = lang;
    // keepAlive: for speech longer than one utterance (the Fluency Sprint).
    // Without it the transcript stops at the learner's first pause, which made
    // words-per-minute read ~7 instead of ~105 on a two-minute round.
    this.keepAlive = keepAlive;
    this.stopping = false;
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.parts = [];
    this.confidences = [];
    this.recognition = null;
    this.startedAt = 0;
  }

  /** Everything recognised so far, across restarts. */
  get transcript() {
    const joined = this.parts.join(' ').trim();
    return joined || null;
  }

  /** Mean confidence where the engine reports it (Safari often does not). */
  get confidence() {
    if (!this.confidences.length) return null;
    return this.confidences.reduce((a, b) => a + b, 0) / this.confidences.length;
  }

  /** Must be called from a user gesture (iOS requires it for getUserMedia). */
  async start() {
    const caps = detect();
    if (!caps.secure || caps.fileProtocol) {
      const err = new Error('insecure-context');
      err.name = 'InsecureContextError';
      throw err;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const err = new Error('no-mediadevices');
      err.name = 'NotSupportedError';
      throw err;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = pickMimeType();
    try {
      this.recorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);
    } catch {
      this.recorder = new MediaRecorder(this.stream);
    }
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size) this.chunks.push(e.data);
    };
    this.recorder.start();
    this.startedAt = Date.now();

    if (this.wantTranscript) this._startRecognition();
  }

  _startRecognition() {
    try {
      const r = new SR();
      // continuous=true never returns on iPhone. Single utterance only.
      r.continuous = false;
      r.interimResults = false;   // unreliable in WebKit; final result only
      r.maxAlternatives = 1;
      r.lang = this.lang;
      r.onresult = (e) => {
        // With continuous=false each result event carries one utterance.
        for (let i = e.resultIndex ?? 0; i < e.results.length; i++) {
          const alt = e.results[i]?.[0];
          if (!alt || !e.results[i].isFinal) continue;
          const text = (alt.transcript || '').trim();
          if (text) this.parts.push(text);
          if (typeof alt.confidence === 'number' && alt.confidence > 0) {
            this.confidences.push(alt.confidence);
          }
        }
      };
      r.onerror = () => { /* degrade to recording-only */ };
      r.onend = () => {
        // Restart until we stop it ourselves, so a pause does not end capture.
        if (this.keepAlive && !this.stopping) {
          setTimeout(() => {
            if (this.stopping) return;
            try { r.start(); } catch { /* already restarting */ }
          }, 120);
        }
      };
      this.recognition = r;
      r.start();
    } catch {
      this.recognition = null;
    }
  }

  /** Stop everything and hand back the attempt. Never rejects. */
  async stop() {
    this.stopping = true;   // must precede stopping recognition, or keepAlive restarts it
    const seconds = (Date.now() - this.startedAt) / 1000;

    const blob = await new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === 'inactive') return resolve(null);
      const settle = () => {
        const type = this.recorder?.mimeType || 'audio/mp4';
        resolve(this.chunks.length ? new Blob(this.chunks, { type }) : null);
      };
      this.recorder.onstop = settle;
      try { this.recorder.stop(); } catch { settle(); }
      setTimeout(settle, 1500); // Safari occasionally withholds onstop
    });

    // Give recognition a beat to deliver its final result before tearing down.
    if (this.recognition) {
      await new Promise((resolve) => {
        let done = false;
        const end = () => { if (!done) { done = true; resolve(); } };
        this.recognition.onend = end;
        try { this.recognition.stop(); } catch { end(); }
        setTimeout(end, 1800);
      });
    }

    this.release();
    return {
      blob,
      url: blob ? URL.createObjectURL(blob) : null,
      seconds,
      transcript: this.transcript,
      confidence: this.confidence,
    };
  }

  /** Always release the mic - iOS keeps the recording indicator on otherwise. */
  release() {
    // Must precede stopping recognition, or keepAlive's onend handler
    // restarts it - same ordering stop() uses, and just as required here:
    // recognition opens its own capture independent of `this.stream`, so
    // stopping the recorder's tracks alone never stops a keepAlive session.
    this.stopping = true;
    try { this.recognition?.stop(); } catch { /* already gone */ }
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* already gone */ }
    this.stream = null;
    this.recorder = null;
    this.recognition = null;
  }
}

/** Release a recording URL. Object URLs leak for the life of the document. */
export function revokeUrl(url) {
  if (url) { try { URL.revokeObjectURL(url); } catch { /* already gone */ } }
}

/**
 * One-shot probe used by the Sound Check. Records ~2.5s and reports what
 * actually worked on this device, which is the only trustworthy signal.
 */
export async function probeMic(ms = 2500) {
  const cap = new Capture({ wantTranscript: true });
  await cap.start();
  await new Promise((r) => setTimeout(r, ms));
  const result = await cap.stop();
  return {
    recorded: !!result.blob && result.blob.size > 0,
    transcript: result.transcript,
    asrWorked: typeof result.transcript === 'string' && result.transcript.trim().length > 0,
    url: result.url,
  };
}
