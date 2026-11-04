// 科举闯关控制器：UI 与流程串联
import {
  STAGES, PER_LEVEL, TIMER_BY_LEVEL,
  FIFTY_FIFTY, TIME_EXTEND, TIME_EXTEND_SECONDS,
  createExam, currentQuestion, answerQuestion,
  useFiftyFifty, useTimeExtend, passedLevels, titleFor,
  serializeExam, restoreExam,
} from './logic.js';

const SAVED_KEY = 'keju_state_v1';

const progressEl = document.getElementById('progress');
const quizEl = document.getElementById('quiz');
const stageLabelEl = document.getElementById('stage-label');
const qNoEl = document.getElementById('q-no');
const qTotalEl = document.getElementById('q-total');
const qOkEl = document.getElementById('q-ok');
const timerEl = document.getElementById('timer');
const qtextEl = document.getElementById('qtext');
const optionsEl = document.getElementById('options');
const explainEl = document.getElementById('explain');
const toolsEl = document.getElementById('tools');
const nextBtnEl = document.getElementById('next');
const feedbackEl = document.getElementById('feedback');
const resultEl = document.getElementById('result');

qTotalEl.textContent = PER_LEVEL;

let exam;
let timerHandle = null;
let timeLeft = 0;
let fiftyKeep = null;     // 当前题被保留的选项下标
let answered = false;     // 当前题是否已答（防止重复）

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    if (s && typeof s.seed === 'number') return restoreExam(s);
  } catch {}
  return null;
}
function saveState() {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(serializeExam(exam))); } catch {}
}
function clearState() {
  try { localStorage.removeItem(SAVED_KEY); } catch {}
}

function startNew() {
  exam = createExam(Date.now() ^ Math.floor(Math.random() * 0xffff));
  saveState();
  beginQuestion();
}

function renderProgress() {
  const cur = currentLevelIdx();
  progressEl.innerHTML = STAGES.map((s, i) => {
    let cls = '';
    if (i < cur) cls = 'done';
    else if (i === cur && !exam.finished) cls = 'current';
    else if (i === cur && exam.finished) cls = 'current';
    else cls = 'locked';
    const ok = exam.answers[i].filter(a => a === true).length;
    return `<div class="keju-stage ${cls}">
      <span class="ks-name">${s.name}</span>
      <span class="ks-stat">${ok}/${PER_LEVEL}</span>
    </div>${i < STAGES.length - 1 ? '<span class="keju-arrow">›</span>' : ''}`;
  }).join('');
}

function currentLevelIdx() {
  for (let i = 0; i < exam.answers.length; i++) {
    const a = exam.answers[i];
    if (!(a.length > 0 && a.every(x => x === true))) return i;
  }
  return STAGES.length;
}

function beginQuestion() {
  const cur = currentQuestion(exam);
  if (!cur) {
    exam.finished = true;
    saveState();
    showResult(true);
    return;
  }
  if (exam.finished) {
    showResult(false);
    return;
  }
  answered = false;
  fiftyKeep = null;
  quizEl.classList.remove('hidden');
  resultEl.classList.add('hidden');
  feedbackEl.innerHTML = '';
  nextBtnEl.classList.add('hidden');
  explainEl.classList.remove('shown');

  stageLabelEl.textContent = STAGES[cur.level].name;
  qNoEl.textContent = cur.idx + 1;
  qOkEl.textContent = exam.answers[cur.level].filter(a => a === true).length;
  qtextEl.textContent = cur.q.q;

  renderOptions(cur.q);
  renderTools();
  startTimer(TIMER_BY_LEVEL[cur.level]);
  renderProgress();
}

function renderOptions(q) {
  const tags = ['甲', '乙', '丙', '丁'];
  optionsEl.innerHTML = q.options.map((opt, i) => `
    <button type="button" class="keju-option" data-idx="${i}">
      <span class="ko-tag">${tags[i]}</span>
      <span class="ko-text">${opt}</span>
    </button>
  `).join('');
  optionsEl.querySelectorAll('.keju-option').forEach(btn => {
    btn.addEventListener('click', () => onAnswer(Number(btn.dataset.idx)));
  });
}

