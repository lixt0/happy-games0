export const START_MONEY = 1500;
export const START_BONUS = 200;

// 物价系统：开局在基准价 ±50% 随机，之后每轮 ±25% 随行就市，
// 并限制在基准价的 0.5–2 倍之间，避免长期漂移失控。
const BASE_JITTER = 0.50;
const ROUND_JITTER = 0.25;
const PRICE_FLOOR = 0.5;
const PRICE_CAP = 2;

// Route follows a fictional grand tour through representative cities from several eras.
export const SPACES = [
  { id: 'chang-an', name: '长安', type: 'start', x: 44, y: 43, note: '丝路起点' },
  { id: 'luoyang', name: '洛阳', type: 'city', x: 52, y: 39, cost: 180, toll: 35, color: '#b84b3f' },
  { id: 'kaifeng', name: '汴京', type: 'city', x: 60, y: 38, cost: 220, toll: 42, color: '#c46b3c' },
  { id: 'jinan', name: '济南', type: 'city', x: 68, y: 32, cost: 260, toll: 50, color: '#b3822d' },
  { id: 'dadu', name: '大都', type: 'city', x: 74, y: 20, cost: 320, toll: 62, color: '#907044' },
  { id: 'shanhaiguan', name: '山海关', type: 'pass', x: 84, y: 25, note: '关隘' },
  { id: 'yangzhou', name: '扬州', type: 'city', x: 72, y: 43, cost: 280, toll: 54, color: '#2d7b76' },
  { id: 'jinling', name: '金陵', type: 'city', x: 67, y: 51, cost: 300, toll: 58, color: '#27756f' },
  { id: 'hangzhou', name: '杭州', type: 'city', x: 72, y: 61, cost: 340, toll: 66, color: '#287e86' },
  { id: 'fuzhou', name: '福州', type: 'city', x: 78, y: 72, cost: 250, toll: 48, color: '#b05e44' },
  { id: 'guangzhou', name: '广州', type: 'city', x: 69, y: 84, cost: 380, toll: 74, color: '#9b4d6b' },
  { id: 'maritime', name: '海贸会', type: 'port', x: 57, y: 86, note: '南海商路' },
  { id: 'ganzhou', name: '赣州', type: 'city', x: 57, y: 73, cost: 210, toll: 40, color: '#a15d35' },
  { id: 'changsha', name: '长沙', type: 'city', x: 49, y: 70, cost: 230, toll: 44, color: '#a75c34' },
  { id: 'wuhan', name: '江夏', type: 'city', x: 48, y: 59, cost: 240, toll: 46, color: '#b77b31' },
  { id: 'chengdu', name: '成都', type: 'city', x: 28, y: 64, cost: 310, toll: 60, color: '#5c8660' },
  { id: 'chongqing', name: '巴渝', type: 'city', x: 37, y: 62, cost: 190, toll: 36, color: '#638a58' },
  { id: 'kunming', name: '昆明', type: 'city', x: 22, y: 82, cost: 260, toll: 50, color: '#667b52' },
  { id: 'guiyang', name: '黔中', type: 'city', x: 34, y: 78, cost: 180, toll: 35, color: '#6c8052' },
  { id: 'lanzhou', name: '兰州', type: 'city', x: 30, y: 39, cost: 200, toll: 38, color: '#82653e' },
  { id: 'dunhuang', name: '敦煌', type: 'city', x: 12, y: 29, cost: 280, toll: 54, color: '#a77a37' },
  { id: 'yumen', name: '玉门关', type: 'pass', x: 7, y: 20, note: '西出阳关' },
  { id: 'xining', name: '西宁', type: 'city', x: 20, y: 27, cost: 190, toll: 36, color: '#71815d' },
  { id: 'silkroad', name: '丝路驿', type: 'port', x: 33, y: 27, note: '西域商路' },
  { id: 'event-north', name: '风云', type: 'event', x: 83, y: 38 },
  { id: 'event-east', name: '风云', type: 'event', x: 82, y: 60 },
  { id: 'event-south', name: '风云', type: 'event', x: 43, y: 87 },
  { id: 'event-west', name: '风云', type: 'event', x: 10, y: 57 },
];

export const EVENTS = [
  { title: '漕运顺风', text: '河道疏浚完成，货船提前抵达。', money: 120 },
  { title: '官府征税', text: '朝廷加征商税，人人缴纳银钱。', money: -90 },
  { title: '商路遇盗', text: '护卫击退盗匪，但货物损失了一成。', money: -130 },
  { title: '丰收之年', text: '粮价下跌，百姓有余粮可售。', money: 80 },
  { title: '贵人赏识', text: '你的商号声名远播，获得一笔赏银。', money: 160 },
  { title: '山洪阻路', text: '驿道被冲毁，修路花去不少银两。', money: -120 },
];

