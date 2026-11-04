// 板块与游戏数据。首页走 renderHome，板块子页走 renderSection。
const COLORS = [
  'var(--accent-red-text)',
  'var(--accent-orange-text)',
  'var(--accent-blue-text)',
  'var(--accent-green-text)',
  'var(--accent-purple-text)',
  'var(--accent-teal-text)',
  'var(--accent-gold-text)',
  'var(--accent-teal-text)',
];

// 板块入口卡的小图标
const SECTION_ICONS = {
  board: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="8" fill="#e8c989"/>
    <g stroke="#6e5a40" stroke-width="1.4">
      ${Array.from({length:5},(_,i)=>`<line x1="${16+i*8}" y1="16" x2="${16+i*8}" y2="48"/>`).join('')}
      ${Array.from({length:5},(_,i)=>`<line x1="16" y1="${16+i*8}" x2="48" y2="${16+i*8}"/>`).join('')}
    </g>
    <circle cx="32" cy="32" r="4.5" fill="#1a1a1a"/>
    <circle cx="40" cy="24" r="4.5" fill="#f9f5ea" stroke="#1a1a1a" stroke-width="0.6"/>
  </svg>`,
  puzzle: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="8" fill="#faf8ef"/>
    <g fill="#2980b9">
      <path d="M14 14 h14 v6 a4 4 0 1 0 4 4 h6 v14 h-6 a4 4 0 1 0 -4 4 v6 h-14 v-6 a4 4 0 1 0 -4 -4 h-4 v-14 h4 a4 4 0 1 0 4 -4 z" transform="translate(2,2)"/>
    </g>
  </svg>`,
  fun: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="8" fill="#70c5ce"/>
    <ellipse cx="32" cy="40" rx="14" ry="12" fill="#f5c842"/>
    <circle cx="36" cy="36" r="5" fill="white"/>
    <circle cx="38" cy="36" r="2.5" fill="#1a1a1a"/>
    <polygon points="44,38 54,40 44,43" fill="#e85a3a"/>
    <rect x="12" y="6" width="8" height="22" fill="#5cb85c"/>
    <rect x="46" y="10" width="8" height="20" fill="#5cb85c"/>
  </svg>`,
  history: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" rx="8" fill="#3a2418"/>
    <rect x="14" y="14" width="36" height="6" fill="#d4a017"/>
    <path d="M10 20 h44 v8 h-44 z" fill="#c0392b"/>
    <path d="M16 28 h32 v28 h-32 z" fill="#8b2a1f"/>
    <g stroke="#5a1810" stroke-width="0.8" fill="none">
      <line x1="16" y1="36" x2="48" y2="36"/><line x1="16" y1="44" x2="48" y2="44"/><line x1="16" y1="52" x2="48" y2="52"/>
    </g>
  </svg>`,
};

