// Shared lifecycle, score and feedback client for every game page.
const MAX_QUEUE = 60;
const FLUSH_SIZE = 6;
const FLUSH_DELAY = 1600;
const ANON_KEY = 'hg_anonymous_id';

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.random() * 16 | 0;
    const value = char === 'x' ? random : (random & 3 | 8);
    return value.toString(16);
  });
}

function gameIdFromPath() {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts[0] || 'unknown';
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseDisplayedNumber(text) {
  const match = String(text || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return match ? safeNumber(match[0]) : null;
}

function getAnonymousId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function createGameRuntime({ gameId = gameIdFromPath(), autoStart = true } = {}) {
  let sessionId = uuid();
  let startedAt = Date.now();
  const queue = [];
  let status = 'ready';
  let currentScore = null;
  let flushTimer = 0;
  let startPromise = null;
  let finished = false;

  function scheduleFlush() {
    if (flushTimer || queue.length < FLUSH_SIZE) {
      if (!flushTimer && queue.length) flushTimer = window.setTimeout(() => flush(), FLUSH_DELAY);
      return;
    }
    flush();
  }

  async function flush() {
    if (flushTimer) window.clearTimeout(flushTimer);
    flushTimer = 0;
    if (!queue.length) return;
    if (startPromise) await startPromise;
    const events = queue.splice(0, MAX_QUEUE);
    try {
      const response = await fetch('/api/game/events', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, sessionId, events }),
        keepalive: true,
      });
      if (!response.ok && response.status !== 404 && response.status !== 503) {
        queue.unshift(...events.slice(-MAX_QUEUE));
      }
    } catch {
      queue.unshift(...events.slice(-MAX_QUEUE));
    }
    if (queue.length) scheduleFlush();
  }

  function event(type, payload = {}, details = {}) {
    if (finished && type !== 'game_finished') return;
    queue.push({
      eventId: uuid(),
      type,
      payload: payload && typeof payload === 'object' ? payload : { value: payload },
      score: safeNumber(details.score ?? (type === 'score_snapshot' ? payload.score : undefined)),
      scoreDelta: safeNumber(details.scoreDelta ?? payload?.scoreDelta),
      clientAt: Date.now(),
    });
    if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
    scheduleFlush();
  }

  async function start(metadata = {}) {
    if (startPromise) return startPromise;
    status = 'playing';
    event('game_started', { ...metadata, path: location.pathname });
    startPromise = fetch('/api/game/sessions', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, sessionId, anonymousId: getAnonymousId(), metadata }),
      keepalive: true,
    }).catch(() => null);
    return startPromise;
  }

  function setScore(score, metadata = {}) {
    const next = safeNumber(score);
    if (next === null || next === currentScore) return;
    const previous = currentScore;
    currentScore = next;
    event('score_snapshot', { ...metadata, score: next }, { score: next, scoreDelta: previous === null ? 0 : next - previous });
  }

  function finish(outcome = 'finished', details = {}) {
    if (finished) return;
    status = outcome;
    const score = safeNumber(details.score ?? currentScore) ?? 0;
    event(outcome === 'won' ? 'game_won' : outcome === 'lost' ? 'game_lost' : 'game_finished', {
      ...details,
      score,
    }, { score });
    finished = true;
    const body = JSON.stringify({
      gameId,
      sessionId,
      outcome,
      score,
      durationMs: Math.max(0, Date.now() - startedAt),
      metadata: details.metadata || {},
    });
    fetch('/api/game/finish', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
    flush();
  }

  function restart(metadata = {}) {
    if (!finished) {
      event('game_restarted', metadata);
      return;
    }
    sessionId = uuid();
    startedAt = Date.now();
    queue.length = 0;
    status = 'ready';
    currentScore = null;
    finished = false;
    startPromise = null;
    start(metadata);
  }

  function captureDomSnapshot() {
    const values = {};
    document.querySelectorAll('#score, [data-score], .score-value, #level, #moves, #combo, #kills, #progress-text, #status, [aria-live="polite"]').forEach(element => {
      const key = element.id || element.dataset.score || element.className?.split?.(' ')?.[0];
      if (!key) return;
      const text = element.textContent.trim();
      if (!text) return;
      values[key] = text.slice(0, 160);
      if (key === 'score' || element.dataset.score === 'score') setScore(parseDisplayedNumber(text));
    });
    const statusText = Object.entries(values)
      .filter(([key]) => key === 'status' || key === 'status-text')
      .map(([, value]) => value)
      .join(' ');
    if (/游戏结束|挑战结束|已失败|失败|通关|胜利|完成！|完成!|恭喜/.test(statusText) && status === 'playing') {
      finish(/失败/.test(statusText) ? 'lost' : 'won', { statusText });
    }
    if (Object.keys(values).length) event('state_snapshot', values);
  }

  function observeDom() {
    let timer = 0;
    const scheduleSnapshot = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        timer = 0;
        captureDomSnapshot();
      }, 350);
    };
    const observer = new MutationObserver(scheduleSnapshot);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    window.addEventListener('happy-game-score', eventObject => {
      const detail = eventObject.detail || {};
      setScore(detail.score, detail);
      if (detail.delta !== undefined) event('score_delta', detail, { scoreDelta: detail.delta, score: detail.score });
    });
    window.addEventListener('happy-game-event', eventObject => {
      const detail = eventObject.detail || {};
      if (detail.type) event(detail.type, detail.payload || {}, detail);
    });
    window.addEventListener('pagehide', () => {
      if (finished) return;
      const body = JSON.stringify({ gameId, sessionId, outcome: 'abandoned', score: currentScore ?? 0, durationMs: Math.max(0, Date.now() - startedAt), metadata: {} });
      try {
        navigator.sendBeacon('/api/game/finish', new Blob([body], { type: 'application/json' }));
      } catch {}
    }, { once: true });
    captureDomSnapshot();
  }

  const runtime = {
    gameId,
    get sessionId() { return sessionId; },
    start,
    restart,
    event,
    setScore,
    finish,
    flush,
    snapshot: captureDomSnapshot,
    get status() { return status; },
    get score() { return currentScore; },
  };

  if (autoStart) {
    const boot = () => {
      observeDom();
      start();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
  return runtime;
}

export const gameRuntime = createGameRuntime();
globalThis.HappyGame = gameRuntime;
