// 华夏帝王控制器：UI 与流程串联
import {
  EMPERORS_DATA, HINT_START_ATTEMPT, STATS_KEYS, STAT_LABELS,
  pickEmperor, findEmperor, compareGuess, displayName,
} from './logic.js';

const SAVED_KEY = 'emperors_state_v2';

const countEl = document.getElementById('count');
const historyEl = document.getElementById('history');
const resultEl = document.getElementById('result');
const inputEl = document.getElementById('guess-input');
const btnEl = document.getElementById('guess-btn');
const giveupBtnEl = document.getElementById('giveup');
const datalistEl = document.getElementById('emperor-list');

function buildDatalist() {
  const names = EMPERORS_DATA.flatMap(e => [e.name, ...(e.aliases || [])]);
  datalistEl.innerHTML = names.map(n => `<option value="${n}">`).join('');
}
buildDatalist();

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    if (s && s.answerName && !s.finished) return s;
  } catch {}
  return null;
}

function saveState(state) {
  try {
    if (state) localStorage.setItem(SAVED_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVED_KEY);
  } catch {}
}

// 第 5 次起每次独立 50% 概率揭示
function shouldReveal(attempt) {
  return attempt >= HINT_START_ATTEMPT && Math.random() < 0.5;
}

let state;
{
  const saved = loadState();
  if (saved) {
    state = saved;
  } else {
    const answer = pickEmperor();
    state = { answerName: answer.name, guesses: [], finished: false, won: false };
    saveState(state);
  }
}

render();

function renderClue(label, clue) {
  return `<div class="clue clue-${clue.tone}">
    <span class="clue-label">${label}</span>
    <span class="clue-text">${clue.text}</span>
  </div>`;
}

function guessRowHTML(g) {
  const cls = g.correct ? 'correct' : 'wrong';
  let html = `<div class="guess-row ${cls}">`;
  html += `<div class="guess-head"><span class="guess-no">#${g.attempt}</span><span class="guess-name">${g.name}</span>`;
  if (g.sim != null) html += `<span class="guess-sim">相似度 ${g.sim}%</span>`;
  html += `</div>`;
  if (g.correct) {
    html += `<div class="guess-result ok">猜中了！</div>`;
  } else if (g.clues) {
    html += `<div class="clues">`;
    html += renderClue('朝代', g.clues.era);
    html += renderClue('身份', g.clues.role);
    for (const k of STATS_KEYS) html += renderClue(STAT_LABELS[k], g.clues[k]);
    html += `</div>`;
  } else {
    html += `<div class="guess-result">还未揭示，请继续猜</div>`;
  }
  html += `</div>`;
  return html;
}

function answerSummaryHTML() {
  const a = findEmperor(state.answerName);
  const statsLine = STATS_KEYS.map(k => `${STAT_LABELS[k]} ${a.stats[k]}`).join(' · ');
  return `<p class="emp-meta">答案是 <span class="emp-answer">${displayName(a)}</span>（${a.era} · ${a.role}）</p>
    <p class="emp-meta">${statsLine}</p>`;
}

function render() {
  countEl.textContent = state.guesses.length;
  historyEl.innerHTML = state.guesses.map(guessRowHTML).join('');
  if (state.finished) {
    resultEl.classList.remove('hidden');
    resultEl.classList.toggle('win', state.won);
    resultEl.classList.toggle('lose', !state.won);
    resultEl.innerHTML = `
      <p class="emp-title">${state.won ? '🎉 猜中了！' : '已放弃'}</p>
      ${answerSummaryHTML()}
      <button type="button" id="again" class="reset-btn">再来一局</button>
    `;
    document.getElementById('again').addEventListener('click', newGame);
    inputEl.disabled = true;
    btnEl.disabled = true;
    giveupBtnEl.disabled = true;
  } else {
    resultEl.classList.add('hidden');
    resultEl.innerHTML = '';
    inputEl.disabled = false;
    btnEl.disabled = false;
    giveupBtnEl.disabled = false;
  }
}

function makeGuess() {
  if (state.finished) return;
  const name = inputEl.value.trim();
  if (!name) return;
  const guess = findEmperor(name);
  if (!guess) {
    resultEl.classList.remove('hidden');
    resultEl.classList.remove('win', 'lose');
    resultEl.innerHTML = `<p class="emp-title" style="color:var(--accent-red)">未识别人名</p>
      <p class="emp-meta">「${name}」不在帝王名单中。请从下拉选取或输入规范名。</p>`;
    return;
  }
  const attempt = state.guesses.length + 1;
  const reveal = shouldReveal(attempt);
  const result = compareGuess(findEmperor(state.answerName), guess.name, attempt, { reveal });
  if (!result.valid) return;
  const entry = { attempt, name: result.name, correct: result.correct };
  if (result.sim != null) entry.sim = result.sim;
  if (result.clues) entry.clues = result.clues;
  state.guesses.push(entry);
  if (result.correct) { state.finished = true; state.won = true; }
  saveState(state);
  inputEl.value = '';
  render();
}

function giveUp() {
  if (state.finished) return;
  state.finished = true;
  state.won = false;
  saveState(state);
  render();
}

function newGame() {
  const answer = pickEmperor();
  state = { answerName: answer.name, guesses: [], finished: false, won: false };
  saveState(state);
  inputEl.value = '';
  render();
}

btnEl.addEventListener('click', makeGuess);
giveupBtnEl.addEventListener('click', giveUp);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); makeGuess(); }
});