function renderTools() {
  const f = exam.toolState[FIFTY_FIFTY];
  const t = exam.toolState[TIME_EXTEND];
  toolsEl.innerHTML = `
    <button type="button" id="tool-fifty" class="keju-tool" ${f <= 0 || answered ? 'disabled' : ''}>
      去二错项 <span class="kt-count">${f}</span>
    </button>
    <button type="button" id="tool-time" class="keju-tool" ${t <= 0 || answered ? 'disabled' : ''}>
      加时 ${TIME_EXTEND_SECONDS} 秒 <span class="kt-count">${t}</span>
    </button>
  `;
  const fBtn = document.getElementById('tool-fifty');
  const tBtn = document.getElementById('tool-time');
  if (fBtn) fBtn.addEventListener('click', onFifty);
  if (tBtn) tBtn.addEventListener('click', onExtend);
}

function onFifty() {
  if (answered) return;
  const r = useFiftyFifty(exam);
  if (!r.ok) return;
  fiftyKeep = r.keep;
  saveState();
  optionsEl.querySelectorAll('.keju-option').forEach(btn => {
    const i = Number(btn.dataset.idx);
    if (!fiftyKeep.includes(i)) btn.classList.add('fade');
  });
  renderTools();
}

function onExtend() {
  if (answered) return;
  const r = useTimeExtend(exam);
  if (!r.ok) return;
  saveState();
  timeLeft += r.seconds;
  renderTimer();
  renderTools();
}

function startTimer(sec) {
  if (timerHandle) clearInterval(timerHandle);
  timeLeft = sec;
  renderTimer();
  timerHandle = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      renderTimer();
      clearInterval(timerHandle);
      timerHandle = null;
      onAnswer(null, true);
    } else {
      renderTimer();
    }
  }, 1000);
}

function renderTimer() {
  timerEl.textContent = timeLeft;
  timerEl.classList.toggle('warn', timeLeft <= 5);
}

function onAnswer(optIdx, isTimeout = false) {
  if (answered) return;
  answered = true;
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  const r = answerQuestion(exam, optIdx, { isTimeout });
  if (!r.ok) return;
  saveState();
  const snap = r.snapshot;

  const correctIdx = snap.answer;
  optionsEl.querySelectorAll('.keju-option').forEach(btn => {
    const i = Number(btn.dataset.idx);
    btn.disabled = true;
    if (i === correctIdx) btn.classList.add('correct');
    if (snap.picked === i && !snap.correct) btn.classList.add('wrong');
  });

  explainEl.innerHTML = `<div class="keju-exp-title">${snap.correct ? '✓ 答对' : snap.timeout ? '⌛ 超时' : '✗ 答错'}</div>${snap.explain}`;
  explainEl.classList.add('shown');

  const cls = snap.correct ? 'ok' : (snap.timeout ? 'to' : 'no');
  const msg = snap.correct ? '通过本题' : (snap.timeout ? '超时未答，本场科考止步' : '答错了，本场科考止步');
  feedbackEl.innerHTML = `<div class="keju-fb-line ${cls}">${msg}</div>`;

  renderProgress();
  renderTools();

  if (!exam.finished) {
    nextBtnEl.classList.remove('hidden');
  } else {
    setTimeout(() => showResult(r.correct && currentQuestion(exam) === null), 800);
  }
}

nextBtnEl.addEventListener('click', () => {
  beginQuestion();
});

function showResult(wonAll) {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  quizEl.classList.add('hidden');
  resultEl.classList.remove('hidden');
  resultEl.classList.toggle('win', wonAll);
  resultEl.classList.toggle('lose', !wonAll);
  const passed = passedLevels(exam);
  const all = wonAll && passed >= STAGES.length;
  const title = all ? '状元及第' : titleFor(passed);
  const meta = `通过 ${passed} 关 / 共 ${STAGES.length} 关`,
    detail = exam.wrongAt ? `止步于「${STAGES[exam.wrongAt.level].name}」第 ${exam.wrongAt.idx + 1} 题` : '一路过关斩将';
  resultEl.innerHTML = `
    <p class="kr-title">${wonAll ? '🎉 一举登科' : '本场结束'}</p>
    <div class="kr-rank">${title}</div>
    <p class="kr-meta"><b>${meta}</b> · ${detail}</p>
    <button type="button" id="again" class="reset-btn">再赴科考</button>
  `;
  document.getElementById('again').addEventListener('click', () => {
    clearState();
    startNew();
  });
  clearState();
}

function restartOngoing() {
  const saved = loadState();
  if (saved) {
    exam = saved;
    beginQuestion();
  } else {
    startNew();
  }
}
restartOngoing();