// App shell: onboarding, sound check, placement, home, progress, and routing.

import { h, clear, toast, ltr } from './ui.js';
import {
  detect, speak, probeMic, cancelSpeech, isIOS, Capture, primeVoices,
  setCaptureConfig, onCaptureFinished, effectiveMode, CAPTURE_MODES,
} from './speech.js';
import { scoreAttempt, countsTowardStats } from './scoring.js';
import { PlacementTest } from './placement.js';
import { LEVELS } from './content/sentences.js';
import { t, setLang, getLang, levelName, phoneme, applyDir, weekdayShort } from './i18n.js';
import * as store from './state.js';
import * as program from './program.js';
import * as vocabTrack from './vocab.js';
import * as shadowDrill from './drills/shadow.js';
import * as repeatDrill from './drills/repeat.js';
import * as fluencyDrill from './drills/fluency.js';
import * as vocabDrill from './drills/vocab.js';
import * as salesDrill from './drills/sales.js';
import * as listeningDrill from './drills/listening.js';
import * as numbersDrill from './drills/numbers.js';
import * as pitchDrill from './drills/pitch.js';
import * as checkpointDrill from './drills/checkpoint.js';
import { micError } from './drills/common.js';

const OWNER_EMAIL = 'netanel.portnoy@gmail.com';

const app = document.getElementById('app');
const navBar = document.getElementById('nav');
let teardown = null;

function show(node, { nav = true } = {}) {
  if (teardown) { try { teardown(); } catch { /* view already gone */ } teardown = null; }
  cancelSpeech();
  clear(app).append(node);
  navBar.hidden = !nav;
  window.scrollTo(0, 0);
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

/** Two-button interface-language switch. Content stays English regardless. */
function langToggle(onChange) {
  const mk = (code, label) => h('button', {
    class: `chip ${getLang() === code ? 'on' : ''}`, type: 'button',
    onClick: () => {
      setLang(code);
      store.update({ lang: code });
      buildNav();
      onChange?.();
    },
  }, label);
  return h('div', { class: 'chips' }, mk('he', 'עברית'), mk('en', 'English'));
}

// ------------------------------------------------------------- onboarding

function viewWelcome() {
  const p = store.get();
  const input = h('input', {
    class: 'text-input', type: 'text',
    placeholder: t('welcome.namePlaceholder'),
    value: p.name || 'Elad',
    autocomplete: 'given-name',
  });
  const submit = () => {
    const name = input.value.trim();
    if (!name) return toast(t('welcome.needName'), 'warn');
    store.update({ name });
    go('#/soundcheck');
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  // The field starts pre-filled (not empty) as a convenience for the one
  // learner this app is built for - select it on focus so typing replaces
  // the whole name instead of appending to it (e.g. "Elad" + "Dana" typed
  // over it silently becoming "EladDana").
  input.addEventListener('focus', () => input.select());

  show(h('div', { class: 'card welcome' },
    h('h1', {}, t('app.name')),
    h('p', { class: 'lede' }, t('welcome.lede')),
    h('label', { class: 'label' }, t('welcome.language')),
    langToggle(viewWelcome),
    h('label', { class: 'label spaced' }, t('welcome.askName')),
    input,
    h('button', { class: 'btn primary wide', type: 'button', onClick: submit }, t('welcome.start')),
  ), { nav: false });
}

function viewSoundCheck() {
  const caps = detect();
  const results = { tts: null, mic: null, asr: null };
  const body = h('div', { class: 'card' });

  function renderStep(step) {
    clear(body);
    body.append(h('h2', {}, t('sc.title')), h('p', { class: 'hint' }, t('sc.intro')));

    // The commonest reason recording "just does not work" while editing: the
    // page was opened as a file, which is not a secure context.
    if (caps.fileProtocol || !caps.secure) {
      body.append(h('p', { class: 'error' }, t('mic.insecure')));
    }

    if (step === 'tts') {
      if (!caps.tts) { results.tts = false; return renderStep('mic'); }
      body.append(
        h('p', { class: 'step' }, h('strong', {}, t('sc.check1')), ' ', t('sc.canYouHear')),
        h('button', {
          class: 'btn primary wide', type: 'button',
          onClick: (e) => {
            // speak() must be called from inside this gesture on iOS.
            speak('Hello. If you can hear this, tap yes.').catch(() => {});
            e.target.textContent = t('sc.playAgain');
          },
        }, t('sc.playTest')),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onClick: () => { results.tts = true; renderStep('mic'); } }, t('sc.heardIt')),
          h('button', { class: 'btn ghost', type: 'button', onClick: () => { results.tts = false; renderStep('mic'); } }, t('sc.noSound')),
        ),
        h('p', { class: 'hint small' }, t('sc.silentSwitch')),
      );
      return;
    }

    if (step === 'mic') {
      if (!caps.mic || !caps.secure) { results.mic = false; results.asr = false; return renderStep('done'); }
      const status = h('p', { class: 'hint' }, t('sc.willAsk'));
      const out = h('div', {});
      const probeBtn = h('button', { class: 'btn primary wide', type: 'button' }, t('sc.testMic'));

      // The probe reads a fixed sentence for a full 6 seconds (the old one
      // gave 3 seconds and no prompt, so anyone who hesitated was recorded
      // as "recognition does not work on this device" and never asked again).
      // On a miss the reason is shown, and a second method can be tried -
      // iPhones differ in whether recognition must start before the
      // microphone does.
      async function runProbe(mode) {
        probeBtn.disabled = true;
        probeBtn.textContent = t('sc.listening');
        status.textContent = t('sc.speakNow');
        clear(out);
        try {
          const m = mode || effectiveMode();
          const probe = await probeMic(6000, { mode: m });
          results.mic = probe.recorded !== false ? true : false;
          if (probe.recorded === null) results.mic = probe.asrWorked;
          results.asr = probe.asrWorked;
          results.asrReason = probe.asrWorked ? null : probe.asr.status;
          if (probe.asrWorked && m.startsWith('both-')) {
            results.captureLearned = m === 'both-asr-first' ? 'asr-first' : 'rec-first';
            results.captureMode = 'auto';
            setCaptureConfig({ mode: 'auto', learned: results.captureLearned });
          }
          probeBtn.disabled = false;
          probeBtn.textContent = t('sc.tryAgain');
          status.textContent = '';
          const alt = m === 'both-rec-first' ? 'both-asr-first' : 'both-rec-first';
          clear(out).append(
            probe.recorded !== false
              ? h('p', { class: 'ok-line' }, t('sc.micWorks'))
              : h('p', { class: 'error' }, t('sc.nothingRecorded')),
            probe.url ? h('audio', { src: probe.url, controls: '' }) : null,
            probe.asrWorked
              ? h('p', { class: 'ok-line' }, t('sc.asrWorks'), ' ', ltr(h('span', {}, `"${probe.transcript}"`)))
              : h('div', {},
                  h('p', { class: 'hint small' }, probe.recorded ? t('sc.recordedNoAsr') : t('sc.noAsr')),
                  h('p', { class: 'hint small' }, t(`asr.${['disabled', 'unsupported', 'blocked', 'network', 'audio-capture', 'error', 'no-speech'].includes(probe.asr.status) ? probe.asr.status : 'error'}`)),
                  detect().asr && (m.startsWith('both-') || m === 'record-only')
                    ? h('button', { class: 'btn ghost wide', type: 'button', onClick: () => runProbe(alt) }, t('sc.tryAnother'))
                    : null),
            h('button', { class: 'btn primary wide', type: 'button', onClick: () => renderStep('done') },
              probe.asrWorked || probe.recorded ? t('sc.continue') : t('sc.continueAnyway')),
          );
        } catch (err) {
          results.mic = false; results.asr = false;
          probeBtn.disabled = false;
          probeBtn.textContent = t('sc.testMic');
          status.textContent = '';
          clear(out).append(micError(err),
            h('button', { class: 'btn primary wide', type: 'button', onClick: () => renderStep('done') }, t('sc.continueAnyway')));
        }
      }
      probeBtn.addEventListener('click', () => runProbe());

      body.append(
        h('p', { class: 'step' }, h('strong', {}, t('sc.check2')), ' ', t('sc.canAppHear')),
        status,
        h('p', { class: 'hint small' }, t('sc.readThis')),
        ltr(h('p', { class: 'target' }, t('sc.probeSentence'))),
        probeBtn,
        out,
      );
      return;
    }

    // done
    store.update({ caps: { ...store.get().caps, ...results, checkedAt: new Date().toISOString() } });
    body.append(
      h('ul', { class: 'check-list' },
        h('li', {}, results.tts ? t('sc.soundOk') : t('sc.soundNo')),
        h('li', {}, results.mic ? t('sc.micOk') : t('sc.micNo')),
        h('li', {}, results.asr ? t('sc.asrOk') : t('sc.asrNo')),
      ),
      !results.mic ? h('p', { class: 'hint' }, t('sc.noMicNote')) : null,
      h('button', {
        class: 'btn primary wide', type: 'button',
        onClick: () => go(store.get().onboarded ? '#/more' : '#/budget'),
      }, t('sc.next')),
    );
  }

  renderStep('tts');
  show(body, { nav: false });
}

