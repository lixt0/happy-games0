import {
  routes, backpacks, allItems, getFoodDefs, getToolDefs, getItem, getBackpack,
  createGameState, getCurrentCheckpoint, getNextCheckpoint,
  advanceCheckpoint, getProgress, isComplete, isFood,
  processDay, consumeFood, useMedkit, initFatalDanger, getSceneryImages,
} from '/hiking/logic.js';

const $ = id => document.getElementById(id);

const routeCardsEl = $('route-cards');
const routeSelectEl = $('route-select');
const gearSelectEl = $('gear-select');
const gearGridEl = $('gear-grid');
const gearRouteName = $('gear-route-name');
const gearInfo = $('gear-info');
const gearWeightEl = $('gear-weight');
const gearBackpackEl = $('gear-backpack');
const gearConfirmEl = $('gear-confirm');
const gearFooter = $('gear-footer');
const btnStartHike = $('btn-start-hike');
const btnBackRoutes = $('btn-back-routes');
const gameViewEl = $('game-view');
const sceneryImg = $('scenery-img');
const dayLabel = $('day-label');
const profileSvg = $('profile-svg');
const locIndex = $('loc-index');
const locName = $('loc-name');
const locElevation = $('loc-elevation');
const locDesc = $('loc-desc');
const dayLog = $('day-log');
const dayEvents = $('day-events');
const btnAdvance = $('btn-advance');
const btnRouteBack = $('btn-route-back');
const routeNameDisplay = $('route-name-display');
const gearDisplay = $('gear-display');
const foodInventoryEl = $('food-inventory');
const vitalEnergy = $('vital-energy');
const vitalHealth = $('vital-health');
const vitalEnergyText = $('vital-energy-text');
const vitalHealthText = $('vital-health-text');
const progressBar = $('progress-bar');
const progressText = $('progress-text');
const statCheckpoint = $('stat-checkpoint');
const statElevation = $('stat-elevation');
const statDistance = $('stat-distance');
const statFailures = $('stat-failures');
const winModal = $('win-modal');
const winStats = $('win-stats');
const winNew = $('win-new');
const deathModal = $('death-modal');
const deathReason = $('death-reason');
const deathRetry = $('death-retry');

let state = null;
let selectedGear = {};
let selectedBackpack = null;
let pendingRouteId = null;
let busy = false;

function renderRouteCards() {
  const imgs = getSceneryImages();
  routeCardsEl.innerHTML = routes.map((r, i) => {
    const img = imgs[i % imgs.length] || '';
    return `<div class="route-card" data-route="${r.id}">
      <div class="rc-img"><img src="${img}" alt="" loading="lazy" decoding="async" fetchpriority="low"><span class="rc-badge" style="background:${r.color}">${r.difficulty}</span></div>
      <div class="rc-body">
        <h3>${r.name}</h3>
        <div class="rc-sub">${r.route}</div>
        <div class="rc-stats"><span>📏 ${r.distance}</span><span>⛰️ ${r.maxElevation}m</span><span>📅 ${r.days}</span></div>
        <p class="rc-summary">${r.summary}</p>
      </div>
    </div>`;
  }).join('');
  routeCardsEl.querySelectorAll('.route-card').forEach(el => {
    el.addEventListener('click', () => showGearSelect(el.dataset.route));
  });
}

function showGearSelect(routeId) {
  const route = routes.find(r => r.id === routeId);
  if (!route) return;
  pendingRouteId = routeId;
  selectedGear = {};
  selectedBackpack = null;
  routeSelectEl.classList.add('hidden');
  gearSelectEl.classList.remove('hidden');
  gearRouteName.textContent = `${route.name} · ${route.route}`;
  renderBackpackSelection();
  renderGearGrid();
}

function renderBackpackSelection() {
  gearBackpackEl.innerHTML = backpacks.map(b => `<div class="bp-item" data-bp="${b.id}">
    <div class="bp-name">${b.name}</div>
    <div class="bp-kg">${(b.maxWeight / 1000).toFixed(0)} kg</div>
    <div class="bp-desc">${b.desc}</div>
    <div class="bp-effort">体力 x${b.energyMult} · 自重 ${(b.selfWeight / 1000).toFixed(0)}kg</div>
  </div>`).join('');
  gearBackpackEl.querySelectorAll('.bp-item').forEach(el => {
    el.addEventListener('click', () => {
      gearBackpackEl.querySelectorAll('.bp-item').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedBackpack = el.dataset.bp;
      renderGearGrid();
    });
  });
}

