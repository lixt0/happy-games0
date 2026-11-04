// 华夏大乱斗 — 数据与核心逻辑
// 双人轮流选将，10 个职位逐一对决，按属性加权评分判定胜负

import { EMPERORS_DATA } from './data/emperors.js';
import { PRINCES_DATA } from './data/princes.js';
import { CONSORTS_DATA } from './data/consorts.js';
import { MINISTERS_DATA } from './data/ministers.js';
import { STRATEGISTS_DATA } from './data/strategists.js';
import { DIPLOMATS_DATA } from './data/diplomats.js';
import { GENERALS_DATA } from './data/generals.js';
import { VANGUARDS_DATA } from './data/vanguards.js';
import { LOGISTICS_DATA } from './data/logistics.js';
import { TALENTS_DATA } from './data/talents.js';

export const POSITIONS = [
  { id: 'monarch', name: '君主', desc: '统御天下，开创盛世', pool: EMPERORS_DATA, weights: { politics: 0.3, military: 0.2, strategy: 0.2, charm: 0.2, literature: 0.05, diplomacy: 0.05 } },
  { id: 'prince', name: '太子', desc: '储君之资，守成继业', pool: PRINCES_DATA, weights: { politics: 0.25, charm: 0.25, strategy: 0.2, literature: 0.15, military: 0.1, diplomacy: 0.05 } },
  { id: 'consort', name: '后宫', desc: '母仪天下，辅佐内政', pool: CONSORTS_DATA, weights: { charm: 0.3, politics: 0.25, literature: 0.2, strategy: 0.15, diplomacy: 0.05, military: 0.05 } },
  { id: 'minister', name: '丞相', desc: '治国安邦，运筹帷幄', pool: MINISTERS_DATA, weights: { politics: 0.35, strategy: 0.25, diplomacy: 0.15, literature: 0.1, charm: 0.1, military: 0.05 } },
  { id: 'strategist', name: '军师', desc: '决胜千里，算无遗策', pool: STRATEGISTS_DATA, weights: { strategy: 0.4, politics: 0.15, military: 0.15, literature: 0.15, diplomacy: 0.1, charm: 0.05 } },
  { id: 'envoy', name: '外交', desc: '纵横捭阖，不辱使命', pool: DIPLOMATS_DATA, weights: { diplomacy: 0.35, charm: 0.25, strategy: 0.15, politics: 0.1, literature: 0.1, military: 0.05 } },
  { id: 'general', name: '将军', desc: '统帅三军，百战百胜', pool: GENERALS_DATA, weights: { military: 0.4, strategy: 0.25, charm: 0.15, politics: 0.1, diplomacy: 0.05, literature: 0.05 } },
  { id: 'vanguard', name: '先锋', desc: '冲锋陷阵，万夫莫', pool: VANGUARDS_DATA, weights: { military: 0.45, charm: 0.2, strategy: 0.15, politics: 0.05, diplomacy: 0.05, literature: 0.1 } },
  { id: 'logistics', name: '后勤', desc: '粮草先行，固本培元', pool: LOGISTICS_DATA, weights: { politics: 0.35, strategy: 0.2, literature: 0.15, diplomacy: 0.1, charm: 0.1, military: 0.1 } },
  { id: 'talent', name: '才华', desc: '文采风流，名垂青史', pool: TALENTS_DATA, weights: { literature: 0.45, charm: 0.2, strategy: 0.1, politics: 0.1, diplomacy: 0.1, military: 0.05 } },
];

export const DYNASTIES = [
  { id: 'qin', name: '秦', desc: '横扫六合，一统天下', bonus: { military: 5, politics: 3 } },
  { id: 'han', name: '汉', desc: '大风起兮云飞扬', bonus: { politics: 5, diplomacy: 3 } },
  { id: 'tang', name: '唐', desc: '万国来朝，盛世华章', bonus: { literature: 5, charm: 3 } },
  { id: 'song', name: '宋', desc: '文治巅峰，富甲天下', bonus: { literature: 5, politics: 3 } },
  { id: 'yuan', name: '元', desc: '铁骑纵横，疆域无疆', bonus: { military: 5, strategy: 3 } },
  { id: 'ming', name: '明', desc: '天子守国门，君王死社稷', bonus: { military: 3, politics: 3, charm: 2 } },
  { id: 'sanguo', name: '三国', desc: '英雄辈出，逐鹿中原', bonus: { strategy: 5, military: 3 } },
  { id: 'sui', name: '隋', desc: '开运河，创科举，功在千秋', bonus: { politics: 4, strategy: 4 } },
];

export const POOL_SIZE = 20;

export function pickDynasty() {
  return DYNASTIES[Math.floor(Math.random() * DYNASTIES.length)];
}

export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildPools() {
  return POSITIONS.map(pos => ({
    position: pos,
    heroes: shuffleArray(pos.pool).slice(0, POOL_SIZE),
  }));
}

export function calcScore(hero, position, dynasty) {
  let score = 0;
  for (const [stat, weight] of Object.entries(position.weights)) {
    let val = hero.stats[stat] || 0;
    if (dynasty.bonus[stat]) val += dynasty.bonus[stat];
    val = Math.min(val, 100);
    score += val * weight;
  }
  return Math.round(score * 10) / 10;
}

export function judgeDuel(heroA, heroB, position, dynasty) {
  const scoreA = calcScore(heroA, position, dynasty);
  const scoreB = calcScore(heroB, position, dynasty);
  const diff = scoreA - scoreB;
  let winner, sA, sB;
  if (Math.abs(diff) < 1.5) {
    winner = 'draw';
    sA = 5; sB = 5;
  } else if (diff > 0) {
    winner = 'A';
    sA = Math.min(10, 5 + Math.round(diff / 3));
    sB = 10 - sA;
  } else {
    winner = 'B';
    sB = Math.min(10, 5 + Math.round(-diff / 3));
    sA = 10 - sB;
  }
  return { winner, scoreA: sA, scoreB: sB, rawA: scoreA, rawB: scoreB };
}

export function judgeAll(lineupA, lineupB, dynasty) {
  const results = [];
  let totalA = 0, totalB = 0;
  for (const pos of POSITIONS) {
    const heroA = lineupA[pos.id];
    const heroB = lineupB[pos.id];
    if (!heroA || !heroB) continue;
    const r = judgeDuel(heroA, heroB, pos, dynasty);
    results.push({ position: pos, heroA, heroB, ...r });
    totalA += r.scoreA;
    totalB += r.scoreB;
  }
  const winner = totalA > totalB ? 'A' : totalB > totalA ? 'B' : 'draw';
  return { results, totalA, totalB, winner };
}