function viewBudget() {
  const p = store.get();
  const budget = { ...p.budget };
  let months = p.programMonths;
  let days = [...(p.program.days.length ? p.program.days : [0, 1, 2, 3, 4])];

  const OPTIONS = [0, 5, 10, 15, 20, 30];
  const totalEl = h('p', { class: 'big-stat' });

  const dayBtns = h('div', { class: 'chips' },
    ...[0, 1, 2, 3, 4, 5, 6].map((n) => h('button', {
      class: `chip ${days.includes(n) ? 'on' : ''}`, type: 'button',
      onClick: (e) => {
        days = days.includes(n) ? days.filter((x) => x !== n) : [...days, n];
        e.target.classList.toggle('on');
      },
    }, weekdayShort(n))),
  );

  function refresh() {
    totalEl.textContent = `${budget.speech + budget.vocab + budget.sales + budget.listening} ${t('budget.perDay')}`;
  }

  function pickerRow(key, title, blurb) {
    const btns = OPTIONS.map((v) => h('button', {
      class: `chip ${budget[key] === v ? 'on' : ''}`, type: 'button',
      onClick: (e) => {
        budget[key] = v;
        e.target.parentElement.querySelectorAll('.chip').forEach((b) => b.classList.remove('on'));
        e.target.classList.add('on');
        refresh();
      },
    }, v === 0 ? t('budget.skip') : `${v}m`));
    return h('div', { class: 'budget-row' },
      h('h3', {}, title),
      h('p', { class: 'hint small' }, blurb),
      h('div', { class: 'chips' }, btns),
    );
  }

  const monthBtns = h('div', { class: 'chips' },
    ...[3, 6].map((m) => h('button', {
      class: `chip ${months === m ? 'on' : ''}`, type: 'button',
      onClick: (e) => {
        months = m;
        e.target.parentElement.querySelectorAll('.chip').forEach((b) => b.classList.remove('on'));
        e.target.classList.add('on');
      },
    }, t('budget.months', { n: m }))),
  );

  refresh();

  show(h('div', { class: 'card' },
    h('h2', {}, t('budget.title')),
    h('p', { class: 'hint' }, t('budget.hint')),
    pickerRow('speech', t('budget.speech'), t('budget.speechBlurb')),
    pickerRow('vocab', t('budget.vocab'), t('budget.vocabBlurb')),
    pickerRow('sales', t('budget.sales'), t('budget.salesBlurb')),
    pickerRow('listening', t('budget.listening'), t('budget.listeningBlurb')),
    totalEl,
    h('h3', {}, t('budget.length')),
    monthBtns,
    h('h3', {}, t('program.practiceDays')),
    h('p', { class: 'hint small' }, t('program.practiceDaysHint')),
    dayBtns,
    h('button', {
      class: 'btn primary wide', type: 'button',
      onClick: () => {
        if (budget.speech + budget.vocab + budget.sales + budget.listening === 0) return toast(t('budget.needTime'), 'warn');
        if (!days.length) return toast(t('program.needDays'), 'warn');
        store.update({ budget, programMonths: months, program: { ...p.program, days } });
        go(p.onboarded ? '#/today' : '#/placement');
      },
    }, p.onboarded ? t('sc.continue') : t('budget.next')),
  ), { nav: false });
}

// -------------------------------------------------------------- placement

