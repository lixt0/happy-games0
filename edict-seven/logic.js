export const DECREE_POOL = [
  { title: '开仓赈灾', text: '城南灾民聚集，三日内必须平息饥荒。', need: { grain: 70 }, success: { people: 12, prestige: 8 }, fail: { people: -16, prestige: -8 } },
  { title: '清查军饷', text: '边军欠饷，圣上命你筹措八十两银钱。', need: { silver: 80 }, success: { safety: 12, prestige: 7 }, fail: { safety: -15, prestige: -7 } },
  { title: '缉拿要犯', text: '命案牵连士族，须有足够情报才能定案。', need: { intel: 5 }, success: { prestige: 13, clan: -6 }, fail: { prestige: -9, clan: 8 } },
  { title: '修复堤坝', text: '暴雨将至，河堤亟待征调人手与粮石。', need: { grain: 35, people: 55 }, success: { people: 7, safety: 14 }, fail: { people: -14, safety: -16 } },
  { title: '安抚士族', text: '本地大族上书施压，朝廷要你维持局面。', need: { clan: 52 }, success: { prestige: 8, clan: 6 }, fail: { prestige: -6, clan: -13 } },
  { title: '护送密使', text: '一封密函必须穿过城外险地，需调集兵勇。', need: { safety: 58 }, success: { prestige: 12, safety: 5 }, fail: { prestige: -10, safety: -12 } },
  { title: '整顿吏治', text: '御史将至，民怨不得继续累积。', need: { people: 58, intel: 3 }, success: { prestige: 10, people: 7 }, fail: { prestige: -8, people: -12 } }
];
export const ACTIONS = [
  { id: 'open-granary', name: '开仓放粮', tag: '民生', text: '拨出粮食，换取民心与情报。', effect: { grain: -22, people: 12, intel: 1 } },
  { id: 'tax', name: '清点商税', tag: '财赋', text: '迅速补足银钱，但商户会不满。', effect: { silver: 30, people: -8, clan: -3 } },
  { id: 'visit-clan', name: '拜访士族', tag: '人情', text: '以礼相待，获得士族支持与捐助。', effect: { clan: 11, silver: 9, people: -2 } },
  { id: 'night-watch', name: '夜巡暗访', tag: '情报', text: '深入坊市收集线索，治安略有改善。', effect: { intel: 2, safety: 6, people: -3 } },
  { id: 'drill', name: '操练差役', tag: '军务', text: '征调人手维持秩序，民心会受影响。', effect: { safety: 11, people: -6 } },
  { id: 'mediate', name: '公堂断案', tag: '政务', text: '当众裁断纠纷，提升威望但得罪一方。', effect: { prestige: 6, people: 5, clan: -6 } },
  { id: 'borrow', name: '向商会借款', tag: '权衡', text: '解燃眉之急，代价是折损名望。', effect: { silver: 42, prestige: -7, clan: 3 } },
  { id: 'inspect', name: '巡查河工', tag: '政务', text: '查验工料，获得粮石与治安提升。', effect: { grain: 14, safety: 4, intel: 1 } }
];
const keys = ['silver', 'grain', 'people', 'safety', 'clan', 'prestige', 'intel'];
const clone = value => structuredClone(value);
const clamp = (key, value) => key === 'intel' ? Math.max(0, value) : Math.max(0, Math.min(100, value));
export function createGame(rng = Math.random) { const deck = [...DECREE_POOL].sort(() => rng() - .5).slice(0, 7); return { day: 1, actions: 3, decrees: deck, stats: { silver: 55, grain: 65, people: 56, safety: 48, clan: 45, prestige: 30, intel: 1 }, log: ['奉诏入京，七日之内，且看你能否守住一城。'], over: false, ending: null }; }
export function availableActions(state, rng = Math.random) { return [...ACTIONS].sort(() => rng() - .5).slice(0, 4); }
function apply(state, effect) { keys.forEach(key => { if (effect[key] !== undefined) state.stats[key] = clamp(key, state.stats[key] + effect[key]); }); }
export function takeAction(state, actionId) { if (state.over || state.actions <= 0) return null; const card = ACTIONS.find(x => x.id === actionId); if (!card) return null; const next = clone(state); apply(next, card.effect); next.actions -= 1; next.log.push(card.name + '：' + card.text); return next; }
function meets(stats, need) { return Object.entries(need).every(([key, value]) => stats[key] >= value); }
export function closeDay(state) { if (state.over || state.actions > 0) return null; const next = clone(state), decree = next.decrees[next.day - 1], success = meets(next.stats, decree.need); apply(next, success ? decree.success : decree.fail); next.log.push(decree.title + '：' + (success ? '圣旨办妥。' : '未能办妥，后果已至。') + decree.text); if (next.stats.people === 0 || next.stats.safety === 0 || next.stats.prestige === 0) { next.over = true; next.ending = '失守'; return next; } if (next.day === 7) { next.over = true; const value = score(next); next.ending = value >= 72 ? '名臣' : value >= 52 ? '能吏' : '守成'; return next; } next.day += 1; next.actions = 3; return next; }
export function decreeProgress(state) { const decree = state.decrees[state.day - 1]; return Object.entries(decree.need).map(([key, value]) => ({ key, value, current: state.stats[key], ok: state.stats[key] >= value })); }
export function score(state) { return Math.round(state.stats.prestige * .35 + state.stats.people * .2 + state.stats.safety * .2 + state.stats.clan * .1 + state.stats.silver * .08 + state.stats.grain * .07); }
