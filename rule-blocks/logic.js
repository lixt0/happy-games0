export const WIDTH = 9;
export const HEIGHT = 8;
export const NOUNS = ['我', '旗', '墙', '箱', '水'];
export const PROPS = ['你', '胜', '停', '推', '灭'];
const DIRECTIONS = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
const clone = value => structuredClone(value);
const at = (items, r, c) => items.filter(item => item.r === r && item.c === c);
const point = (r, c) => `${r},${c}`;

const words = (r, c, text) => ({ r, c, type: 'word', text });
const obj = (r, c, text) => ({ r, c, type: 'object', text });

export const LEVELS = [
  { name: '规则初见', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(2, 0, '墙'), words(2, 1, '是'), words(2, 2, '停'), obj(6, 1, '我'), obj(6, 6, '旗'), obj(5, 3, '墙'), obj(6, 3, '墙'), obj(7, 3, '墙')] },
  { name: '打破阻挡', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(3, 2, '墙'), words(3, 3, '是'), words(3, 4, '停'), obj(6, 1, '我'), obj(6, 7, '旗'), obj(4, 5, '墙'), obj(5, 5, '墙'), obj(6, 5, '墙'), obj(7, 5, '墙')] },
  { name: '谁是玩家', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(3, 1, '箱'), words(3, 2, '是'), words(3, 3, '推'), obj(6, 1, '我'), obj(6, 6, '旗'), obj(5, 3, '箱'), obj(6, 3, '箱')] },
  { name: '沉没边界', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(2, 0, '水'), words(2, 1, '是'), words(2, 2, '灭'), obj(6, 1, '我'), obj(6, 7, '旗'), obj(5, 4, '水'), obj(6, 4, '水'), obj(7, 4, '水')] },
  { name: '文字也能推', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(3, 2, '墙'), words(3, 3, '是'), words(3, 4, '停'), obj(6, 1, '我'), obj(6, 7, '旗'), obj(5, 5, '墙'), obj(6, 5, '墙'), obj(7, 5, '墙'), obj(4, 5, '墙')] },
  { name: '最后一条规则', items: [words(0, 0, '我'), words(0, 1, '是'), words(0, 2, '你'), words(1, 0, '旗'), words(1, 1, '是'), words(1, 2, '胜'), words(2, 0, '墙'), words(2, 1, '是'), words(2, 2, '停'), words(3, 0, '水'), words(3, 1, '是'), words(3, 2, '灭'), obj(6, 1, '我'), obj(6, 7, '旗'), obj(4, 4, '墙'), obj(5, 4, '水'), obj(6, 4, '水'), obj(7, 4, '水')] },
];

export function createState(levelIndex = 0) { return { levelIndex, items: clone(LEVELS[levelIndex].items), moves: 0, won: false }; }
export function rulesFor(state) {
  const rules = Object.fromEntries(NOUNS.map(noun => [noun, new Set()]));
  const lookup = new Map(state.items.filter(item => item.type === 'word').map(item => [point(item.r, item.c), item.text]));
  for (const [coord, noun] of lookup) {
    if (!NOUNS.includes(noun)) continue;
    const [r, c] = coord.split(',').map(Number);
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (lookup.get(point(r + dr, c + dc)) !== '是') continue;
      const prop = lookup.get(point(r + dr * 2, c + dc * 2));
      if (PROPS.includes(prop)) rules[noun].add(prop);
    }
  }
  return rules;
}

function canMoveItem(items, index, dr, dc, rules, moving = new Set()) {
  if (moving.has(index)) return true;
  moving.add(index);
  const item = items[index]; const nr = item.r + dr; const nc = item.c + dc;
  if (nr < 0 || nr >= HEIGHT || nc < 0 || nc >= WIDTH) return false;
  const blockers = at(items, nr, nc);
  for (const blocker of blockers) {
    const blockerIndex = items.indexOf(blocker);
    const pushes = blocker.type === 'word' || rules[blocker.text]?.has('推');
    if (rules[blocker.text]?.has('停')) return false;
    if (pushes && !canMoveItem(items, blockerIndex, dr, dc, rules, moving)) return false;
  }
  return true;
}

export function move(state, direction) {
  const [dr, dc] = DIRECTIONS[direction] || [];
  if (dr === undefined || state.won) return state;
  const next = clone(state); const rules = rulesFor(next);
  const movers = next.items.map((item, index) => ({ item, index })).filter(({ item }) => item.type === 'object' && rules[item.text]?.has('你'));
  const moved = new Set();
  for (const { index } of movers) {
    const group = new Set();
    if (canMoveItem(next.items, index, dr, dc, rules, group)) group.forEach(itemIndex => moved.add(itemIndex));
  }
  if (!moved.size) return state;
  moved.forEach(index => { next.items[index].r += dr; next.items[index].c += dc; });
  next.moves += 1;
  const after = rulesFor(next);
  next.items = next.items.filter(item => !(item.type === 'object' && after[item.text]?.has('你') && at(next.items, item.r, item.c).some(other => other !== item && other.type === 'object' && after[other.text]?.has('灭'))));
  next.won = next.items.some(item => item.type === 'object' && after[item.text]?.has('你') && at(next.items, item.r, item.c).some(other => other !== item && other.type === 'object' && after[other.text]?.has('胜')));
  return next;
}
