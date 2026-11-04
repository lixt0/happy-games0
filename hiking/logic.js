const stockPhotos = [
  'photo-1759027684392-0eecdf15da6e',
  'photo-1755760729025-5c441822864a',
  'photo-1773001899177-7f642f65fd4c',
  'photo-1753854267745-e52d083053bd',
  'photo-1778024283037-2d225ebbe3e6',
  'photo-1771345207751-4ab70c4cc234',
  'photo-1751566609738-e1ed580bcb33',
  'photo-1631643171709-626f69ca8be0',
  'photo-1726853550443-20b90f727b9b',
  'photo-1719337763939-7633d9c0eb02',
  'photo-1667911944014-1a1a33129bab',
  'photo-1771777400714-a4120a98d758',
  'photo-1775367782614-2f91a272c636',
  'photo-1756135783538-ee69ea125025',
];

export function getSceneryImages() {
  const list = [...stockPhotos];
  const out = [];
  for (let i = 0; i < 3 && list.length > 0; i++) {
    const idx = Math.floor(Math.random() * list.length);
    out.push(`https://images.unsplash.com/${list.splice(idx, 1)[0]}?w=640&h=360&fit=crop&auto=format&q=72`);
  }
  return out;
}

export const backpacks = [
  { id: 'small',  name: '小型 30L', maxWeight: 4000,  selfWeight: 1000,  energyMult: 1.0, desc: '自重1kg，限重4kg' },
  { id: 'medium', name: '中型 50L', maxWeight: 7000,  selfWeight: 3000,  energyMult: 1.2, desc: '自重3kg，限重7kg' },
  { id: 'large',  name: '大型 70L', maxWeight: 12000, selfWeight: 8000,  energyMult: 1.5, desc: '自重8kg，限重12kg' },
];

const toolDefs = [
  { id: 'trekking_poles', name: '登山杖', emoji: '🦯', desc: '陡坡碎石冰雪路段', weight: 500 },
  { id: 'rain_jacket',    name: '冲锋衣', emoji: '🧥', desc: '防风防雨防失温', weight: 400 },
  { id: 'hiking_boots',   name: '登山鞋', emoji: '👢', desc: '防滑护踝复杂地形', weight: 800 },
  { id: 'oxygen',         name: '氧气瓶', emoji: '🫁', desc: '缓解高原反应', weight: 1500 },
  { id: 'first_aid',      name: '急救包', emoji: '🏥', desc: '外伤高原病症处理', weight: 300 },
  { id: 'headlamp',       name: '头灯',   emoji: '🔦', desc: '浓雾夜路落石预警', weight: 100 },
  { id: 'rope',           name: '绳索',   emoji: '🪢', desc: '冰裂缝悬崖防护', weight: 2000 },
  { id: 'crampons',       name: '冰爪',   emoji: '⛏️', desc: '冰雪路面防滑', weight: 500 },
  { id: 'thermos',        name: '保温杯', emoji: '🫖', desc: '热水驱寒补充体力', weight: 400 },
];

const foodDefs = [
  { id: 'compressed_biscuit', name: '压缩饼干', emoji: '🍪', desc: '管饱耐放', weight: 400, energy: 18 },
  { id: 'energy_bar',         name: '能量棒',   emoji: '🍫', desc: '快速补充', weight: 160, energy: 12 },
  { id: 'beef_jerky',         name: '牛肉干',   emoji: '🥩', desc: '高蛋白顶饿', weight: 300, energy: 14 },
  { id: 'self_heating_rice',  name: '自热米饭', emoji: '🍚', desc: '热饭恢复大量体力', weight: 1000, energy: 35 },
  { id: 'chocolate',          name: '巧克力',   emoji: '🍬', desc: '小巧高热量', weight: 200, energy: 8 },
];

const tentDef = { id: 'tent', name: '帐篷', emoji: '⛺', desc: '野外过夜必备', weight: 2500 };

export const allItems = [...toolDefs, tentDef, ...foodDefs];

export function getBackpack(id) {
  return backpacks.find(b => b.id === id);
}

export function getItem(id) {
  return allItems.find(i => i.id === id);
}

export function isFood(id) {
  return foodDefs.some(f => f.id === id);
}

export function getFoodDefs() {
  return [...foodDefs];
}

export function getToolDefs() {
  return [...toolDefs, tentDef];
}

