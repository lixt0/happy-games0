export const BOARD_SIZE = 7;
export const ECHO_LENGTH = 6;

const DELTAS = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function positionKey(pos) {
  return `${pos.x},${pos.y}`;
}

function createRng(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(items, rng) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function allCells(size) {
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) cells.push({ x, y });
  }
  return cells;
}

export function isLevelConnected(size, blocked, start) {
  const blockedKeys = new Set(blocked.map(positionKey));
  if (blockedKeys.has(positionKey(start))) return false;

  const queue = [start];
  const visited = new Set([positionKey(start)]);

  while (queue.length > 0) {
    const current = queue.shift();
    for (const delta of Object.values(DELTAS)) {
      const next = { x: current.x + delta.x, y: current.y + delta.y };
      const key = positionKey(next);
      if (
        next.x < 0 || next.x >= size || next.y < 0 || next.y >= size ||
        blockedKeys.has(key) || visited.has(key)
      ) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return visited.size === size * size - blockedKeys.size;
}

function pickSpreadOutCells(candidates, count, start, rng) {
  const pool = shuffle(candidates, rng);
  const selected = [];

  while (selected.length < count && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -1;
    for (let i = 0; i < pool.length; i++) {
      const anchors = [start, ...selected];
      const score = Math.min(...anchors.map(anchor => manhattan(pool[i], anchor)));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    selected.push(pool.splice(bestIndex, 1)[0]);
  }

  return selected;
}

export function generateLevel(level = 1, seed = Date.now()) {
  const safeLevel = Math.max(1, Math.floor(level));
  const size = BOARD_SIZE;
  const start = { x: 3, y: 3 };

  if (safeLevel === 1) {
    return {
      level: safeLevel,
      size,
      start,
      blocked: [],
      seals: [
        { x: 0, y: 0 },
        { x: 6, y: 0 },
        { x: 0, y: 6 },
        { x: 6, y: 6 },
      ],
    };
  }

  const rng = createRng(seed);
  const obstacleTarget = Math.min(10, safeLevel + 1);
  const sealTarget = Math.min(8, safeLevel + 3);
  const candidates = shuffle(
    allCells(size).filter(cell => !samePosition(cell, start)),
    rng,
  );
  const blocked = [];

  for (const cell of candidates) {
    if (blocked.length >= obstacleTarget) break;
    const attempt = [...blocked, cell];
    if (isLevelConnected(size, attempt, start)) blocked.push(cell);
  }

  const blockedKeys = new Set(blocked.map(positionKey));
  const sealCandidates = allCells(size).filter(cell => (
    !samePosition(cell, start) && !blockedKeys.has(positionKey(cell))
  ));
  const seals = pickSpreadOutCells(sealCandidates, sealTarget, start, rng);

  return { level: safeLevel, size, start, blocked, seals };
}

export function createGameState(level = 1, seed = Date.now()) {
  const layout = generateLevel(level, seed);
  return {
    ...layout,
    player: { ...layout.start },
    seals: layout.seals.map(seal => ({ ...seal })),
    totalSeals: layout.seals.length,
    collected: 0,
    moves: 0,
    echoes: [],
    currentPath: [{ ...layout.start }],
    status: 'playing',
    events: ['start'],
  };
}

export function stepsUntilEcho(state) {
  return ECHO_LENGTH - (state.currentPath.length - 1);
}

export function advanceEcho(echo) {
  if (echo.path.length < 2) return { ...echo };

  let direction = echo.direction;
  let nextIndex = echo.index + direction;
  if (nextIndex >= echo.path.length || nextIndex < 0) {
    direction *= -1;
    nextIndex = echo.index + direction;
  }

  return { ...echo, index: nextIndex, direction };
}

function cloneState(state) {
  return {
    ...state,
    start: { ...state.start },
    player: { ...state.player },
    blocked: state.blocked.map(cell => ({ ...cell })),
    seals: state.seals.map(seal => ({ ...seal })),
    currentPath: state.currentPath.map(pos => ({ ...pos })),
    echoes: state.echoes.map(echo => ({
      ...echo,
      path: echo.path.map(pos => ({ ...pos })),
    })),
    events: [],
  };
}

export function advanceGame(state, direction) {
  if (state.status !== 'playing' || !DELTAS[direction]) return state;

  const delta = DELTAS[direction];
  const destination = {
    x: state.player.x + delta.x,
    y: state.player.y + delta.y,
  };
  const blockedKeys = new Set(state.blocked.map(positionKey));
  if (
    destination.x < 0 || destination.x >= state.size ||
    destination.y < 0 || destination.y >= state.size ||
    blockedKeys.has(positionKey(destination))
  ) {
    return { ...state, events: ['blocked'] };
  }

  const next = cloneState(state);
  const previousPlayer = { ...state.player };
  const previousEchoPositions = state.echoes.map(echo => echo.path[echo.index]);
  next.player = destination;
  next.moves++;
  next.currentPath.push({ ...destination });
  next.echoes = next.echoes.map(advanceEcho);

  const hitEcho = next.echoes.some((echo, index) => {
    const echoPosition = echo.path[echo.index];
    const crossed = samePosition(previousEchoPositions[index], destination) &&
      samePosition(echoPosition, previousPlayer);
    return samePosition(echoPosition, destination) || crossed;
  });

  if (hitEcho) {
    next.status = 'lost';
    next.events.push('collision');
    return next;
  }

  const sealIndex = next.seals.findIndex(seal => samePosition(seal, destination));
  if (sealIndex >= 0) {
    next.seals.splice(sealIndex, 1);
    next.collected++;
    next.events.push('seal');
  }

  if (next.currentPath.length === ECHO_LENGTH + 1) {
    const echo = {
      id: next.moves / ECHO_LENGTH,
      path: next.currentPath.map(pos => ({ ...pos })),
      index: 0,
      direction: 1,
    };
    next.echoes.push(echo);
    next.currentPath = [{ ...destination }];
    next.events.push('echo');

    if (samePosition(echo.path[0], destination)) {
      next.status = 'lost';
      next.events.push('collision');
      return next;
    }
  }

  if (next.seals.length === 0) {
    next.status = 'won';
    next.events.push('won');
  }

  if (next.events.length === 0) next.events.push('move');
  return next;
}