export const sections = [
  {
    id: 'board', title: '棋类竞技', subtitle: '方寸棋盘，纵横谋略', accent: 'var(--accent-red-text)',
    games: [
      {
        id: 'gomoku', name: '五子棋',
        description: '经典 15×15 人机对战，三档难度',
        href: '/gomoku/', accent: COLORS[0],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g stroke="#6e5a40" stroke-width="0.6">${Array.from({length:9},(_,i)=>`<line x1="${15+i*11.25}" y1="15" x2="${15+i*11.25}" y2="105"/>`).join('')}${Array.from({length:9},(_,i)=>`<line x1="15" y1="${15+i*11.25}" x2="105" y2="${15+i*11.25}"/>`).join('')}</g><circle cx="37.5" cy="48.75" r="6" fill="#1a1a1a"/><circle cx="71.25" cy="71.25" r="6" fill="#f9f5ea" stroke="#1a1a1a" stroke-width="0.8"/></svg>`,
      },
      {
        id: 'xiangqi', name: '中国象棋',
        description: '人机对弈，内置 alpha-beta 搜索引擎',
        href: '/xiangqi/', accent: 'var(--accent-teal-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#eccb8a"/><g stroke="#5a4028" stroke-width="0.8" fill="none"><rect x="14" y="14" width="92" height="92"/><line x1="14" y1="45" x2="106" y2="45"/><line x1="14" y1="75" x2="106" y2="75"/><line x1="45" y1="14" x2="45" y2="106"/><line x1="75" y1="14" x2="75" y2="106"/><line x1="45" y1="45" x2="75" y2="75"/><line x1="75" y1="45" x2="45" y2="75"/></g><circle cx="45" cy="30" r="7" fill="#f9e8c8" stroke="#1a1a1a" stroke-width="1"/><text x="45" y="33" font-size="9" font-weight="bold" text-anchor="middle" fill="#1a1a1a" font-family="serif">卒</text><circle cx="75" cy="90" r="7" fill="#f9e8c8" stroke="#c0392b" stroke-width="1"/><text x="75" y="93" font-size="9" font-weight="bold" text-anchor="middle" fill="#c0392b" font-family="serif">兵</text><text x="60" y="62" font-size="9" fill="#5a4028" text-anchor="middle" font-family="serif">楚河</text></svg>`,
      },
      {
        id: 'weiqi', name: '围棋',
        description: '人机对弈，内置 GNU Go 引擎',
        href: '/weiqi/', accent: 'var(--ink)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g stroke="#3a2a1a" stroke-width="0.6">${Array.from({length:7},(_,i)=>`<line x1="${20+i*13.33}" y1="20" x2="${20+i*13.33}" y2="100"/>`).join('')}${Array.from({length:7},(_,i)=>`<line x1="20" y1="${20+i*13.33}" x2="100" y2="${20+i*13.33}"/>`).join('')}</g><circle cx="33.3" cy="33.3" r="6" fill="#111"/><circle cx="60" cy="60" r="6" fill="#f5f1e6" stroke="#9a8e72" stroke-width="0.6"/><circle cx="86.7" cy="86.7" r="6" fill="#111"/></svg>`,
      },
      {
        id: 'doushouqi', name: '斗兽棋',
        description: '经典河流与陷阱规则，三档人机对战',
        href: '/doushouqi/', accent: 'var(--accent-green-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8cf93"/><g fill="#82b6b8"><rect x="27" y="43" width="26" height="34" rx="2"/><rect x="67" y="43" width="26" height="34" rx="2"/></g><g stroke="#70562f" stroke-width=".55" opacity=".65">${Array.from({length:8},(_,i)=>`<line x1="${7+i*15.15}" y1="7" x2="${7+i*15.15}" y2="113"/>`).join('')}${Array.from({length:10},(_,i)=>`<line x1="7" y1="${7+i*11.78}" x2="113" y2="${7+i*11.78}"/>`).join('')}</g><g font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="16" text-anchor="middle"><text x="22" y="28">🦁</text><text x="98" y="28">🐯</text><text x="22" y="103">🐯</text><text x="98" y="103">🦁</text></g><rect x="54" y="7" width="12" height="12" rx="2" fill="#4d7778"/><rect x="54" y="101" width="12" height="12" rx="2" fill="#9e5a4e"/></svg>`,
      },
      {
        id: 'othello', name: '黑白棋',
        description: '翻转对手棋子，三档 AI 难度，支持悔棋',
        href: '/othello/', accent: 'var(--accent-teal-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="6" fill="#28755a"/><g stroke="#d9f0df" stroke-opacity=".4" stroke-width=".7">${Array.from({length:7},(_,i)=>`<line x1="${15+(i+1)*11.25}" y1="15" x2="${15+(i+1)*11.25}" y2="105"/><line x1="15" y1="${15+(i+1)*11.25}" x2="105" y2="${15+(i+1)*11.25}"/>`).join('')}</g><g stroke="#b8c1b6" stroke-width="1"><circle cx="54" cy="54" r="7" fill="#f4f6ee"/><circle cx="66" cy="54" r="7" fill="#182522" stroke="#0b1110"/><circle cx="54" cy="66" r="7" fill="#182522" stroke="#0b1110"/><circle cx="66" cy="66" r="7" fill="#f4f6ee"/></g></svg>`,
      },
      {
        id: 'feixingqi', name: '飞行棋',
        description: '2-4 人联机，空座由 AI 补位',
        href: '/feixingqi/', accent: 'var(--accent-blue-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g stroke="#6e5a40" stroke-width="0.6" fill="none"><rect x="20" y="20" width="80" height="80"/><path d="M52 20 h16 v80 h-16 z M20 52 h80 v16 h-80 z"/></g><g font-family="Segoe UI Emoji, Apple Color Emoji, sans-serif" font-size="16" text-anchor="middle"><text x="30" y="34">✈️</text><text x="90" y="34">✈️</text><text x="30" y="94">✈️</text><text x="90" y="94">✈️</text></g><circle cx="60" cy="60" r="8" fill="#d4a017"/><text x="60" y="64" font-size="9" text-anchor="middle" fill="#fff" font-family="serif">🏆</text></svg>`,
      },
    ],
  },
  {
    id: 'puzzle', title: '益智解谜', subtitle: '逻辑推理，烧脑一刻', accent: 'var(--accent-blue-text)',
    games: [
      {
        id: 'rule-blocks', name: '规则方块',
        description: '推动文字，改写规则过关',
        href: '/rule-blocks/', accent: 'var(--accent-purple-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#dfe7e4"/><g fill="#f6e7bc" stroke="#a27a42"><rect x="12" y="18" width="28" height="22" rx="3"/><rect x="46" y="18" width="28" height="22" rx="3"/><rect x="80" y="18" width="28" height="22" rx="3"/></g><g fill="#4b3822" font-family="serif" font-size="14" text-anchor="middle"><text x="26" y="34">我</text><text x="60" y="34">是</text><text x="94" y="34">你</text></g><g fill="#e9e0f5" stroke="#7653a6"><rect x="12" y="50" width="28" height="22" rx="3"/><rect x="46" y="50" width="28" height="22" rx="3"/><rect x="80" y="50" width="28" height="22" rx="3"/></g><g fill="#493661" font-family="serif" font-size="14" text-anchor="middle"><text x="26" y="66">旗</text><text x="60" y="66">是</text><text x="94" y="66">胜</text></g><circle cx="28" cy="94" r="11" fill="#7653a6"/><path d="M82 103V78l18 7-18 7" fill="#c45a43" stroke="#8a3d2d"/></svg>`,
      },
      {
        id: 'refraction', name: '光线折射',
        description: '旋转镜面，让激光点亮晶体',
        href: '/refraction/', accent: 'var(--accent-red-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#1b302b"/><g stroke="#3e5951" stroke-width=".5">${Array.from({length:7},(_,i)=>`<path d="M${15+i*13} 10V110 M10 ${15+i*13}H110"/>`).join('')}</g><path d="M18 95V48H60V22" fill="none" stroke="#ffe17b" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="95" r="8" fill="#d55c3d" stroke="#ffd466" stroke-width="3"/><rect x="53" y="41" width="14" height="14" rx="2" fill="#49665d" stroke="#f5e5b5" stroke-width="2" transform="rotate(45 60 48)"/><rect x="54" y="16" width="12" height="12" fill="#ffe37b" stroke="#79b8b0" stroke-width="2" transform="rotate(45 60 22)"/></svg>`,
      },
      {
        id: 'sudoku', name: '数独',
        description: '经典 9×9 数独，三档难度，限时挑战',
        href: '/sudoku/', accent: COLORS[2],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#faf8ef"/><g stroke="#2a1d10" stroke-width="2" fill="none"><rect x="14" y="14" width="92" height="92"/></g><g stroke="#6e5a40" stroke-width="0.5">${Array.from({length:8},(_,i)=>`<line x1="${14+(i+1)*10.222}" y1="14" x2="${14+(i+1)*10.222}" y2="106"/>`).join('')}${Array.from({length:8},(_,i)=>`<line x1="14" y1="${14+(i+1)*10.222}" x2="106" y2="${14+(i+1)*10.222}"/>`).join('')}</g><g stroke="#2a1d10" stroke-width="1.5"><line x1="44.667" y1="14" x2="44.667" y2="106"/><line x1="75.333" y1="14" x2="75.333" y2="106"/><line x1="14" y1="44.667" x2="106" y2="44.667"/><line x1="14" y1="75.333" x2="106" y2="75.333"/></g><g font-family="sans-serif" font-weight="700" font-size="10" fill="#2a1d10" text-anchor="middle"><text x="24" y="38">5</text><text x="65" y="28">1</text><text x="86" y="49">7</text><text x="34" y="59">3</text><text x="96" y="80">2</text></g></svg>`,
      },
      {
        id: 'maze', name: '迷宫逃脱',
        description: '限时穿越随机迷宫，越难越大',
        href: '/maze/', accent: COLORS[5],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#faf8ef"/><g stroke="#2a1d10" stroke-width="2"><line x1="10" y1="10" x2="110" y2="10"/><line x1="10" y1="10" x2="10" y2="110"/><line x1="110" y1="10" x2="110" y2="110"/><line x1="10" y1="110" x2="110" y2="110"/><line x1="40" y1="10" x2="40" y2="40"/><line x1="70" y1="10" x2="70" y2="70"/><line x1="10" y1="40" x2="70" y2="40"/><line x1="40" y1="70" x2="110" y2="70"/><line x1="40" y1="40" x2="40" y2="70"/><line x1="10" y1="70" x2="40" y2="70"/><line x1="70" y1="40" x2="70" y2="110"/></g><circle cx="25" cy="25" r="8" fill="#c0392b"/><rect x="85" y="85" width="16" height="16" fill="#6aaa64"/></svg>`,
      },
      {
        id: 'echo', name: '回声行者',
        description: '躲开回声，收集印章过关',
        href: '/echo/', accent: 'var(--accent-teal-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#eadbb8"/><g stroke="#c6aa76" stroke-width="0.7">${Array.from({length:8},(_,i)=>`<line x1="${11+i*14}" y1="11" x2="${11+i*14}" y2="109"/><line x1="11" y1="${11+i*14}" x2="109" y2="${11+i*14}"/>`).join('')}</g><path d="M60 60 L60 32 L32 32 L32 18" fill="none" stroke="#2c7873" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 6" opacity="0.55"/><g fill="#2c7873" opacity="0.72"><circle cx="60" cy="47" r="7"/><path d="M50 68 Q51 52 60 52 Q69 52 70 68 Q65 64 60 68 Q55 64 50 68"/></g><circle cx="32" cy="18" r="10" fill="#c0392b" stroke="#fff1d4" stroke-width="2"/><g transform="translate(88,88)"><rect x="-10" y="-10" width="20" height="20" rx="3" fill="#d4a017" stroke="#6b3b19"/><text x="0" y="5" font-size="13" text-anchor="middle" fill="#6b3b19" font-family="serif">印</text></g></svg>`,
      },
      {
        id: 'sokoban', name: '推箱子',
        description: '经典推箱子解谜，15 个关卡挑战',
        href: '/sokoban/', accent: COLORS[3],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e8c989"/><g><rect x="10" y="10" width="20" height="20" fill="#b8843a"/><rect x="30" y="10" width="20" height="20" fill="#b8843a"/><rect x="50" y="10" width="20" height="20" fill="#b8843a"/><rect x="70" y="10" width="20" height="20" fill="#b8843a"/><rect x="90" y="10" width="20" height="20" fill="#b8843a"/><rect x="10" y="30" width="20" height="20" fill="#b8843a"/><rect x="90" y="30" width="20" height="20" fill="#b8843a"/><rect x="10" y="50" width="20" height="20" fill="#b8843a"/><rect x="90" y="50" width="20" height="20" fill="#b8843a"/><rect x="10" y="70" width="20" height="20" fill="#b8843a"/><rect x="90" y="70" width="20" height="20" fill="#b8843a"/><rect x="10" y="90" width="20" height="20" fill="#b8843a"/><rect x="30" y="90" width="20" height="20" fill="#b8843a"/><rect x="50" y="90" width="20" height="20" fill="#b8843a"/><rect x="70" y="90" width="20" height="20" fill="#b8843a"/><rect x="90" y="90" width="20" height="20" fill="#b8843a"/></g><circle cx="40" cy="60" r="8" fill="#c0392b" stroke="#8b2a1f" stroke-width="1.5"/><rect x="55" y="52" width="16" height="16" rx="2" fill="#d4a574" stroke="#8b5a2b" stroke-width="1.5"/><circle cx="78" cy="40" r="5" fill="rgba(192,57,43,0.3)"/><circle cx="58" cy="80" r="5" fill="rgba(192,57,43,0.3)"/><rect x="35" y="72" width="16" height="16" rx="2" fill="#6aaa64" stroke="#4a7a44" stroke-width="1.5"/></svg>`,
      },
    ],
  },
  {
    id: 'fun', title: '娱乐天地', subtitle: '随手把玩，偷得半日闲', accent: 'var(--accent-orange-text)',
    games: [
      {
        id: 'survivor', name: '星火割草',
        description: '自动射击，随机升级撑到最后',
        href: '/survivor/', accent: 'var(--accent-red-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#17312e"/><g stroke="#31534c" stroke-width=".7">${Array.from({length:7},(_,i)=>`<path d="M${i*20} 0V120 M0 ${i*20}H120"/>`).join('')}</g><g fill="#7ea682"><circle cx="22" cy="30" r="8"/><circle cx="93" cy="28" r="9"/><circle cx="98" cy="86" r="8"/><circle cx="26" cy="91" r="7"/></g><circle cx="60" cy="60" r="13" fill="#f4be65"/><circle cx="64" cy="56" r="3" fill="#fff8e9"/><g fill="#ffb25d"><circle cx="44" cy="44" r="4"/><circle cx="79" cy="48" r="4"/><circle cx="71" cy="78" r="4"/></g></svg>`,
      },
      {
        id: 'life', name: '模拟人生',
        description: '分配天赋，走完一段人生',
        href: '/life/', accent: 'var(--accent-red-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f5eee3"/><path d="M20 91 C34 72 39 50 60 26 C81 50 86 72 100 91" fill="none" stroke="#b7563c" stroke-width="5" stroke-linecap="round"/><g fill="#b7563c"><circle cx="29" cy="88" r="6"/><circle cx="49" cy="60" r="6"/><circle cx="72" cy="46" r="6"/><circle cx="94" cy="87" r="6"/></g><g font-family="serif" font-size="12" text-anchor="middle" fill="#604735"><text x="29" y="109">生</text><text x="60" y="20">长</text><text x="94" y="109">逝</text></g></svg>`,
      },
      {
        id: 'flappy', name: '跳跳鸟',
        description: '点击飞翔穿过管道，越飞越远',
        href: '/flappy/', accent: COLORS[1],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#70c5ce"/><rect y="100" width="120" height="20" fill="#ded895"/><rect y="100" width="120" height="4" fill="#54a338"/><rect x="20" y="0" width="14" height="50" fill="#5cb85c"/><rect x="17" y="46" width="20" height="8" fill="#4a9a4a"/><rect x="20" y="70" width="14" height="30" fill="#5cb85c"/><rect x="17" y="70" width="20" height="8" fill="#4a9a4a"/><rect x="75" y="0" width="14" height="35" fill="#5cb85c"/><rect x="72" y="31" width="20" height="8" fill="#4a9a4a"/><rect x="75" y="55" width="14" height="45" fill="#5cb85c"/><rect x="72" y="55" width="20" height="8" fill="#4a9a4a"/><g transform="translate(50, 55)"><ellipse rx="14" ry="12" fill="#f5c842"/><ellipse cx="-4" cy="4" rx="6" ry="4" fill="#e8a317"/><circle cx="6" cy="-4" r="6" fill="white"/><circle cx="8" cy="-4" r="3" fill="#1a1a1a"/><polygon points="14,-2 22,0 14,4" fill="#e85a3a"/></g></svg>`,
      },
      {
        id: 'hiking', name: '模拟徒步',
        description: '挑战三条经典徒步路线',
        href: '/hiking/', accent: COLORS[4],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f5f0e8"/><rect x="0" y="80" width="120" height="40" fill="#6aaa64" rx="4"/><polygon points="10,80 35,20 60,80" fill="#8e44ad" opacity="0.6"/><polygon points="40,80 70,10 100,80" fill="#e67e22" opacity="0.5"/><polygon points="20,80 55,30 90,80" fill="#2980b9" opacity="0.4"/><rect x="20" y="30" width="4" height="50" fill="#6e5a40"/><rect x="16" y="26" width="12" height="8" fill="#c0392b"/><circle cx="22" cy="24" r="5" fill="#c0392b"/><line x1="22" y1="29" x2="30" y2="38" stroke="#c0392b" stroke-width="1.5"/><line x1="22" y1="29" x2="14" y2="38" stroke="#c0392b" stroke-width="1.5"/><circle cx="34" cy="48" r="2" fill="white"/><circle cx="52" cy="55" r="2" fill="white"/><circle cx="78" cy="42" r="2" fill="white"/></svg>`,
      },
      {
        id: 'jump', name: '跳一跳',
        description: '长按蓄力跳跃，精准落地连击',
        href: '/jump/', accent: COLORS[7],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f1e4c4"/><rect x="0" y="96" width="120" height="24" fill="#d9c79a"/><g><rect x="14" y="72" width="28" height="24" rx="6" fill="#b8893f"/><rect x="14" y="72" width="28" height="8" rx="6" fill="#e8c989"/><rect x="74" y="78" width="22" height="18" rx="5" fill="#a87a35"/><rect x="74" y="78" width="22" height="6" rx="5" fill="#e0bd7e"/></g><g transform="translate(48,60)" fill="#1a1a1a"><ellipse cx="0" cy="2" rx="6" ry="1.6" fill="rgba(40,25,10,0.2)"/><rect x="-6" y="-14" width="12" height="16" rx="6"/><rect x="-4" y="-12" width="8" height="3" rx="2" fill="rgba(220,200,170,0.4)"/></g><path d="M40 56 Q60 30 80 56" fill="none" stroke="rgba(192,57,43,0.4)" stroke-width="2" stroke-dasharray="3 4"/><circle cx="85" cy="87" r="3" fill="#6aaa64"/></svg>`,
      },
      {
        id: 'stack', name: '堆塔',
        description: '看准时机落下方块，精准对齐，挑战最高层数',
        href: '/stack/', accent: 'var(--accent-orange-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#dfe9e7"/><path d="M0 78 L25 52 L43 72 L66 43 L91 73 L120 50 V120 H0 Z" fill="#2c7296" opacity=".1"/><g><rect x="22" y="91" width="76" height="13" rx="3" fill="#27756f"/><rect x="29" y="77" width="70" height="13" rx="3" fill="#c96725"/><rect x="25" y="63" width="66" height="13" rx="3" fill="#2c7296"/><rect x="33" y="49" width="58" height="13" rx="3" fill="#c69620"/><rect x="43" y="35" width="48" height="13" rx="3" fill="#55734f"/><rect x="50" y="21" width="41" height="13" rx="3" fill="#b84b3f"/></g><g fill="rgba(255,255,255,.24)"><rect x="25" y="94" width="70" height="2"/><rect x="32" y="80" width="64" height="2"/><rect x="28" y="66" width="60" height="2"/><rect x="36" y="52" width="52" height="2"/></g></svg>`,
      },
    ],
  },
  {
    id: 'history', title: '华夏历史', subtitle: '数风流人物，还看今朝', accent: 'var(--accent-gold-text)',
    games: [
      {
        id: 'edict-seven', name: '圣旨七日',
        description: '七天三次行动，办妥一纸圣旨',
        href: '/edict-seven/', accent: 'var(--accent-red-text)',
        previewSvg: '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f4e7c5"/><rect x="22" y="13" width="76" height="94" fill="#ead199" stroke="#a33e33" stroke-width="3"/><path d="M35 35h50M35 47h50M35 59h36M35 71h45" stroke="#80573b" stroke-width="3"/><circle cx="81" cy="84" r="12" fill="#a33e33"/><text x="81" y="89" fill="#f6dfae" font-size="13" text-anchor="middle" font-family="serif">诏</text><text x="60" y="28" fill="#a33e33" font-size="14" text-anchor="middle" font-family="serif">七日</text></svg>',
      },
      {
        id: 'huaxia-trade', name: '华夏商旅',
        description: '经营商号，与 AI 争夺财富',
        href: '/huaxia-trade/', accent: 'var(--accent-red-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#e5ce9a"/><path d="M15 33Q35 14 59 24T103 33Q88 53 101 71Q74 101 45 91T14 63Q28 50 15 33Z" fill="#d4b875" stroke="#936637"/><path d="M24 71Q43 50 55 57T78 39Q92 48 94 72" fill="none" stroke="#a34a32" stroke-width="2" stroke-dasharray="3 3"/><g fill="#fff" stroke="#7d4f2d" stroke-width="2"><circle cx="24" cy="71" r="5"/><circle cx="55" cy="57" r="5"/><circle cx="78" cy="39" r="5"/><circle cx="94" cy="72" r="5"/></g><g fill="#a34a32"><circle cx="24" cy="71" r="2"/><circle cx="55" cy="57" r="2"/><circle cx="78" cy="39" r="2"/><circle cx="94" cy="72" r="2"/></g><rect x="48" y="78" width="26" height="18" rx="2" fill="#a34a32"/><path d="M44 79h34L61 67z" fill="#bd6a46"/><rect x="58" y="84" width="7" height="12" fill="#f4df9b"/></svg>`,
      },
      {
        id: 'magistrate', name: '大唐县令',
        description: '经营县城，处理十二季政务',
        href: '/magistrate/', accent: 'var(--accent-red-text)',
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#d8c286"/><g stroke="#a88b54" stroke-width=".7">${Array.from({length:6},(_,i)=>`<path d="M${i*20} 0V120 M0 ${i*20}H120"/>`).join('')}</g><path d="M36 76V50h48v26" fill="#a43d2f"/><path d="M30 50h60L60 28z" fill="#bd5743"/><rect x="52" y="58" width="16" height="18" fill="#f4df9b"/><g fill="#bd9164"><rect x="10" y="12" width="19" height="17"/><rect x="91" y="91" width="19" height="17"/></g><g fill="#d4bd63"><rect x="11" y="89" width="17" height="19"/><rect x="91" y="12" width="18" height="18"/></g></svg>`,
      },
      {
        id: 'emperors', name: '华夏帝王',
        description: '从 200 余位帝王中猜中目标',
        href: '/emperors/', accent: COLORS[6],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f5efe1"/><rect x="20" y="14" width="80" height="6" fill="#d4a017"/><rect x="26" y="20" width="68" height="14" fill="#e8c989"/><rect x="22" y="34" width="76" height="6" fill="#d4a017"/><rect x="34" y="40" width="52" height="50" fill="#c0392b"/><g stroke="#8b2a1f" stroke-width="1" fill="none"><path d="M34 44 h52 M34 50 h52 M34 56 h52 M34 62 h52 M34 68 h52 M34 74 h52 M34 80 h52 M34 86 h52"/></g><g transform="translate(60,66)"><circle r="6" fill="#f9f5ea" stroke="#2a1d10" stroke-width="1"/><circle cx="0" cy="-2" r="1.5" fill="#2a1d10"/><path d="M-4 3 Q0 5 4 3" stroke="#2a1d10" stroke-width="0.8" fill="none"/></g><rect x="50" y="92" width="20" height="8" fill="#e8c989"/><rect x="44" y="100" width="32" height="6" fill="#1a1a1a"/></svg>`,
      },
      {
        id: 'battle', name: '华夏大乱斗',
        description: '轮流选将，十局决出胜负',
        href: '/battle/', accent: COLORS[0],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#3a2418"/><g transform="translate(35,25)"><rect x="-3" y="0" width="6" height="55" rx="2" fill="#d4a017"/><polygon points="0,-12 -8,4 8,4" fill="#c0392b"/></g><g transform="translate(85,25)"><rect x="-3" y="0" width="6" height="55" rx="2" fill="#d4a017"/><polygon points="0,-12 -8,4 8,4" fill="#2980b9"/></g><g transform="translate(60,50)"><circle r="16" fill="none" stroke="#f5e6c8" stroke-width="2"/><text x="0" y="6" font-size="16" text-anchor="middle" fill="#f5e6c8" font-family="serif">斗</text></g><rect x="20" y="90" width="80" height="4" rx="2" fill="#d4a017"/><g font-size="10" fill="#f5e6c8" text-anchor="middle" font-family="serif"><text x="35" y="108">秦</text><text x="60" y="108">汉</text><text x="85" y="108">唐</text></g></svg>`,
      },
      {
        id: 'keju', name: '科举闯关',
        description: '七关科举答题，错一题即止',
        href: '/keju/', accent: COLORS[3],
        previewSvg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" fill="#f5efe1"/><rect x="20" y="20" width="80" height="80" fill="none" stroke="#d4a017" stroke-width="2" rx="6"/><rect x="30" y="30" width="60" height="14" rx="3" fill="#e8c989"/><text x="60" y="41" font-size="11" text-anchor="middle" fill="#2a1d10" font-family="serif">卷</text><rect x="30" y="48" width="60" height="8" rx="2" fill="#f5e6c8"/><rect x="30" y="60" width="60" height="8" rx="2" fill="#f5e6c8"/><rect x="30" y="72" width="40" height="8" rx="2" fill="#f5e6c8"/><circle cx="86" cy="86" r="7" fill="#c0392b"/><text x="86" y="90" font-size="9" text-anchor="middle" fill="#f9f5ea" font-family="serif">甲</text></svg>`,
      },
    ],
  },
];

