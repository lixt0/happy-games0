export const ATTRIBUTE_BUDGET = 20;
export const ATTRIBUTE_MAX = 10;
export const ATTRIBUTES = [
  { id: 'mind', name: '悟性', hint: '学习与专业机会' },
  { id: 'charm', name: '魅力', hint: '关系与协作机会' },
  { id: 'vitality', name: '体质', hint: '健康与寿命' },
  { id: 'family', name: '家境', hint: '起点与资源' },
  { id: 'fortune', name: '幸运', hint: '意外与转机' },
];

export const ACTIONS = [
  { id: 'learn', name: '投入学习', desc: '积累知识与能力', effects: { skill: 8, happiness: -2, health: -1 } },
  { id: 'connect', name: '经营关系', desc: '陪伴家人与朋友', effects: { relation: 9, happiness: 5, money: -2 } },
  { id: 'work', name: '专注事业', desc: '争取收入和声望', effects: { money: 8, reputation: 6, health: -3, happiness: -1 } },
  { id: 'explore', name: '拥抱变化', desc: '探索未知的机会', effects: { happiness: 4, reputation: 3, money: -3 } },
  { id: 'rest', name: '照顾自己', desc: '恢复健康与心情', effects: { health: 8, happiness: 5, reputation: -1 } },
];

const STAGES = [
  { until: 6, name: '童年', step: 3 },
  { until: 18, name: '少年', step: 3 },
  { until: 35, name: '青年', step: 2 },
  { until: 60, name: '中年', step: 3 },
  { until: Infinity, name: '晚年', step: 5 },
];

const NPCS = [
  { id: 'family', name: '家人', goal: '守护', weights: { connect: 8, rest: 5, learn: 2, work: -2, explore: 1 } },
  { id: 'friend', name: '挚友', goal: '同行', weights: { connect: 6, explore: 6, learn: 2, work: 1, rest: 2 } },
  { id: 'rival', name: '同侪', goal: '超越', weights: { work: 7, learn: 6, explore: 4, connect: -1, rest: -2 } },
];

const clamp = value => Math.max(0, Math.min(100, Math.round(value)));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stageFor(age) {
  return STAGES.find(stage => age < stage.until);
}

function normalizePoints(points) {
  const out = {};
  for (const attr of ATTRIBUTES) out[attr.id] = Math.max(0, Math.min(ATTRIBUTE_MAX, Number(points[attr.id]) || 0));
  return out;
}

export function isValidPoints(points) {
  return ATTRIBUTES.reduce((total, attr) => total + (Number(points[attr.id]) || 0), 0) === ATTRIBUTE_BUDGET
    && ATTRIBUTES.every(attr => Number.isInteger(points[attr.id]) && points[attr.id] >= 0 && points[attr.id] <= ATTRIBUTE_MAX);
}

export function createLife(points, seed = 20260729) {
  const attributes = normalizePoints(points);
  if (!isValidPoints(attributes)) throw new Error('属性点必须刚好分配完');
  const maxAge = 68 + attributes.vitality * 3 + attributes.fortune * 2;
  return {
    age: 0,
    turn: 0,
    seed: seed >>> 0,
    maxAge,
    attributes,
    stats: {
      health: clamp(52 + attributes.vitality * 5 + attributes.fortune),
      happiness: clamp(48 + attributes.family * 4 + attributes.charm * 2),
      money: clamp(8 + attributes.family * 7),
      skill: clamp(4 + attributes.mind * 4),
      relation: clamp(28 + attributes.family * 5 + attributes.charm * 3),
      reputation: 0,
    },
    logs: [{ age: 0, stage: '出生', title: '人生开始', local: '你带着独一无二的天赋，来到这个世界。' }],
    finished: false,
    cause: null,
  };
}

export function chooseNpcAction(state, npc) {
  const options = ACTIONS.map(action => {
    let score = npc.weights[action.id] || 0;
    if (action.id === 'rest' && state.stats.health < 35) score += 8;
    if (action.id === 'work' && state.stats.money < 25) score += 6;
    if (action.id === 'learn' && state.age < 25) score += 4;
    if (action.id === 'connect' && state.stats.relation < 35) score += 5;
    return { action, score };
  });
  options.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
  return options[0].action;
}