const difficulties = [
  {
    id: 'steep_slope', title: '陡坡碎石', items: ['trekking_poles', 'hiking_boots'],
    desc: '前路是被碎石覆盖的陡峭山坡，每一步都可能滑坠。',
    dmgW: { energy: 3, health: 1 }, dmgWO: { energy: 15, health: 10 },
  },
  {
    id: 'storm', title: '暴风雨', items: ['rain_jacket', 'tent'],
    desc: '狂风裹挟暴雨迎面扑来，体温在快速流失。',
    dmgW: { energy: 3, health: 1 }, dmgWO: { energy: 12, health: 15 },
  },
  {
    id: 'slippery', title: '湿滑路面', items: ['hiking_boots', 'trekking_poles'],
    desc: '连日降雨让山路变成泥潭和滑石坡。',
    dmgW: { energy: 3, health: 1 }, dmgWO: { energy: 10, health: 12 },
  },
  {
    id: 'altitude', title: '高原反应', items: ['oxygen', 'first_aid'],
    desc: '头痛欲裂，呼吸困难，每一步都像在月球上行走。',
    dmgW: { energy: 4, health: 2 }, dmgWO: { energy: 12, health: 18 },
  },
  {
    id: 'injury', title: '意外受伤', items: ['first_aid', 'rope'],
    desc: '一脚踩空，脚踝传来剧痛——可能扭伤了。',
    dmgW: { energy: 2, health: 2 }, dmgWO: { energy: 8, health: 22 },
  },
  {
    id: 'fog', title: '浓雾迷失', items: ['headlamp', 'thermos'],
    desc: '浓雾吞噬了一切，能见度不足三米，方向感丧失。',
    dmgW: { energy: 4, health: 0 }, dmgWO: { energy: 15, health: 5 },
  },
  {
    id: 'crevasse', title: '冰裂缝', items: ['rope', 'crampons'],
    desc: '冰川暗藏深不见底的冰裂缝，表面只有薄薄的雪桥。',
    dmgW: { energy: 4, health: 2 }, dmgWO: { energy: 8, health: 25 },
  },
  {
    id: 'ice', title: '冰雪路面', items: ['crampons', 'trekking_poles'],
    desc: '山脊被冰雪覆盖，一步一滑，下面是万丈深渊。',
    dmgW: { energy: 3, health: 2 }, dmgWO: { energy: 12, health: 18 },
  },
  {
    id: 'blizzard', title: '暴风雪', items: ['tent', 'rain_jacket'],
    desc: '暴风雪来袭！气温骤降至零下三十度。',
    dmgW: { energy: 5, health: 2 }, dmgWO: { energy: 15, health: 20 },
  },
  {
    id: 'hypothermia', title: '失温', items: ['thermos', 'rain_jacket'],
    desc: '身体不受控制地颤抖，手指麻木，意识逐渐模糊。',
    dmgW: { energy: 3, health: 2 }, dmgWO: { energy: 12, health: 18 },
  },
  {
    id: 'lightning', title: '雷暴', items: ['rain_jacket', 'tent'],
    desc: '头顶乌云密布雷鸣滚滚，暴露在山脊上如同活靶子。',
    dmgW: { energy: 4, health: 1 }, dmgWO: { energy: 10, health: 20 },
  },
  {
    id: 'rockfall', title: '落石', items: ['headlamp', 'rope'],
    desc: '上方传来轰隆声——碎石从高处滚落！',
    dmgW: { energy: 4, health: 2 }, dmgWO: { energy: 8, health: 22 },
  },
  {
    id: 'altitude_sick', title: '高山病', items: ['oxygen', 'first_aid'],
    desc: '剧烈头痛伴随着恶心呕吐，可能是脑水肿前兆。',
    dmgW: { energy: 4, health: 3 }, dmgWO: { energy: 10, health: 22 },
  },
  {
    id: 'exhaustion', title: '体力透支', items: ['thermos', 'headlamp'],
    desc: '双腿像灌了铅，肺像要烧起来，每一步都是煎熬。',
    dmgW: { energy: 5, health: 0 }, dmgWO: { energy: 22, health: 5 },
  },
];

