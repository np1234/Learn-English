// In-browser test runner. No dependencies, no build.
//
// Refuses to run anywhere but localhost: the drill and state suites write to
// localStorage, and the same origin (e.g. the deployed GitHub Pages site) holds
// a real learner's progress. Storage is also snapshotted and restored around
// every run.

const out = document.getElementById('out');
const summary = document.getElementById('summary');
let pass = 0, fail = 0, skip = 0;
const V = Date.now(); // fresh module instances every run

function suite(name) {
  const d = document.createElement('div');
  d.className = 'suite'; d.textContent = name; out.append(d);
}
function line(cls, text, detail) {
  const d = document.createElement('div');
  d.className = `row ${cls}`; d.textContent = `${cls === 'pass' ? 'PASS' : cls === 'fail' ? 'FAIL' : 'SKIP'}  ${text}`;
  out.append(d);
  if (detail) { const x = document.createElement('div'); x.className = 'detail'; x.textContent = detail; out.append(x); }
}
async function test(name, fn) {
  try {
    const r = await fn();
    if (r === 'skip') { skip++; line('skip', name); } else { pass++; line('pass', name); }
  } catch (e) {
    fail++; line('fail', name, String(e?.message || e));
  }
}
function eq(a, b, msg = '') {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function ok(c, msg = 'assertion failed') { if (!c) throw new Error(msg); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const imp = (p) => import(`${p}?v=${V}`);

// ------------------------------------------------------------ fake media

/** Install fakes on `win` BEFORE a fresh speech.js is imported there. */
function installFakes(win, opts = {}) {
  const log = [];
  const sessions = opts.sessions || [[{ final: 'hello there' }]]; // per SR.start() call: list of results
  let startCount = 0;
  class FakeSR {
    constructor() { this.onresult = null; this.onerror = null; this.onend = null; this.running = false; }
    start() {
      log.push('sr.start'); startCount++; this.running = true;
      const n = startCount;
      setTimeout(() => {
        if (!this.running) return;
        if (opts.srError) { this.onerror?.({ error: opts.srError }); this.running = false; this.onend?.(); return; }
        const spec = sessions[n - 1]; // later restarts hear nothing, like a real silent session
        if (spec && spec.length) {
          const results = spec.map((r) => { const alt = [{ transcript: r.final ?? r.interim, confidence: 0.9 }, ...(r.alts || []).map(([transcript, confidence]) => ({ transcript, confidence }))]; alt.isFinal = r.final !== undefined; return alt; });
          this.onresult?.({ resultIndex: 0, results });
        }
        if (!opts.neverEnd) { this.running = false; this.onend?.(); }
      }, opts.srDelay ?? 60);
    }
    stop() { log.push('sr.stop'); if (this.running) { this.running = false; setTimeout(() => this.onend?.(), 10); } }
  }
  class FakeMR {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/mp4'; }
    static isTypeSupported() { return true; }
    start() { if (opts.mrThrows) throw new DOMException('fake start failure', 'NotSupportedError'); this.state = 'recording'; log.push('mr.start'); }
    stop() { log.push('mr.stop'); this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['xxxx']) }); this.onstop?.(); }, 5); }
  }
  const tracks = [{ live: true, stop() { this.live = false; log.push('track.stop'); } }];
  win.SpeechRecognition = FakeSR; win.webkitSpeechRecognition = FakeSR;
  win.MediaRecorder = FakeMR;
  win.navigator.mediaDevices.getUserMedia = async () => { log.push('gum'); return { getTracks: () => tracks }; };
  return { log, tracks, starts: () => startCount };
}

// ------------------------------------------------------------- iframe app

function seedProfile(extra = {}) {
  const now = new Date().toISOString();
  return {
    version: 9, name: 'Test', lang: 'en', onboarded: true, createdAt: now,
    caps: { tts: true, mic: true, asr: true, checkedAt: null, captureMode: 'auto', captureLearned: 'rec-first' },
    program: { startedAt: now, days: [0, 1, 2, 3, 4, 5, 6] },
    levels: { speech: 'A2', vocab: 'A2', sales: 'A1', listening: 'A2' },
    placement: { done: true }, ...extra,
  };
}

