import {
  ARENA_WIDTH,
  advanceMover,
  createGameState,
  placeActive,
} from '/stack/logic.js';

const STORAGE_KEY = 'happygames.stack.best';
const W = ARENA_WIDTH;
const H = 640;
const BLOCK_H = 30;
const BASE_Y = 548;
const VISIBLE_LEVELS = 10;
const COLORS = ['#27756f', '#c96725', '#2c7296', '#c69620', '#55734f', '#b84b3f'];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const comboEl = document.getElementById('combo');
const statusEl = document.getElementById('status');
const restartBtn = document.getElementById('restart');

let game;
let best = loadBest();
let cameraY = 0;
let cameraTarget = 0;
let fragment = null;
let flash = 0;
let lastTime = performance.now();
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setupCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loadBest() {
  try {
    return Number.parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
  }
}

function reset() {
  if (game?.state === 'gameover') globalThis.HappyGame?.restart({ reason: 'button_reset' });
  game = createGameState();
  cameraY = 0;
  cameraTarget = 0;
  fragment = null;
  flash = 0;
  lastTime = performance.now();
  updateUI('点击画面开始建塔');
}

function updateUI(message) {
  scoreEl.textContent = game.score;
  bestEl.textContent = best;
  comboEl.textContent = game.combo;
  globalThis.HappyGame?.setScore(game.score, { best, combo: game.combo });
  if (message) statusEl.textContent = message;
}

function act() {
  if (game.state === 'ready') {
    game = { ...game, state: 'playing' };
    updateUI('看准时机，点击放下方块');
    return;
  }
  if (game.state === 'gameover') {
    reset();
    game = { ...game, state: 'playing' };
    updateUI('新塔开工，点击放下方块');
    return;
  }

  const oldActive = game.active;
  const { state, placement } = placeActive(game);
  game = state;

  if (placement.result === 'miss') {
    fragment = {
      ...oldActive,
      y: levelY(game.blocks.length),
      vy: 0,
      rotation: 0,
      rotationSpeed: oldActive.direction * 0.035,
      color: colorForLevel(game.blocks.length),
    };
    updateUI('没有接住，点击画面再来一局');
    return;
  }

  if (placement.fragment && placement.fragment.width > 0.5) {
    fragment = {
      ...placement.fragment,
      y: levelY(game.blocks.length - 1),
      vy: -0.6,
      rotation: 0,
      rotationSpeed: oldActive.direction * 0.045,
      color: colorForLevel(game.blocks.length - 1),
    };
  }

  if (game.score > best) {
    best = game.score;
    saveBest(best);
  }

  if (placement.result === 'perfect') {
    flash = 1;
    updateUI(game.combo > 1 ? `完美重合，连续 ${game.combo} 次` : '完美重合，塔身保持完整');
  } else if (game.active.width < 22) {
    updateUI('只剩一点宽度了，稳住');
  } else {
    updateUI('接住了，继续向上');
  }

  cameraTarget = Math.max(0, (game.blocks.length - VISIBLE_LEVELS) * BLOCK_H);
}

function levelY(level) {
  return BASE_Y - level * BLOCK_H + cameraY;
}

function colorForLevel(level) {
  return COLORS[level % COLORS.length];
}