export const routes = [
  {
    id: 'aotai', name: '熬太穿越', route: '鳌山 — 太白山',
    distance: '80 km', days: '5–6 天', maxElevation: 3767,
    difficulty: '高难度', difficultyStars: 4, color: '#e67e22',
    baseCost: 2,
    summary: '中国最经典的顶级徒步路线之一，纵贯鳌山与太白山，行走在秦岭之巅的跑马梁上。',
    checkpoints: [
      { name: '塘口村',    elevation: 1240, dist: 0,  desc: '从塘口村出发，沿溪流上行，开始你的熬太征程。' },
      { name: '火烧坡',    elevation: 1850, dist: 5,  desc: '穿过茂密的松林，到达火烧坡，视野逐渐开阔。' },
      { name: '2900 营地', elevation: 2900, dist: 12, desc: '海拔攀升至 2900 米，在森林线附近扎营休整。' },
      { name: '鳌山大梁',  elevation: 3300, dist: 18, desc: '登上鳌山大梁，高山草甸一望无际，云海在脚下翻涌。' },
      { name: '导航架',    elevation: 3475, dist: 24, desc: '到达导航架，狂风呼啸，石海遍布，秦岭之巅的苍凉。' },
      { name: '荞麦梁',    elevation: 3500, dist: 36, desc: '荞麦梁如刀刃般狭窄陡峭，两侧是万丈深渊。' },
      { name: '太白梁',    elevation: 3600, dist: 44, desc: '石海茫茫，路径隐约，需要仔细辨认方向。' },
      { name: '拔仙台',    elevation: 3767, dist: 55, desc: '登顶太白山最高峰——拔仙台！海拔 3767 米！' },
      { name: '汤峪',      elevation: 620,  dist: 80, desc: '沿汤峪河谷下撤，穿越瀑布群，抵达终点。' },
    ],
  },
  {
    id: 'gongga', name: '贡嘎大环线', route: '朝圣蜀山之王',
    distance: '120 km', days: '7–8 天', maxElevation: 4900,
    difficulty: '专业级', difficultyStars: 5, color: '#2980b9',
    baseCost: 3,
    summary: '环绕蜀山之王贡嘎山（7556米）的经典徒步路线，雪山、冰川、森林、牧场交相辉映。',
    checkpoints: [
      { name: '老榆林',    elevation: 3200, dist: 0,  desc: '从康定附近的老榆林出发，整理装备，适应海拔。' },
      { name: '格西草原',  elevation: 3500, dist: 10, desc: '穿过杜鹃林和溪流，到达格西草原。' },
      { name: '两岔河',    elevation: 3800, dist: 20, desc: '到达两岔河营地，河水是冰川融水，冰冷刺骨。' },
      { name: '日乌且垭口', elevation: 4900, dist: 32, desc: '翻越 4900 米的日乌且垭口！贡嘎主峰迎面而来！' },
      { name: '莫溪沟',    elevation: 4200, dist: 45, desc: '沿莫溪沟下行，野花遍地，雪峰相伴。' },
      { name: '贡嘎寺',    elevation: 3750, dist: 60, desc: '到达古老的贡嘎寺，观赏贡嘎主峰日落。' },
      { name: '子梅垭口',  elevation: 4500, dist: 72, desc: '子梅垭口，近距离观赏贡嘎主峰的最佳位置。' },
      { name: '巴王海',    elevation: 3100, dist: 95, desc: '高山湖泊如翡翠般碧绿，枯木立于水中。' },
      { name: '草科',      elevation: 2000, dist: 120,desc: '到达终点草科！泡一泡温泉洗去风尘！' },
    ],
  },
  {
    id: 'wusun', name: '乌孙古道', route: '穿越天山南北',
    distance: '120 km', days: '6–8 天', maxElevation: 3800,
    difficulty: '高难度', difficultyStars: 4, color: '#16a085',
    baseCost: 3,
    summary: '新疆最顶级的徒步路线之一，翻越天山南北，天堂湖如翡翠般镶嵌在雪山环抱中。',
    checkpoints: [
      { name: '琼库什台',  elevation: 2000, dist: 0,  desc: '从天山北麓的琼库什台牧业村出发，乌孙古道北入口。' },
      { name: '小桥营地',  elevation: 2300, dist: 8,  desc: '沿河谷前行，穿过雪岭云杉林，在小桥边扎营。' },
      { name: '包扎墩达坂', elevation: 3650, dist: 20, desc: '翻越包扎墩达坂（3650m），高山草甸野花如织。' },
      { name: '科克苏河',  elevation: 2000, dist: 35, desc: '下至科克苏河谷，河水碧绿湍急，过桥后进入原始森林。' },
      { name: '天堂湖',    elevation: 3100, dist: 50, desc: '到达阿克库勒湖——天堂湖！湖水如翡翠般碧蓝。' },
      { name: '阿克布拉克达坂', elevation: 3800, dist: 65, desc: '翻越全程最高点（3800m），站在天山脊梁上。' },
      { name: '博孜克日格河谷', elevation: 2600, dist: 80, desc: '沿河谷下行，两岸是壮观的红砂岩峡谷。' },
      { name: '溜索过河',  elevation: 2200, dist: 95, desc: '再次横渡科克苏河，通过惊险的溜索。' },
      { name: '黑英山',    elevation: 1800, dist: 120,desc: '抵达南疆黑英山乡，乌孙古道圆满完成！' },
    ],
  },
];

