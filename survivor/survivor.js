import { ARENA, clampPlayer, createRun, enemyProfile, levelUp, moveVector, upgradeChoices } from './logic.js';

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const DPR = window.devicePixelRatio || 1;
const $ = id => document.getElementById(id);
const keys = { up: false, down: false, left: false, right: false };

canvas.width = ARENA.width * DPR;
canvas.height = ARENA.height * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

let run, player, enemies, shots, gems, choices, state, fireClock, spawnClock, lastFrame, raf;

function reset() {
  if (state === 'dead') globalThis.HappyGame?.restart({ reason: 'button_reset' });
  run = createRun();
  player = { x: ARENA.width / 2, y: ARENA.height / 2, hit: 0 };
  enemies = [];
  shots = [];
  gems = [];
  choices = [];
  state = 'ready';
  fireClock = 0;
  spawnClock = 0;
  lastFrame = performance.now();
  updateUi();
}

function start() {
  if (state === 'dead') reset();
  state = 'playing';
  globalThis.HappyGame?.event('game_resumed', { source: 'start_button' });
  $('start-screen').classList.add('hidden');
  $('upgrade-screen').classList.add('hidden');
}

function updateUi() {
  const seconds = Math.floor(run.time);
  $('time').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  $('level').textContent = run.level;
  $('kills').textContent = run.kills;
  globalThis.HappyGame?.setScore(run.kills, { time: run.time, level: run.level, scoreKind: 'kills' });
  $('hp-bar').style.width = `${Math.max(0, run.hp / run.maxHp * 100)}%`;
  $('xp-bar').style.width = `${Math.max(0, run.xp / run.nextXp * 100)}%`;
}

function spawnEnemy() {
  const profile = enemyProfile(run.time);
  const side = Math.floor(Math.random() * 4);
  const pad = 22;
  const point = side === 0 ? { x: Math.random() * ARENA.width, y: -pad } : side === 1 ? { x: ARENA.width + pad, y: Math.random() * ARENA.height } : side === 2 ? { x: Math.random() * ARENA.width, y: ARENA.height + pad } : { x: -pad, y: Math.random() * ARENA.height };
  const elite = Math.random() < Math.min(.24, run.time / 600);
  enemies.push({ ...point, hp: profile.hp * (elite ? 3.2 : 1), maxHp: profile.hp * (elite ? 3.2 : 1), speed: profile.speed * (elite ? .72 : 1) * (.85 + Math.random() * .3), r: elite ? 16 : 10, xp: profile.xp * (elite ? 5 : 1), elite, hit: 0 });
}

function fire() {
  if (!enemies.length) return;
  const targets = [...enemies].sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
  for (let i = 0; i < run.projectiles; i++) {
    const target = targets[i % targets.length];
    const angle = Math.atan2(target.y - player.y, target.x - player.x) + (i - (run.projectiles - 1) / 2) * .16;
    shots.push({ x: player.x, y: player.y, vx: Math.cos(angle) * 460, vy: Math.sin(angle) * 460, life: 1.05, damage: run.damage, r: 4 });
  }
}

function gainXp(amount) {
  run.xp += amount;
  const result = levelUp(run);
  run = result.state;
  if (result.levels) openUpgrade();
}

function openUpgrade() {
  state = 'upgrade';
  choices = upgradeChoices();
  $('upgrade-list').innerHTML = choices.map(choice => `<button class="upgrade-choice" data-upgrade="${choice.id}" type="button"><b>${choice.name}</b><span>${choice.detail}</span></button>`).join('');
  $('upgrade-list').querySelectorAll('[data-upgrade]').forEach(button => button.onclick = () => {
    const choice = choices.find(item => item.id === button.dataset.upgrade);
    run = choice.apply(run);
    state = 'playing';
    $('upgrade-screen').classList.add('hidden');
    updateUi();
  });
  $('upgrade-screen').classList.remove('hidden');
}

