// 跳一跳 · 纯逻辑（供单元测试，不含渲染）

export const MAX_JUMP = 240;
export const CHARGE_FRAMES = 36;
export const CHARGE_RATE = 1 / CHARGE_FRAMES;
export const JUMP_FRAMES = 32;
export const PERFECT_R = 8;
export const DIST_MIN = 70;
export const DIST_MAX = 195;
export const BLOCK_W_MIN = 34;
export const BLOCK_W_MAX = 58;

export function jumpDistance(power) {
  const p = power < 0 ? 0 : power > 1 ? 1 : power;
  return p * MAX_JUMP;
}

export function chargeTick(power) {
  return Math.min(1, power + CHARGE_RATE);
}

export function makeNextBlock(prevBlock, rng = Math.random) {
  const w = Math.round(BLOCK_W_MIN + rng() * (BLOCK_W_MAX - BLOCK_W_MIN));
  const d = Math.round(DIST_MIN + rng() * (DIST_MAX - DIST_MIN));
  return { x: prevBlock.x + d, w, d };
}

// 落点判定：landX 为棋子落地的世界横坐标
export function classifyLanding(landX, currentBlock, nextBlock) {
  const nx = nextBlock.x;
  const hw = nextBlock.w / 2;
  if (landX < nx - hw) return { result: 'short' };
  if (landX > nx + hw) return { result: 'long' };
  if (Math.abs(landX - nx) <= PERFECT_R) return { result: 'perfect', snap: nx };
  return { result: 'ok', snap: null };
}

export function createGameState(rng = Math.random) {
  const first = { x: 0, w: 56 };
  const next = makeNextBlock(first, rng);
  return {
    blocks: [first, next],
    currentIdx: 0,
    piece: { x: first.x, y: 0, vy: 0, rot: 0 },
    power: 0,
    score: 0,
    combo: 0,
    state: 'ready',
  };
}

// 跳跃一帧的纯运动学更新（不感知输入）
export function tickJump(piece, jumpDist, frame) {
  const next = { ...piece };
  next.x += jumpDist / JUMP_FRAMES;
  if (frame > 0) next.y = piece.y === 0 && frame === 1 ? -10 : next.y;
  return next;
}