import { BUILDINGS, BOARD_SIZE, advanceSeason, build, canBuild, countyScore, createCounty } from './logic.js';

const $ = id => document.getElementById(id);
let state = createCounty();
let selected = 'farm';

const resourceRows = [
  ['grain', '粮食'], ['silver', '银两'], ['people', '人口'], ['prestige', '名望'], ['order', '治安'],
];

function render() {
  $('season').textContent = `第 ${Math.min(state.season, 12)} / 12 季`;
  $('resources').innerHTML = resourceRows.map(([key, label]) => `<div class="resource"><span>${label}</span><b>${key === 'people' ? `${state[key]}/${state.maxPeople}` : state[key]}</b></div>`).join('');
  $('county').innerHTML = state.board.flatMap((row, r) => row.map((type, c) => `<button class="tile" data-row="${r}" data-col="${c}" data-type="${type || ''}" type="button">${type === 'office' ? '衙' : type ? BUILDINGS[type].icon : ''}</button>`)).join('');
  $('county').querySelectorAll('.tile').forEach(tile => tile.onclick = () => {
    const next = build(state, selected, Number(tile.dataset.row), Number(tile.dataset.col));
    if (next) { state = next; render(); }
  });
  $('buildings').innerHTML = Object.entries(BUILDINGS).map(([id, item]) => `<button class="building ${id === selected ? 'selected' : ''}" data-building="${id}" type="button"><b>${item.icon} ${item.name}</b><span>${item.desc}<br>粮${item.cost.grain} 银${item.cost.silver}</span></button>`).join('');
  $('buildings').querySelectorAll('[data-building]').forEach(button => button.onclick = () => { selected = button.dataset.building; render(); });
  $('logs').innerHTML = [...state.logs].reverse().map(log => `<p>${log}</p>`).join('');
  $('advance').disabled = state.over;
  $('advance').textContent = state.over ? '任期已结' : '处理本季政务';
  if (state.over) showEnding();
}

function showEnding() {
  $('ending-title').textContent = state.result === '名城' ? '治下成名城' : state.result === '守成' ? '守成一方' : '县城失守';
  $('ending-score').textContent = `县令政绩 ${countyScore(state)}`;
  $('ending').classList.remove('hidden');
}

$('advance').onclick = () => { state = advanceSeason(state); render(); };
$('restart').onclick = () => { state = createCounty(); selected = 'farm'; $('ending').classList.add('hidden'); render(); };
render();