function viewPlacement() {
  const test = new PlacementTest();

  function step() {
    const state = test.next();
    if (state.phase === 'done') return finishPlacement(test);
    const pct = Math.min(95, Math.round((state.answered / test.estimatedTotal) * 100));
    const bar = h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: `width:${pct}%` }));
    if (state.phase === 'quiz') return renderQuiz(state.item, bar);
    return renderSpeaking(state.item, bar);
  }

  function renderQuiz(item, bar) {
    const opts = h('div', { class: 'options' });
    item.options.forEach((opt, idx) => {
      // Answer options are English: keep them left-to-right.
      opts.append(ltr(h('button', {
        class: 'option', type: 'button',
        onClick: () => { test.answer(idx); step(); },
      }, opt)));
    });

    show(h('div', { class: 'card' },
      bar,
      h('span', { class: 'pill' }, t('pl.title')),
      item.type === 'listen'
        ? h('div', {},
            h('p', { class: 'hint' }, t('pl.listenThen')),
            h('button', {
              class: 'btn primary wide', type: 'button',
              onClick: (e) => { speak(item.audio).catch(() => {}); e.target.textContent = t('sc.playAgain'); },
            }, t('pl.play')))
        : ltr(h('p', { class: 'target' }, item.prompt)),
      opts,
    ), { nav: false });
  }

  function renderSpeaking(item, bar) {
    const feedback = h('div', { class: 'feedback' });
    if (!store.get().caps.mic) {
      // No microphone: skip speaking items rather than dead-ending the test.
      test.recordSpeaking({ type: item.type, scored: false, accuracy: null, skipped: true });
      return step();
    }

    let capture = null;
    // Placement has no nav bar (nav:false throughout), but the browser's own
    // back button/gesture is always available. Without this, navigating away
    // while the very first mic permission prompt is pending would let cap.start()
    // resolve into an orphaned, indefinitely-open microphone - the same race
    // fixed in common.js's recordButton and fluency.js's renderRound.
    let cancelled = false;
    const btn = h('button', { class: 'btn record wide', type: 'button' }, t('pl.startRec'));

    btn.addEventListener('click', async () => {
      if (capture) {
        btn.disabled = true;
        btn.textContent = t('pl.processing');
        const cap = capture; capture = null;
        const result = await cap.stop();
        const scored = item.text ? scoreAttempt(item.text, result.transcript, result.seconds, { alternatives: result.alternatives, confidence: result.confidence }) : null;
        // A reading the recogniser only partly caught must not lower his
        // starting speech level by two bands - treat it as unscored.
        const counts = countsTowardStats(scored);
        test.recordSpeaking({
          type: item.type,
          scored: counts,
          accuracy: counts ? scored.accuracy : null,
        });
        clear(feedback).append(
          h('p', { class: 'ok-line' }, t('pl.recorded')),
          result.url ? h('audio', { src: result.url, controls: '' }) : null,
          h('button', { class: 'btn primary wide', type: 'button', onClick: step }, t('sc.continue')),
        );
        btn.remove();
        return;
      }
      try {
        const cap = new Capture({ wantTranscript: true });
        await cap.start();
        if (cancelled) { cap.release(); return; }
        capture = cap;
        btn.textContent = t('pl.stop');
        btn.classList.add('recording');
      } catch (err) {
        clear(feedback).append(micError(err),
          h('button', { class: 'btn ghost wide', type: 'button', onClick: () => {
            test.recordSpeaking({ type: item.type, scored: false, accuracy: null, skipped: true });
            step();
          } }, t('pl.skipThis')));
      }
    });

    show(h('div', { class: 'card' },
      bar,
      h('span', { class: 'pill' }, t('pl.speaking')),
      ltr(h('p', { class: 'hint' }, item.prompt)),
      item.text ? ltr(h('p', { class: 'target' }, item.text)) : null,
      item.text
        ? h('button', { class: 'btn ghost', type: 'button', onClick: () => speak(item.text).catch(() => {}) }, t('pl.hearFirst'))
        : null,
      btn,
      // Always offer a way past a speaking item. Previously a skip only
      // appeared if the mic errored, so anyone who simply did not want to
      // speak aloud right then was stuck on the question.
      h('button', {
        class: 'link', type: 'button',
        onClick: () => {
          test.recordSpeaking({ type: item.type, scored: false, accuracy: null, skipped: true });
          step();
        },
      }, t('pl.skipThis')),
      feedback,
    ), { nav: false });
    teardown = () => { cancelled = true; capture?.release(); capture = null; };
  }

  step();
}

function finishPlacement(test) {
  const r = test.results();
  const p = store.get();
  store.update({
    levels: r.levels,
    placement: { done: true, takenAt: new Date().toISOString(), results: r },
    onboarded: true,
    // Day 1 of the program is the day he actually starts practising, not the
    // day the profile object was first created (which can be earlier, if he
    // closed the app partway through onboarding and came back).
    program: { ...p.program, startedAt: p.program.startedAt || new Date().toISOString() },
  });

  const row = (name, lvl) => h('li', {},
    h('strong', {}, name), ': ', h('span', { class: 'lvl' }, `${lvl} - ${levelName(lvl)}`));

  show(h('div', { class: 'card' },
    h('h2', {}, t('pl.resultTitle')),
    h('p', { class: 'hint' }, t('pl.resultHint')),
    h('ul', { class: 'level-list' },
      row(t('budget.speech'), r.levels.speech),
      row(t('budget.vocab'), r.levels.vocab),
      row(t('budget.sales'), r.levels.sales),
      row(t('budget.listening'), r.levels.listening),
    ),
    h('p', { class: 'hint small' }, t('pl.speechLags')),
    h('button', { class: 'btn primary wide', type: 'button', onClick: () => go('#/today') }, t('pl.startPractising')),
  ), { nav: false });
}

// ------------------------------------------------------------------ today

const DRILL_META = {
  repeat:  ['drill.repeat',  'drill.repeatBlurb',  '#/drill/repeat'],
  shadow:  ['drill.shadow',  'drill.shadowBlurb',  '#/drill/shadow'],
  fluency: ['drill.fluency', 'drill.fluencyBlurb', '#/drill/fluency'],
  vocab:   ['drill.vocab',   'drill.vocabBlurb',   '#/drill/vocab'],
  sales:   ['drill.sales',   'drill.salesBlurb',   '#/drill/sales'],
  listening: ['drill.listening', 'drill.listeningBlurb', '#/drill/listening'],
};