function gearQty(id) { return selectedGear[id] || 0; }
function setQty(id, n) { if (n <= 0) delete selectedGear[id]; else selectedGear[id] = n; }

function calcWeight() {
  let total = 0;
  for (const [id, qty] of Object.entries(selectedGear)) {
    const item = getItem(id);
    if (item) total += item.weight * qty;
  }
  return total;
}

function renderGearGrid() {
  const bp = getBackpack(selectedBackpack);
  const totalW = calcWeight();
  const maxW = bp ? bp.maxWeight : 0;

  if (!bp) {
    gearWeightEl.textContent = '';
    gearGridEl.innerHTML = '<div style="padding:30px;color:var(--muted);font-size:14px">请先选择背包</div>';
    updateGearFooter();
    return;
  }

  const over = totalW > maxW;
  const loadW = totalW + (bp ? bp.selfWeight : 0);
  gearWeightEl.innerHTML = `装备 <strong style="color:${over ? '#e74c3c' : totalW > 0 ? 'var(--accent-red)' : 'var(--muted)'}">${(totalW / 1000).toFixed(1)}</strong> / ${(maxW / 1000).toFixed(0)} kg · 总负重 ${(loadW / 1000).toFixed(1)} kg`;

  const renderTool = item => {
    const q = gearQty(item.id);
    const sel = q > 0;
    const disabled = !sel && totalW + item.weight > maxW;
    return `<div class="gear-item ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}" data-id="${item.id}" data-type="tool">
      <span class="gi-emoji">${item.emoji}</span>
      <div class="gi-body"><div class="gi-name">${item.name}</div><div class="gi-desc">${item.desc}</div></div>
      <div class="gi-right"><span class="gi-wt">${item.weight}g</span></div>
    </div>`;
  };

  const renderFood = item => {
    const q = gearQty(item.id);
    const oneMore = (totalW + item.weight) <= maxW;
    return `<div class="gear-item ${q > 0 ? 'selected' : ''}" data-id="${item.id}" data-type="food">
      <span class="gi-emoji">${item.emoji}</span>
      <div class="gi-body"><div class="gi-name">${item.name}</div><div class="gi-desc">${item.desc} +${item.energy}体力</div></div>
      <div class="gi-right">
        <span class="gi-wt">${item.weight}g</span>
        <div class="qty-controls">
          <button class="qty-btn qty-sub" ${q <= 0 ? 'disabled' : ''}>−</button>
          <span class="qty-val">${q}</span>
          <button class="qty-btn qty-add" ${!oneMore ? 'disabled' : ''}>+</button>
        </div>
      </div>
    </div>`;
  };

  gearGridEl.innerHTML = `
    <div class="gs-row"><div class="gs-row-title">🧰 装备</div><div class="gi-grid">${getToolDefs().map(renderTool).join('')}</div></div>
    <div class="gs-row"><div class="gs-row-title">🍖 食物</div><div class="gi-grid">${getFoodDefs().map(renderFood).join('')}</div></div>
  `;

  gearGridEl.querySelectorAll('.gear-item[data-type="tool"]:not(.disabled)').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      setQty(id, gearQty(id) ? 0 : 1);
      renderGearGrid();
    });
  });

  gearGridEl.querySelectorAll('.gear-item[data-type="food"] .qty-add:not([disabled])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const el = btn.closest('.gear-item');
      setQty(el.dataset.id, gearQty(el.dataset.id) + 1);
      renderGearGrid();
    });
  });

  gearGridEl.querySelectorAll('.gear-item[data-type="food"] .qty-sub:not([disabled])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const el = btn.closest('.gear-item');
      setQty(el.dataset.id, gearQty(el.dataset.id) - 1);
      renderGearGrid();
    });
  });

  updateGearFooter();
}

