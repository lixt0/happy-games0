import {
  jumpDistance,
  chargeTick,
  makeNextBlock,
  classifyLanding,
  MAX_JUMP,
  JUMP_FRAMES,
  PERFECT_R,
  CHARGE_RATE,
} from '/jump/logic.js';

const STORAGE_KEY = 'happygames.jump.best';

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

const CX = 150;            // 当前方块在屏幕上的横坐标
const BLOCK_TOP_Y = 430;   // 方块顶面 y，棋子立于其上
const G = 0.625;
const JUMP_VY = -10;

let blocks, currentIdx;
let piece;
let power, charging, state;
let camX, camTarget, camShake;
let score, best;
let combo, lastPerfect, perfectGlow;
let jumpDist, jFrame;
let fallVy, fallFrames;
let rafId = 0;
let keyDown = false;

function loadBest() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
function saveBest(v) {
  try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
}

function reset() {
  if (state === 'dead') globalThis.HappyGame?.restart({ reason: 'button_reset' });
  const first = { x: 0, w: 56 };
  const next = makeNextBlock(first);
  blocks = [first, next];
  currentIdx = 0;
  piece = { x: first.x, y: 0, vy: 0, rot: 0 };
  power = 0;
  charging = false;
  state = 'ready';
  camX = first.x - CX;
  camTarget = camX;
  camShake = 0;
  score = 0;
  combo = 0;
  lastPerfect = false;
  perfectGlow = 0;
  jumpDist = 0;
  jFrame = 0;
  fallVy = 0;
  fallFrames = 0;
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  globalThis.HappyGame?.setScore(score, { best, combo });
}

function startCharge() {
  if (state === 'ready' || state === 'idle') {
    state = 'charging';
    globalThis.HappyGame?.event('game_resumed', { source: 'input' });
    power = 0;
    charging = true;
  } else if (state === 'dead') {
    reset();
  }
}

function releaseCharge() {
  if (!charging || state !== 'charging') return;
  charging = false;
  const cur = blocks[currentIdx];
  const nx = blocks[currentIdx + 1];
  jumpDist = jumpDistance(power);
  piece.vy = JUMP_VY;
  piece.y = piece.y === 0 ? -0.01 : piece.y;
  jFrame = 0;
  state = 'jumping';
}

function land() {
  const cur = blocks[currentIdx];
  const next = blocks[currentIdx + 1];
  const landX = piece.x;
  const r = classifyLanding(landX, cur, next);

  if (r.result === 'short' || r.result === 'long') {
    state = 'falling';
    fallVy = 0;
    fallFrames = 0;
    combo = 0;
    lastPerfect = false;
    globalThis.HappyGame?.finish('lost', { score, combo, landing: r.result });
    return;
  }

  if (r.result === 'perfect') {
    piece.x = r.snap;
    score += 2 + combo;
    combo++;
    lastPerfect = true;
    perfectGlow = 1;
    camShake = 6;
  } else {
    piece.x = Math.max(next.x - next.w / 2 + 4, Math.min(next.x + next.w / 2 - 4, piece.x));
    score += 1;
    combo = 0;
    lastPerfect = false;
  }

  if (score > best) {
    best = score;
    saveBest(best);
  }

  currentIdx++;
  blocks.push(makeNextBlock(blocks[blocks.length - 1]));
  camTarget = blocks[currentIdx].x - CX;
  piece.x = blocks[currentIdx].x;
  piece.y = 0;
  piece.vy = 0;
  piece.rot = 0;
  power = 0;
  state = 'idle';
  updateUI();
}

function update() {
  // 相机平滑
  camX += (camTarget - camX) * 0.18;
  if (camShake > 0) camShake *= 0.85;
  if (perfectGlow > 0) perfectGlow = Math.max(0, perfectGlow - 0.04);

  if (state === 'charging') {
    power = chargeTick(power);
  } else if (state === 'jumping') {
    piece.vy += G;
    piece.y += piece.vy;
    piece.x += jumpDist / JUMP_FRAMES;
    piece.rot += (Math.PI * 2 / JUMP_FRAMES) * (jumpDist >= 0 ? 1 : -1);
    jFrame++;
    if (jFrame >= JUMP_FRAMES) land();
  } else if (state === 'falling') {
    fallVy += G * 1.6;
    piece.y += fallVy;
    piece.x += jumpDist / JUMP_FRAMES * 0.6;
    fallFrames++;
    if (piece.y > 200) state = 'dead';
  }
}

function sx(worldX) { return worldX - camX; }