export function chooseLifeAction(state) {
  const stage = stageFor(state.age);
  const { attributes, stats } = state;
  const options = ACTIONS.map(action => {
    let score = 0;
    if (action.id === 'learn') score = attributes.mind * 2 + (state.age < 25 ? 15 : 2) + (stats.skill < 55 ? 8 : 0);
    if (action.id === 'connect') score = attributes.charm * 2 + (stats.relation < 45 ? 12 : 2) + (stats.happiness < 40 ? 8 : 0);
    if (action.id === 'work') score = attributes.family + attributes.mind + (state.age >= 18 && state.age < 60 ? 17 : -5) + (stats.money < 50 ? 12 : 0);
    if (action.id === 'explore') score = attributes.fortune * 2 + (stage.name === '青年' ? 10 : 2) + (stats.happiness < 50 ? 7 : 0);
    if (action.id === 'rest') score = attributes.vitality + (stats.health < 48 ? 22 : 0) + (state.age >= 60 ? 12 : 0);
    score += mulberry32(state.seed + state.turn * 8191 + action.id.length)() * 3;
    return { action, score };
  });
  options.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));
  return options[0].action;
}

function applyEffects(stats, effects, multiplier = 1) {
  const next = { ...stats };
  for (const [key, value] of Object.entries(effects)) next[key] = clamp((next[key] || 0) + value * multiplier);
  return next;
}

function lifeTitle(age, actionId, roll) {
  const stage = stageFor(age).name;
  const outcomes = {
    learn: roll > .72 ? '意外的好成绩' : '安静的积累',
    connect: roll > .72 ? '一段重要的关系' : '被记住的陪伴',
    work: roll > .72 ? '抓住上升机会' : '踏实地前进',
    explore: roll > .72 ? '一次命运转弯' : '走出熟悉的路',
    rest: roll > .72 ? '找回生活节奏' : '留给自己的时间',
  };
  return `${stage} · ${outcomes[actionId]}`;
}

function lifeEvent(state, actionId, roll, eventRoll, twistRoll) {
  const stage = stageFor(state.age).name;
  const events = {
    童年: {
      learn: ['一位老师注意到你对知识的敏感', '你开始把好奇心变成习惯'],
      connect: ['家人给了你稳定的陪伴', '你学会了在关系里表达自己'],
      explore: ['一次偶然的见闻打开了新世界', '你对未知保留了长久的兴趣'],
      rest: ['被悉心照料的日子让你慢慢长大', '健康成了你后来冒险的底气'],
      work: ['家里的忙碌让你早早理解责任', '你开始珍惜来之不易的资源'],
    },
    少年: {
      learn: ['一次重要的学习机会来到面前', '积累逐渐显出它的回报'],
      connect: ['你遇见了能彼此理解的伙伴', '这段关系影响了你往后的选择'],
      explore: ['你离开熟悉的环境去看更远的地方', '眼界让未来有了新的可能'],
      rest: ['你主动放慢脚步调整状态', '稳定的节奏帮你度过了成长的波动'],
      work: ['现实让你开始思考谋生与独立', '责任感比同龄人更早落在肩上'],
    },
    青年: {
      learn: ['一个需要全力以赴的机会出现', '能力让你拥有了更多选择权'],
      connect: ['重要的人走进了你的生活', '你开始把个人计划放进更长的关系里'],
      explore: ['一场变化迫使你重新选择方向', '不确定性后来变成了新的道路'],
      rest: ['你没有让忙碌吞没自己', '这份克制让之后的生活更有余地'],
      work: ['事业的门槛摆在眼前', '投入逐渐换来了可见的积累'],
    },
    中年: {
      learn: ['你决定继续更新自己', '经验与新知开始彼此支撑'],
      connect: ['家庭和朋友需要你投入更多时间', '关系成为你应对风浪的支点'],
      explore: ['你选择接受一次不算稳妥的变化', '新的经历让人生没有过早定型'],
      rest: ['身体发出的信号让你学会取舍', '照顾自己也成了一种长期责任'],
      work: ['责任与机会同时压了过来', '多年的积累在此刻开始兑现'],
    },
    晚年: {
      learn: ['你仍愿意理解正在变化的世界', '清醒与好奇陪你走得更远'],
      connect: ['你把更多时间留给重要的人', '被记住的陪伴成为人生的回响'],
      explore: ['你用自己的方式继续向外走', '新的风景让晚年依然有光亮'],
      rest: ['你把生活还给更从容的节奏', '安稳的日子沉淀成内心的平和'],
      work: ['你整理多年所获，也交接肩上的责任', '曾经的努力在他人身上延续'],
    },
  };
  const [event, outcome] = events[stage][actionId];
  const details = {
    learn: ['一份意外的推荐让你看见更远的方向', '一次不顺利的尝试逼你换了方法', '你在重复练习里找到了自己的节奏'],
    connect: ['一句坦诚的话消除了隔阂', '一场误会让你重新理解彼此的边界', '共同经历的困难拉近了距离'],
    work: ['临时出现的任务把你推到台前', '资源紧张迫使你重新安排计划', '一位前辈给了你关键的提醒'],
    explore: ['陌生环境里的人给了你新的启发', '计划外的变化打乱了原来的安排', '偶遇的机会让你结识了新伙伴'],
    rest: ['一段安静时光让你重新恢复能量', '短暂的病痛提醒你不能透支自己', '久违的闲暇让你重新审视生活'],
  };
  const detail = details[actionId][Math.floor(twistRoll * details[actionId].length)];
  const turn = eventRoll > .84 ? '事情出现了意料之外的转机' : eventRoll < .16 ? '途中也遇到了一些不容易的波折' : '事情沿着平常的节奏展开';
  return `${event}。${detail}。${turn}，${roll > .72 ? `${outcome}，结果比预想中更好。` : outcome}。`;
}