function viewToday() {
  const p = store.get();
  const now = new Date();
  const frame = program.programFrame(p, now);
  const plan = program.planFor(p, now);
  const todayStr = store.today();
  const doneDrills = new Set(p.sessions.filter((s) => s.date === todayStr).map((s) => s.drill));
  // Vocabulary has no fixed session count to "finish" the way a speech drill
  // does - a day with nothing due is already done, or allDone would stay
  // false forever on a day the FSRS deck simply has nothing to show.
  const vocabQueueEmpty = vocabTrack.queueSize(p, now) === 0;
  const drillDone = (drill) => doneDrills.has(drill) || (drill === 'vocab' && vocabQueueEmpty);
  const allDone = plan.every(({ drill }) => drillDone(drill));
  const plannedMinutes = plan.reduce((a, b) => a + b.minutes, 0);
  const doneMinutes = store.minutesToday();
  const pct = plannedMinutes ? Math.min(100, Math.round((doneMinutes / plannedMinutes) * 100)) : 0;
  const streaks = program.computeStreak(p.sessions, p.program.days, now);
  const streak = streaks.current;
  const scheduledToday = program.isScheduled(p.program.days, now);
  const missed = program.missedRun(p.sessions, p.program.days, now, p.program.startedAt);
  const checkpointDue = program.dueCheckpoint(p, now);

  // Fires at most once a week (Safari can purge a site's storage after about
  // 7 days away), and only once real history exists -
  // stamped the moment it's shown (same "record it as you render it" pattern
  // finishPlacement() already uses) so it never nags on every single visit.
  const daysSinceBackup = p.lastBackupPrompt
    ? Math.floor((now - new Date(p.lastBackupPrompt).getTime()) / 86400000) : Infinity;
  const showBackupNudge = p.sessions.length >= 5 && daysSinceBackup >= 7;
  if (showBackupNudge) store.update({ lastBackupPrompt: todayStr });

  const planTask = (drill, minutes) => {
    const [titleKey, blurbKey, hash] = DRILL_META[drill];
    const done = drillDone(drill);
    // Vocabulary's badge shows what's actually due, not the planned minutes -
    // "5 min" promises a fixed block, but the FSRS deck might have 2 cards
    // or 20 due today regardless of budget.vocab.
    const badge = done
      ? t('today.doneTick')
      : drill === 'vocab' ? t('vc.due', { n: vocabTrack.queueSize(p, now) }) : t('today.min', { n: minutes });
    return h('button', {
      class: `task ${done ? 'done' : ''}`, type: 'button',
      onClick: () => go(hash),
    },
      h('div', { class: 'task-main' },
        h('strong', {}, t(titleKey)),
        h('span', { class: 'task-blurb' }, t(blurbKey))),
      h('span', { class: 'task-min' }, badge),
    );
  };

  // Rest-day reveal needs its own re-render (a click, not a navigation), so
  // the practice-task list lives in a small wrap re-populated in place -
  // the same renderStep(...) pattern used in viewSoundCheck.
  let forcePractice = false;
  const planWrap = h('div', { class: 'tasks' });

  function renderPlan() {
    const items = [];
    if (!scheduledToday && !forcePractice) {
      items.push(
        h('p', { class: 'hint' }, t('today.restDay')),
        h('button', {
          class: 'btn ghost wide', type: 'button',
          onClick: () => { forcePractice = true; renderPlan(); },
        }, t('today.practiseAnyway')),
      );
    } else if (allDone) {
      items.push(h('p', { class: 'hint' }, t('today.allDone')));
    } else {
      items.push(...plan.map(({ drill, minutes }) => planTask(drill, minutes)));
    }
    clear(planWrap).append(...items);
  }
  renderPlan();

  show(h('div', {},
    h('div', { class: 'card head-card' },
      h('p', { class: 'greeting' }, t('today.hi', { name: p.name })),
      h('p', { class: 'week-line' }, t('program.week', { week: frame.week, total: frame.totalWeeks })),
      h('p', { class: 'hint small phase-line' },
        t(`program.phase.${frame.phase}`, { from: frame.phaseRange[0], to: frame.phaseRange[1] })),
      h('div', { class: 'ring-row' },
        h('div', {},
          h('p', { class: 'big-stat' }, `${doneMinutes} / ${plannedMinutes}`),
          h('p', { class: 'hint small' }, t('today.practisedToday'))),
        h('div', { class: 'streak' },
          h('p', { class: 'big-stat' }, streak),
          h('p', { class: 'hint small' }, t('today.streak'))),
      ),
      h('div', { class: 'progress' }, h('div', { class: 'progress-fill', style: `width:${pct}%` })),
    ),

    // programFrame().complete is a pure, recomputed-every-time fact, so this
    // keeps showing every day the program stays finished, same as the
    // missed-days card below keeps showing until he practises - it clears
    // itself only when "start a new program" resets program.startedAt.
    frame.complete
      ? h('div', { class: 'card recovery' },
          h('h2', {}, t('today.programComplete', { n: p.programMonths })),
          h('p', { class: 'hint small' }, t('today.programCompleteHint', {
            days: program.adherence(p.sessions, p.program, now).practised,
            streak: streaks.longest,
            minutes: Math.round((p.stats.totalSeconds || 0) / 60),
          })),
          h('button', {
            class: 'btn primary wide', type: 'button',
            onClick: () => {
              store.update({ program: { ...p.program, startedAt: new Date().toISOString() } });
              go('#/budget');
            },
          }, t('today.startNewProgram')),
        )
      : null,

    checkpointDue
      ? h('div', { class: 'card recovery' },
          h('h3', {}, t('cp.dueTitle', { week: checkpointDue.week })),
          h('p', { class: 'hint small' }, t('cp.dueHint')),
          h('button', { class: 'btn primary wide', type: 'button', onClick: () => go('#/drill/checkpoint') }, t('cp.start')),
        )
      : null,

    missed >= 1
      ? h('div', { class: 'card recovery' },
          h('p', {}, t('today.missedDays', { n: missed })),
          h('button', {
            class: 'btn ghost wide', type: 'button',
            onClick: () => go('#/drill/quick'),
          }, t('today.missedCta')),
        )
      : null,

    h('div', { class: 'card' },
      h('h2', {}, t('today.title')),
      planWrap,
    ),

    h('div', { class: 'card' },
      h('h3', {}, t('today.spareTitle')),
      h('p', { class: 'hint small' }, t('today.spareBlurb')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/drill/quick') }, t('today.quick')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/drill/numbers') }, t('today.numbers')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/drill/pitch') }, t('today.pitch')),
    ),

    showBackupNudge
      ? h('div', { class: 'card' },
          h('p', { class: 'hint small' }, t('today.backupNudge')),
          h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/more') }, t('today.backupNudgeCta')),
        )
      : null,
  ));
}