export function createGameState(routeId, backpackId, gearMap) {
  const route = routes.find(r => r.id === routeId);
  const bp = backpacks.find(b => b.id === backpackId);
  if (!route || !bp) return null;

  const toolIds = [];
  const foodInventory = [];
  let totalWeight = 0;

  for (const [id, qty] of Object.entries(gearMap)) {
    const item = getItem(id);
    if (!item) continue;
    if (isFood(id)) {
      for (let i = 0; i < qty; i++) {
        foodInventory.push(id);
        totalWeight += item.weight;
      }
    } else {
      toolIds.push(id);
      totalWeight += item.weight * qty;
    }
  }

  if (totalWeight > bp.maxWeight) return null;

  const loadWeight = totalWeight + bp.selfWeight;

  return {
    routeId, backpackId, energyMult: bp.energyMult,
    currentCheckpoint: 0, energy: 100, health: 100,
    toolIds, foodInventory, hasTent: toolIds.includes('tent'),
    failures: 0, completed: false, dead: false,
    deathReason: '', dayLog: [], totalWeight, loadWeight,
  };
}

export function getCurrentCheckpoint(state) {
  const route = routes.find(r => r.id === state.routeId);
  return route ? route.checkpoints[state.currentCheckpoint] : null;
}

export function getNextCheckpoint(state) {
  const route = routes.find(r => r.id === state.routeId);
  if (!route || state.currentCheckpoint >= route.checkpoints.length - 1) return null;
  return route.checkpoints[state.currentCheckpoint + 1];
}

export function consumeFood(state, foodId) {
  const idx = state.foodInventory.indexOf(foodId);
  if (idx === -1) return 0;
  const item = getItem(foodId);
  if (!item || !item.energy) return 0;
  state.foodInventory.splice(idx, 1);
  state.energy = Math.min(100, state.energy + item.energy);
  return item.energy;
}

export function useMedkit(state) {
  const idx = state.toolIds.indexOf('first_aid');
  if (idx === -1) return 0;
  state.toolIds.splice(idx, 1);
  const heal = 30;
  state.health = Math.min(100, state.health + heal);
  return heal;
}

const fatalItems = ['first_aid', 'crampons', 'oxygen', 'rope'];

export function initFatalDanger(state) {
  const route = routes.find(r => r.id === state.routeId);
  if (!route || route.checkpoints.length < 3) return;
  const maxIdx = route.checkpoints.length - 2;
  const cpIdx = 1 + Math.floor(Math.random() * maxIdx);
  const reqItem = fatalItems[Math.floor(Math.random() * fatalItems.length)];
  state.fatalDanger = { checkpoint: cpIdx, requiredItem: reqItem, triggered: false };
}

function processFatalDanger(state) {
  if (!state.fatalDanger || state.fatalDanger.triggered) return null;
  if (state.currentCheckpoint !== state.fatalDanger.checkpoint) return null;
  state.fatalDanger.triggered = true;
  const hasItem = state.toolIds.includes(state.fatalDanger.requiredItem);
  const survivalRate = hasItem ? 0.8 : 0.15;
  const survive = Math.random() < survivalRate;
  const itemName = getItem(state.fatalDanger.requiredItem)?.name || '未知装备';
  const log = {
    title: '致命危机',
    desc: hasItem
      ? `${itemName}在关键时刻发挥了作用！你死里逃生。`
      : `你缺少${itemName}，面对致命危险束手无策……`,
    solved: survive, item: hasItem ? state.fatalDanger.requiredItem : null,
    energyLoss: survive ? 5 : 0,
    healthLoss: survive ? 10 : 999,
  };
  if (!survive) {
    state.dead = true;
    state.deathReason = `在第 ${state.currentCheckpoint + 1} 站遭遇致命危机，因缺少${itemName}不幸遇难。`;
    state.health = 0;
  } else {
    state.health -= 10;
    state.energy -= 5;
    state.failures++;
  }
  return log;
}