function update(dt) {
  if (state !== 'playing') return;
  run.time += dt;
  const vector = moveVector(keys);
  player = clampPlayer({ ...player, x: player.x + vector.x * run.speed * dt, y: player.y + vector.y * run.speed * dt, hit: Math.max(0, player.hit - dt) });
  fireClock -= dt;
  if (fireClock <= 0) { fire(); fireClock += run.fireDelay; }
  spawnClock -= dt;
  const profile = enemyProfile(run.time);
  if (spawnClock <= 0) { spawnEnemy(); spawnClock += profile.spawnEvery; }

  for (const enemy of enemies) {
    const dx = player.x - enemy.x, dy = player.y - enemy.y, distance = Math.hypot(dx, dy) || 1;
    enemy.x += dx / distance * enemy.speed * dt;
    enemy.y += dy / distance * enemy.speed * dt;
    enemy.hit = Math.max(0, enemy.hit - dt);
    if (distance < enemy.r + 12 && player.hit <= 0) { run.hp -= enemy.elite ? 13 : 7; player.hit = .48; }
  }
  for (const shot of shots) { shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt; }
  for (const shot of shots) for (const enemy of enemies) {
    if (shot.life <= 0 || enemy.hp <= 0) continue;
    if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < shot.r + enemy.r) { enemy.hp -= shot.damage; enemy.hit = .12; shot.life = 0; }
  }
  const fallen = enemies.filter(enemy => enemy.hp <= 0);
  for (const enemy of fallen) gems.push({ x: enemy.x, y: enemy.y, value: enemy.xp, r: enemy.elite ? 7 : 4 });
  if (fallen.length) run.kills += fallen.length;
  enemies = enemies.filter(enemy => enemy.hp > 0 && enemy.x > -60 && enemy.x < ARENA.width + 60 && enemy.y > -60 && enemy.y < ARENA.height + 60);
  shots = shots.filter(shot => shot.life > 0 && shot.x > -20 && shot.x < ARENA.width + 20 && shot.y > -20 && shot.y < ARENA.height + 20);
  for (const gem of gems) {
    const dx = player.x - gem.x, dy = player.y - gem.y, distance = Math.hypot(dx, dy) || 1;
    if (distance < run.pickup) { gem.x += dx / distance * 320 * dt; gem.y += dy / distance * 320 * dt; }
    if (distance < 17) gem.collected = true;
  }
  const collected = gems.filter(gem => gem.collected);
  gems = gems.filter(gem => !gem.collected);
  collected.forEach(gem => gainXp(gem.value));
  if (run.hp <= 0) gameOver();
  updateUi();
}

function gameOver() {
  state = 'dead';
  globalThis.HappyGame?.finish('lost', { score: run.kills, time: run.time, level: run.level });
  $('start-screen').classList.remove('hidden');
  $('start-screen').innerHTML = `<h2>星火熄灭</h2><p>你坚持了 ${$('time').textContent}，击败 ${run.kills} 个影兽。</p><button id="start" class="reset-btn" type="button">再试一次</button>`;
  $('start').onclick = start;
}

function circle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function draw() {
  const bg = ctx.createLinearGradient(0, 0, ARENA.width, ARENA.height); bg.addColorStop(0, '#153330'); bg.addColorStop(1, '#1a263d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.strokeStyle = 'rgba(244,190,101,.08)'; ctx.lineWidth = 1;
  for (let x = 0; x < ARENA.width; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.height); ctx.stroke(); }
  for (let y = 0; y < ARENA.height; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.width, y); ctx.stroke(); }
  for (const gem of gems) { circle(gem.x, gem.y, gem.r + 3, 'rgba(244,190,101,.15)'); circle(gem.x, gem.y, gem.r, '#f4be65'); }
  for (const shot of shots) { circle(shot.x, shot.y, shot.r + 4, 'rgba(255,164,83,.18)'); circle(shot.x, shot.y, shot.r, '#ffb25d'); }
  for (const enemy of enemies) { circle(enemy.x, enemy.y, enemy.r + 3, enemy.elite ? 'rgba(192,57,75,.28)' : 'rgba(126,166,130,.2)'); circle(enemy.x, enemy.y, enemy.r, enemy.hit ? '#fff1d2' : enemy.elite ? '#bc435b' : '#7ea682'); if (enemy.elite) { ctx.strokeStyle = '#f4be65'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r + 4, 0, Math.PI * 2); ctx.stroke(); } }
  circle(player.x, player.y, 20, 'rgba(244,190,101,.18)'); circle(player.x, player.y, 12, player.hit ? '#fff' : '#f4be65'); circle(player.x + 3, player.y - 3, 3, '#fff8e9');
  ctx.fillStyle = 'rgba(8,20,20,.56)'; ctx.fillRect(12, 12, 146, 25); ctx.fillStyle = '#f8f1de'; ctx.font = '13px system-ui'; ctx.fillText(`怪潮 ${Math.floor(run.time / 20) + 1}`, 23, 29);
}

function loop(now) { const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now; update(dt); draw(); raf = requestAnimationFrame(loop); }

function setKey(key, pressed) { if (key === 'w' || key === 'ArrowUp') keys.up = pressed; if (key === 's' || key === 'ArrowDown') keys.down = pressed; if (key === 'a' || key === 'ArrowLeft') keys.left = pressed; if (key === 'd' || key === 'ArrowRight') keys.right = pressed; }
window.addEventListener('keydown', event => { setKey(event.key, true); if (['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) event.preventDefault(); });
window.addEventListener('keyup', event => setKey(event.key, false));
canvas.addEventListener('pointermove', event => { if (!event.buttons || state !== 'playing') return; const rect = canvas.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width * ARENA.width, y = (event.clientY - rect.top) / rect.height * ARENA.height; keys.left = x < player.x - 12; keys.right = x > player.x + 12; keys.up = y < player.y - 12; keys.down = y > player.y + 12; });
canvas.addEventListener('pointerup', () => Object.keys(keys).forEach(key => keys[key] = false));
$('start').onclick = start;
$('restart').onclick = () => { reset(); start(); };
reset();
raf = requestAnimationFrame(loop);
