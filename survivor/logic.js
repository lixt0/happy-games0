export const ARENA = { width: 720, height: 520 };

export const UPGRADES = [
  { id: 'power', name: '炽焰', detail: '星火伤害 +5', apply: state => ({ ...state, damage: state.damage + 5 }) },
  { id: 'tempo', name: '疾射', detail: '攻击间隔 -12%', apply: state => ({ ...state, fireDelay: Math.max(.12, state.fireDelay * .88) }) },
  { id: 'stride', name: '风行', detail: '移动速度 +14%', apply: state => ({ ...state, speed: state.speed * 1.14 }) },
  { id: 'ember', name: '余烬', detail: '星火数量 +1', apply: state => ({ ...state, projectiles: state.projectiles + 1 }) },
  { id: 'vigor', name: '复苏', detail: '立即恢复 24 点生命', apply: state => ({ ...state, hp: Math.min(state.maxHp, state.hp + 24) }) },
  { id: 'magnet', name: '引力', detail: '拾取范围 +28', apply: state => ({ ...state, pickup: state.pickup + 28 }) },
];

export function createRun() {
  return { hp: 100, maxHp: 100, damage: 12, speed: 205, fireDelay: .48, projectiles: 1, pickup: 54, level: 1, xp: 0, nextXp: 8, kills: 0, time: 0 };
}

export function moveVector(keys) {
  const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const length = Math.hypot(x, y);
  return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}

export function enemyProfile(time) {
  const wave = Math.floor(time / 20);
  return { hp: 20 + wave * 8, speed: 38 + wave * 5, spawnEvery: Math.max(.18, .8 - time * .009), xp: 1 + Math.floor(wave / 2) };
}

export function levelUp(state) {
  let next = { ...state, level: state.level, xp: state.xp, nextXp: state.nextXp };
  let levels = 0;
  while (next.xp >= next.nextXp) {
    next.xp -= next.nextXp;
    next.level += 1;
    next.nextXp = Math.ceil(next.nextXp * 1.34);
    levels += 1;
  }
  return { state: next, levels };
}

export function upgradeChoices(rng = Math.random) {
  const pool = [...UPGRADES];
  const picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return picks;
}

export function clampPlayer(player) {
  return { ...player, x: Math.max(16, Math.min(ARENA.width - 16, player.x)), y: Math.max(16, Math.min(ARENA.height - 16, player.y)) };
}