const clone = value => structuredClone(value);
const alivePlayers = state => state.players.filter(player => !player.bankrupt);

function marketPriceFor(space, ratio, floor, cap, rng) {
  const next = Math.round(space * (1 - ratio + rng() * ratio * 2));
  return Math.min(cap, Math.max(floor, next));
}

// 开局物价：每城在基准价附近随机波动
function buildMarket(rng = Math.random) {
  const market = {};
  for (const space of SPACES) {
    if (space.type !== 'city') continue;
    market[space.id] = {
      cost: marketPriceFor(space.cost, BASE_JITTER, Math.round(space.cost * PRICE_FLOOR), Math.round(space.cost * PRICE_CAP), rng),
      toll: marketPriceFor(space.toll, BASE_JITTER, Math.max(10, Math.round(space.toll * PRICE_FLOOR)), Math.round(space.toll * PRICE_CAP), rng),
    };
  }
  return market;
}

// 每轮随行就市：在上一轮价格基础上再浮动，且不超出基准价的上下限
function fluctuateMarket(market, rng = Math.random) {
  const next = {};
  for (const space of SPACES) {
    if (space.type !== 'city') continue;
    const base = market[space.id];
    next[space.id] = {
      cost: marketPriceFor(base.cost, ROUND_JITTER, Math.round(space.cost * PRICE_FLOOR), Math.round(space.cost * PRICE_CAP), rng),
      toll: marketPriceFor(base.toll, ROUND_JITTER, Math.max(10, Math.round(space.toll * PRICE_FLOOR)), Math.round(space.toll * PRICE_CAP), rng),
    };
  }
  return next;
}

// 查询某地当前市场报价；非城市（港口/关隘/事件）返回 null
export function marketPrice(state, spaceId) {
  return state.market[spaceId] || null;
}

export function createGame(playerCount = 4, rng = Math.random) {
  const count = Math.max(2, Math.min(4, Number(playerCount) || 4));
  return {
    turn: 0,
    round: 1,
    phase: 'await-roll',
    dice: null,
    pending: null,
    winner: null,
    log: ['商队从长安出发。经营商号、走通商路，成为天下首富吧！'],
    properties: {},
    market: buildMarket(rng),
    players: Array.from({ length: count }, (_, index) => ({
      id: index,
      name: index === 0 ? '你' : `商旅${['乙', '丙', '丁'][index - 1]}`,
      kind: index === 0 ? 'human' : 'ai',
      position: 0,
      money: START_MONEY,
      assets: 0,
      bankrupt: false,
      color: ['#b83b2e', '#2d718f', '#c28a27', '#477a57'][index],
      icon: ['驿', '帆', '鼎', '印'][index],
    })),
  };
}

export function currentPlayer(state) { return state.players[state.turn]; }
export function propertyValue(state, playerId) {
  return Object.values(state.properties).filter(property => property.owner === playerId)
    .reduce((sum, property) => sum + property.cost + property.level * Math.floor(property.cost * .55), 0);
}

export function totalWealth(state, playerId) {
  const player = state.players[playerId];
  return player ? player.money + propertyValue(state, playerId) : 0;
}

function addLog(next, message) {
  next.log.push(message);
  if (next.log.length > 80) next.log.shift();
}

function nextTurn(next, rng = Math.random) {
  let nextTurnIndex = next.turn;
  for (let i = 0; i < next.players.length; i += 1) {
    nextTurnIndex = (nextTurnIndex + 1) % next.players.length;
    if (!next.players[nextTurnIndex].bankrupt) break;
  }
  if (nextTurnIndex <= next.turn) {
    next.round += 1;
    next.market = fluctuateMarket(next.market, rng);
    addLog(next, '新轮商期启幕，各地物价随行就市。');
  }
  next.turn = nextTurnIndex;
  next.phase = 'await-roll';
  next.dice = null;
  next.pending = null;
  if (next.round > 30) {
    const contenders = alivePlayers(next);
    contenders.sort((a, b) => totalWealth(next, b.id) - totalWealth(next, a.id));
    next.winner = contenders[0]?.id ?? null;
    next.phase = 'finished';
    addLog(next, '三十轮商期结束，天下商号开始结算。');
  }
}

function bankruptIfNeeded(next, player) {
  if (player.money >= 0) return;
  player.bankrupt = true;
  for (const [spaceId, property] of Object.entries(next.properties)) {
    if (property.owner === player.id) delete next.properties[spaceId];
  }
  addLog(next, `${player.name} 资金断裂，退出商路。`);
  const remaining = alivePlayers(next);
  if (remaining.length === 1) {
    next.winner = remaining[0].id;
    next.phase = 'finished';
  }
}