function drawBlock(b) {
  const x = sx(b.x);
  const w = b.w;
  const top = BLOCK_TOP_Y;
  const h = 26 + (b.w % 7);
  ctx.save();
  // 阴影
  ctx.fillStyle = 'rgba(60,40,20,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, top + h + 2, w / 2 + 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 柱身
  const g = ctx.createLinearGradient(x - w / 2, top, x + w / 2, top + h);
  g.addColorStop(0, '#c9a35a');
  g.addColorStop(0.5, '#e0bd7e');
  g.addColorStop(1, '#b8893f');
  ctx.fillStyle = g;
  roundRect(ctx, x - w / 2, top, w, h, 6);
  ctx.fill();
  // 顶面
  ctx.fillStyle = '#e8c989';
  roundRect(ctx, x - w / 2, top, w, 8, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, x - w / 2 + 2, top + 1, w - 4, 3, 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, Math.min(w, h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawPiece() {
  const x = sx(piece.x);
  let y = BLOCK_TOP_Y + piece.y;
  let scaleSX = 1, scaleSY = 1;
  if (state === 'charging') {
    const squash = power * 0.42;
    scaleSX = 1 + squash * 0.5;
    scaleSY = 1 - squash;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(piece.rot);
  // 阴影
  ctx.fillStyle = 'rgba(40,25,10,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 12 * scaleSX, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 棋子底座
  ctx.scale(scaleSX, scaleSY);
  const baseG = ctx.createLinearGradient(0, -22, 0, 2);
  baseG.addColorStop(0, '#3a2a17');
  baseG.addColorStop(0.5, '#1a1a1a');
  baseG.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = baseG;
  roundRect(ctx, -10, -22, 20, 24, 8);
  ctx.fill();
  // 顶面亮带
  ctx.fillStyle = 'rgba(220,200,170,0.35)';
  roundRect(ctx, -8, -20, 16, 4, 3);
  ctx.fill();
  ctx.restore();

  // 蓄力光环
  if (state === 'charging' && power > 0.02) {
    ctx.save();
    ctx.translate(x, BLOCK_TOP_Y + 2);
    ctx.strokeStyle = `rgba(192,57,43,${Math.min(1, power + 0.2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + power * 8, 0, Math.PI * 2 * power);
    ctx.stroke();
    ctx.restore();
  }
  if (perfectGlow > 0) {
    ctx.save();
    ctx.translate(x, BLOCK_TOP_Y + 2);
    ctx.strokeStyle = `rgba(106,170,100,${perfectGlow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + (1 - perfectGlow) * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawScene() {
  // 天空渐变
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#f7eed6');
  sky.addColorStop(0.6, '#f1e4c4');
  sky.addColorStop(1, '#e8d6ac');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 远山
  ctx.fillStyle = 'rgba(110,90,64,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, 360);
  for (let i = 0; i <= W; i += 40) {
    ctx.lineTo(i, 360 - Math.sin(i * 0.05 + camX * 0.002) * 26);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // 地面
  ctx.fillStyle = '#d9c79a';
  ctx.fillRect(0, BLOCK_TOP_Y + 30, W, H);

  // 远景方块（视差）
  ctx.fillStyle = 'rgba(184,137,63,0.25)';
  for (let i = -2; i < 10; i++) {
    const wx = i * 90 - (camX * 0.3) % 90;
    ctx.fillRect(wx % (W + 90) - 45, 380, 30, 20);
  }

  // 相机抖动
  if (camShake > 0.3) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * camShake, (Math.random() - 0.5) * camShake);
  }

  // 方块（只画屏幕内的）
  for (const b of blocks) {
    const x = sx(b.x);
    if (x < -80 || x > W + 80) continue;
    drawBlock(b);
  }

  drawPiece();

  if (camShake > 0.3) ctx.restore();

  // 蓄力条
  if (state === 'charging') {
    const bw = 200, bh = 8;
    const bx = (W - bw) / 2;
    const by = H - 46;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.fill();
    const fw = bw * power;
    const pg = ctx.createLinearGradient(bx, 0, bx + fw, 0);
    pg.addColorStop(0, '#e8a317');
    pg.addColorStop(1, '#c0392b');
    ctx.fillStyle = pg;
    roundRect(ctx, bx, by, fw, bh, 4);
    ctx.fill();
  }

  // 连击提示
  if (combo > 1) {
    ctx.fillStyle = '#6aaa64';
    ctx.font = '20px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`连击 ×${combo}`, W / 2, 56);
  }

  if (state === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '52px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('跳一跳', W / 2, H / 2 - 40);
    ctx.font = '22px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('长按蓄力，松手起跳', W / 2, H / 2 + 16);
    ctx.font = '18px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('点击任意位置开始', W / 2, H / 2 + 52);
  }

  if (state === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = '48px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', W / 2, H / 2 - 60);
    ctx.font = '30px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText(`得分: ${score}`, W / 2, H / 2);
    ctx.fillText(`最高: ${best}`, W / 2, H / 2 + 40);
    ctx.font = '20px "Kaiti SC", "STKaiti", "KaiTi", serif';
    ctx.fillText('点击或按空格重新开始', W / 2, H / 2 + 90);
  }
}

function loop() {
  update();
  drawScene();
  rafId = requestAnimationFrame(loop);
}

// 输入
function onDown(e) {
  if (e.cancelable) e.preventDefault();
  startCharge();
}
function onUp(e) {
  if (e && e.cancelable) e.preventDefault();
  releaseCharge();
}

canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('mouseleave', onUp);
canvas.addEventListener('touchstart', onDown, { passive: false });
canvas.addEventListener('touchend', onUp, { passive: false });
canvas.addEventListener('touchcancel', onUp, { passive: false });

window.addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Spacebar') && !e.repeat) {
    e.preventDefault();
    if (!keyDown) { keyDown = true; startCharge(); }
  }
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    keyDown = false;
    releaseCharge();
  }
});

restartBtn.addEventListener('click', (e) => {
  e.preventDefault();
  reset();
});

best = loadBest();
reset();
loop();