// --------------------------------------------------------------- progress

/** MM-DD from a state.js today()-format YYYY-MM-DD - compact and locale-agnostic. */
const shortDate = (ymd) => ymd.slice(5);

function viewProgress() {
  const p = store.get();
  const now = new Date();
  const frame = program.programFrame(p, now);
  const streaks = program.computeStreak(p.sessions, p.program.days, now);
  const adherence = program.adherence(p.sessions, p.program, now);
  const vocabStats = vocabTrack.stats(p.reviews, now);

  const lvlRow = (name, lvl) => {
    const idx = LEVELS.indexOf(lvl);
    return h('div', { class: 'lvl-row' },
      h('div', { class: 'lvl-head' },
        h('strong', {}, name),
        h('span', { class: 'lvl' }, `${lvl} - ${levelName(lvl)}`)),
      h('div', { class: 'ladder' }, ...LEVELS.map((l, i) => h('span', { class: `rung ${i <= idx ? 'on' : ''}` }))),
    );
  };

  const phonemes = Object.entries(p.phonemes)
    .filter(([, e]) => e.attempts >= 1)
    .sort((a, b) => a[1].score - b[1].score);

  const recent = p.sessions.slice(-8).reverse();
  const accuracyTrend = p.sessions.filter((s) => s.drill === 'repeat' && s.accuracy !== null).slice(-8);

  // ---------------------------------------------------------- calendar
  //
  // A record of what actually happened (from dayHistory(), itself derived
  // from sessions), not a plan drawn forward - see program.js's module
  // comment. Deliberately NOT wrapped in ltr(): a Hebrew calendar correctly
  // reads right-to-left with Sunday on the right, and both the CSS grid's
  // column order and flex row below inherit that from the page's own
  // dir="rtl" with no extra work.
  const localeTag = getLang() === 'he' ? 'he' : 'en';
  const startedAt = new Date(p.program.startedAt || p.createdAt);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startMonth = new Date(startedAt.getFullYear(), startedAt.getMonth(), 1);
  let viewMonth = currentMonth;
  const calWrap = h('div', {});

  function renderCalendar() {
    const y = viewMonth.getFullYear(), m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const hist = program.dayHistory(p.sessions, p.program.days, first, new Date(y, m, daysInMonth));
    const byDate = new Map(hist.map((d) => [d.date, d]));
    const todayKey = store.today();

    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(h('span', { class: 'cal-cell pad' }));
    for (let day = 1; day <= daysInMonth; day++) {
      const key = new Date(y, m, day).toLocaleDateString('en-CA');
      const rec = byDate.get(key);
      let cls = 'cal-cell';
      if (!rec || !rec.scheduled) cls += ' rest';
      else if (rec.met) cls += ' met';
      else if (key > todayKey) cls += ' future';
      else cls += ' missed';
      if (key === todayKey) cls += ' today';
      cells.push(h('span', { class: cls }, String(day)));
    }

    clear(calWrap).append(
      h('div', { class: 'cal-nav' },
        h('button', {
          class: 'btn tiny', type: 'button', disabled: viewMonth <= startMonth,
          onClick: () => { viewMonth = new Date(y, m - 1, 1); renderCalendar(); },
        }, t('pr.prevMonth')),
        h('span', { class: 'cal-month' }, first.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' })),
        h('button', {
          class: 'btn tiny', type: 'button', disabled: viewMonth >= currentMonth,
          onClick: () => { viewMonth = new Date(y, m + 1, 1); renderCalendar(); },
        }, t('pr.nextMonth')),
      ),
      h('div', { class: 'cal-grid' },
        ...[0, 1, 2, 3, 4, 5, 6].map((n) => h('span', { class: 'cal-dow' }, weekdayShort(n))),
        ...cells,
      ),
    );
  }
  renderCalendar();

  show(h('div', {},
    h('div', { class: 'card' },
      h('h2', {}, t('pr.program')),
      h('span', { class: 'pill' }, t(`program.phaseName.${frame.phase}`)),
      h('p', { class: 'hint small' },
        t(`program.phase.${frame.phase}`, { from: frame.phaseRange[0], to: frame.phaseRange[1] })),
      calWrap,
      h('div', { class: 'stat-grid' },
        h('div', {}, h('p', { class: 'big-stat' }, streaks.current), h('p', { class: 'hint small' }, t('today.streak'))),
        h('div', {}, h('p', { class: 'big-stat' }, streaks.longest), h('p', { class: 'hint small' }, t('pr.longestStreak'))),
        h('div', {}, h('p', { class: 'big-stat' }, `${adherence.pct}%`),
          h('p', { class: 'hint small' }, t('pr.daysPractised', { practised: adherence.practised, scheduled: adherence.scheduledSoFar }))),
      ),
      h('p', { class: 'hint small' },
        t('pr.programEnds', { date: frame.endDate.toLocaleDateString(localeTag, { day: 'numeric', month: 'short', year: 'numeric' }) })),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('pr.trendTitle')),
      accuracyTrend.length >= 2
        ? h('div', { class: 'wpm-chart' }, ...accuracyTrend.map((s) => h('div', { class: 'wpm-bar' },
            h('div', { class: 'bar', style: `height:${Math.max(6, Math.round(s.accuracy * 100))}%` }),
            h('span', { class: 'wpm-val' }, `${Math.round(s.accuracy * 100)}%`),
            h('span', { class: 'wpm-lbl' }, shortDate(s.date)),
          )))
        : h('p', { class: 'hint' }, t('pr.trendEmpty')),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('pr.yourLevel')),
      lvlRow(t('budget.speech'), p.levels.speech),
      lvlRow(t('budget.vocab'), p.levels.vocab),
      lvlRow(t('budget.sales'), p.levels.sales),
      lvlRow(t('budget.listening'), p.levels.listening),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('drill.vocab')),
      h('div', { class: 'stat-grid' },
        h('div', {}, h('p', { class: 'big-stat' }, vocabStats.learned), h('p', { class: 'hint small' }, t('vc.learned'))),
        h('div', {}, h('p', { class: 'big-stat' }, vocabStats.mature), h('p', { class: 'hint small' }, t('vc.mature'))),
        h('div', {}, h('p', { class: 'big-stat' }, vocabStats.dueTomorrow), h('p', { class: 'hint small' }, t('vc.dueTomorrow'))),
      ),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('pr.totals')),
      h('div', { class: 'stat-grid' },
        h('div', {}, h('p', { class: 'big-stat' }, streaks.current), h('p', { class: 'hint small' }, t('today.streak'))),
        h('div', {}, h('p', { class: 'big-stat' }, Math.round((p.stats.totalSeconds || 0) / 60)), h('p', { class: 'hint small' }, t('pr.minutesTotal'))),
        h('div', {}, h('p', { class: 'big-stat' }, p.stats.drillsDone || 0), h('p', { class: 'hint small' }, t('pr.sessions'))),
      ),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('cp.progressTitle')),
      (() => {
        const base = p.placement?.results?.detail?.readAloud;
        const rows = [];
        if (base?.scored && typeof base.accuracy === 'number') {
          rows.push(h('div', { class: 'sess-row' }, h('span', {}, t('cp.baseline')), h('span', { class: 'hint small' }, `${Math.round(base.accuracy * 100)}%`)));
        }
        for (const c of p.checkpoints || []) {
          rows.push(h('div', { class: 'sess-row' },
            h('span', {}, t('cp.weekRow', { week: c.week })),
            h('span', { class: 'hint small' }, c.accuracy === null ? t('cp.noScore') : `${Math.round(c.accuracy * 100)}%${c.wpm ? ` · ${c.wpm} wpm` : ''}`)));
        }
        return rows.length ? h('div', {}, ...rows) : h('p', { class: 'hint' }, t('cp.empty'));
      })(),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('pr.sounds')),
      phonemes.length
        ? h('div', {},
            h('p', { class: 'hint small' }, t('pr.soundsHint')),
            ...phonemes.slice(0, 6).map(([tag, e]) => h('div', { class: 'phon-row' },
              h('div', { class: 'phon-head' },
                h('strong', {}, phoneme(tag)?.label || tag),
                h('span', { class: 'hint small' }, `${Math.round(e.score * 100)}%`)),
              h('div', { class: 'progress thin' }, h('div', { class: 'progress-fill', style: `width:${Math.round(e.score * 100)}%` })),
            )))
        : h('p', { class: 'hint' }, t('pr.soundsEmpty')),
    ),

    recent.length
      ? h('div', { class: 'card' },
          h('h2', {}, t('pr.recent')),
          ...recent.map((s) => h('div', { class: 'sess-row' },
            h('span', {}, t(`drill.${s.drill}`)),
            h('span', { class: 'hint small' }, `${Math.round(s.seconds / 60)}m${s.accuracy !== null ? ` - ${Math.round(s.accuracy * 100)}%` : ''}`))))
      : null,
  ));
}