function rollDailyDifficulties(state) {
  const count = Math.floor(Math.random() * 4);
  if (count === 0) return [];
  const pool = [...difficulties];
  const results = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const d = pool.splice(idx, 1)[0];
    const hasItem = d.items.some(id => state.toolIds.includes(id));
    const dmg = hasItem ? d.dmgW : d.dmgWO;
    results.push({ difficulty: d, hasItem, energyLoss: dmg.energy, healthLoss: dmg.health });
  }
  return results;
}

export function processDay(state) {
  const route = routes.find(r => r.id === state.routeId);
  if (!route || state.dead || state.completed)
    return { events: [], dead: false, logs: [], energyLoss: 0, healthLoss: 0 };

  const events = rollDailyDifficulties(state);
  const logs = [];
  let totalEnergyLoss = Math.round(route.baseCost * state.energyMult);
  let totalHealthLoss = 0;

  const fatalLog = processFatalDanger(state);
  if (fatalLog) {
    logs.push(fatalLog);
    if (state.dead) {
      totalEnergyLoss += fatalLog.energyLoss;
      totalHealthLoss += fatalLog.healthLoss;
      state.dayLog = logs;
      state.energy = Math.max(0, state.energy - totalEnergyLoss);
      state.health = Math.max(0, state.health - totalHealthLoss);
      return { events, dead: true, reason: state.deathReason, energyLoss: totalEnergyLoss, healthLoss: totalHealthLoss, logs };
    }
    totalEnergyLoss += fatalLog.energyLoss;
    totalHealthLoss += fatalLog.healthLoss;
  }

  for (const evt of events) {
    totalEnergyLoss += evt.energyLoss;
    totalHealthLoss += evt.healthLoss;
    if (!evt.hasItem) state.failures++;
    const solvedBy = evt.hasItem
      ? evt.difficulty.items.find(id => state.toolIds.includes(id))
      : null;
    logs.push({
      title: evt.difficulty.title,
      desc: evt.difficulty.desc,
      solved: evt.hasItem, item: solvedBy,
      energyLoss: evt.energyLoss,
      healthLoss: evt.healthLoss,
    });
  }

  if (!state.hasTent) {
    totalHealthLoss += 15; totalEnergyLoss += 5;
    logs.push({ title: '露天过夜', desc: '没有帐篷，只能在露天蜷缩。寒冷和潮湿让你无法入睡。', solved: false, item: null, energyLoss: 5, healthLoss: 15 });
  } else {
    logs.push({ title: '帐篷休息', desc: '钻进帐篷，遮风挡雨，好好休息一晚。', solved: true, item: 'tent', energyLoss: 0, healthLoss: 0 });
  }

  state.energy -= totalEnergyLoss;
  state.health -= totalHealthLoss;

  let dead = false, reason = '';
  if (state.energy <= 0) { dead = true; reason = '体力耗尽，倒在了路上。身体再也撑不住了。'; }
  else if (state.health <= 0) { dead = true; reason = '伤势过重，在高海拔地带伤病是致命的。'; }
  else if (state.failures >= 3) { dead = true; reason = '遭遇太多无法应对的危险，不得不放弃求救。'; }

  if (dead) { state.dead = true; state.deathReason = reason; }

  state.dayLog = logs;
  state.energy = Math.max(0, state.energy);
  state.health = Math.max(0, state.health);
  return { events, dead, reason, energyLoss: totalEnergyLoss, healthLoss: totalHealthLoss, logs };
}

export function advanceCheckpoint(state) {
  const route = routes.find(r => r.id === state.routeId);
  if (!route || state.dead || state.completed) return null;
  if (state.currentCheckpoint >= route.checkpoints.length - 1) {
    state.completed = true; return null;
  }
  state.currentCheckpoint++;
  return getCurrentCheckpoint(state);
}

export function isComplete(state) {
  const route = routes.find(r => r.id === state.routeId);
  return route ? state.currentCheckpoint >= route.checkpoints.length - 1 : false;
}

export function getProgress(state) {
  const route = routes.find(r => r.id === state.routeId);
  return route ? state.currentCheckpoint / (route.checkpoints.length - 1) : 0;
}
