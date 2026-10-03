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
//   - continuous=false stops recognition at the first pause, so every
//     Capture restarts it until stopped (and never on a fatal error).
//   - Which order to start recorder and recognition in is device-specific;
//     see "capture strategy" below and the Speech Lab (#/diag).
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

// ------------------------------------------------------- capture strategy
//
// How recording and recognition are combined is a per-DEVICE fact that can
// only be learned on the device itself (the browser pane used to develop this
// app blocks the mic outright). Four strategies:
//
//   both-rec-first  getUserMedia + MediaRecorder, then recognition
//   both-asr-first  recognition.start() synchronously inside the tap, THEN
//                   getUserMedia + MediaRecorder. iOS ties recognition to the
//                   gesture and to audio-session ownership, so on some
//                   devices only this order yields a transcript.
//   asr-only        recognition alone: grading works, no self-playback
//   record-only     recorder alone: self-playback works, no grading
//
// `auto` (the default) uses one of the two "both" orders and flips to the
// other after repeated silent misses (a real recording, recognition
// supported, no fatal error, still no transcript) - see app.js's
// learnFromCapture(). The Speech Lab (#/diag) can pin any strategy by hand.

export const CAPTURE_MODES = ['auto', 'both-rec-first', 'both-asr-first', 'asr-only', 'record-only'];

let captureConfig = { mode: 'auto', learned: 'rec-first' };
let captureListener = null;

/** Set from the stored profile at boot and whenever the strategy changes. */
export function setCaptureConfig({ mode, learned } = {}) {
  if (mode && CAPTURE_MODES.includes(mode)) captureConfig.mode = mode;
  if (learned === 'rec-first' || learned === 'asr-first') captureConfig.learned = learned;
}

/** The strategy a new Capture will actually use. */
export function effectiveMode() {
  return captureConfig.mode === 'auto' ? `both-${captureConfig.learned}` : captureConfig.mode;
}

/** Called with every finished attempt's diagnostics (app.js persists them). */
export function onCaptureFinished(fn) { captureListener = fn; }

// Errors after which restarting recognition can never help: a permission or
// OS-setting block, no audio device, no network for a cloud recogniser, or an
// unsupported language. Restarting on these used to loop ~8 times a second
// for as long as a keepAlive capture stayed open.
const FATAL_ASR = new Set([
  'not-allowed', 'service-not-allowed', 'audio-capture', 'network',
  'language-not-supported', 'bad-grammar',
]);

// Ceiling on recognition restarts per attempt - a guard, not a tuning knob.
// A two-minute Fluency round with natural pauses restarts a few dozen times.
const MAX_RESTARTS = 120;

/**
 * One capture attempt: records audio and, when available, transcribes it.
 * Recognition runs alongside the recorder and is allowed to fail - the drill
 * always gets the recording when there is one, plus an honest `asr.status`
 * saying why there is no transcript when there isn't.
 *
 * Recognition is restarted whenever it ends on its own before stop() -
 * continuous=true never returns on iPhone, and continuous=false ends at the
 * first pause, which used to cut a hesitant reading (or any Shadow passage)
 * short and grade the rest of the sentence as "missing".
 */
export class Capture {
  constructor({ wantTranscript = true, lang = 'en-US', keepAlive = false, mode } = {}) {
    this.mode = mode || effectiveMode();
    this.wantRecording = this.mode !== 'asr-only';
    this.asrRequested = wantTranscript && this.mode !== 'record-only';
    this.wantTranscript = this.asrRequested && !!SR;
    this.lang = lang;
    // keepAlive is kept for API compatibility (Fluency passes it); every
    // capture now restarts recognition until stopped, see the class comment.
    this.keepAlive = keepAlive;
    this.stopping = false;
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    this.parts = [];
    this.cur = null;            // the live recognition session's {final, interim}
    this.confidences = [];
    this.recognition = null;
    this.startedAt = 0;
    this.restarts = 0;
    this.errors = [];
    this.fatal = null;
    this.heardSpeech = false;
    this.asrRunning = false;
    this.t0 = Date.now();
    this.events = [];
  }

  _ev(ev, detail) {
    if (this.events.length < 200) this.events.push({ t: Date.now() - this.t0, ev, ...(detail ? { detail } : {}) });
  }

