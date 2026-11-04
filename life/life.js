import { ATTRIBUTES, ATTRIBUTE_BUDGET, ATTRIBUTE_MAX, createLife } from './logic.js?v=5';

const $ = id => document.getElementById(id);
let points = Object.fromEntries(ATTRIBUTES.map(attr => [attr.id, 0]));
let streamController = null;
let pendingText = '';
let visibleText = '';
let drainTimer = null;
const labels = { health: '健康', happiness: '心境', money: '财富', skill: '能力', relation: '关系', reputation: '声望' };

function statusFor(value) {
  if (value >= 78) return '充盈';
  if (value >= 55) return '平稳';
  if (value >= 32) return '起伏';
  return '低迷';
}

function renderSetup() {
  const spent = Object.values(points).reduce((total, value) => total + value, 0);
  $('points-left').textContent = ATTRIBUTE_BUDGET - spent;
  $('begin-button').disabled = spent !== ATTRIBUTE_BUDGET;
  $('attribute-grid').innerHTML = ATTRIBUTES.map(attr => `<div class="attribute"><div><h3>${attr.name}</h3><p>${attr.hint}</p></div><div class="attribute-stepper"><button data-attr="${attr.id}" data-step="-1" type="button" ${points[attr.id] === 0 ? 'disabled' : ''}>-</button><strong>${points[attr.id]}</strong><button data-attr="${attr.id}" data-step="1" type="button" ${spent === ATTRIBUTE_BUDGET || points[attr.id] === ATTRIBUTE_MAX ? 'disabled' : ''}>+</button></div></div>`).join('');
  document.querySelectorAll('[data-attr]').forEach(button => button.onclick = () => {
    const id = button.dataset.attr;
    const delta = Number(button.dataset.step);
    const next = points[id] + delta;
    const nextSpent = Object.values(points).reduce((sum, value) => sum + value, 0) + delta;
    if (next >= 0 && next <= ATTRIBUTE_MAX && nextSpent <= ATTRIBUTE_BUDGET) {
      points[id] = next;
      renderSetup();
    }
  });
}

function parseSections(text) {
  return [...text.matchAll(/【([^】]+)】\s*([\s\S]*?)(?=【|$)/g)]
    .map(([, title, content]) => ({ title: title.trim(), content: content.trim() }))
    .filter(section => section.content);
}

function renderTimeline(text) {
  const sections = parseSections(text).filter(section => section.title !== '人生总评');
  $('timeline').replaceChildren(...sections.map(section => {
    const item = document.createElement('article');
    item.className = 'timeline-item';
    const marker = document.createElement('span');
    marker.textContent = 'AI 推演';
    const title = document.createElement('b');
    title.textContent = section.title;
    const content = document.createElement('p');
    content.textContent = section.content;
    item.append(marker, title, content);
    return item;
  }));
}

function renderStream(text) {
  const latest = parseSections(text).at(-1);
  $('story-title').textContent = latest ? latest.title : 'AI 正在推演人生';
  $('story-text').textContent = latest ? latest.content : (text || '从出生开始，人生正在展开...');
  renderTimeline(text);
}

function showEnding(text) {
  const review = parseSections(text).find(section => section.title === '人生总评');
  const content = review?.content || '这段人生已经走到终点。';
  const score = content.match(/(?:人生)?评分\s*[：:]\s*(\d{1,3})/);
  $('ending-title').textContent = '人生总评';
  $('ending-text').textContent = content;
  $('ending-score').textContent = score ? `人生评分 ${score[1]}` : '人生推演完成';
  $('ending').classList.remove('hidden');
}

function drainText() {
  const chunk = pendingText.slice(0, 4);
  pendingText = pendingText.slice(chunk.length);
  visibleText += chunk;
  renderStream(visibleText);
  drainTimer = pendingText ? window.setTimeout(drainText, 18) : null;
}

function enqueueText(text) {
  pendingText += text;
  if (!drainTimer) drainText();
}

async function waitForVisibleText() {
  while (pendingText || drainTimer) await new Promise(resolve => window.setTimeout(resolve, 30));
}

async function streamLife() {
  const life = createLife(points, Date.now());
  const attributes = ATTRIBUTES.map(attr => `${attr.name}${life.attributes[attr.id]}点`).join('，');
  streamController = new AbortController();
  const response = await fetch('/api/life/narrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attributes }),
    signal: streamController.signal,
  });
  if (!response.ok || !response.body) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error || 'AI 推演暂时不可用');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  const consume = line => {
    if (!line.startsWith('data:')) return;
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    try {
      const data = JSON.parse(payload);
      const token = data.text || data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content;
      if (token) {
        fullText += token;
        enqueueText(token);
      }
    } catch { /* Ignore keep-alives and incomplete SSE records. */ }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(consume);
  }
  consume(buffer);
  await waitForVisibleText();
  if (!fullText.trim()) throw new Error('AI 未返回人生内容');
  await new Promise(resolve => window.setTimeout(resolve, 5000));
  showEnding(fullText);
  const score = Number(fullText.match(/(?:人生)?评分\s*[：:]\s*(\d{1,3})/)?.[1]);
  globalThis.HappyGame?.finish('won', { score: Number.isFinite(score) ? score : 0, metadata: { attributes: points } });
}

function renderInitialLife() {
  const life = createLife(points, Date.now());
  $('stage-name').textContent = '推演中';
  $('age').textContent = '0';
  $('max-age').textContent = life.maxAge;
  $('life-stats').innerHTML = Object.entries(life.stats).map(([key, value]) => `<div class="life-stat"><div><span>${labels[key]}</span><b>${statusFor(value)}</b></div><i><em style="width:${value}%"></em></i></div>`).join('');
  $('story-title').textContent = 'AI 正在推演人生';
  $('story-text').textContent = '从出生开始，人生正在展开...';
  $('timeline').replaceChildren();
  pendingText = '';
  visibleText = '';
}

$('begin-button').onclick = async () => {
  $('setup').classList.add('hidden');
  $('game').classList.remove('hidden');
  renderInitialLife();
  globalThis.HappyGame?.event('game_resumed', { source: 'begin_button', attributes: points });
  try {
    await streamLife();
  } catch (error) {
    if (error.name === 'AbortError') return;
    $('story-title').textContent = '推演未完成';
    $('story-text').textContent = error.message || 'AI 服务暂时不可用，请重新开始。';
  } finally {
    streamController = null;
  }
};

$('restart').onclick = () => {
  globalThis.HappyGame?.restart({ reason: 'button_reset' });
  streamController?.abort();
  streamController = null;
  if (drainTimer) window.clearTimeout(drainTimer);
  drainTimer = null;
  pendingText = '';
  visibleText = '';
  points = Object.fromEntries(ATTRIBUTES.map(attr => [attr.id, 0]));
  $('ending').classList.add('hidden');
  $('setup').classList.remove('hidden');
  renderSetup();
};

renderSetup();