// ------------------------------------------------------------------- more

function viewMore() {
  const p = store.get();
  const requestBox = h('textarea', { class: 'text-input area', rows: '4', placeholder: t('more.requestPlaceholder') });
  const requestFallback = ltr(h('textarea', {
    class: 'text-input area', rows: '5', readonly: '', hidden: '', dir: 'ltr',
  }));

  // mailto only OPENS a compose window - it never confirms anything was sent,
  // and on a device with no mail account configured (common if someone's
  // primary app is Gmail/WhatsApp rather than the native Mail app) it can
  // silently do nothing at all. So this is never the ONLY path: the same
  // message is always also offered as a copy, so it is never lost even when
  // mailto fails or Elad is not sure whether it worked.
  function requestSubjectAndBody(text) {
    const subject = `English app - request from ${p.name}`;
    const body = `${text}\n\n---\nLevel: speech ${p.levels.speech}, vocab ${p.levels.vocab}, sales ${p.levels.sales}\nStreak: ${p.stats.streak} days`;
    return { subject, body };
  }

  function showRequestFallback(text) {
    const { subject, body } = requestSubjectAndBody(text);
    const full = `To: ${OWNER_EMAIL}\nSubject: ${subject}\n\n${body}`;
    const doShow = () => {
      requestFallback.value = full;
      requestFallback.hidden = false;
      requestFallback.focus();
      requestFallback.select();
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(full)
        .then(() => { doShow(); toast(t('more.requestCopied'), 'info'); })
        .catch(() => { doShow(); toast(t('more.requestCopyManually'), 'warn'); });
    } else {
      doShow();
      toast(t('more.requestCopyManually'), 'warn');
    }
  }

  function sendRequest() {
    const text = requestBox.value.trim();
    if (!text) return toast(t('more.writeFirst'), 'warn');
    p.requests.push({ at: Date.now(), text });
    store.save();
    const { subject, body } = requestSubjectAndBody(text);
    location.href = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast(t('more.openingMail'), 'info');
    // Kept, not cleared: he may still want "Copy message" right after this.
  }

  const exportArea = ltr(h('textarea', {
    class: 'text-input area', rows: '4', readonly: '', hidden: '', dir: 'ltr',
  }));

  function exportProgress() {
    // Backups can run to tens of thousands of characters once real usage
    // accumulates (up to 800 sessions alone). The old fallback truncated to
    // 1800 chars and emailed that - a truncated JSON backup fails to parse on
    // import, so the safety net was silently useless exactly when clipboard
    // access fails, which is disproportionately likely on iOS Safari. Now the
    // full, untruncated text is shown selected on screen instead, so a manual
    // copy always works regardless of clipboard API support.
    const json = store.exportJSON();
    const showFallback = () => {
      exportArea.value = json;
      exportArea.hidden = false;
      exportArea.focus();
      exportArea.select();
      toast(t('more.copyManually'), 'info');
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json)
        .then(() => { exportArea.hidden = true; toast(t('more.copied'), 'info'); })
        .catch(showFallback);
    } else {
      showFallback();
    }
  }

  // File backup: a real file survives a storage purge, unlike the clipboard,
  // and the iOS share sheet can drop it straight into Files / iCloud.
  async function saveBackupFile() {
    const json = store.exportJSON();
    const name = `speak-english-backup-${store.today()}.json`;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        toast(t('more.fileSaved'), 'info');
        return;
      }
    } catch (err) {
      if (err?.name === 'AbortError') return; // he closed the share sheet
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(t('more.fileSaved'), 'info');
  }

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: '' });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try { store.importJSON(await f.text()); toast(t('more.restored'), 'info'); go('#/today'); }
    catch { toast(t('more.restoreFailed'), 'warn'); }
    fileInput.value = '';
  });

  const importArea = ltr(h('textarea', { class: 'text-input area', rows: '3', placeholder: t('more.restorePlaceholder'), dir: 'ltr' }));

  show(h('div', {},
    h('div', { class: 'card' },
      h('h2', {}, t('more.requestTitle')),
      h('p', { class: 'hint small' }, t('more.requestHint')),
      requestBox,
      h('button', { class: 'btn primary wide', type: 'button', onClick: sendRequest }, t('more.send')),
      h('button', {
        class: 'btn ghost wide', type: 'button',
        onClick: () => {
          const text = requestBox.value.trim();
          if (!text) return toast(t('more.writeFirst'), 'warn');
          showRequestFallback(text);
        },
      }, t('more.copyRequest')),
      h('p', { class: 'hint small' }, t('more.requestFallbackHint')),
      requestFallback,
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('more.langTitle')),
      h('p', { class: 'hint small' }, t('more.langHint')),
      langToggle(viewMore),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('more.timeTitle')),
      h('p', { class: 'hint small' }, t('more.timeNow', {
        n: p.budget.speech + p.budget.vocab + p.budget.sales + p.budget.listening, m: p.programMonths,
      })),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/budget') }, t('more.changeTime')),
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('more.deviceTitle')),
      h('p', { class: 'hint small' }, p.caps.asr ? t('more.asrOn') : t('more.asrOff')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/soundcheck') }, t('more.redoCheck')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => go('#/diag') }, t('diag.open')),
      isIOS ? h('p', { class: 'hint small' }, t('more.iosNote')) : null,
    ),

    h('div', { class: 'card' },
      h('h2', {}, t('more.backupTitle')),
      h('p', { class: 'hint small' }, t('more.backupHint')),
      h('button', { class: 'btn primary wide', type: 'button', onClick: saveBackupFile }, t('more.saveFile')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: exportProgress }, t('more.copyProgress')),
      h('button', { class: 'btn ghost wide', type: 'button', onClick: () => fileInput.click() }, t('more.restoreFile')),
      fileInput,
      exportArea,
      importArea,
      h('button', {
        class: 'btn ghost wide', type: 'button',
        onClick: () => {
          try { store.importJSON(importArea.value); toast(t('more.restored'), 'info'); go('#/today'); }
          catch { toast(t('more.restoreFailed'), 'warn'); }
        },
      }, t('more.restore')),
      store.hasSnapshot() ? h('button', {
        class: 'btn ghost wide', type: 'button',
        onClick: () => {
          if (!confirm(t('more.confirmRestoreSnapshot'))) return;
          try { store.restoreSnapshot(); toast(t('more.restored'), 'info'); go('#/today'); }
          catch { toast(t('more.restoreFailed'), 'warn'); }
        },
      }, t('more.restoreSnapshot')) : null,
    ),

    h('div', { class: 'card' },
      h('button', {
        class: 'link danger', type: 'button',
        onClick: () => { if (confirm(t('more.confirmReset'))) { store.reset(); go('#/'); } },
      }, t('more.startOver')),
    ),
  ));
}