  /** Everything recognised so far, across restarts. */
  get transcript() {
    const live = this.cur ? (this.cur.final || this.cur.interim) : '';
    const joined = [...this.parts, live].join(' ').replace(/\s+/g, ' ').trim();
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
    this._ev('start', { mode: this.mode, asr: this.wantTranscript });

    // asr-first: recognition must start synchronously, still inside the tap -
    // no await may come before this line in that mode.
    if (this.wantTranscript && this.mode === 'both-asr-first') this._startRecognition();
    if (this.mode === 'asr-only') {
      if (!this.wantTranscript) {
        const err = new Error('no-recognition');
        err.name = 'NotSupportedError';
        throw err;
      }
      this._startRecognition();
      this.startedAt = Date.now();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.release();
      const err = new Error('no-mediadevices');
      err.name = 'NotSupportedError';
      throw err;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._ev('mic-open');
      if (this.stopping) { this.release(); return; }
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
      this._ev('rec-start', { mime: this.recorder.mimeType || mimeType || '' });
    } catch (err) {
      // Never leave the mic open behind a failed start - iOS keeps the
      // recording indicator lit, and the next attempt finds it "in use".
      this._ev('start-failed', { name: err?.name, message: err?.message });
      this.release();
      throw err;
    }
    this.startedAt = Date.now();

    if (this.wantTranscript && this.mode !== 'both-asr-first') this._startRecognition();
  }

  _commitSession() {
    if (!this.cur) return;
    const text = [this.cur.final, this.cur.final ? '' : this.cur.interim].join(' ').trim();
    if (text) this.parts.push(text);
    this.cur = null;
  }

  _startRecognition() {
    let r;
    try {
      r = new SR();
      // continuous=true never returns on iPhone. Single utterance per
      // session; onend below restarts it so a pause does not end capture.
      r.continuous = false;
      // Interim results are a FALLBACK only: if a session ends (or we stop
      // it) before the engine marks anything final, the latest interim text
      // is kept instead of being discarded. WebKit's interim support is
      // unreliable, so it is only requested off iOS; a non-final result that
      // iOS delivers anyway is still kept the same way.
      r.interimResults = !isIOS;
      r.maxAlternatives = 1;
      r.lang = this.lang;
    } catch (err) {
      this._ev('asr-construct-failed', { message: err?.message });
      this.recognition = null;
      this.wantTranscript = false;
      this.fatal = this.fatal || 'construct-failed';
      return;
    }

    r.onstart = () => this._ev('asr-start');
    r.onaudiostart = () => this._ev('asr-audio');
    r.onspeechstart = () => { this.heardSpeech = true; this._ev('asr-speech'); };
    r.onresult = (e) => {
      // Rebuild this session's text from ALL its results every time, rather
      // than from resultIndex, so an interim later promoted to final is never
      // counted twice.
      let final = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const alt = res?.[0];
        if (!alt) continue;
        const text = (alt.transcript || '').trim();
        if (!text) continue;
        if (res.isFinal) {
          final += ` ${text}`;
          if (typeof alt.confidence === 'number' && alt.confidence > 0 && i >= (e.resultIndex ?? 0)) {
            this.confidences.push(alt.confidence);
          }
        } else {
          interim += ` ${text}`;
        }
      }
      this.cur = { final: final.trim(), interim: interim.trim() };
      this.heardSpeech = true;
      this._ev('asr-result', { final: this.cur.final, interim: this.cur.interim });
    };
    r.onerror = (e) => {
      const code = e?.error || 'error';
      this.errors.push(code);
      this._ev('asr-error', { code });
      if (FATAL_ASR.has(code)) this.fatal = code;
    };
    r.onend = () => {
      this.asrRunning = false;
      this._ev('asr-end');
      this._commitSession();
      if (this._onRecognitionEnd) { this._onRecognitionEnd(); return; }
      if (this.stopping || this.fatal || this.restarts >= MAX_RESTARTS) return;
      setTimeout(() => {
        if (this.stopping || this.fatal || this.recognition !== r) return;
        this.restarts += 1;
        try { r.start(); this.asrRunning = true; this._ev('asr-restart', { n: this.restarts }); } catch { /* already running */ }
      }, 120);
    };