export function roll(state, rng = Math.random) {
  if (state.phase !== 'await-roll' || currentPlayer(state).bankrupt) return null;
  const next = clone(state);
  const player = currentPlayer(next);
  const dice = Math.floor(rng() * 6) + 1;
  next.dice = dice;
  const oldPosition = player.position;
  player.position = (oldPosition + dice) % SPACES.length;
  if (oldPosition + dice >= SPACES.length) {
    player.money += START_BONUS;
    addLog(next, `${player.name} 绕行商路一周，获得通关红利 ${START_BONUS} 两。`);
  }
  const space = SPACES[player.position];
  addLog(next, `${player.name} 掷出 ${dice} 点，抵达${space.name}。`);
  next.phase = 'await-action';
  next.pending = space.id;
  return next;
}

export function buy(state, rng = Math.random) {
  if (state.phase !== 'await-action') return null;
  const player = currentPlayer(state);
  const space = SPACES.find(item => item.id === state.pending);
  const price = marketPrice(state, space?.id)?.cost;
  if (!space || space.type !== 'city' || state.properties[space.id] || !price || player.money < price) return null;
  const next = clone(state);
  next.players[next.turn].money -= price;
  next.properties[space.id] = { owner: next.turn, cost: price, level: 0 };
  addLog(next, `${player.name} 以 ${price} 两买下${space.name}的商号。`);
  nextTurn(next, rng);
  return next;
}

export function upgrade(state, rng = Math.random) {
  if (state.phase !== 'await-action') return null;
  const player = currentPlayer(state);
  const property = state.properties[state.pending];
  if (!property || property.owner !== player.id || property.level >= 3) return null;
  const price = Math.floor(property.cost * (.45 + property.level * .2));
  if (player.money < price) return null;
  const next = clone(state);
  next.players[next.turn].money -= price;
  next.properties[next.pending].level += 1;
  const space = SPACES.find(item => item.id === next.pending);
  addLog(next, `${player.name} 将${space.name}商号升级为${['商铺', '商行', '总号'][next.properties[next.pending].level - 1]}。`);
  nextTurn(next, rng);
  return next;
}

export function finishAction(state, rng = Math.random) {
  if (state.phase !== 'await-action') return null;
  const space = SPACES.find(item => item.id === state.pending);
  const next = clone(state);
  const player = next.players[next.turn];
  if (space.type === 'city') {
    const property = next.properties[space.id];
    if (property && property.owner !== player.id) {
      const fee = Math.floor((marketPrice(next, space.id)?.toll ?? space.toll) * (1 + property.level * .7));
      player.money -= fee;
      next.players[property.owner].money += fee;
      addLog(next, `${player.name} 向${next.players[property.owner].name}缴纳${fee}两商税。`);
    }
  } else if (space.type === 'event') {
    const event = EVENTS[(next.round + next.turn + space.id.length) % EVENTS.length];
    player.money += event.money;
    addLog(next, `${event.title}：${event.text}（${event.money >= 0 ? '+' : ''}${event.money}两）`);
  } else if (space.type === 'port') {
    player.money += 70;
    addLog(next, `${player.name} 在${space.name}完成一趟贸易，获利 70 两。`);
  } else if (space.type === 'pass') {
    player.money -= 35;
    addLog(next, `${player.name} 缴纳${space.name}通行费 35 两。`);
  }
  bankruptIfNeeded(next, player);
  if (next.phase !== 'finished') nextTurn(next, rng);
  return next;
}

export function aiAction(state, rng = Math.random) {
  if (state.phase !== 'await-action' || currentPlayer(state).kind !== 'ai') return state;
  const space = SPACES.find(item => item.id === state.pending);
  const player = currentPlayer(state);
  const price = marketPrice(state, space?.id)?.cost ?? space.cost;
  if (space.type === 'city' && !state.properties[space.id] && player.money >= price && player.money - price > 260) return buy(state, rng) || finishAction(state, rng);
  if (space.type === 'city' && state.properties[space.id]?.owner === player.id && state.properties[space.id].level < 3) {
    const upgradePrice = Math.floor(state.properties[space.id].cost * (.45 + state.properties[space.id].level * .2));
    if (player.money > upgradePrice + 220) return upgrade(state, rng) || finishAction(state, rng);
  }
  return finishAction(state, rng);
}

export function playAiTurn(state, rng = Math.random) {
  let next = roll(state, rng);
  if (!next) return state;
  return aiAction(next, rng);
}

export function winnerText(state) {
  if (state.winner === null) return '';
  return `${state.players[state.winner].name} 成为天下首富，资产 ${totalWealth(state, state.winner)} 两`;
}