function update(dt) {
  if (game.state === 'playing') {
    const scale = Math.min(dt / (1000 / 60), 2.2);
    game = {
      ...game,
      active: advanceMover(game.active, ARENA_WIDTH, scale),
    };
  }

  const cameraEase = reducedMotion ? 1 : Math.min(1, dt * 0.008);
  cameraY += (cameraTarget - cameraY) * cameraEase;
  flash = Math.max(0, flash - dt * 0.0026);

  if (fragment) {
    const scale = Math.min(dt / (1000 / 60), 2.2);
    fragment.vy += 0.42 * scale;
    fragment.y += fragment.vy * scale;
    fragment.rotation += fragment.rotationSpeed * scale;
    if (fragment.y > H + 80) fragment = null;
  }
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#d9e8e6');
  sky.addColorStop(0.58, '#edf0e9');
  sky.addColorStop(1, '#f4e8d2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(44, 114, 150, 0.08)';
  ctx.beginPath();
  ctx.moveTo(0, 320);
  ctx.lineTo(78, 225);
  ctx.lineTo(148, 310);
  ctx.lineTo(230, 190);
  ctx.lineTo(325, 310);
  ctx.lineTo(420, 235);
  ctx.lineTo(420, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(31, 44, 41, 0.075)';
  const offset = (cameraY * 0.12) % 20;
  for (let x = 0; x < W; x += 34) {
    const height = 54 + ((x / 34) % 4) * 18;
    ctx.fillRect(x, H - 72 + offset - height, 24, height + 72);
  }

  ctx.fillStyle = '#cad4ce';
  ctx.fillRect(0, BASE_Y + BLOCK_H + 5, W, H - BASE_Y);
  ctx.fillStyle = 'rgba(31, 44, 41, 0.12)';
  ctx.fillRect(0, BASE_Y + BLOCK_H + 5, W, 2);
}

function drawBlock(block, y, color, alpha = 1) {
  if (block.width <= 0 || y < -BLOCK_H * 2 || y > H + BLOCK_H) return;
  const x = block.x - block.width / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(31, 44, 41, 0.18)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = color;
  roundRect(x, y, block.width, BLOCK_H - 3, 4);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  roundRect(x + 3, y + 3, Math.max(0, block.width - 6), 4, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(18, 26, 25, 0.12)';
  ctx.fillRect(x + 3, y + BLOCK_H - 7, Math.max(0, block.width - 6), 3);
  ctx.restore();
}

function drawTower() {
  for (const block of game.blocks) {
    drawBlock(block, levelY(block.level), colorForLevel(block.level));
  }

  if (game.state !== 'gameover') {
    const activeLevel = game.blocks.length;
    drawBlock(game.active, levelY(activeLevel), colorForLevel(activeLevel));
    if (game.state === 'playing') {
      ctx.strokeStyle = 'rgba(31, 44, 41, 0.14)';
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(game.active.x, levelY(activeLevel) + BLOCK_H);
      ctx.lineTo(game.active.x, levelY(activeLevel) + BLOCK_H + 22);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (fragment) {
    ctx.save();
    ctx.translate(fragment.x, fragment.y + BLOCK_H / 2);
    ctx.rotate(fragment.rotation);
    drawBlock({ x: 0, width: fragment.width }, -BLOCK_H / 2, fragment.color, 0.88);
    ctx.restore();
  }
}

function drawHeightMarker() {
  if (game.score === 0 || game.state === 'ready') return;
  const y = Math.max(25, levelY(game.blocks.length) - 12);
  ctx.fillStyle = 'rgba(31, 44, 41, 0.62)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${game.score} 层`, 18, y);
}

function drawOverlay() {
  if (game.state === 'playing') {
    if (flash > 0) {
      ctx.strokeStyle = `rgba(198, 150, 32, ${flash * 0.75})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(3, 3, W - 6, H - 6);
    }
    return;
  }

  ctx.fillStyle = game.state === 'ready' ? 'rgba(20, 36, 33, 0.32)' : 'rgba(20, 30, 28, 0.58)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '52px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.fillText(game.state === 'ready' ? '堆塔' : '挑战结束', W / 2, H / 2 - 58);
  ctx.font = '22px "Kaiti SC", "STKaiti", "KaiTi", serif';
  if (game.state === 'ready') {
    ctx.fillText('点击或按空格开始', W / 2, H / 2 + 2);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('让每一层稳稳落在塔顶', W / 2, H / 2 + 38);
  } else {
    ctx.fillText(`建成 ${game.score} 层 · 最高 ${best} 层`, W / 2, H / 2 + 2);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('点击画面再来一局', W / 2, H / 2 + 46);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawTower();
  drawHeightMarker();
  drawOverlay();
}

function loop(now) {
  const dt = Math.min(40, now - lastTime || 16.67);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  act();
});

window.addEventListener('keydown', (event) => {
  if ((event.key === ' ' || event.key === 'ArrowDown') && !event.repeat) {
    event.preventDefault();
    act();
  }
});

restartBtn.addEventListener('click', reset);
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
  reducedMotion = event.matches;
});

setupCanvas();
reset();
requestAnimationFrame(loop);
