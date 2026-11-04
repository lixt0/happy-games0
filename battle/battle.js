import { POSITIONS, DYNASTIES } from './logic.js';

const STAT_LABELS = { politics: '政', military: '武', strategy: '谋', diplomacy: '交', literature: '文', charm: '魅' };
const DRAFT_ORDER = ['A','B','B','A','A','B','B','A','A','B','B','A','A','B','B','A','A','B','B','A'];
const POOL_SIZE = 5;
const POLL_MS = 1500;

let mySide = null, roomCode = null, myName = '', pollTimer = null;
let dynasty = null, pools = null, remoteState = null;
let initSent = false, battleShown = false;

const $ = id => document.getElementById(id);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSeededPools(seed) {
  return POSITIONS.map(pos => {
    const rng = mulberry32(seed + pos.id.length * 7 + pos.name.charCodeAt(0));
    return { position: pos, heroes: seededShuffle(pos.pool, rng).slice(0, POOL_SIZE) };
  });
}

function pickDynastyBySeed(seed) {
  return DYNASTIES[seed % DYNASTIES.length];
}

function show(id) {
  document.querySelectorAll('.bt-screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

function showError(msg) {
  const el = $('lobby-error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

async function api(path, body) {
  const res = await fetch(`/api/battle/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function createRoom() {
  const name = $('create-name').value.trim() || '玩家一';
  const pass = $('create-pass').value.trim();
  if (!pass) { showError('请设置房间密码'); return; }
  myName = name;
  mySide = 'A';
  const data = await api('create', { username: name, password: pass });
  if (data.error) { showError(data.error); return; }
  roomCode = data.code;
  $('room-code-display').textContent = roomCode;
  show('screen-waiting');
  startPolling();
}

async function joinRoom() {
  const name = $('join-name').value.trim() || '玩家二';
  const code = $('join-code').value.trim();
  const pass = $('join-pass').value.trim();
  if (!code || !pass) { showError('请输入房间号和密码'); return; }
  myName = name;
  mySide = 'B';
  roomCode = code;
  const data = await api('join', { code, password: pass, username: name });
  if (data.error) { showError(data.error); return; }
  startPolling();
}

function startPolling() {
  stopPolling();
  poll();
  pollTimer = setInterval(poll, POLL_MS);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function poll() {
  try {
    const state = await api(`state?code=${roomCode}`);
    if (state.error) return;
    remoteState = state;
    handleState(state);
  } catch (e) { /* network error, retry next tick */ }
}

function handleState(state) {
  if (state.phase === 'waiting') {
    show('screen-waiting');
    return;
  }

  if (state.phase === 'ready') {
    if (mySide === 'A' && !state.seed && !initSent) {
      initSent = true;
      const seed = Math.floor(Math.random() * 1000000);
      api('pick', { code: roomCode, username: myName, heroName: '__init__', posIdx: 0, seed });
      return;
    }
    if (state.seed) initGame(state);
    return;
  }

  if (state.phase === 'drafting' || state.phase === 'battle') {
    initGame(state);
    if (state.phase === 'battle') {
      stopPolling();
      if (!battleShown) { battleShown = true; showBattle(state); }
    } else {
      show('screen-draft');
      renderDraft(state);
    }
  }
}

function initGame(state) {
  if (!dynasty || !pools) {
    dynasty = pickDynastyBySeed(state.seed);
    pools = buildSeededPools(state.seed);
    renderDynasty();
  }
}

function renderDynasty() {
  const bonusText = Object.entries(dynasty.bonus)
    .map(([k, v]) => `${STAT_LABELS[k]}+${v}`).join(' ');
  const html = `<div class="dyn-name">穿越至【${dynasty.name}】</div>
    <div class="dyn-desc">${dynasty.desc}</div>
    <div class="dyn-bonus">朝代加成：${bonusText}</div>`;
  $('dynasty-banner').innerHTML = html;
  $('dynasty-banner2').innerHTML = html;
}

function renderDraft(state) {
  const step = state.draftStep;
  const posIndex = Math.floor(step / 2);
  const pos = POSITIONS[posIndex];
  const turnSide = DRAFT_ORDER[step];
  const turnName = turnSide === 'A' ? state.players.A : state.players.B;
  const isMyTurn = turnSide === mySide;

  const turnEl = $('draft-turn');
  turnEl.textContent = isMyTurn ? '轮到你选将！' : `${turnName} 正在选将…`;
  turnEl.classList.toggle('my-turn', isMyTurn);
  $('draft-pos').textContent = `第 ${posIndex + 1}/10 职位：${pos.name}（${pos.desc}）`;

  $('lineup-a-name').textContent = state.players.A;
  $('lineup-b-name').textContent = state.players.B;
  renderLineups(state, posIndex);
  renderPool(state, posIndex, isMyTurn);
}

function renderLineups(state, currentPosIndex) {
  for (const [side, lineupKey, elId] of [['A', 'lineupA', 'slots-a'], ['B', 'lineupB', 'slots-b']]) {
    const lineup = state[lineupKey] || {};
    const ul = $(elId);
    ul.innerHTML = POSITIONS.map((p, i) => {
      const heroName = lineup[p.id];
      const isCurrent = i === currentPosIndex && !heroName;
      const cls = heroName ? 'filled' : isCurrent ? 'current' : '';
      return `<li class="${cls}">
        <span class="slot-name">${p.name}</span>
        <span class="${heroName ? 'slot-hero' : 'slot-empty'}">${heroName || '—'}</span>
      </li>`;
    }).join('');
  }
}

function renderPool(state, posIndex, isMyTurn) {
  const { position, heroes } = pools[posIndex];
  const container = $('hero-pool');

  if (!isMyTurn) {
    container.innerHTML = `<div class="bt-pool-locked">等待对手选择…</div>`;
    return;
  }

  const allPicked = [...Object.values(state.lineupA || {}), ...Object.values(state.lineupB || {})];

  container.innerHTML = `<div class="bt-pool-title">英雄池 · ${position.name}（点击选择）</div>
    <div class="bt-pool-grid">${heroes.map(h => {
      const picked = allPicked.includes(h.name);
      const topStats = Object.entries(h.stats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
      return `<div class="hero-card${picked ? ' picked' : ''}" data-name="${h.name}">
        <div class="hero-name">${h.name}</div>
        <div class="hero-era">${h.era}</div>
        <div class="hero-tags">${h.tags.join(' · ')}</div>
        <div class="hero-stats">${Object.entries(h.stats).map(([k, v]) =>
          `<span class="stat${topStats.includes(k) ? ' high' : ''}">${STAT_LABELS[k]}${v}</span>`
        ).join('')}</div>
      </div>`;
    }).join('')}</div>`;

  container.querySelectorAll('.hero-card:not(.picked)').forEach(card => {
    card.addEventListener('click', () => pickHero(card.dataset.name, posIndex));
  });
}

async function pickHero(name, posIndex) {
  const data = await api('pick', { code: roomCode, username: myName, heroName: name, posIdx: posIndex });
  if (data.error) return;
  poll();
}

function showBattle(state) {
  const lineupA = resolveLineup(state.lineupA || {});
  const lineupB = resolveLineup(state.lineupB || {});

  const matchups = POSITIONS.map(pos => ({
    position: pos.name,
    desc: pos.desc,
    heroA: lineupA[pos.id],
    heroB: lineupB[pos.id],
  })).filter(m => m.heroA && m.heroB);

  $('battle-results').innerHTML = '';
  $('battle-summary').innerHTML = '';
  $('ai-analysis').classList.remove('hidden');
  $('ai-text').innerHTML = '<span class="cursor"></span>';
  show('screen-battle');
  streamJudgment(state, matchups);
}

async function streamJudgment(state, matchups) {
  const textEl = $('ai-text');

  if (mySide !== 'A') {
    textEl.textContent = '房主正在生成战报…';
    pollAnalysis(textEl);
    return;
  }

  const payload = {
    dynasty: { name: dynasty.name, desc: dynasty.desc, bonus: dynasty.bonus },
    nameA: state.players.A,
    nameB: state.players.B,
    matchups,
  };

  try {
    const res = await fetch('/api/battle/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      textEl.textContent = 'AI 裁判连接失败，请稍后再试。';
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    let lastSync = 0;
    const sync = async (done) => {
      try {
        await fetch('/api/battle/analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: roomCode, text, done }),
        });
      } catch (e) { /* ignore sync errors */ }
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) text += delta;
        } catch (e) { /* skip malformed chunks */ }
      }
      const clean = stripThink(text);
      textEl.innerHTML = renderMarkdown(clean) + '<span class="cursor"></span>';
      const now = Date.now();
      if (now - lastSync > 500) { lastSync = now; sync(false); }
    }
    textEl.innerHTML = renderMarkdown(stripThink(text));
    sync(true);
  } catch (e) {
    textEl.textContent = 'AI 裁判连接失败，请稍后再试。';
  }
}

async function pollAnalysis(textEl) {
  let lastLen = 0;
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`/api/battle/analysis?code=${encodeURIComponent(roomCode)}`);
      const data = await res.json();
      if (data.text) {
        if (data.text.length !== lastLen) {
          lastLen = data.text.length;
          textEl.innerHTML = renderMarkdown(stripThink(data.text)) + '<span class="cursor"></span>';
        }
        if (data.done) {
          clearInterval(timer);
          textEl.innerHTML = renderMarkdown(stripThink(data.text));
        }
      }
    } catch (e) { /* retry next tick */ }
  }, 800);
}

function stripThink(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<think>[\s\S]*$/g, '').trim();
}

function renderMarkdown(text) {
  return esc(text)
    .replace(/^## (.+)$/gm, '<strong class="ai-h2">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\n/g, '<br>');
}

function resolveLineup(nameMap) {
  const lineup = {};
  for (const { position, heroes } of pools) {
    const name = nameMap[position.id];
    if (name) {
      lineup[position.id] = heroes.find(h => h.name === name) || { name, era: '?', tags: [], stats: { politics: 50, military: 50, strategy: 50, diplomacy: 50, literature: 50, charm: 50 } };
    }
  }
  return lineup;
}

$('btn-create').addEventListener('click', createRoom);
$('btn-join').addEventListener('click', joinRoom);
$('btn-restart').addEventListener('click', () => {
  stopPolling();
  dynasty = null; pools = null; remoteState = null; roomCode = null; mySide = null;
  initSent = false; battleShown = false;
  show('screen-lobby');
});