function updateGearFooter() {
  const bp = getBackpack(selectedBackpack);
  const gearW = calcWeight();
  const maxW = bp ? bp.maxWeight : 0;
  const selfW = bp ? bp.selfWeight : 0;
  const loadW = gearW + selfW;
  const hasTent = gearQty('tent') > 0;
  const hasFood = Object.keys(selectedGear).some(id => isFood(id) && gearQty(id) > 0);
  const withinWeight = gearW > 0 && gearW <= maxW;
  const ok = bp && hasTent && hasFood && withinWeight;

  btnStartHike.disabled = !ok;

  if (bp) {
    const pct = Math.round((bp.energyMult - 1) * 100);
    const eff = pct > 0 ? `（体力消耗 +${pct}%）` : '（体力消耗正常）';
    gearInfo.innerHTML = `装备 <span class="wt ${withinWeight && gearW > 0 ? 'ok' : gearW > maxW ? 'over' : ''}">${(gearW / 1000).toFixed(1)}</span> / ${(maxW / 1000).toFixed(0)} kg · 总负重 ${(loadW / 1000).toFixed(1)} kg ${eff}`;
  } else {
    gearInfo.textContent = '先选背包';
  }

  const warns = [];
  if (!bp) warns.push('请选择背包');
  else if (!hasTent) warns.push('⚠️ 没帐篷没法睡觉');
  else if (!hasFood) warns.push('⚠️ 不带食物会饿死');
  else if (gearW > maxW) warns.push('⚠️ 超重了');
  else if (ok) { gearConfirmEl.innerHTML = '<span class="gs-ok">✅ 准备就绪</span>'; return; }

  gearConfirmEl.innerHTML = warns.length > 0 ? `<span class="gs-warn">${warns[warns.length - 1]}</span>` : '';
}

btnStartHike.addEventListener('click', () => {
  if (pendingRouteId && selectedBackpack) {
    startGame(pendingRouteId, selectedBackpack, { ...selectedGear });
  }
});

btnBackRoutes.addEventListener('click', () => {
  routeSelectEl.classList.remove('hidden');
  gearSelectEl.classList.add('hidden');
});

function startGame(routeId, bpId, gear) {
  state = createGameState(routeId, bpId, gear);
  if (!state) { alert('装备超重！'); return; }
  initFatalDanger(state);
  gearSelectEl.classList.add('hidden');
  gameViewEl.classList.remove('hidden');
  hideModal('win-modal');
  hideModal('death-modal');
  busy = false;
  renderGame();
}

function renderGame() {
  if (!state) return;
  const route = routes.find(r => r.id === state.routeId);
  const cp = getCurrentCheckpoint(state);
  if (!cp) return;
  routeNameDisplay.textContent = route.name;
  renderGearDisplay();
  renderFoodInventory();
  renderMedkit();
  renderProfile();
  renderLocation();
  renderVitals();
  renderProgress();
  renderStats();
  updateButton();
  loadScenery();
  updateDayLabel();
}

function renderGearDisplay() {
  const items = state.toolIds.filter(id => id !== 'tent').map(id => {
    const item = getItem(id);
    return item ? `<span class="gchip" title="${item.desc}">${item.emoji}</span>` : '';
  });
  if (state.hasTent) items.push('<span class="gchip tchip" title="帐篷">⛺</span>');
  const bp = getBackpack(state.backpackId);
  items.unshift(`<span class="gchip bpchip">🎒 ${bp ? bp.name.split(' ')[1] : ''}</span>`);
  const loadKg = (state.loadWeight / 1000).toFixed(1);
  gearDisplay.innerHTML = items.join('') + ` <span class="gchip wchip">${loadKg}kg</span>`;
}

function renderFoodInventory() {
  if (state.foodInventory.length === 0) {
    foodInventoryEl.innerHTML = '<div class="food-empty">没有食物了 😰</div>';
    return;
  }
  const counts = {};
  state.foodInventory.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  foodInventoryEl.innerHTML = Object.entries(counts).map(([fid, cnt]) => {
    const food = getItem(fid);
    if (!food) return '';
    return `<div class="food-item" data-food="${fid}">
      <span class="food-emoji">${food.emoji}</span>
      <span class="food-name">${food.name} ×${cnt}</span>
    </div>`;
  }).join('');
  foodInventoryEl.querySelectorAll('.food-item').forEach(el => {
    el.addEventListener('click', () => {
      const restored = consumeFood(state, el.dataset.food);
      if (restored > 0) { renderFoodInventory(); renderVitals(); renderMedkit(); }
    });
  });
}

