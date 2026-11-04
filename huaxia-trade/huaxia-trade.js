import { SPACES, buy, createGame, currentPlayer, finishAction, marketPrice, playAiTurn, propertyValue, roll, totalWealth, upgrade, winnerText } from './logic.js';

const $ = id => document.getElementById(id);
let state = createGame(4);
let moving = false;
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function routeSvg() {
  const points = SPACES.map(space => `${space.x},${space.y}`).join(' ');
  return `<svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="route-line" points="${points} ${SPACES[0].x},${SPACES[0].y}"/><path class="route-line secondary" d="M44 43 C54 50 65 51 72 61 S57 73 49 70 S37 62 28 64 S20 27 44 43"/></svg>`;
}

function renderMap() {
  const owned = state.properties;
  const pieces = state.players.filter(player => !player.bankrupt).reduce((map, player) => {
    map[player.position] = [...(map[player.position] || []), player];
    return map;
  }, {});
  $('map').innerHTML = routeSvg() + SPACES.map((space, index) => {
    const property = owned[space.id];
    const players = pieces[index] || [];
    const owner = property ? state.players[property.owner] : null;
    const typeClass = space.type;
    const market = marketPrice(state, space.id);
    const label = space.type === 'city' ? `<small>${market.cost}两</small>` : `<small>${space.note || '历史事件'}</small>`;
    const ownerMark = owner ? `<i class="owner-mark" style="background:${owner.color}">${owner.icon}</i>` : '';
    const level = property?.level ? `<em class="level-mark">${'◆'.repeat(property.level)}</em>` : '';
    const tokenMark = players.length ? `<span class="on-space">${players.map(player => esc(player.icon)).join('')}</span>` : '';
    return `<button class="map-space ${typeClass}" style="left:${space.x}%;top:${space.y}%;--space-color:${space.color || '#8b5b39'}" data-space="${space.id}" type="button"><strong>${space.name}</strong>${label}${ownerMark}${level}${tokenMark}</button>`;
  }).join('');
  $('map').querySelectorAll('[data-space]').forEach(button => { button.onclick = () => renderSpaceInfo(button.dataset.space); });
}

function renderPlayers() {
  $('players').innerHTML = state.players.map(player => `<div class="player-row ${player.bankrupt ? 'bankrupt' : ''}"><span class="player-token" style="background:${player.color}">${player.icon}</span><div><b>${esc(player.name)}${player.id === state.turn && !player.bankrupt ? ' · 行商中' : ''}</b><small>${propertyValue(state, player.id)} 两商号资产</small></div><strong class="player-money">${player.money}两</strong></div>`).join('');
}

function renderTurn() {
  const player = currentPlayer(state);
  $('round-label').textContent = `第 ${state.round} 轮`;
  $('turn-card').innerHTML = state.phase === 'finished' ? '<b>商路已结算</b><small>天下财富已有归属</small>' : `<b style="color:${player.color}">${esc(player.name)} 的回合</b><small>${state.phase === 'await-roll' ? '请掷骰子，开始本回合行商' : `掷出 ${state.dice} 点，请处理落点`}</small>`;
  $('roll-btn').disabled = moving || state.phase !== 'await-roll' || player.kind !== 'human';
  $('roll-btn').textContent = state.phase === 'await-roll' ? '掷骰子' : `本回合 ${state.dice || ''} 点`;
}

function renderSpaceInfo(spaceId = state.pending || state.players[state.turn].position) {
  const space = SPACES.find(item => item.id === spaceId);
  if (!space) return;
  const property = state.properties[space.id];
  const owner = property ? state.players[property.owner] : null;
  const market = marketPrice(state, space.id);
  let body = space.type === 'city' ? (owner ? `由 <b style="color:${owner.color}">${esc(owner.name)}</b> 经营 · 商税 ${Math.floor(market.toll * (1 + property.level * .7))} 两` : `购入价格 <b>${market.cost} 两</b> · 当前商税 ${market.toll} 两`) : `<b>${space.note || '历史事件'}</b>`;
  if (property) body += `<br>等级：${['商号', '商铺', '商行', '总号'][property.level]}`;
  $('space-info').innerHTML = `<h3>${space.name}</h3><div>${body}</div>`;
}

