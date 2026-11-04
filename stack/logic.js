export const ARENA_WIDTH = 420;
export const START_WIDTH = 220;
export const EDGE_PADDING = 20;
export const PERFECT_TOLERANCE = 5;
export const START_SPEED = 2.35;
export const MAX_SPEED = 6.4;

export function speedForLevel(level) {
  return Math.min(MAX_SPEED, START_SPEED + Math.max(0, level - 1) * 0.14);
}

export function calculatePlacement(moving, support, tolerance = PERFECT_TOLERANCE) {
  const delta = moving.x - support.x;
  if (Math.abs(delta) <= tolerance) {
    return {
      result: 'perfect',
      block: { x: support.x, width: support.width },
      fragment: null,
    };
  }

  const movingLeft = moving.x - moving.width / 2;
  const movingRight = moving.x + moving.width / 2;
  const supportLeft = support.x - support.width / 2;
  const supportRight = support.x + support.width / 2;
  const overlapLeft = Math.max(movingLeft, supportLeft);
  const overlapRight = Math.min(movingRight, supportRight);

  if (overlapRight <= overlapLeft) {
    return { result: 'miss', block: null, fragment: { ...moving } };
  }

  const block = {
    x: (overlapLeft + overlapRight) / 2,
    width: overlapRight - overlapLeft,
  };
  let fragment;
  if (delta < 0) {
    fragment = {
      x: (movingLeft + overlapLeft) / 2,
      width: overlapLeft - movingLeft,
    };
  } else {
    fragment = {
      x: (overlapRight + movingRight) / 2,
      width: movingRight - overlapRight,
    };
  }

  return { result: 'placed', block, fragment };
}

export function advanceMover(mover, arenaWidth = ARENA_WIDTH, frameScale = 1) {
  const minX = EDGE_PADDING + mover.width / 2;
  const maxX = arenaWidth - EDGE_PADDING - mover.width / 2;
  let x = mover.x + mover.speed * mover.direction * frameScale;
  let direction = mover.direction;

  if (x > maxX) {
    x = maxX - (x - maxX);
    direction = -1;
  } else if (x < minX) {
    x = minX + (minX - x);
    direction = 1;
  }

  return { ...mover, x, direction };
}

export function makeMover(width, level, arenaWidth = ARENA_WIDTH) {
  const direction = level % 2 === 1 ? 1 : -1;
  return {
    x: direction === 1
      ? EDGE_PADDING + width / 2
      : arenaWidth - EDGE_PADDING - width / 2,
    width,
    direction,
    speed: speedForLevel(level),
  };
}

export function createGameState(arenaWidth = ARENA_WIDTH) {
  const base = { x: arenaWidth / 2, width: START_WIDTH, level: 0 };
  return {
    blocks: [base],
    active: makeMover(START_WIDTH, 1, arenaWidth),
    score: 0,
    combo: 0,
    state: 'ready',
  };
}

export function placeActive(state, arenaWidth = ARENA_WIDTH) {
  if (state.state !== 'playing') {
    return { state, placement: null };
  }

  const support = state.blocks[state.blocks.length - 1];
  const placement = calculatePlacement(state.active, support);
  if (placement.result === 'miss') {
    return {
      state: { ...state, state: 'gameover', combo: 0 },
      placement,
    };
  }

  const score = state.score + 1;
  const combo = placement.result === 'perfect' ? state.combo + 1 : 0;
  const level = state.blocks.length;
  const block = { ...placement.block, level };
  return {
    state: {
      ...state,
      blocks: [...state.blocks, block],
      active: makeMover(block.width, level + 1, arenaWidth),
      score,
      combo,
    },
    placement,
  };
}