function renderMedkit() {
  const medkitEl = $('medkit-area');
  const hasMedkit = state.toolIds.includes('first_aid');
  if (!hasMedkit || state.health >= 100) {
    medkitEl.innerHTML = '';
    return;
  }
  const item = getItem('first_aid');
  medkitEl.innerHTML = `<div class="food-item" data-use="medkit">
    <span class="food-emoji">${item.emoji}</span>
    <span class="food-name">${item.name}（恢复 30 健康度）</span>
  </div>`;
  medkitEl.querySelector('[data-use="medkit"]').addEventListener('click', () => {
    const healed = useMedkit(state);
    if (healed > 0) { renderMedkit(); renderVitals(); }
  });
}

function renderProfile() {
  const route = routes.find(r => r.id === state.routeId);
  const cps = route.checkpoints;
  const curIdx = state.currentCheckpoint;
  const maxDist = cps[cps.length - 1].dist;
  const maxElev = Math.max(...cps.map(c => c.elevation));
  const minElev = Math.min(...cps.map(c => c.elevation));
  const er = maxElev - minElev || 1;
  const w = 600, h = 180, pad = { top: 14, right: 16, bottom: 26, left: 42 };
  const xs = d => pad.left + (d / maxDist) * (w - pad.left - pad.right);
  const ys = e => pad.top + (1 - (e - minElev) / er) * (h - pad.top - pad.bottom);
  const pts = cps.map((c, i) => ({ x: xs(c.dist), y: ys(c.elevation), a: i === curIdx, p: i < curIdx, e: c.elevation }));
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const fill = poly + ` ${xs(cps[cps.length-1].dist)},${h + 10} ${xs(0)},${h + 10}`;
  const li = Math.max(1, Math.floor(cps.length / 5));
  const labelColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#a6b5b1' : '#6e5a40';
  profileSvg.innerHTML = `<defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${route.color}88"/><stop offset="100%" stop-color="${route.color}18"/></linearGradient></defs>
    <rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>
    <polygon points="${fill}" fill="url(#pg)"/>
    <polyline points="${poly}" fill="none" stroke="${route.color}" stroke-width="2.5" stroke-linejoin="round"/>
    ${pts.filter(p => p.p || p.a).map(p => `<circle cx="${p.x}" cy="${p.y}" r="${p.a ? 5 : 2.5}" fill="${p.a ? '#c0392b' : route.color}" stroke="white" stroke-width="${p.a ? 2 : 0.8}"/>`).join('')}
    ${pts.filter(p => p.a).map(p => `<circle cx="${p.x}" cy="${p.y}" r="9" fill="none" stroke="#c0392b" stroke-width="1.5" opacity="0.4"><animate attributeName="r" values="5;12;5" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/></circle>`).join('')}
    ${pts.filter((_, i) => i % li === 0 || i === cps.length - 1).map(p => `<text x="${p.x}" y="${h - 3}" text-anchor="middle" font-size="10" fill="${labelColor}">${p.e >= 1000 ? Math.round(p.e/100)*100 + 'm' : p.e + 'm'}</text>`).join('')}
    <text x="${pad.left - 6}" y="${pad.top + 8}" text-anchor="end" font-size="11" fill="${labelColor}">${maxElev}m</text>
    <text x="${pad.left - 6}" y="${h - pad.bottom + 6}" text-anchor="end" font-size="11" fill="${labelColor}">${minElev}m</text>`;
}

function renderLocation() {
  const cp = getCurrentCheckpoint(state);
  const route = routes.find(r => r.id === state.routeId);
  if (!cp) return;
  locIndex.textContent = `第 ${state.currentCheckpoint + 1}/${route.checkpoints.length} 站`;
  locName.textContent = cp.name;
  locElevation.textContent = `海拔 ${cp.elevation}m`;
  locDesc.textContent = cp.desc;
}

function renderVitals() {
  const e = Math.max(0, state.energy);
  const h = Math.max(0, state.health);
  vitalEnergy.style.width = `${e}%`; vitalHealth.style.width = `${h}%`;
  vitalEnergyText.textContent = Math.round(e); vitalHealthText.textContent = Math.round(h);
  vitalEnergy.style.background = e > 50 ? '#c0392b' : e > 25 ? '#e67e22' : '#c0392b';
  vitalHealth.style.background = h > 50 ? '#27ae60' : h > 25 ? '#e67e22' : '#c0392b';
}