    this.recognition = r;
    try {
      r.start();
      this.asrRunning = true;
    } catch (err) {
      this._ev('asr-start-threw', { name: err?.name, message: err?.message });
      this.errors.push(err?.name || 'start-threw');
      this.fatal = this.fatal || 'start-threw';
    }
  }

  /** Why there is (or is not) a transcript - drives honest feedback copy. */
  asrStatus() {
    if (this.transcript) return 'ok';
    if (!this.asrRequested) return 'disabled';
    if (!SR) return 'unsupported';
    if (this.fatal === 'not-allowed' || this.fatal === 'service-not-allowed') return 'blocked';
    if (this.fatal === 'network') return 'network';
    if (this.fatal === 'audio-capture') return 'audio-capture';
    if (this.fatal) return 'error';
    return 'no-speech';
  }

  /** Stop everything and hand back the attempt. Never rejects. */
  async stop() {
    this.stopping = true;   // must precede stopping recognition, or onend restarts it
    const seconds = (Date.now() - (this.startedAt || this.t0)) / 1000;
    this._ev('stop');

    // Recognition FIRST, recorder second. Ending the recorder and its audio
    // session before the recogniser has delivered its final result can lose
    // that result outright on iOS - the only transcript of the attempt.
    // Skip the wait when recognition is idle (between restarts, or already
    // ended on its own): stop() on an idle recogniser never fires onend.
    const r = this.recognition;
    if (r && this.asrRunning) {
      await new Promise((resolve) => {
        let done = false;
        const end = () => { if (!done) { done = true; resolve(); } };
        this._onRecognitionEnd = end;
        try { r.stop(); } catch { end(); }
        setTimeout(end, 2500);
      });
      this._commitSession();
    }

    const blob = await new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec || rec.state === 'inactive') return resolve(null);
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        const type = rec.mimeType || 'audio/mp4';
        resolve(this.chunks.length ? new Blob(this.chunks, { type }) : null);
      };
      rec.onstop = settle;
      try { rec.stop(); } catch { settle(); }
      setTimeout(settle, 1500); // Safari occasionally withholds onstop
    });

    this.release();
    const transcript = this.transcript;
    const asr = { status: this.asrStatus(), error: this.fatal || this.errors[this.errors.length - 1] || null };
    const diag = {
      at: Date.now(),
      mode: this.mode,
      seconds: Math.round(seconds * 10) / 10,
      blobBytes: blob ? blob.size : 0,
      transcript,
      asr,
      restarts: this.restarts,
      errors: this.errors.slice(0, 20),
      heardSpeech: this.heardSpeech,
      events: this.events.slice(0, 60),
    };
    this._ev('done', { status: asr.status });
    try { captureListener?.(diag); } catch { /* diagnostics must never break a drill */ }
    return {
      blob,
      url: blob ? URL.createObjectURL(blob) : null,
      seconds,
      transcript,
      confidence: this.confidence,
      asr,
      diag,
    };
  }

  /** Always release the mic - iOS keeps the recording indicator on otherwise. */
  release() {
    // Must precede stopping recognition, or onend restarts it. Recognition
    // opens its own capture independent of `this.stream`, so stopping the
    // recorder's tracks alone never stops it.
    this.stopping = true;
    try { this.recognition?.stop(); } catch { /* already gone */ }
    try { if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop(); } catch { /* already gone */ }
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
 * One-shot probe used by the Sound Check. Records for `ms` while he reads a
 * sentence aloud, and reports what actually worked on this device - the only
 * trustworthy signal. Returns the reason recognition failed, not just that it
 * did.
 */
export async function probeMic(ms = 5000, { mode } = {}) {
  const cap = new Capture({ wantTranscript: true, mode });
  await cap.start();
  await new Promise((r) => setTimeout(r, ms));
  const result = await cap.stop();
  return {
    recorded: cap.mode === 'asr-only' ? null : (!!result.blob && result.blob.size > 0),
    transcript: result.transcript,
    asrWorked: typeof result.transcript === 'string' && result.transcript.trim().length > 0,
    asr: result.asr,
    url: result.url,
    diag: result.diag,
  };
}