const byId = Object.fromEntries(sections.map(s => [s.id, s]));

// 首页：4 个板块入口卡
export function renderHome() {
  const root = document.getElementById('section-grid');
  if (!root) return;
  root.innerHTML = sections.map(s => `
    <a class="section-card" href="/${s.id}/" style="--card-accent: ${s.accent}">
      <div class="sc-icon">${SECTION_ICONS[s.id] || ''}</div>
      <div class="sc-body">
        <h2 class="sc-title">${s.title}</h2>
        <p class="sc-desc">${s.subtitle}</p>
        <div class="sc-games">${s.games.map(g => `<span>${g.name}</span>`).join('')}</div>
      </div>
      <span class="sc-arrow">→</span>
    </a>
  `).join('');
}

// 板块子页：标题 + 该板块游戏卡
export function renderSection(id) {
  const sec = byId[id];
  const root = document.getElementById('game-grid');
  const head = document.getElementById('section-head');
  if (!root) return;
  if (!sec) { root.innerHTML = '<p>板块不存在</p>'; return; }
  if (head) {
    head.style.setProperty('--section-accent', sec.accent);
    head.innerHTML = `<h2 class="section-title">${sec.title}</h2>
      <span class="section-subtitle">${sec.subtitle}</span>
      <span class="section-count">${sec.games.length} 款游戏</span>`;
  }
  root.className = 'section-grid cols-2';
  root.innerHTML = sec.games.map(g => `
    <a class="card" href="${g.href}" style="--card-accent: ${g.accent}">
      <div class="card-preview">${g.previewSvg}</div>
      <h2>${g.name}</h2>
      <p>${g.description}</p>
      <span class="card-cta">开始 →</span>
    </a>
  `).join('');
}