// -------------------------------------------------------------- speech lab

/**
 * Hidden diagnostics page (#/diag, linked from More). Grading depends on how
 * this particular phone combines the recorder and the recogniser, and that can
 * only be measured on the phone. Each method can be tested by hand; the report
 * (device, settings, last attempts with their event timelines) is one tap to
 * copy and send.
 */
function viewDiag() {
  const p = store.get();
  const out = h('div', {});
  const tests = [];
  const reportArea = ltr(h('textarea', { class: 'text-input area', rows: '8', readonly: '', hidden: '', dir: 'ltr' }));
  const currentEl = h('p', { class: 'hint' });
  const modes = CAPTURE_MODES.filter((m) => m !== 'auto');

  const modeName = (m) => t(`diag.mode.${m}`);
  const refreshCurrent = () => {
    const caps = store.get().caps;
    const pinned = caps.captureMode && caps.captureMode !== 'auto';
    currentEl.textContent = t('diag.current', { m: pinned ? modeName(caps.captureMode) : `${modeName('auto')} (${effectiveMode()})` });
  };

  function buildReport() {
    const cur = store.get();
    return JSON.stringify({
      when: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ios: isIOS,
      detect: detect(),
      caps: cur.caps,
      effectiveMode: effectiveMode(),
      captureStats: cur.captureStats,
      labTests: tests,
      recentAttempts: cur.captureLog,
    }, null, 2);
  }

  function copyReport() {
    const json = buildReport();
    const fallback = () => {
      reportArea.value = json; reportArea.hidden = false; reportArea.focus(); reportArea.select();
      toast(t('diag.copyManually'), 'info');
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).then(() => toast(t('diag.copied'), 'info')).catch(fallback);
    } else fallback();
  }

  const buttons = modes.map((m) => {
    const btn = h('button', { class: 'btn ghost wide', type: 'button' }, t('diag.run', { m: modeName(m) }));
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = t('diag.recording');
      try {
        const res = await probeMic(6000, { mode: m });
        tests.push({
          mode: m, recorded: res.recorded, bytes: res.diag.blobBytes, transcript: res.transcript,
          status: res.asr.status, error: res.asr.error, restarts: res.diag.restarts,
          errors: res.diag.errors, events: res.diag.events,
        });
        clear(out).append(
          h('h3', {}, `${t('diag.result')}: ${modeName(m)}`),
          res.url ? h('audio', { src: res.url, controls: '' }) : null,
          h('p', { class: res.asrWorked ? 'ok-line' : 'hint' }, t('diag.heard'), ' ',
            ltr(h('span', {}, res.transcript ? `"${res.transcript}"` : t('diag.nothing')))),
          h('p', { class: 'hint small' }, `${res.asr.status}${res.asr.error ? ` (${res.asr.error})` : ''} · ${res.diag.blobBytes} bytes · ${res.diag.restarts} restarts`),
          res.asrWorked ? h('button', {
            class: 'btn primary wide', type: 'button',
            onClick: () => {
              const caps = store.get().caps;
              store.update({ caps: { ...caps, captureMode: m } });
              setCaptureConfig({ mode: m });
              refreshCurrent();
              toast(t('diag.saved'), 'info');
            },
          }, t('diag.use')) : null,
        );
      } catch (err) {
        clear(out).append(micError(err));
      }
      btn.textContent = label;
      btn.disabled = false;
    });
    return btn;
  });

  refreshCurrent();
  show(h('div', {},
    h('div', { class: 'card' },
      h('h2', {}, t('diag.title')),
      h('p', { class: 'hint small' }, t('diag.intro')),
      ltr(h('p', { class: 'target' }, t('sc.probeSentence'))),
      currentEl,
      h('p', { class: 'hint small' }, t('diag.stats', {
        g: p.captureStats?.graded || 0, u: p.captureStats?.ungraded || 0,
      })),
      ...buttons,
      out,
      h('button', {
        class: 'btn ghost wide', type: 'button',
        onClick: () => {
          const caps = store.get().caps;
          store.update({ caps: { ...caps, captureMode: 'auto' } });
          setCaptureConfig({ mode: 'auto' });
          refreshCurrent();
          toast(t('diag.saved'), 'info');
        },
      }, t('diag.auto')),
      h('button', { class: 'btn primary wide', type: 'button', onClick: copyReport }, t('diag.copy')),
      reportArea,
    ),
  ));
}

