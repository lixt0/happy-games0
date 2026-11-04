export const BOARD_SIZE = 7;

export const BUILDINGS = {
  farm: { name: '农田', cost: { grain: 0, silver: 8 }, icon: '田', desc: '每季粮食 +15' },
  home: { name: '民居', cost: { grain: 10, silver: 10 }, icon: '居', desc: '人口上限 +12' },
  market: { name: '集市', cost: { grain: 8, silver: 24 }, icon: '市', desc: '每季银两 +14' },
  school: { name: '书院', cost: { grain: 16, silver: 30 }, icon: '学', desc: '名望与科举机缘' },
  wall: { name: '城防', cost: { grain: 12, silver: 20 }, icon: '城', desc: '抵御匪患，名望 +1' },
};

export function createCounty() {
  const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'office';
  return { season: 1, grain: 70, silver: 65, people: 18, maxPeople: 30, prestige: 8, order: 62, board, logs: ['你受命赴任，眼前是一座待兴的荒县。'], over: false, result: null };
}

export function canBuild(state, type, row, col) {
  const building = BUILDINGS[type];
  return Boolean(building) && row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && !state.board[row][col]
    && state.grain >= building.cost.grain && state.silver >= building.cost.silver;
}

export function build(state, type, row, col) {
  if (!canBuild(state, type, row, col)) return null;
  const item = BUILDINGS[type];
  const next = structuredClone(state);
  next.grain -= item.cost.grain;
  next.silver -= item.cost.silver;
  next.board[row][col] = type;
  next.logs.push(`修建${item.name}，${item.desc}。`);
  return next;
}

export function countBuildings(state) {
  const counts = Object.fromEntries(Object.keys(BUILDINGS).map(key => [key, 0]));
  for (const row of state.board) for (const tile of row) if (tile in counts) counts[tile]++;
  return counts;
}

function eventFor(state, rng) {
  const counts = countBuildings(state);
  const roll = rng();
  if (roll < .22 && counts.wall === 0) return { title: '山匪叩关', text: '山匪在县境滋扰，百姓惶惶。', effect: { order: -13, prestige: -3 } };
  if (roll < .42 && counts.farm < 2) return { title: '春旱', text: '春雨迟迟未至，田亩收成受损。', effect: { grain: -18, order: -4 } };
  if (roll < .62 && counts.market > 0) return { title: '商路重开', text: '西市商队借道而来，带动一城买卖。', effect: { silver: 25, prestige: 3 } };
  if (roll < .82 && counts.school > 0) return { title: '童生来试', text: '书院办起县试，寒门子弟纷纷应考。', effect: { prestige: 8, order: 4 } };
  return { title: '邻县互市', text: '邻县送来盐布，百姓的日子有了新盼头。', effect: { silver: 9, grain: 8, order: 2 } };
}

export function advanceSeason(state, rng = Math.random) {
  if (state.over) return state;
  const next = structuredClone(state);
  const counts = countBuildings(next);
  next.grain += counts.farm * 15 - Math.ceil(next.people / 5);
  next.silver += counts.market * 14 + Math.floor(next.people / 6);
  next.maxPeople = 30 + counts.home * 12;
  next.people = Math.min(next.maxPeople, next.people + Math.max(0, Math.floor((next.order - 45) / 18) + counts.home));
  next.prestige += counts.school * 2 + counts.wall;
  const event = eventFor(next, rng);
  for (const [key, value] of Object.entries(event.effect)) next[key] += value;
  next.grain = Math.max(0, next.grain);
  next.silver = Math.max(0, next.silver);
  next.order = Math.max(0, Math.min(100, next.order));
  next.logs.push(`第${next.season}季 · ${event.title}：${event.text}`);
  if (next.grain === 0 || next.order <= 0) { next.over = true; next.result = '失守'; }
  next.season += 1;
  if (next.season > 12 && !next.over) { next.over = true; next.result = next.prestige >= 58 && next.people >= 45 ? '名城' : '守成'; }
  return next;
}

export function countyScore(state) {
  return Math.max(0, Math.min(100, Math.round(state.prestige * .4 + state.order * .25 + state.people * .25 + state.silver * .1)));
}