function renderProgress() { const p = getProgress(state) * 100; progressBar.style.width = `${p}%`; progressText.textContent = `${Math.round(p)}%`; }

function renderStats() {
  const route = routes.find(r => r.id === state.routeId);
  const cp = getCurrentCheckpoint(state);
  if (!cp) return;
  statCheckpoint.textContent = `${state.currentCheckpoint + 1}/${route.checkpoints.length}`;
  statElevation.textContent = `${cp.elevation}m`;
  statDistance.textContent = `${cp.dist} km`;
  statFailures.textContent = `${state.failures}/3`;
}

function updateButton() {
  if (!state) return;
  if (state.dead) { btnAdvance.textContent = '已失败'; btnAdvance.disabled = true; }
  else if (state.completed || isComplete(state)) { btnAdvance.textContent = '已完成'; btnAdvance.disabled = true; }
  else { const n = getNextCheckpoint(state); btnAdvance.textContent = n ? `前进 → ${n.name}` : '前进 →'; btnAdvance.disabled = false; }
}

function updateDayLabel() {
  if (!state) return;
  const route = routes.find(r => r.id === state.routeId);
  dayLabel.textContent = `第 ${state.currentCheckpoint + 1}/${route.checkpoints.length} 天`;
}

function loadScenery() {
  const imgs = getSceneryImages();
  if (imgs.length > 0) { sceneryImg.src = imgs[0]; sceneryImg.alt = '沿途美景'; }
}

function handleAdvance() {
  if (!state || state.dead || isComplete(state) || busy) return;
  busy = true;
  btnAdvance.disabled = true;
  dayLog.classList.add('hidden');

  const result = processDay(state);

  dayEvents.innerHTML = result.logs.map(l => `<div class="eitem ${l.solved ? 'ok' : 'fail'}">
    <div class="ehead"><span class="eicon">${l.solved ? '✅' : '❌'}</span><span class="etitle">${l.title}</span></div>
    <div class="edesc">${l.desc}</div>
  </div>`).join('');
  dayLog.classList.remove('hidden');

  if (!state.dead) {
    advanceCheckpoint(state);
    renderVitals(); renderProgress(); renderStats(); updateButton(); renderFoodInventory(); renderMedkit();
    if (isComplete(state)) { setTimeout(() => { state.completed = true; showWinModal(); busy = false; }, 800); return; }
  } else {
    renderVitals(); renderStats(); updateButton();
    setTimeout(() => { showDeathModal(); busy = false; }, 800); return;
  }
  renderVitals(); renderProgress(); renderStats(); renderFoodInventory(); renderMedkit();
  loadScenery(); updateDayLabel(); renderProfile(); renderLocation();
  setTimeout(() => { busy = false; btnAdvance.disabled = false; updateButton(); }, 500);
}

function showWinModal() {
  const route = routes.find(r => r.id === state.routeId);
  const cp = getCurrentCheckpoint(state);
  winStats.textContent = `成功完成 ${route.name}！抵达 ${cp.name}（${cp.elevation}m）。剩余体力 ${Math.round(state.energy)}，健康 ${Math.round(state.health)}，食物剩 ${state.foodInventory.length} 份。`;
  showModal('win-modal');
}

function showDeathModal() { deathReason.textContent = state.deathReason; showModal('death-modal'); }

function goBack() {
  state = null; pendingRouteId = null; selectedGear = {}; selectedBackpack = null; busy = false;
  gameViewEl.classList.add('hidden'); gearSelectEl.classList.add('hidden'); routeSelectEl.classList.remove('hidden');
  hideModal('win-modal'); hideModal('death-modal');
}

function showModal(id) { $(id).classList.remove('hidden'); }
function hideModal(id) { $(id).classList.add('hidden'); }

btnAdvance.addEventListener('click', handleAdvance);
btnRouteBack.addEventListener('click', goBack);
winNew.addEventListener('click', goBack);
deathRetry.addEventListener('click', () => {
  hideModal('death-modal');
  if (pendingRouteId && selectedBackpack) { startGame(pendingRouteId, selectedBackpack, { ...selectedGear }); }
  else goBack();
});

renderRouteCards();
