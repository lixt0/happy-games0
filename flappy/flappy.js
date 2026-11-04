const STORAGE_KEY = 'happygames.flappy.best';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const restartBtn = document.getElementById('restart');

const W = 400;
const H = 600;
const DPR = window.devicePixelRatio || 1;

function setupCanvas() {
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
setupCanvas();

const BIRD_SIZE = 24;
const BIRD_X = 80;
const GRAVITY = 0.5;
const FLAP_VEL = -8;

const PIPE_WIDTH = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 90;

let bird = { y: H / 2, vel: 0 };
let pipes = [];
let score = 0;
let best = loadBest();
let frame = 0;
let state = 'ready';
let rafId = 0;
let groundOffset = 0;

const clouds = Array.from({ length: 4 }, () => ({
  x: Math.random() * W,
  y: 30 + Math.random() * 80,
  w: 40 + Math.random() * 60,
  speed: 0.2 + Math.random() * 0.3,
}));

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

function reset() {
  if (state === 'gameover') globalThis.HappyGame?.restart({ reason: 'button_reset' });
  bird = { y: H / 2, vel: 0 };
  pipes = [];
  score = 0;
  frame = 0;
  state = 'ready';
  updateUI();
  draw();
}

function flap() {
  if (state === 'gameover') {
    reset();
    return;
  }
  if (state === 'ready') {
    state = 'playing';
    globalThis.HappyGame?.event('game_resumed', { source: 'input' });
  }
  bird.vel = FLAP_VEL;
}

function update() {
  if (state !== 'playing') return;

  bird.vel += GRAVITY;
  bird.y += bird.vel;

  frame++;
  if (frame % PIPE_INTERVAL === 0) {
    const minTop = 60;
    const maxTop = H - PIPE_GAP - 60 - 80;
    const topH = minTop + Math.random() * (maxTop - minTop);
    pipes.push({ x: W, topH, scored: false });
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].x -= PIPE_SPEED;
    if (pipes[i].x + PIPE_WIDTH < 0) {
      pipes.splice(i, 1);
      continue;
    }
    if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < BIRD_X) {
      pipes[i].scored = true;
      score++;
      if (score > best) {
        best = score;
        saveBest(best);
      }
      updateUI();
    }
  }

  if (bird.y + BIRD_SIZE > H - 80 || bird.y < 0) {
    gameOver();
    return;
  }

  for (const p of pipes) {
    if (
      BIRD_X + BIRD_SIZE > p.x &&
      BIRD_X < p.x + PIPE_WIDTH
    ) {
      if (bird.y < p.topH || bird.y + BIRD_SIZE > p.topH + PIPE_GAP) {
        gameOver();
        return;
      }
    }
  }
}

function gameOver() {
  state = 'gameover';
  globalThis.HappyGame?.finish('lost', { score, best });
}

function updateUI() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  globalThis.HappyGame?.setScore(score, { best });
}

function draw() {
  let gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#8bd2d9');
  gradient.addColorStop(0.7, '#70c5ce');
  gradient.addColorStop(1, '#5bb5bd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (const c of clouds) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w * 0.4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.2, c.y + 5, c.w * 0.3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.25, c.y + 3, c.w * 0.35, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    c.x -= c.speed;
    if (c.x + c.w * 0.5 < 0) {
      c.x = W + c.w * 0.5;
      c.y = 30 + Math.random() * 80;
    }
  }

  groundOffset = (groundOffset + 1.5) % 24;
  ctx.fillStyle = '#ded895';
  ctx.fillRect(0, H - 80, W, 80);
  ctx.fillStyle = '#54a338';
  ctx.fillRect(0, H - 80, W, 12);
  ctx.fillStyle = '#3d8a28';
  for (let i = -groundOffset; i < W; i += 24) {
    ctx.fillRect(i, H - 80, 12, 4);
  }

  for (const p of pipes) {
    let g = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
    g.addColorStop(0, '#4a9a4a');
    g.addColorStop(0.3, '#6bcd6b');
    g.addColorStop(0.7, '#6bcd6b');
    g.addColorStop(1, '#3d8a28');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
    ctx.fillRect(p.x, p.topH + PIPE_GAP, PIPE_WIDTH, H - p.topH - PIPE_GAP - 80);

    ctx.fillStyle = '#3d8a28';
    ctx.fillRect(p.x - 4, p.topH - 26, PIPE_WIDTH + 8, 26);
    ctx.fillRect(p.x - 4, p.topH + PIPE_GAP, PIPE_WIDTH + 8, 26);
    ctx.fillStyle = '#5cb85c';
    ctx.fillRect(p.x - 2, p.topH - 20, PIPE_WIDTH + 4, 14);
    ctx.fillRect(p.x - 2, p.topH + PIPE_GAP + 6, PIPE_WIDTH + 4, 14);
  }

  ctx.save();
  ctx.translate(BIRD_X + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
  const angle = Math.min(Math.max(bird.vel * 3, -30), 70) * Math.PI / 180;
  ctx.rotate(angle);

  ctx.fillStyle = '#f5c842';
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE / 2 + 2, BIRD_SIZE / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e8a317';
  ctx.beginPath();
  ctx.ellipse(-4, 4, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(6, -4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(8, -4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e85a3a';
  ctx.beginPath();
  ctx.moveTo(BIRD_SIZE / 2 + 2, -2);
  ctx.lineTo(BIRD_SIZE / 2 + 10, 0);
  ctx.lineTo(BIRD_SIZE / 2 + 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (state === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white';
    ctx.font = '48px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('跳跳鸟', W / 2, H / 2 - 40);
    ctx.font = '24px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('点击或按空格开始', W / 2, H / 2 + 20);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'white';
    ctx.font = '48px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', W / 2, H / 2 - 60);
    ctx.font = '32px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText(`得分: ${score}`, W / 2, H / 2);
    ctx.fillText(`最高: ${best}`, W / 2, H / 2 + 40);
    ctx.font = '20px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('点击或按空格重新开始', W / 2, H / 2 + 90);
  }
}

function loop() {
  update();
  draw();
  rafId = requestAnimationFrame(loop);
}

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  flap();
});
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  flap();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'ArrowUp') {
    e.preventDefault();
    flap();
  }
});
restartBtn.addEventListener('click', reset);

bestEl.textContent = best;
reset();
loop();