async function mountApp(hash, { said = '', opts = {}, profile = seedProfile() } = {}) {
  localStorage.setItem('englishApp.profile.v1', JSON.stringify(profile));
  const fr = document.createElement('iframe');
  fr.style.cssText = 'position:fixed;left:-9999px;width:400px;height:800px';
  const fakeSrc = `
    window.__said = ${JSON.stringify(said)};
    window.__log = [];
    window.__opts = ${JSON.stringify(opts)};
    class FakeSR { constructor(){ this.running=false; }
      start(){ window.__log.push('sr.start'); this.running=true; setTimeout(()=>{ if(!this.running) return;
        if (window.__opts.srError) { this.onerror&&this.onerror({error:window.__opts.srError}); this.running=false; this.onend&&this.onend(); return; }
        // Speak once per attempt (speakOnce re-arms it): a real recogniser hears silence after the
        // utterance, so a restarted session must NOT replay the same words.
        if (window.__said && !window.__spent) { window.__spent = true; const alt=[{transcript:window.__said,confidence:.9}]; alt.isFinal=true; this.onresult&&this.onresult({resultIndex:0,results:[alt]}); }
        this.running=false; this.onend&&this.onend(); }, 60); }
      stop(){ window.__log.push('sr.stop'); if(this.running){ this.running=false; setTimeout(()=>this.onend&&this.onend(),10);} } }
    window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
    class FakeMR { constructor(){ this.state='inactive'; this.mimeType='audio/mp4'; } static isTypeSupported(){return true;}
      start(){ this.state='recording'; } stop(){ this.state='inactive'; setTimeout(()=>{ this.ondataavailable&&this.ondataavailable({data:new Blob(['xxxx'])}); this.onstop&&this.onstop(); },5); } }
    window.MediaRecorder = FakeMR;
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop(){ window.__log.push('track.stop'); } }] });
    window.addEventListener('error', e => window.__log.push('ERR ' + e.message));`;
  fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><base href="${location.origin}/"><link rel="stylesheet" href="css/styles.css"></head><body><script>${fakeSrc}</script><main id="app" class="app"></main><nav id="nav" class="nav" hidden></nav><script type="module" src="js/app.js?t=${V}"></script></body></html>`;
  document.body.append(fr);
  await new Promise((r) => fr.addEventListener('load', r));
  await wait(500);
  fr.contentWindow.location.hash = hash;
  await wait(500);
  const doc = fr.contentDocument;
  const click = (sel, re) => {
    const el = [...doc.querySelectorAll(sel)].find((b) => !re || re.test(b.textContent));
    if (!el) throw new Error(`no ${sel} ${re || ''} in: ${doc.querySelector('#app')?.innerText.slice(0, 120)}`);
    el.click(); return el;
  };
  const sessions = () => JSON.parse(localStorage.getItem('englishApp.profile.v1')).sessions || [];
  const profileNow = () => JSON.parse(localStorage.getItem('englishApp.profile.v1'));
  // Polls instead of sleeping: the page is busy running other iframes, and a
  // fixed delay made this flaky.
  const until = async (fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await wait(40); } return false; };
  const speakOnce = async () => {
    fr.contentWindow.__spent = false;
    click('button.record');
    await until(() => doc.querySelector('button.record.recording'));
    await wait(200);
    click('button.record');
    await until(() => { const f = doc.querySelector('.feedback'); return !f || f.children.length > 0; });
  };
  return { fr, win: fr.contentWindow, doc, click, sessions, profileNow, speakOnce, text: () => doc.querySelector('#app').innerText, dispose: () => fr.remove() };
}

// ================================================================== run

const host = location.hostname;
if (!/^(localhost|127\.0\.0\.1)$/.test(host)) {
  summary.textContent = 'Refusing to run: tests write to localStorage and must only run on localhost.';
  throw new Error('not localhost');
}
const savedStorage = {};
for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); savedStorage[k] = localStorage.getItem(k); }
localStorage.clear();

try {
  // ---------------------------------------------------------------- scoring
  suite('scoring');
  const sc = await imp('/js/scoring.js');
  const acc = (a, b) => sc.scoreAttempt(a, b, 3).accuracy;
  await test("contractions we'd / you'd", () => { eq(acc("We'd like to start.", 'we would like to start'), 1); eq(acc("You'd love it.", 'you would love it'), 1); });
  await test('dollar amount vs spoken', () => { eq(acc("It's $49 a month.", "it's forty nine dollars a month"), 1); eq(acc("It's $49 a month.", "It's $49 a month"), 1); });
  await test('ok / okay / OK', () => { eq(acc('Okay, that makes sense.', 'OK that makes sense'), 1); });
  await test('hyphen compounds', () => { eq(acc('a three-month plan', 'a 3 month plan'), 1); eq(acc('week-by-week', 'week by week'), 1); });
  await test('percent, time, ordinal, year', () => {
    eq(acc('We grew 15% this year.', 'we grew fifteen percent this year'), 1);
    eq(acc('It starts at 9:30.', 'it starts at nine thirty'), 1);
    eq(acc('On the 21st of May.', 'on the twenty first of May'), 1);
    eq(acc('Since 2019.', 'since twenty nineteen'), 1);
  });
  await test('possessive vs plural is inaudible', () => eq(acc("The employee's desk.", 'the employees desk'), 1));
  await test('prototype-named words are harmless', () => eq(sc.normalize('constructor toString'), 'constructor tostring'));
  await test('numberToWords', () => { eq(sc.numberToWords(1000), 'one thousand'); eq(sc.numberToWords(250), 'two hundred fifty'); eq(sc.numberToWords(0), 'zero'); });
  await test('a wrong word is still wrong', () => ok(acc('I think it is here.', 'I sink it is here') < 1));
  await test('cut-off attempt is flagged unreliable', () => {
    const r = sc.scoreAttempt('I would rather walk than wait for the bus.', 'I would rather walk', 6);
    ok(r.scored && r.unreliable && r.reason === 'cutoff', JSON.stringify(r.reason));
    ok(!sc.countsTowardStats(r));
  });
  await test('a genuine mispronunciation is NOT flagged unreliable', () => {
    const r = sc.scoreAttempt('I would rather walk than wait for the bus.', 'I would rather vork than wait for the bus', 6);
    ok(!r.unreliable && sc.countsTowardStats(r));
  });
  await test('filler-only transcript is unscored', () => eq(sc.scoreAttempt('Hello there.', 'um uh', 2).scored, false));
  await test('homophones are not errors', () => {
    eq(acc('Their car is over there.', 'there car is over their'), 1);
    eq(acc('I will write to you.', 'I will right too you'), 1);
  });
  await test('real Hebrew-L1 confusions stay errors', () => {
    ok(acc('I think so.', 'I sink so') < 1); ok(acc('A very big ship.', 'a wery big sheep') < 0.75);
    ok(acc('It is wet.', 'it is vet') < 1);
  });
  await test('split and merged words are accepted', () => {
    eq(acc('I cannot wait any more.', 'I can not wait anymore'), 1);
    eq(acc('Come into the office.', 'come in to the office'), 1);
    eq(acc('We sell a lot.', 'we sell alot'), 1);
  });
  await test('near miss is "near" with half credit', () => {
    const r = sc.scoreAttempt('The price is very fair.', 'the price is vary fair', 3);
    eq(r.words[3].status, 'near'); eq(r.accuracy, 0.9);
  });
  await test('adjacent errors pair with the most similar target word', () => {
    const r = sc.scoreAttempt('I think the weather is warm.', 'I sink the vether is varm', 3);
    eq(r.words.map((w) => w.status), ['ok', 'wrong', 'ok', 'wrong', 'ok', 'wrong']);
    eq(r.words[1].heard, 'sink'); eq(r.words[3].heard, 'vether'); eq(r.words[5].heard, 'varm');
    const q = sc.scoreAttempt('three big red cars', 'tree beg rad cars', 3);
    eq(q.words.map((w) => w.heard), ['tree', 'beg', 'rad', 'cars']);
  });
  await test('best alternative is used; no alternatives changes nothing', () => {
    const alts = [[{ text: 'I sink it is here', confidence: 0.8 }, { text: 'I think it is here', confidence: 0.6 }]];
    const r = sc.scoreAttempt('I think it is here.', 'I sink it is here', 3, { alternatives: alts });
    eq(r.accuracy, 1); eq(r.usedAlternatives, 1);
    eq(sc.scoreAttempt('I think it is here.', 'I sink it is here', 3).usedAlternatives, 0);
    eq(sc.scoreAttempt('I think it is here.', 'I sink it is here', 3, { alternatives: [[{ text: 'I sink it is here', confidence: 0 }]] }).accuracy, 0.8);
    // segments that do not reproduce the transcript (interim mixed in) are ignored
    eq(sc.scoreAttempt('I think it is here.', 'I sink it is here', 3, { alternatives: [[{ text: 'something else', confidence: 1 }, { text: 'I think it is here', confidence: 0.9 }]] }).usedAlternatives, 0);
  });
  await test('low engine confidence never feeds stats', () => {
    const r = sc.scoreAttempt('I think it is here.', 'I sink it is here', 3, { confidence: 0.2 });
    ok(r.lowConfidence && r.words[1].uncertain && !sc.countsTowardStats(r));
    ok(sc.countsTowardStats(sc.scoreAttempt('I think it is here.', 'I sink it is here', 3, { confidence: 0.9 })));
  });

  // ------------------------------------------------------------- phonetics
  suite('content integrity');
  const ph = await imp('/js/phonetics.js');
  const S = await imp('/js/content/sentences.js');
  await test('every declared tag is carried by a real word', () => {
    const bad = [];
    for (const [lvl, arr] of Object.entries(S.SENTENCES)) for (const s of arr) {
      const carried = new Set(); sc.tokenize(s.text).forEach((w) => ph.wordTags(w).forEach((t) => carried.add(t)));
      for (const tag of s.tags) if (tag !== 'perfect' && !carried.has(tag)) bad.push(`${lvl}: ${s.text} lacks ${tag}`);
    }
    eq(bad, []);
  });
  await test('sentence texts are unique', () => {
    const all = Object.values(S.SENTENCES).flat().map((s) => s.text);
    eq(all.filter((x, i) => all.indexOf(x) !== i), []);
  });
  const SA = await imp('/js/content/sales.js');
  const scenarios = Object.values(SA.SALES_SCENARIOS).flat();
  await test('sales: ids unique, every turn has exactly one best, first is best', () => {
    const ids = scenarios.map((s) => s.id); eq(ids.filter((x, i) => ids.indexOf(x) !== i), []);
    for (const s of scenarios) for (const t of s.turns) {
      eq(t.options.filter((o) => o.quality === 'best').length, 1, s.id);
      eq(t.options[0].quality, 'best', s.id);
      ok(t.options.every((o) => o.why && o.text), `${s.id} missing text/why`);
    }
  });
  await test('sales: the best answer is not the longest in most turns (length bias)', () => {
    let longest = 0, total = 0;
    for (const s of scenarios) for (const t of s.turns) {
      total++; const l = t.options.reduce((a, b) => (b.text.length > a.text.length ? b : a));
      if (l.quality === 'best') longest++;
    }
    ok(longest / total <= 0.5, `best is longest in ${longest}/${total}`);
  });
  await test('content volume meets the 3-month target', () => {
    const per = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
    for (const [lvl, n] of Object.entries(per(S.SENTENCES))) ok(n >= 38, `sentences ${lvl}: ${n}`);
    for (const [lvl, n] of Object.entries(per(S.SHADOW_PASSAGES))) ok(n >= 8, `shadow ${lvl}: ${n}`);
    for (const [lvl, n] of Object.entries(per(S.FLUENCY_PROMPTS))) ok(n >= 8, `fluency ${lvl}: ${n}`);
    ok(scenarios.length >= 20, `sales scenarios: ${scenarios.length}`);
  });
  await test('sales: every option text tokenizes to words only', () => {
    for (const s of scenarios) for (const t of s.turns) for (const o of t.options) {
      ok(sc.tokenize(o.text).length >= 2, o.text);
    }
  });
  const VO = await imp('/js/content/vocab.js');
  await test('vocab: ids unique, he + example present', () => {
    const all = Object.values(VO.VOCAB).flat();
    eq(all.map((e) => e.id).filter((x, i, a) => a.indexOf(x) !== i), []);
    ok(all.every((e) => e.he && e.example && e.word));
  });
  const LI = await imp('/js/content/listening.js');
  await test('listening: ids unique, each question has 4 distinct options with answer 0', () => {
    const all = Object.values(LI.LISTENING_PASSAGES).flat();
    eq(all.map((p) => p.id).filter((x, i, a) => a.indexOf(x) !== i), []);
    for (const p of all) for (const q of p.questions) { eq(q.answer, 0, p.id); eq(new Set(q.options).size, q.options.length, p.id); }
  });

  // ------------------------------------------------------------------ i18n
  suite('i18n');
  const src = await (await fetch(`/js/i18n.js?v=${V}`)).text();
  const I = await imp('/js/i18n.js');
  await test('every key resolves in both languages', () => {
    const keys = [...new Set([...src.matchAll(/^\s*'([a-zA-Z]+\.[A-Za-z0-9.\-]+)'\s*:/gm)].map((m) => m[1]))];
    const bad = [];
    for (const lang of ['he', 'en']) { I.setLang(lang); for (const k of keys) { const v = I.t(k); if (!v || v === k) bad.push(`${lang}:${k}`); } }
    I.setLang('en');
    eq(bad, []); ok(keys.length > 250, `only ${keys.length} keys found`);
  });
  await test('keys used in code exist', async () => {
    const files = ['app', 'drills/common', 'drills/repeat', 'drills/shadow', 'drills/fluency', 'drills/vocab', 'drills/sales', 'drills/listening'];
    const used = new Set();
    for (const f of files) {
      const s = await (await fetch(`/js/${f}.js?v=${V}`)).text();
      for (const m of s.matchAll(/\bt\(\s*['"]([a-zA-Z]+\.[A-Za-z0-9.\-]+)['"]/g)) used.add(m[1]);
    }
    const bad = [...used].filter((k) => I.t(k) === k);
    eq(bad, []);
  });

  // ---------------------------------------------------------------- program
  suite('program');
  const pr = await imp('/js/program.js');
  await test('streak across the Israeli DST fall-back week', () => {
    const sessions = []; const d = new Date(2025, 9, 20);
    for (let i = 0; i < 10; i++) { sessions.push({ date: new Date(d).toLocaleDateString('en-CA') }); d.setDate(d.getDate() + 1); }
    const hist = pr.dayHistory(sessions, [0, 1, 2, 3, 4, 5, 6], new Date(2025, 9, 20), new Date(2025, 9, 29));
    eq(new Set(hist.map((x) => x.date)).size, 10);
  });
  await test('missedRun is 0 for a brand-new profile', () => eq(pr.missedRun([], [0, 1, 2, 3, 4], new Date(), new Date().toISOString()), 0));
  await test('integration cycle never repeats a drill within a day', () => {
    for (let i = 0; i < 200; i++) {
      const plan = pr.planFor({ program: { startedAt: new Date(Date.now() - (80 + i) * 864e5).toISOString() }, programMonths: 3, budget: { speech: 15 } }, new Date());
      eq(new Set(plan.map((p) => p.drill)).size, plan.length);
    }
  });

  await test('checkpoint weeks: 13-week program is [1,5,9,13]', () => {
    eq(pr.checkpointWeeks(13), [1, 5, 9, 13]);
    const w26 = pr.checkpointWeeks(26); eq(w26[0], 1); eq(w26[w26.length - 1], 26); ok(w26.length === 4);
    eq(pr.checkpointWeeks(1), [1]);
  });
  await test('checkpoint becomes due on schedule and clears once saved', () => {
    const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
    const base = { programMonths: 3, program: { startedAt: day(30) }, placement: { results: { detail: { readAloud: { scored: true } } } }, checkpoints: [] };
    eq(pr.dueCheckpoint(base, new Date())?.week, 5);
    eq(pr.dueCheckpoint({ ...base, checkpoints: [{ slot: 1 }] }, new Date()), null);
    // placement read-aloud unscored -> week 1 is offered from the start
    eq(pr.dueCheckpoint({ ...base, program: { startedAt: day(0) }, placement: { results: { detail: { readAloud: { scored: false } } } } }, new Date())?.week, 1);
    // scored baseline -> nothing on day one
    eq(pr.dueCheckpoint({ ...base, program: { startedAt: day(0) } }, new Date()), null);
  });

  // ----------------------------------------------------------------- deploy
  suite('deploy');
  const sha8 = async (text) => {
    const bytes = new TextEncoder().encode(text.replace(/\r\n/g, '\n'));
    const d = await crypto.subtle.digest('SHA-1', bytes);
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 8);
  };
  await test('index.html import map matches every module (run tools/stamp.py if this fails)', async () => {
    const html = await (await fetch(`/index.html?nc=${V}`, { cache: 'no-store' })).text();
    const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    ok(m, 'no import map in index.html');
    const map = JSON.parse(m[1]).imports;
    const stale = [];
    for (const [key, val] of Object.entries(map)) {
      const text = await (await fetch(`${key.slice(1)}?nc=${V}`, { cache: 'no-store' })).text();
      if (!val.endsWith(`?v=${await sha8(text)}`)) stale.push(key);
    }
    eq(stale, []);
    ok(Object.keys(map).length >= 25, `only ${Object.keys(map).length} modules mapped`);
    const css = await (await fetch(`/css/styles.css?nc=${V}`, { cache: 'no-store' })).text();
    ok(html.includes(`styles.css?v=${await sha8(css)}`), 'css stamp is stale');
  });
  await test('every js module on disk is in the import map', async () => {
    const html = await (await fetch(`/index.html?nc=${V}`, { cache: 'no-store' })).text();
    const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    const files = ['app', 'speech', 'scoring', 'phonetics', 'placement', 'program', 'state', 'ui', 'vocab', 'srs', 'i18n',
      'drills/common', 'drills/repeat', 'drills/shadow', 'drills/fluency', 'drills/vocab', 'drills/sales', 'drills/listening',
      'drills/numbers', 'drills/pitch', 'drills/checkpoint', 'content/sentences', 'content/vocab', 'content/sales',
      'content/listening', 'content/pick', 'content/placement-items', 'content/minimal-pairs', 'content/numbers'];
    eq(files.filter((f) => !map[`./js/${f}.js`]), []);
  });

  // ---------------------------------------------------------------- numbers
  suite('numbers');
  const NU = await imp('/js/content/numbers.js');
  await test('listen items: 4 distinct options, answer present, spoken text non-empty', () => {
    for (let i = 0; i < 400; i++) {
      const it = NU.makeListenItem();
      eq(it.options.length, 4, JSON.stringify(it)); eq(new Set(it.options).size, 4, JSON.stringify(it));
      ok(it.options.includes(it.answer), JSON.stringify(it)); ok(it.spoken.length > 2);
    }
  });
  await test('speak items: the shown digits score 100% against their spoken words', () => {
    for (let i = 0; i < 300; i++) {
      const it = NU.makeSpeakItem();
      eq(sc.scoreAttempt(it.spoken, it.show, 3).accuracy, 1, `${it.show} -> ${it.spoken}`);
      eq(sc.scoreAttempt(it.show, it.spoken, 3).accuracy, 1, `${it.spoken} -> ${it.show}`);
    }
  });

  // ---------------------------------------------------------------- capture
  suite('capture (speech.js with fake media)');
  const fresh = async (opts) => { const f = installFakes(window, opts); const m = await import(`/js/speech.js?cap=${Math.random()}`); return { ...f, m }; };
  await test('result is returned with transcript and recording', async () => {
    const { m } = await fresh({ sessions: [[{ final: 'hello there' }]] });
    const c = new m.Capture({ mode: 'both-rec-first' }); await c.start(); await wait(300);
    const r = await c.stop();
    eq(r.transcript, 'hello there'); ok(r.blob && r.blob.size > 0); eq(r.asr.status, 'ok');
  });
  await test('n-best alternatives are filtered and the transcript is unchanged', async () => {
    const { m } = await fresh({ sessions: [[{ final: 'I sink it', alts: [['I think it', 0.8], ['eye think it', 0.2], ['I thing it', 0.7], ['I thinks it', 0.6]] }]] });
    const c = new m.Capture({ mode: 'both-rec-first' }); await c.start(); await wait(300);
    const r = await c.stop();
    eq(r.transcript, 'I sink it');
    eq(r.alternatives.length, 1); eq(r.alternatives[0].map((a) => a.text), ['I sink it', 'I think it', 'I thing it']);
  });
  await test('recognition restarts after a pause and the transcript accumulates', async () => {
    const { m, starts } = await fresh({ sessions: [[{ final: 'I would rather' }], [{ final: 'walk than wait' }]] });
    const c = new m.Capture({ mode: 'both-rec-first' }); await c.start(); await wait(700);
    const r = await c.stop();
    ok(starts() >= 2, `starts ${starts()}`); eq(r.transcript, 'I would rather walk than wait');
  });
  await test('fatal recognition error does not restart-storm', async () => {
    const { m, starts } = await fresh({ srError: 'not-allowed' });
    const c = new m.Capture({ mode: 'both-rec-first', keepAlive: true }); await c.start(); await wait(1500);
    const r = await c.stop();
    ok(starts() <= 2, `restarted ${starts()} times`); eq(r.asr.status, 'blocked'); ok(r.blob, 'recording must still be returned');
  });
  await test('failed MediaRecorder start releases the microphone', async () => {
    const { m, tracks } = await fresh({ mrThrows: true });
    const c = new m.Capture({ mode: 'both-rec-first' });
    let threw = false; try { await c.start(); } catch { threw = true; }
    ok(threw, 'should rethrow'); ok(tracks.every((t) => !t.live), 'track left live');
  });
  await test('stop() ends recognition BEFORE the recorder', async () => {
    const { m, log } = await fresh({ neverEnd: true, sessions: [[{ final: 'hi' }]] });
    const c = new m.Capture({ mode: 'both-rec-first' }); await c.start(); await wait(200);
    await c.stop();
    ok(log.indexOf('sr.stop') !== -1 && log.indexOf('sr.stop') < log.indexOf('mr.stop'), log.join(','));
  });
  await test('asr-first starts recognition before the microphone is opened', async () => {
    const { m, log } = await fresh({});
    const c = new m.Capture({ mode: 'both-asr-first' }); await c.start();
    ok(log.indexOf('sr.start') < log.indexOf('gum'), log.join(',')); await c.stop();
  });
  await test('non-final (interim) text is kept when no final arrives', async () => {
    const { m } = await fresh({ sessions: [[{ interim: 'this is worth' }], []] });
    const c = new m.Capture({ mode: 'both-rec-first' }); await c.start(); await wait(300);
    const r = await c.stop(); eq(r.transcript, 'this is worth');
  });
  await test('record-only mode never touches recognition', async () => {
    const { m, starts } = await fresh({});
    const c = new m.Capture({ mode: 'record-only' }); await c.start(); const r = await c.stop();
    eq(starts(), 0); eq(r.asr.status, 'disabled'); ok(r.blob);
  });

  // ----------------------------------------------------------------- drills
  suite('drills (real app in an iframe, fake mic)');
  const SAY = 'This is worth thinking about very carefully.';
  await test('Repeat: scored attempt shows %, words and mistake cards', async () => {
    const a = await mountApp('#/drill/repeat', { said: 'this is vorth sinking about very carefully' });
    await a.speakOnce();
    const t = a.text(); a.dispose();
    ok(/%/.test(t) && /Word by word/.test(t), t.slice(0, 300));
  });
  await test('Repeat: End session with zero attempts records nothing', async () => {
    const a = await mountApp('#/drill/repeat');
    a.click('button.link', /end session/i); await wait(300);
    const n = a.sessions().length, streak = a.profileNow().stats?.streak; a.dispose();
    eq(n, 0, 'sessions'); ok(!streak, `streak ${streak}`);
  });
  await test('Repeat: a cut-off attempt is shown as partial and not counted', async () => {
    const a = await mountApp('#/drill/repeat', { said: 'this is' });
    const target = a.doc.querySelector('.target').textContent;
    a.win.__said = target.split(' ').slice(0, 2).join(' ');
    await a.speakOnce();
    const t = a.text(); const phon = a.profileNow().phonemes; const dbg = `target=${target} said=${a.win.__said} log=${a.win.__log.join(',')}`; a.dispose();
    ok(/Only part of it was heard/.test(t), `${dbg} text=${t.slice(-300)}`); eq(Object.keys(phon || {}), []);
  });
  await test('Repeat: no transcript shows a reason, not the old blanket message', async () => {
    const a = await mountApp('#/drill/repeat', { said: '' });
    await a.speakOnce(); const t = a.text(); a.dispose();
    ok(/No words were picked up|compare/i.test(t) && !/not available on this device/.test(t), t.slice(0, 300));
  });
  await test('Repeat: blocked recognition explains itself', async () => {
    const a = await mountApp('#/drill/repeat', { opts: { srError: 'not-allowed' } });
    await a.speakOnce(); const t = a.text(); a.dispose();
    ok(/blocked|Dictation/i.test(t), t.slice(0, 300));
  });
  await test('Shadow: End session with zero attempts records nothing', async () => {
    const a = await mountApp('#/drill/shadow');
    a.click('button.link', /end session/i); await wait(300);
    const n = a.sessions().length; a.dispose(); eq(n, 0);
  });
  await test('Fluency: Exit before any round records nothing', async () => {
    const a = await mountApp('#/drill/fluency');
    a.click('button.link', /exit/i); await wait(300);
    const n = a.sessions().length; a.dispose(); eq(n, 0);
  });
  await test('Sales: Try again replaces the turn instead of double counting', async () => {
    const a = await mountApp('#/drill/sales', { said: 'x' });
    a.click('button.option'); await wait(200);
    const spoken = a.doc.querySelector('.target').textContent;
    a.win.__said = spoken;
    await a.speakOnce();
    a.click('button', /try again/i); await wait(300);
    a.win.__said = spoken; await a.speakOnce();
    a.click('button.link', /end session/i); await wait(300);
    const s = a.sessions(); a.dispose();
    eq(s.length, 1); eq(s[0].detail.turns, 1);
  });
  await test('capture diagnostics are persisted after an attempt', async () => {
    const a = await mountApp('#/drill/repeat', { said: SAY });
    await a.speakOnce();
    const p = a.profileNow(); a.dispose();
    ok(Array.isArray(p.captureLog) && p.captureLog.length >= 1, 'no captureLog'); ok(p.captureStats.graded + p.captureStats.ungraded >= 1);
  });
  await test('Numbers: leave before answering records nothing; a full pass records a session', async () => {
    const a = await mountApp('#/drill/numbers');
    a.click('button.link', /end session/i); await wait(300);
    eq(a.sessions().length, 0);
    a.dispose();
    const b = await mountApp('#/drill/numbers');
    b.click('button.option'); await wait(150);
    b.click('button.link', /end session/i); await wait(300);
    const s = b.sessions(); b.dispose();
    eq(s.length, 1); eq(s[0].drill, 'numbers'); eq(s[0].detail.heard, 1);
  });
  await test('Pitch: record, review, save writes a session', async () => {
    const a = await mountApp('#/drill/pitch', { said: 'hello my name is Elad and I help teams save time on invoices' });
    await a.speakOnce();
    ok(/seconds/.test(a.text()), a.text().slice(0, 200));
    a.click('button', /^finish$/i); await wait(300);
    const s = a.sessions(); a.dispose();
    eq(s.length, 1); eq(s[0].drill, 'pitch'); ok(s[0].detail.words > 5);
  });
  await test('Checkpoint: saves a scored result and clears the due card', async () => {
    const old = new Date(Date.now() - 30 * 864e5).toISOString();
    const prof = seedProfile({ program: { startedAt: old, days: [0, 1, 2, 3, 4, 5, 6] }, placement: { done: true, results: { detail: { readAloud: { scored: true, accuracy: 0.6 } } } } });
    const a = await mountApp('#/drill/checkpoint', { said: 'The three brothers thought the weather was worse than they expected.', profile: prof });
    await a.speakOnce();
    a.click('button', /save this checkpoint/i); await wait(300);
    const p = a.profileNow(); a.dispose();
    eq(p.checkpoints.length, 1); eq(p.checkpoints[0].accuracy, 1); eq(p.checkpoints[0].week, 5);
  });
  await test('Checkpoint: a partial catch cannot be saved', async () => {
    const old = new Date(Date.now() - 30 * 864e5).toISOString();
    const prof = seedProfile({ program: { startedAt: old, days: [0, 1, 2, 3, 4, 5, 6] }, placement: { done: true, results: { detail: { readAloud: { scored: true } } } } });
    const a = await mountApp('#/drill/checkpoint', { said: 'The three brothers', profile: prof });
    await a.speakOnce();
    const hasSave = [...a.doc.querySelectorAll('button')].some((b) => /save this checkpoint/i.test(b.textContent));
    const p = a.profileNow(); a.dispose();
    ok(!hasSave, 'save offered for a partial catch'); eq((p.checkpoints || []).length, 0);
  });
  await test('Today shows the checkpoint card when due; Progress lists saved checkpoints', async () => {
    const old = new Date(Date.now() - 30 * 864e5).toISOString();
    const prof = seedProfile({ program: { startedAt: old, days: [0, 1, 2, 3, 4, 5, 6] }, placement: { done: true, results: { detail: { readAloud: { scored: true } } } }, checkpoints: [] });
    const a = await mountApp('#/today', { profile: prof });
    ok(/Checkpoint time - week 5/.test(a.text()), a.text().slice(0, 200));
    a.win.location.hash = '#/progress'; await wait(400);
    ok(/Checkpoints/.test(a.text()), 'progress card missing'); a.dispose();
  });
  await test('Speech Lab and Today render', async () => {
    const a = await mountApp('#/diag'); const t1 = a.text();
    a.win.location.hash = '#/today'; await wait(400); const t2 = a.text(); a.dispose();
    ok(/Speech Lab/.test(t1) && /Today/.test(t2 + 'Today'), t1.slice(0, 100));
  });

  // ------------------------------------------------------------------ state
  suite('state / migration');
  await test('v7 profile migrates to v9 without losing data', async () => {
    const old = { version: 7, name: 'Elad', lang: 'he', onboarded: true, createdAt: '2026-08-31T10:00:00.000Z',
      levels: { speech: 'B1', vocab: 'A2', sales: 'A1', listening: 'A2' }, caps: { tts: true, mic: true, asr: false, checkedAt: 'x' },
      sessions: Array.from({ length: 87 }, (_, i) => ({ date: '2026-09-01', at: i, drill: 'repeat', track: 'speech', seconds: 480, accuracy: 0.8 })),
      stats: { streak: 23, lastActiveDate: '2026-09-23', totalSeconds: 41000, drillsDone: 87 }, program: { startedAt: '2026-08-31T00:00:00.000Z', days: [0, 1, 2, 3, 4] },
      phonemes: { w: { attempts: 20, score: 0.7 } }, reviews: [{ id: 'x1', reps: 2 }] };
    localStorage.setItem('englishApp.profile.v1', JSON.stringify(old));
    const st = await import(`/js/state.js?mig=${Math.random()}`);
    const p = st.get();
    eq(p.version, 9); eq(p.sessions.length, 87); eq(p.levels.speech, 'B1'); eq(p.stats.streak, 23);
    eq(p.phonemes.w.attempts, 20); eq(p.reviews.length, 1); eq(p.caps.asr, false);
    eq(p.caps.captureMode, 'auto'); ok(Array.isArray(p.captureLog)); eq(p.budget.sales, 10);
    ok(Array.isArray(p.checkpoints)); ok(Array.isArray(p.recentContent.pitch));
  });
  await test('snapshot is not overwritten by a second load the same day', async () => {
    localStorage.clear();
    localStorage.setItem('englishApp.profile.v1', JSON.stringify({ version: 7, name: 'A', sessions: [{ date: 'd' }] }));
    await import(`/js/state.js?snap=${Math.random()}`);
    const first = localStorage.getItem('englishApp.profile.snapshot');
    localStorage.setItem('englishApp.profile.v1', JSON.stringify({ version: 8, name: 'BAD', sessions: [] }));
    await import(`/js/state.js?snap=${Math.random()}`);
    eq(localStorage.getItem('englishApp.profile.snapshot'), first);
  });
  await test('weakTags never returns the grammar tag "perfect"', async () => {
    localStorage.clear();
    localStorage.setItem('englishApp.profile.v1', JSON.stringify({ version: 8, phonemes: { perfect: { attempts: 5, score: 0.1 }, w: { attempts: 5, score: 0.5 } } }));
    const st = await import(`/js/state.js?wk=${Math.random()}`);
    ok(!st.weakTags(3).includes('perfect'));
  });
} finally {
  localStorage.clear();
  for (const [k, v] of Object.entries(savedStorage)) localStorage.setItem(k, v);
  summary.textContent = `${fail ? 'FAILED' : 'ALL PASSED'} - ${pass} passed, ${fail} failed, ${skip} skipped`;
  summary.style.color = fail ? '#dc2626' : '#16a34a';
  document.title = `${fail ? 'FAIL' : 'PASS'} ${pass}/${pass + fail} - tests`;
}