function renderActions() {
  const buttons = $('action-buttons');
  buttons.innerHTML = '';
  if (state.phase !== 'await-action' || currentPlayer(state).kind !== 'human') return;
  const space = SPACES.find(item => item.id === state.pending);
  const property = state.properties[space.id];
  const market = marketPrice(state, space?.id);
  if (space.type === 'city' && !property && currentPlayer(state).money >= market.cost) buttons.insertAdjacentHTML('beforeend', `<button class="primary" id="buy-action" type="button">购入商号（${market.cost} 两）</button>`);
  if (space.type === 'city' && property?.owner === state.turn && property.level < 3) {
    const price = Math.floor(property.cost * (.45 + property.level * .2));
    buttons.insertAdjacentHTML('beforeend', `<button class="primary" id="upgrade-action" type="button">升级（${price} 两）</button>`);
  }
  buttons.insertAdjacentHTML('beforeend', '<button id="finish-action" type="button">结束回合</button>');
  $('buy-action')?.addEventListener('click', () => apply(buy(state)));
  $('upgrade-action')?.addEventListener('click', () => apply(upgrade(state)));
  $('finish-action').addEventListener('click', () => apply(finishAction(state)));
}

function renderLog() { $('trade-log').innerHTML = state.log.slice(-12).reverse().map(log => `<p>${esc(log)}</p>`).join(''); }
function render() { renderMap(); renderPlayers(); renderTurn(); renderSpaceInfo(); renderActions(); renderLog(); }

function apply(next) { if (!next) return; state = next; render(); if (state.phase === 'finished') showFinish(); else if (currentPlayer(state).kind === 'ai') runAi(); }

async function animateRoll() {
  moving = true; renderTurn();
  const player = currentPlayer(state);
  const next = roll(state);
  if (!next) { moving = false; return; }
  // Show each route hop so movement feels like a board game, then reveal the real state.
  const destination = next.players[state.turn].position;
  const start = player.position;
  for (let step = 1; step <= next.dice; step += 1) {
    const preview = structuredClone(state);
    preview.players[state.turn].position = (start + step) % SPACES.length;
    state = preview; renderMap(); await sleep(90);
  }
  state = next; moving = false; render();
  if (state.phase === 'await-action') renderSpaceInfo(SPACES[destination].id);
}

async function runAi() {
  moving = true; renderTurn(); await sleep(520);
  const next = playAiTurn(state);
  if (next === state) { moving = false; return; }
  state = next; moving = false; render();
  if (state.phase === 'finished') showFinish();
  else if (currentPlayer(state).kind === 'ai') runAi();
}

function showFinish() {
  $('finish-title').textContent = winnerText(state) || '商路暂时无人胜出';
  $('finish-ranking').innerHTML = [...state.players].sort((a, b) => totalWealth(state, b.id) - totalWealth(state, a.id)).map((player, index) => `<div class="rank-row"><span>${index + 1}. ${esc(player.name)}</span><b>${totalWealth(state, player.id)} 两</b></div>`).join('');
  $('finish-modal').classList.remove('hidden');
}

function bind() {
  $('roll-btn').onclick = animateRoll;
  $('rules-btn').onclick = () => $('rules-modal').classList.remove('hidden');
  $('close-rules').onclick = () => $('rules-modal').classList.add('hidden');
  $('rules-modal').querySelector('[data-close-rules]').onclick = () => $('rules-modal').classList.add('hidden');
  $('restart-btn').onclick = () => { state = createGame(4); $('finish-modal').classList.add('hidden'); render(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('rules-modal').classList.add('hidden'); $('finish-modal').classList.add('hidden'); } });
}

bind(); render();
