import { LEVELS, SIZE, createState, isSolved, rotatePiece, traceBeam } from './logic.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'happygames.refraction.best';
let state = createState();
let completed = new Set();
let best = {};
let hintTimer = null;

function cellPosition(point) { return ((point.c + .5) / SIZE) * 100; }
function cellY(point) { return ((point.r + .5) / SIZE) * 100; }
function pointKey(point) { return `${point.r},${point.c}`; }

function loadProgress() { try { best = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); completed = new Set(Object.keys(best).map(Number)); } catch { best = {}; completed = new Set(); } }
function saveProgress() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(best)); } catch {} }

function renderPicker() {
  $('level-picker').innerHTML = LEVELS.map((level, index) => `<button class="${index === state.levelIndex ? 'active' : ''} ${completed.has(index) ? 'done' : ''}" data-level="${index}" type="button" aria-label="第 ${index + 1} 关 ${level.name}">${index + 1}</button>`).join('');
  $('level-picker').querySelectorAll('[data-level]').forEach(button => { button.onclick = () => loadLevel(Number(button.dataset.level)); });
}

function renderBoard() {
  const level = LEVELS[state.levelIndex];
  const trace = traceBeam(state);
  const hit = trace.hits;
  const targetMap = new Set(level.targets.map(pointKey));
  const pieceMap = new Map(state.pieces.map((piece, index) => [pointKey(piece), { piece, index }]));
  const sourceKey = pointKey(level.source);
  const cells = [];
  for (let r = 0; r < SIZE; r += 1) for (let c = 0; c < SIZE; c += 1) {
    const at = `${r},${c}`;
    let content = '';
    if (at === sourceKey) content += '<span class="source" aria-label="光源"></span>';
    if (targetMap.has(at)) content += `<span class="target ${hit.has(at) ? 'hit' : ''}" aria-label="${hit.has(at) ? '已点亮晶体' : '未点亮晶体'}"></span>`;
    const item = pieceMap.get(at);
    if (item) {
      if (item.piece.type === 'splitter') content += '<span class="splitter" aria-label="分光器"></span>';
      else content += `<button class="piece ${item.piece.orientation ? 'mirror-back' : ''} ${item.piece.locked ? 'locked' : ''}" data-piece="${item.index}" type="button" ${item.piece.locked ? 'disabled' : ''} aria-label="${item.piece.locked ? '固定镜子' : '旋转镜子'}"><span class="mirror-core"></span></button>`;
    }
    cells.push(`<div class="ref-cell">${content}</div>`);
  }
  const beam = `<svg class="beam-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${trace.segments.map(segment => `<line class="beam-line" x1="${cellPosition(segment.from)}" y1="${cellY(segment.from)}" x2="${cellPosition(segment.to)}" y2="${cellY(segment.to)}"/>`).join('')}</svg>`;
  $('board').innerHTML = cells.join('') + beam;
  $('board').querySelectorAll('[data-piece]').forEach(button => button.onclick = () => rotate(Number(button.dataset.piece)));
  $('beam-state').textContent = `${trace.hits.size} / ${trace.targetCount} 晶体`;
  $('level-name').textContent = `第 ${state.levelIndex + 1} 关 · ${level.name}`;
  $('move-count').textContent = state.moves;
  $('best-count').textContent = best[state.levelIndex] ?? '--';
}

function renderMessage(text) { $('message').innerHTML = text; }
function render() { renderPicker(); renderBoard(); }

function rotate(index) {
  const next = rotatePiece(state, index);
  if (next === state) return;
  state = next; render();
  if (isSolved(state)) completeLevel();
  else renderMessage('光路已改变。继续调整，让所有晶体同时点亮。');
}

function completeLevel() {
  const oldBest = best[state.levelIndex];
  if (!oldBest || state.moves < oldBest) best[state.levelIndex] = state.moves;
  completed.add(state.levelIndex); saveProgress(); render();
  renderMessage(`<strong>全部晶体已点亮。</strong> 本关用了 ${state.moves} 次旋转。`);
  $('win-title').textContent = LEVELS[state.levelIndex].name;
  $('win-text').textContent = `你用了 ${state.moves} 次旋转${oldBest && state.moves >= oldBest ? '，继续挑战更少步数吧。' : '，刷新了本关最佳。'}`;
  $('next-btn').textContent = state.levelIndex === LEVELS.length - 1 ? '回到第一关' : '下一关';
  setTimeout(() => $('win-modal').classList.remove('hidden'), 260);
}

function loadLevel(index) { clearTimeout(hintTimer); state = createState(index); $('win-modal').classList.add('hidden'); render(); renderMessage('点击镜子旋转 90°，让光束命中全部晶体。'); }
function showHint() {
  const solution = LEVELS[state.levelIndex].solution;
  const index = state.pieces.findIndex((piece, i) => piece.type === 'mirror' && !piece.locked && piece.orientation !== solution[i]);
  if (index < 0) return renderMessage('镜面方向已经正确，看看是否有尚未点亮的晶体。');
  const button = $('board').querySelector(`[data-piece="${index}"]`);
  if (!button) return;
  button.classList.add('hinting'); renderMessage('<strong>提示：</strong>高亮的镜子需要再旋转一次。');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => button.classList.remove('hinting'), 1300);
}

function bind() {
  $('reset-btn').onclick = () => loadLevel(state.levelIndex);
  $('hint-btn').onclick = showHint;
  $('rules-btn').onclick = () => $('rules-modal').classList.remove('hidden');
  $('close-rules').onclick = () => $('rules-modal').classList.add('hidden');
  $('rules-modal').querySelector('[data-close-rules]').onclick = () => $('rules-modal').classList.add('hidden');
  $('retry-btn').onclick = () => loadLevel(state.levelIndex);
  $('next-btn').onclick = () => loadLevel((state.levelIndex + 1) % LEVELS.length);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('rules-modal').classList.add('hidden'); $('win-modal').classList.add('hidden'); } });
}

loadProgress(); bind(); render(); renderMessage('点击镜子旋转 90°，让光束命中全部晶体。');
