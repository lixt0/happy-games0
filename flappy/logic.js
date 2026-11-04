export const GRAVITY = 0.5;
export const FLAP_VEL = -8;
export const PIPE_GAP = 140;
export const PIPE_WIDTH = 52;
export const PIPE_SPEED = 2.5;
export const PIPE_INTERVAL = 90;
export const BIRD_SIZE = 24;
export const BIRD_X = 80;

export function createGameState(canvasH) {
  return {
    bird: { y: canvasH / 2, vel: 0 },
    pipes: [],
    score: 0,
    frame: 0,
    state: 'ready',
    canvasH,
  };
}

export function flap(gs) {
  if (gs.state === 'gameover') {
    return { ...createGameState(gs.canvasH), best: gs.best || 0 };
  }
  const next = { ...gs, bird: { ...gs.bird } };
  if (next.state === 'ready') next.state = 'playing';
  next.bird.vel = FLAP_VEL;
  return next;
}

export function update(gs, rng = Math.random) {
  if (gs.state !== 'playing') return { gs, events: [] };

  const events = [];
  const bird = { y: gs.bird.y + gs.bird.vel + GRAVITY, vel: gs.bird.vel + GRAVITY };
  const frame = gs.frame + 1;
  const pipes = gs.pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED }));

  if (frame % PIPE_INTERVAL === 0) {
    const minTop = 60;
    const maxTop = gs.canvasH - PIPE_GAP - 60 - 80;
    const topH = minTop + rng() * (maxTop - minTop);
    pipes.push({ x: 400, topH, scored: false });
    events.push({ type: 'pipe', topH });
  }

  let score = gs.score;
  for (let i = pipes.length - 1; i >= 0; i--) {
    if (pipes[i].x + PIPE_WIDTH < 0) {
      pipes.splice(i, 1);
      continue;
    }
    if (!pipes[i].scored && pipes[i].x + PIPE_WIDTH < BIRD_X) {
      pipes[i].scored = true;
      score++;
      events.push({ type: 'score', score });
    }
  }

  let state = gs.state;
  const groundY = gs.canvasH - 80;
  if (bird.y + BIRD_SIZE > groundY || bird.y < 0) {
    state = 'gameover';
    events.push({ type: 'gameover', reason: 'boundary' });
  }

  if (state === 'playing') {
    for (const p of pipes) {
      if (BIRD_X + BIRD_SIZE > p.x && BIRD_X < p.x + PIPE_WIDTH) {
        if (bird.y < p.topH || bird.y + BIRD_SIZE > p.topH + PIPE_GAP) {
          state = 'gameover';
          events.push({ type: 'gameover', reason: 'pipe' });
          break;
        }
      }
    }
  }

  return {
    gs: { ...gs, bird, pipes, score, frame, state },
    events,
  };
}

export function checkCollision(bird, pipes, canvasH) {
  const groundY = canvasH - 80;
  if (bird.y + BIRD_SIZE > groundY || bird.y < 0) return 'boundary';
  for (const p of pipes) {
    if (BIRD_X + BIRD_SIZE > p.x && BIRD_X < p.x + PIPE_WIDTH) {
      if (bird.y < p.topH || bird.y + BIRD_SIZE > p.topH + PIPE_GAP) {
        return 'pipe';
      }
    }
  }
  return null;
}