// ------------------------------------------------------ capture learning

/**
 * Every finished attempt lands here (speech.js onCaptureFinished). It is
 * persisted for the Speech Lab report, and in `auto` mode two silent misses in
 * a row - a real recording, recognition supported, no error, still no words -
 * flip the recorder/recogniser start order, since that signature points at an
 * audio-session conflict rather than a permission block. Any graded attempt
 * resets the count.
 */
function learnFromCapture(diag) {
  const r = store.recordCapture(diag);
  const caps = store.get().caps;
  if (!r.silentMiss || (caps.captureMode && caps.captureMode !== 'auto')) return;
  if (diag.mode !== effectiveMode() || r.stats.silentMisses < 2) return;
  const learned = caps.captureLearned === 'asr-first' ? 'rec-first' : 'asr-first';
  r.stats.silentMisses = 0;
  store.update({ caps: { ...caps, captureLearned: learned } });
  setCaptureConfig({ learned });
}

// ----------------------------------------------------------------- drills

function hostDrill(kind) {
  const p = store.get();
  const root = h('div', {});
  show(root);
  // Repeat & Grade's weak-sound focus narrows or widens with the program
  // phase (see program.js's module comment); Shadow and Fluency don't take
  // weakTags at all, so 3 (today's long-standing default) is fine for them.
  const frame = program.programFrame(p, new Date());
  const tagLimit = kind === 'repeat' ? program.tagLimitForPhase(frame.phase) : 3;
  const ctx = {
    level: p.levels.speech,
    weakTags: store.weakTags(tagLimit),
    onFinish: () => go('#/today'),
  };
  if (kind === 'shadow') teardown = shadowDrill.mount(root, ctx);
  else if (kind === 'fluency') teardown = fluencyDrill.mount(root, ctx);
  else if (kind === 'quick') teardown = repeatDrill.mount(root, { ...ctx, count: 2 });
  else if (kind === 'vocab') teardown = vocabDrill.mount(root, { onFinish: ctx.onFinish });
  else if (kind === 'sales') teardown = salesDrill.mount(root, { level: p.levels.sales, onFinish: ctx.onFinish });
  else if (kind === 'listening') teardown = listeningDrill.mount(root, { onFinish: ctx.onFinish });
  else if (kind === 'numbers') teardown = numbersDrill.mount(root, { onFinish: ctx.onFinish });
  else if (kind === 'pitch') teardown = pitchDrill.mount(root, { level: p.levels.sales, onFinish: ctx.onFinish });
  else if (kind === 'checkpoint') {
    const due = program.dueCheckpoint(p, new Date());
    if (!due) return go('#/today');
    teardown = checkpointDrill.mount(root, { slot: due.slot, week: due.week, onFinish: ctx.onFinish });
  }
  else teardown = repeatDrill.mount(root, ctx);
}

// ------------------------------------------------------------------ route

function route() {
  const p = store.get();
  const hash = location.hash || '#/';

  switch (true) {
    case hash === '#/welcome': return viewWelcome();
    case hash === '#/soundcheck': return viewSoundCheck();
    case hash === '#/budget': return viewBudget();
    case hash === '#/placement': return viewPlacement();
    case hash === '#/diag': return viewDiag();
    case hash === '#/today': return p.onboarded ? viewToday() : viewWelcome();
    case hash === '#/progress': return p.onboarded ? viewProgress() : viewWelcome();
    case hash === '#/more': return p.onboarded ? viewMore() : viewWelcome();
    case hash.startsWith('#/drill/'): return p.onboarded ? hostDrill(hash.split('/')[2]) : viewWelcome();
    default: return p.onboarded ? viewToday() : viewWelcome();
  }
}

function buildNav() {
  const tabs = [
    ['#/today', t('nav.today')],
    ['#/progress', t('nav.progress')],
    ['#/more', t('nav.more')],
  ];
  clear(navBar).append(...tabs.map(([hash, label]) => h('a', {
    href: hash,
    class: location.hash === hash ? 'on' : '',
  }, label)));
}

// Language must be applied before the first render.
setLang(store.get().lang || 'he');
applyDir();
primeVoices();
// Ask the browser not to evict our storage; best effort, Safari may ignore it.
try { navigator.storage?.persist?.(); } catch { /* unsupported */ }
setCaptureConfig({ mode: store.get().caps?.captureMode, learned: store.get().caps?.captureLearned });
onCaptureFinished(learnFromCapture);

window.addEventListener('hashchange', () => { route(); buildNav(); });
route();
buildNav();