export function advanceLife(state, actionId) {
  if (state.finished) return state;
  const action = ACTIONS.find(item => item.id === actionId);
  if (!action) throw new Error('未知行动');
  const rng = mulberry32(state.seed + state.turn * 0x9E3779B1);
  const stage = stageFor(state.age);
  const years = stage.step;
  const roll = rng();
  const eventRoll = rng();
  const twistRoll = rng();
  const next = JSON.parse(JSON.stringify(state));
  let stats = applyEffects(next.stats, action.effects);
  const aptitude = actionId === 'learn' ? next.attributes.mind : actionId === 'connect' ? next.attributes.charm : actionId === 'rest' ? next.attributes.vitality : actionId === 'explore' ? next.attributes.fortune : next.attributes.family;
  const bonus = Math.round((aptitude * 1.5 + roll * 12) / 3);
  if (actionId === 'learn') stats.skill = clamp(stats.skill + bonus);
  if (actionId === 'connect') stats.relation = clamp(stats.relation + bonus);
  if (actionId === 'work') { stats.money = clamp(stats.money + bonus); stats.reputation = clamp(stats.reputation + Math.round(bonus / 2)); }
  if (actionId === 'explore') { stats.happiness = clamp(stats.happiness + Math.round(bonus / 2)); stats.reputation = clamp(stats.reputation + Math.round(bonus / 3)); }
  if (actionId === 'rest') stats.health = clamp(stats.health + bonus);
  if (eventRoll > .84) {
    const gains = { learn: { skill: 5, reputation: 3 }, connect: { relation: 5, happiness: 3 }, work: { money: 5, reputation: 4 }, explore: { happiness: 5, reputation: 3 }, rest: { health: 5, happiness: 3 } };
    stats = applyEffects(stats, gains[actionId]);
  } else if (eventRoll < .16) {
    const setbacks = { learn: { happiness: -3 }, connect: { relation: -4, happiness: -2 }, work: { money: -3, health: -2 }, explore: { money: -3, health: -2 }, rest: { health: -2, happiness: -2 } };
    stats = applyEffects(stats, setbacks[actionId]);
  }

  const aiActions = NPCS.map(npc => ({ npc, action: chooseNpcAction(next, npc) }));
  for (const { npc, action: npcAction } of aiActions) {
    if (npcAction.id === actionId) stats = applyEffects(stats, { relation: 2, happiness: 1 });
    if (npc.id === 'rival' && npcAction.id === 'work' && actionId !== 'work') stats.reputation = clamp(stats.reputation - 2);
    if (npc.id === 'family' && npcAction.id === 'connect' && actionId === 'work') stats.relation = clamp(stats.relation - 2);
  }
  const age = Math.min(next.maxAge, next.age + years);
  const healthWear = age > 45 ? Math.floor((age - 42) / 9) : 0;
  stats.health = clamp(stats.health - healthWear);
  next.age = age;
  next.turn += 1;
  next.stats = stats;
  const aiLine = aiActions.map(({ npc, action: npcAction }) => `${npc.name}选择${npcAction.name}`).join('，');
  const local = `${lifeEvent(next, actionId, roll, eventRoll, twistRoll)} ${aiLine}。`;
  next.logs.push({ age, stage: stageFor(Math.max(0, age - 1)).name, title: lifeTitle(next.age, actionId, roll), local, action: action.name, aiLine });
  if (stats.health <= 0 || age >= next.maxAge) {
    next.finished = true;
    next.cause = stats.health <= 0 ? '健康耗尽' : '寿终正寝';
  }
  return next;
}

export function lifeScore(state) {
  const s = state.stats;
  return Math.round(s.happiness * .24 + s.health * .2 + s.money * .16 + s.skill * .16 + s.relation * .14 + s.reputation * .1);
}

export function simulateLifeSteps(state) {
  const steps = [state];
  let next = state;
  while (!next.finished) {
    next = advanceLife(next, chooseLifeAction(next).id);
    steps.push(next);
  }
  const closing = { ...next, logs: [...next.logs, { age: next.age, stage: '落幕', title: '人生落幕', local: `这一生走到终点。${next.cause}，留下的是属于自己的故事。` }] };
  steps[steps.length - 1] = closing;
  return steps;
}

export function simulateLife(state) {
  return simulateLifeSteps(state).at(-1);
}
