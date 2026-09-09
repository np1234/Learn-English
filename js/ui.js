// Tiny DOM helpers. No framework, no build step - this app is plain ES modules.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'disabled') el.disabled = !!v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Force left-to-right on English practice content.
 * The interface may be Hebrew (RTL), but every sentence, passage and answer
 * option he practises is English and must not be mirrored.
 */
export function ltr(node) {
  node.setAttribute('dir', 'ltr');
  node.classList.add('ltr');
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function fmtClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

/** A countdown that ticks a callback each second and resolves when it hits 0. */
export function countdown(seconds, onTick) {
  let left = seconds;
  let timer = null;
  let stopped = false;
  const promise = new Promise((resolve) => {
    onTick?.(left);
    timer = setInterval(() => {
      left -= 1;
      onTick?.(Math.max(0, left));
      if (left <= 0) {
        clearInterval(timer);
        if (!stopped) resolve('elapsed');
      }
    }, 1000);
  });
  return {
    promise,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

/** A stopwatch that ticks upward, for open-ended recording. */
export function stopwatch(onTick) {
  const started = Date.now();
  const timer = setInterval(() => onTick?.((Date.now() - started) / 1000), 250);
  return { stop: () => clearInterval(timer), elapsed: () => (Date.now() - started) / 1000 };
}

/** Render the word-by-word result of a scored attempt. */
export function renderWords(scored) {
  const wrap = h('p', { class: 'words ltr', dir: 'ltr' });
  for (const w of scored.words) {
    wrap.append(h('span', { class: `word ${w.status}`, title: w.heard ? `heard: ${w.heard}` : '' }, w.word), ' ');
  }
  return wrap;
}

export function toast(message, tone = 'info') {
  const t = h('div', { class: `toast ${tone}`, text: message });
  document.body.append(t);
  setTimeout(() => t.classList.add('in'), 10);
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 300);
  }, 2600);
}
