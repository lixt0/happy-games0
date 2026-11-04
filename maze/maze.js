import { generateMaze, movePlayer, isSolved } from '/maze/logic.js';

const STORAGE_KEY = 'happygames.maze.best';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const levelEl = document.getElementById('level');
const timeEl = document.getElementById('time');
const movesEl = document.getElementById('moves');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restart');
const nextBtn = document.getElementById('next');

const CELL_SIZE = 40;
const WALL_WIDTH = 2;
const DPR = window.devicePixelRatio || 1;

let maze = null;
let player = { x: 0, y: 0 };
let level = 1;
let moves = 0;
let startTime = 0;
let timeLeft = 0;
let timer = null;
let solved = false;
let best = loadBest();
let animFrame = 0;
let pulsePhase = 0;

const sizes = [
  { w: 8, h: 8, time: 30 },
  { w: 10, h: 10, time: 45 },
  { w: 12, h: 12, time: 60 },
  { w: 15, h: 15, time: 90 },
  { w: 18, h: 18, time: 120 },
];

function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveBest(val) {
  try {
    localStorage.setItem(STORAGE_KEY, String(val));
  } catch {
  }
}

function startLevel(lvl) {
  level = lvl;
  const size = sizes[Math.min(lvl - 1, sizes.length - 1)];
  maze = generateMaze(size.w, size.h);
  player = { x: 0, y: 0 };
  moves = 0;
  solved = false;
  timeLeft = size.time;
  startTime = Date.now();

  canvas.style.width = `${size.w * CELL_SIZE}px`;
  canvas.style.height = `${size.h * CELL_SIZE}px`;
  canvas.width = size.w * CELL_SIZE * DPR;
  canvas.height = size.h * CELL_SIZE * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  updateUI();
  draw();

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (solved) return;
    timeLeft--;
    updateUI();
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameOver();
    }
  }, 1000);
}

function gameOver() {
  solved = true;
  draw();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.font = '36px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.fillText('时间到！', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '20px "Kaiti SC", "STKaiti", "KaiTi", serif';
  ctx.fillText('点击重新开始', canvas.width / 2, canvas.height / 2 + 20);
}

function move(direction) {
  if (solved || !maze) return;

  const newPos = movePlayer(player, direction, maze);
  if (!newPos) return;

  player = newPos;
  moves++;
  updateUI();
  draw();

  if (isSolved(player, maze[0].length, maze.length)) {
    solved = true;
    clearInterval(timer);

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const size = sizes[Math.min(level - 1, sizes.length - 1)];
    const score = Math.max(0, size.time - elapsed) * 10 + Math.max(0, 100 - moves) * 5;

    if (score > best) {
      best = score;
      saveBest(best);
    }

    updateUI();
    draw();

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '36px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('过关！', canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = '24px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText(`得分: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.font = '18px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('点击下一关', canvas.width / 2, canvas.height / 2 + 30);
  }
}

function updateUI() {
  levelEl.textContent = level;
  timeEl.textContent = timeLeft;
  movesEl.textContent = moves;
  bestEl.textContent = best;
}

function draw() {
  if (!maze) return;

  animFrame++;
  pulsePhase = Math.sin(animFrame * 0.05) * 0.15 + 0.85;

  // 暗色模式下换深底浅墙,否则整块迷宫仍是亮色
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  ctx.fillStyle = dark ? '#16201d' : '#f5f0e6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = dark ? '#9db2ab' : '#2a1d10';
  ctx.lineWidth = WALL_WIDTH;
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 1;

  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      const cell = maze[y][x];
      const px = x * CELL_SIZE;
      const py = y * CELL_SIZE;

      if (cell.top) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + CELL_SIZE, py);
        ctx.stroke();
      }
      if (cell.right) {
        ctx.beginPath();
        ctx.moveTo(px + CELL_SIZE, py);
        ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
        ctx.stroke();
      }
      if (cell.bottom) {
        ctx.beginPath();
        ctx.moveTo(px, py + CELL_SIZE);
        ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
        ctx.stroke();
      }
      if (cell.left) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py + CELL_SIZE);
        ctx.stroke();
      }
    }
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  const goalX = (maze[0].length - 1) * CELL_SIZE;
  const goalY = (maze.length - 1) * CELL_SIZE;
  const pulseSize = (CELL_SIZE - 16) * pulsePhase;
  const offset = (CELL_SIZE - pulseSize) / 2;

  ctx.fillStyle = '#6aaa64';
  ctx.shadowColor = 'rgba(106,170,100,0.4)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(goalX + offset, goalY + offset, pulseSize, pulseSize, 4);
  ctx.fill();
  ctx.shadowBlur = 0;

  const cx = player.x * CELL_SIZE + CELL_SIZE / 2;
  const cy = player.y * CELL_SIZE + CELL_SIZE / 2;
  const r = CELL_SIZE / 3;

  let g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ff6b6b');
  g.addColorStop(1, '#c0392b');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(192,57,43,0.3)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

canvas.addEventListener('click', () => {
  if (solved) {
    startLevel(level);
  }
});

nextBtn.addEventListener('click', () => {
  if (solved) {
    startLevel(level + 1);
  }
});

restartBtn.addEventListener('click', () => {
  startLevel(level);
});

window.addEventListener('keydown', (e) => {
  if (solved) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      startLevel(level);
    }
    return;
  }

  let dir = null;
  switch (e.key) {
    case 'ArrowUp': case 'w': case 'W': dir = 'top'; break;
    case 'ArrowRight': case 'd': case 'D': dir = 'right'; break;
    case 'ArrowDown': case 's': case 'S': dir = 'bottom'; break;
    case 'ArrowLeft': case 'a': case 'A': dir = 'left'; break;
  }

  if (dir) {
    e.preventDefault();
    move(dir);
  }
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) return;
  e.preventDefault();
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  e.preventDefault();
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;

  const threshold = 20;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left');
  } else {
    move(dy > 0 ? 'bottom' : 'top');
  }
}, { passive: false });

bestEl.textContent = best;
startLevel(1);
