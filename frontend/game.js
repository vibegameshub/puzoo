// game.js - 메인 게임 로직

(() => {
'use strict';

// ─── 상수 ──────────────────────────────────
const COLS = 10;
const ROWS = 20;
const DANGER_ROWS = 4;
const API = 'https://fearless-emotion-production.up.railway.app';

const SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
};

const PIECE_TYPES = ['I','O','T','S','Z','J','L'];

const SPEEDS = { easy: 800, normal: 500, hard: 300 };
const SPEED_MIN = 80;
const SPEED_STEP = 50;

const LINE_SCORES = { 1: 100, 2: 300, 3: 500, 4: 800 };

// SRS Wall Kick Data
const KICKS_NORMAL = {
  '0>1': [[-1,0],[-1,-1],[0,2],[-1,2]],
  '1>0': [[1,0],[1,1],[0,-2],[1,-2]],
  '1>2': [[1,0],[1,1],[0,-2],[1,-2]],
  '2>1': [[-1,0],[-1,-1],[0,2],[-1,2]],
  '2>3': [[1,0],[1,-1],[0,2],[1,2]],
  '3>2': [[-1,0],[-1,1],[0,-2],[-1,-2]],
  '3>0': [[-1,0],[-1,1],[0,-2],[-1,-2]],
  '0>3': [[1,0],[1,-1],[0,2],[1,2]]
};
const KICKS_I = {
  '0>1': [[-2,0],[1,0],[-2,1],[1,-2]],
  '1>0': [[2,0],[-1,0],[2,-1],[-1,2]],
  '1>2': [[-1,0],[2,0],[-1,-2],[2,1]],
  '2>1': [[1,0],[-2,0],[1,2],[-2,-1]],
  '2>3': [[2,0],[-1,0],[2,-1],[-1,2]],
  '3>2': [[-2,0],[1,0],[-2,1],[1,-2]],
  '3>0': [[1,0],[-2,0],[1,2],[-2,-1]],
  '0>3': [[-1,0],[2,0],[-1,-2],[2,1]]
};

// ─── 게임 상태 ─────────────────────────────
let state = 'start';
let board, boardTypes;
let currentPiece, holdType, canHold;
let nextQueue, bag;
let score, level, lines, combo, feverMode;
let difficulty, nickname;
let dropInterval, lastDropTime;
let cellSize;
let gameOverFallData, gameOverStartTime;
let clearRows, clearStartTime;
let lastHardDrop = false; // 하드드롭 여부 추적

// ─── DOM ───────────────────────────────────
const gameCanvas   = document.getElementById('game-canvas');
const gameCtx      = gameCanvas.getContext('2d');
const effectsCanvas = document.getElementById('effects-canvas');
const holdCanvas   = document.getElementById('hold-canvas');
const holdCtx      = holdCanvas.getContext('2d');
const nextCanvases = document.querySelectorAll('.next-canvas');

const effects = new EffectsManager(effectsCanvas);
gameCanvas.style.pointerEvents = 'none';

// ─── 사이즈 계산 ───────────────────────────
function calcSize() {
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    const ctrl = document.getElementById('mobile-controls');
    const joystickH = ctrl ? ctrl.offsetHeight : 170;
    document.documentElement.style.setProperty('--joystick-h', joystickH + 'px');

    const sidePanel = 65;
    const availW = window.innerWidth - sidePanel * 2 - 8;
    const availH = window.innerHeight - joystickH - 8;
    cellSize = Math.floor(Math.min(availW / COLS, availH / ROWS));
    cellSize = Math.max(cellSize, 14);
  } else {
    const maxH = window.innerHeight - 40;
    const maxW = window.innerWidth - 380;
    cellSize = Math.floor(Math.min(maxH / ROWS, maxW / COLS, 32));
    cellSize = Math.max(cellSize, 18);
  }

  const bw = COLS * cellSize;
  const bh = ROWS * cellSize;
  gameCanvas.width = bw;
  gameCanvas.height = bh;

  syncEffectCanvas();
}

// ─── 이펙트 캔버스 동기화 ──────────────────
function syncEffectCanvas() {
  const boardRect = gameCanvas.getBoundingClientRect();
  effectsCanvas.style.position = 'fixed';
  effectsCanvas.style.left = boardRect.left + 'px';
  effectsCanvas.style.top = boardRect.top + 'px';
  effectsCanvas.style.width = boardRect.width + 'px';
  effectsCanvas.style.height = boardRect.height + 'px';
  effectsCanvas.width = gameCanvas.width;
  effectsCanvas.height = gameCanvas.height;
  effectsCanvas.style.pointerEvents = 'none';
  effectsCanvas.style.zIndex = '10';
}

calcSize();

// ─── 모바일 레이아웃 보정 ─────────────────────
function adjustMobileLayout() {
  if (window.innerWidth > 768) return;
  const joystick = document.getElementById('mobile-controls');
  if (!joystick) return;
  const joystickHeight = joystick.offsetHeight;
  const container = document.getElementById('game-container');
  container.style.height = (window.innerHeight - joystickHeight) + 'px';
  container.style.alignItems = 'flex-end';
  document.getElementById('left-panel').style.alignSelf = 'flex-end';
  document.getElementById('right-panel').style.alignSelf = 'flex-end';
  syncEffectCanvas();
}

// ─── UI 셋업 ───────────────────────────────
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

document.querySelectorAll('.ctrl-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ctrl-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ctrl-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('ctrl-' + tab.dataset.tab).classList.add('active');
  });
});

document.getElementById('start-btn').addEventListener('click', () => {
  SoundManager.resume();
  startGame();
});
document.getElementById('nickname-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { SoundManager.resume(); startGame(); }
});
document.getElementById('retry-btn').addEventListener('click', () => {
  document.getElementById('gameover-modal').classList.add('hidden');
  document.getElementById('start-modal').classList.remove('hidden');
});

// ─── 게임 시작 ─────────────────────────────
function startGame() {
  nickname = document.getElementById('nickname-input').value.trim() || 'Player';
  difficulty = document.querySelector('.diff-btn.selected').dataset.diff;

  document.getElementById('start-modal').classList.add('hidden');
  document.getElementById('gameover-modal').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');

  board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
  boardTypes = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  clearAllCellStates();

  score = 0; level = 1; lines = 0; combo = 0; feverMode = false;
  holdType = null; canHold = true;
  bag = []; nextQueue = [];
  clearRows = null; clearStartTime = 0;
  gameOverFallData = null; gameOverStartTime = 0;
  lastHardDrop = false;
  effects.clear();
  effects.initStars();

  dropInterval = SPEEDS[difficulty];
  lastDropTime = 0;

  for (let i = 0; i < 3; i++) nextQueue.push(pullFromBag());
  spawnPiece();

  state = 'playing';
  boardDirty = true;
  updateUI();
  drawHold();
  drawNextPreviews();
  loadRanking();
  // 게임 시작 후에도 exit 버튼 이벤트 재등록
  const exitBtnAfterStart = document.getElementById('exit-btn');
  if (exitBtnAfterStart) {
    exitBtnAfterStart.onclick = window.handleExit;
  }
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  startGameLoop();
  setTimeout(syncEffectCanvas, 100);
}

// ─── 7-bag ─────────────────────────────────
function pullFromBag() {
  if (bag.length === 0) {
    bag = [...PIECE_TYPES];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}

// ─── 피스 관리 ─────────────────────────────
function spawnPiece() {
  const type = nextQueue.shift();
  nextQueue.push(pullFromBag());

  const shape = SHAPES[type].map(r => [...r]);
  const x = Math.floor((COLS - shape[0].length) / 2);
  const y = type === 'I' ? -1 : 0;

  currentPiece = { type, shape, x, y, rotation: 0 };
  canHold = true;

  if (collides(shape, x, y)) {
    currentPiece.y = y - 1;
    if (collides(shape, x, y - 1)) {
      triggerGameOver();
      return;
    }
  }

  drawNextPreviews();
}

function collides(shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = px + c, ny = py + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function move(dx, dy) {
  if (!currentPiece) return false;
  if (!collides(currentPiece.shape, currentPiece.x + dx, currentPiece.y + dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    boardDirty = true;
    if (dx !== 0) SoundManager.play('move');
    return true;
  }
  return false;
}

function rotate(dir) {
  if (!currentPiece || currentPiece.type === 'O') return;
  const old = currentPiece.rotation;
  const next = (old + dir + 4) % 4;
  const shape = currentPiece.shape;
  const n = shape.length;

  const rotated = Array.from({length: n}, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (dir === 1) rotated[c][n - 1 - r] = shape[r][c];
      else rotated[n - 1 - c][r] = shape[r][c];
    }
  }

  const kickKey = old + '>' + next;
  const kicks = currentPiece.type === 'I' ? KICKS_I : KICKS_NORMAL;
  const tests = [[0,0], ...(kicks[kickKey] || [])];

  for (const [kx, ky] of tests) {
    if (!collides(rotated, currentPiece.x + kx, currentPiece.y - ky)) {
      currentPiece.shape = rotated;
      currentPiece.x += kx;
      currentPiece.y -= ky;
      currentPiece.rotation = next;
      boardDirty = true;
      SoundManager.play('rotate');
      return;
    }
  }
}

function hardDrop() {
  if (!currentPiece) return;
  let dropped = 0;
  while (move(0, 1)) dropped++;
  score += dropped * 2;

  // 하드드롭 이펙트
  if (currentPiece) {
    const { shape, x, y, type } = currentPiece;
    const animal = ANIMAL_TYPES[type];
    const color = ANIMAL_COLORS[animal];
    let minC = COLS, maxC = 0;
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c]) { minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    const px = 40 + (x + minC) * cellSize;
    const py = 40 + (y + shape.length - 1) * cellSize + cellSize;
    const pw = (maxC - minC + 1) * cellSize;
    effects.spawnHardDrop(px, py, pw, color);
    SoundManager.play('hardDrop');
  }

  lastHardDrop = true;
  lock();
}

function softDrop() {
  if (move(0, 1)) {
    score += 1;
    lastDropTime = prevTime;
  }
}

function hold() {
  if (!canHold || !currentPiece) return;
  SoundManager.play('hold');
  canHold = false;
  boardDirty = true;
  const type = currentPiece.type;
  if (holdType) {
    const swapType = holdType;
    holdType = type;
    const shape = SHAPES[swapType].map(r => [...r]);
    currentPiece = {
      type: swapType, shape,
      x: Math.floor((COLS - shape[0].length) / 2), y: 0,
      rotation: 0
    };
  } else {
    holdType = type;
    spawnPiece();
  }
  drawHold();
}

function ghostY() {
  if (!currentPiece) return 0;
  let gy = currentPiece.y;
  while (!collides(currentPiece.shape, currentPiece.x, gy + 1)) gy++;
  return gy;
}

// ─── 잠금 & 라인 클리어 ────────────────────
function lock() {
  if (!currentPiece) return;
  const { shape, x, y, type } = currentPiece;
  const animal = ANIMAL_TYPES[type];
  const color = ANIMAL_COLORS[animal];
  const isHard = lastHardDrop;
  lastHardDrop = false;

  // 착지 먼지 이펙트
  let minC = COLS, maxC = 0, maxR = 0;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) { minC = Math.min(minC, c); maxC = Math.max(maxC, c); maxR = Math.max(maxR, y + r); }

  if (!isHard) {
    effects.spawnLandingDust(40 + (x + minC) * cellSize, 40 + (maxR + 1) * cellSize, (maxC - minC + 1) * cellSize, color);
    SoundManager.play('land');
  }

  // 충격파
  effects.spawnShockwave(40 + (x + (minC + maxC) / 2) * cellSize + cellSize / 2, 40 + (maxR + 1) * cellSize, color);

  // 셀 배치
  const placedCells = [];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const ny = y + r, nx = x + c;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        board[ny][nx] = 1;
        boardTypes[ny][nx] = animal;
        placedCells.push([ny, nx]);
        // squished 표정
        triggerSquish(ny, nx);
      }
    }
  }

  // 충격 전파: 착지 블록 바로 아래 기존 블록들
  const impactMult = isHard ? 2 : 1;
  const placedSet = new Set(placedCells.map(([r, c]) => r + '_' + c));
  for (const [pr, pc] of placedCells) {
    const below = pr + 1;
    if (below < ROWS && board[below][pc] && !placedSet.has(below + '_' + pc)) {
      triggerImpact(below, pc);
    }
  }

  // 동물 친화도: 같은 동물 인접 보너스
  let affinityBonus = 0;
  const affinityChecked = new Set();
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [pr, pc] of placedCells) {
    for (const [dr, dc] of dirs) {
      const nr = pr + dr, nc = pc + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (!board[nr][nc] || placedSet.has(nr + '_' + nc)) continue;
      if (boardTypes[nr][nc] === animal) {
        const pk = Math.min(pr * COLS + pc, nr * COLS + nc) + '-' + Math.max(pr * COLS + pc, nr * COLS + nc);
        if (!affinityChecked.has(pk)) {
          affinityChecked.add(pk);
          affinityBonus += 10;
          const hx = 40 + ((pc + nc) / 2) * cellSize + cellSize / 2;
          const hy = 40 + ((pr + nr) / 2) * cellSize;
          effects.spawnAffinityHeart(hx, hy);
        }
      }
    }
  }
  if (affinityBonus > 0) {
    score += affinityBonus;
    SoundManager.play('affinity');
    effects.spawnScorePopup(effectsCanvas.width / 2, 40 + maxR * cellSize - 10, affinityBonus, '#FF77CC');
  }

  currentPiece = null;
  boardDirty = true;
  checkLines();
}

function checkLines() {
  const full = [];
  for (let r = 0; r < ROWS; r++) {
    if (board[r].every(v => v)) full.push(r);
  }

  if (full.length === 0) {
    combo = 0;
    feverMode = false;
    effects.setFever(false);
    effects.setComboLevel(0);
    document.getElementById('combo-box').classList.remove('fever-glow');
    spawnPiece();
    return;
  }

  clearRows = full;
  clearStartTime = performance.now();
  state = 'clearing';

  for (const r of full) {
    for (let c = 0; c < COLS; c++) {
      setCellExpression(r, c, 'surprised', 500);
    }
  }
}

function finishClear() {
  const n = clearRows.length;
  const margin = 40;

  for (const r of clearRows) {
    effects.spawnLineClear(
      margin, margin + r * cellSize,
      COLS * cellSize, cellSize, n
    );
  }

  for (const r of clearRows.sort((a, b) => a - b)) {
    board.splice(r, 1);
    board.unshift(Array(COLS).fill(0));
    boardTypes.splice(r, 1);
    boardTypes.unshift(Array(COLS).fill(null));
  }

  combo++;
  let mult = combo >= 3 ? 2.0 : combo === 2 ? 1.5 : 1;
  let pts = Math.floor((LINE_SCORES[n] || 100) * level * mult);

  if (combo >= 3) {
    feverMode = true;
    effects.setFever(true);
    pts = Math.floor(pts * 1.5);
    document.getElementById('combo-box').classList.add('fever-glow');
    SoundManager.play('fever');
  } else {
    document.getElementById('combo-box').classList.remove('fever-glow');
  }

  effects.setComboLevel(combo);

  // Perfect Clear (보드 완전 비움)
  if (board.every(row => row.every(v => v === 0))) {
    pts += 5000;
    effects.spawnAllClear(effectsCanvas.width, effectsCanvas.height);
    SoundManager.play('perfect');
  }

  score += pts;
  lines += n;

  // 점수 팝업
  const popX = effectsCanvas.width / 2;
  const popY = margin + clearRows[0] * cellSize;
  effects.spawnScorePopup(popX, popY, pts.toLocaleString(), n >= 4 ? '#FF77CC' : '#FFD700');

  // 콤보 텍스트
  if (combo >= 2) {
    effects.spawnComboText(combo, popX, popY - 25);
    SoundManager.play('combo');
  }

  // 테트리스
  if (n >= 4) {
    effects.spawnTextPopup('TETRIS!!', '#FF77CC', 30, popX, effectsCanvas.height * 0.35);
    effects.shake(6);
    SoundManager.play('tetris');
  } else {
    SoundManager.play('clear1');
  }

  // 피버
  if (combo >= 3) {
    effects.spawnTextPopup('FEVER!!', '#FF6644', 26, popX, effectsCanvas.height * 0.45);
  }

  // 레벨
  const newLv = Math.floor(lines / 10) + 1;
  if (newLv > level) {
    level = newLv;
    dropInterval = Math.max(SPEED_MIN, SPEEDS[difficulty] - (level - 1) * SPEED_STEP);
    effects.spawnTextPopup('LEVEL UP!', '#88ccff', 22, popX, effectsCanvas.height * 0.3);
    effects.flash('#88ccff', 0.15);
    SoundManager.play('levelup');
  }

  // 행복 표정 (보드의 모든 셀)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) setCellExpression(r, c, 'happy', 2000);
    }
  }

  syncCellStates(board, ROWS, COLS);
  clearRows = null;
  state = 'playing';
  boardDirty = true;
  updateUI();
  spawnPiece();
}

// ─── 게임 오버 ─────────────────────────────
function triggerGameOver() {
  state = 'gameover';
  boardDirty = true;
  gameOverStartTime = performance.now();
  gameOverFallData = [];
  SoundManager.play('gameover');
  effects.shake(8);
  effects.flash('#ff3333', 0.3);

  // 모든 셀 dead 표정
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) triggerDead(r, c);
    }
  }

  for (let r = ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        gameOverFallData.push({
          r, c, animal: boardTypes[r][c],
          delay: (ROWS - 1 - r) * 50 + c * 15,
          vy: 0, dy: 0, done: false
        });
      }
    }
  }

  submitScore();
}

async function submitScore() {
  try {
    await fetch(API + '/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score, level, lines, difficulty })
    });
  } catch (e) { /* offline */ }

  const data = await loadRanking();

  setTimeout(() => {
    document.getElementById('final-score').textContent = score.toLocaleString();
    document.getElementById('final-info').textContent =
      'Level ' + level + ' / ' + lines + ' Lines / ' + difficulty.toUpperCase();

    let rank = 0;
    if (data) {
      for (let i = 0; i < data.length; i++) {
        if (score >= data[i].score) { rank = i + 1; break; }
      }
    }
    document.getElementById('final-rank').textContent = rank > 0 ? 'Rank #' + rank : '';
    document.getElementById('gameover-modal').classList.remove('hidden');
  }, 1200);
}

// ─── 랭킹 ──────────────────────────────────
async function loadRanking() {
  try {
    const res = await fetch(API + '/api/scores?type=global&limit=10');
    const data = await res.json();
    const ul = document.getElementById('ranking-list');
    ul.innerHTML = '';
    data.forEach((e, i) => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="rank-name">' + (i + 1) + '. ' + e.nickname + '</span>' +
                     '<span class="rank-score">' + e.score.toLocaleString() + '</span>';
      ul.appendChild(li);
    });
    return data;
  } catch (e) { return null; }
}

// ─── UI 업데이트 ────────────────────────────
function updateUI() {
  const scoreEl = document.getElementById('score-display');
  scoreEl.textContent = score.toLocaleString();
  scoreEl.classList.remove('score-pulse');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pulse');

  document.getElementById('level-display').textContent = level;
  document.getElementById('lines-display').textContent = lines;
  document.getElementById('combo-display').textContent = combo;
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (!holdType) return;
  const floatY = Math.sin((prevTime || 0) * 0.003) * 2;
  drawPreview(holdCtx, holdCanvas, holdType, floatY);
}

function drawNextPreviews() {
  nextCanvases.forEach((cvs, i) => {
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    if (i < nextQueue.length) {
      const floatY = Math.sin((prevTime || 0) * 0.003 + i * 0.7) * 2;
      drawPreview(ctx, cvs, nextQueue[i], floatY);
    }
  });
}

function drawPreview(ctx, canvas, type, floatOffset) {
  const shape = SHAPES[type];
  const animal = ANIMAL_TYPES[type];
  floatOffset = floatOffset || 0;

  let minR = shape.length, maxR = 0, minC = shape[0].length, maxC = 0;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        minR = Math.min(minR, r); maxR = Math.max(maxR, r);
        minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      }
    }
  }
  const pw = maxC - minC + 1;
  const ph = maxR - minR + 1;
  const cs = Math.min((canvas.width - 16) / pw, (canvas.height - 8) / ph, 22);
  const ox = (canvas.width - pw * cs) / 2;
  const oy = (canvas.height - ph * cs) / 2 + floatOffset;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (shape[r][c]) {
        drawAnimalCell(ctx, animal, ox + (c - minC) * cs, oy + (r - minR) * cs, cs, -1, -1, 1);
      }
    }
  }
}

// ─── 키보드 입력 ────────────────────────────
document.addEventListener('keydown', (e) => {
  if (state === 'start') return;

  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
    if (state === 'playing') {
      state = 'paused';
      document.getElementById('pause-overlay').classList.remove('hidden');
    } else if (state === 'paused') {
      state = 'playing';
      lastDropTime = performance.now();
      document.getElementById('pause-overlay').classList.add('hidden');
    }
    return;
  }

  if (state !== 'playing' || !currentPiece) return;

  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': move(-1, 0); break;
    case 'ArrowRight': case 'd': case 'D': move(1, 0); break;
    case 'ArrowDown': case 's': case 'S': softDrop(); break;
    case 'ArrowUp': case 'x': case 'X': rotate(1); break;
    case 'z': case 'Z': rotate(-1); break;
    case ' ': hardDrop(); e.preventDefault(); break;
    case 'c': case 'C': hold(); break;
  }
});

// ─── 모바일 컨트롤러 ───────────────────────
function mobileBtn(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();
    SoundManager.resume();
    fn();
  }, { passive: false });
}

mobileBtn('dpad-left', () => { if (state === 'playing') move(-1, 0); });
mobileBtn('dpad-right', () => { if (state === 'playing') move(1, 0); });
mobileBtn('dpad-down', () => { if (state === 'playing') softDrop(); });
mobileBtn('dpad-up', () => { if (state === 'playing') rotate(1); });
mobileBtn('btn-a', () => { if (state === 'playing') rotate(1); });
mobileBtn('btn-b', () => { if (state === 'playing') hardDrop(); });
mobileBtn('btn-select', () => { if (state === 'playing') hold(); });
mobileBtn('btn-start', () => {
  if (state === 'playing') {
    state = 'paused';
    document.getElementById('pause-overlay').classList.remove('hidden');
  } else if (state === 'paused') {
    state = 'playing';
    lastDropTime = performance.now();
    document.getElementById('pause-overlay').classList.add('hidden');
  }
});

// ─── 메인 게임 루프 ────────────────────────
let prevTime = 0;
let boardDirty = true;
let animFrameId = null;

function startGameLoop() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  prevTime = 0;
  animFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  const dt = timestamp - prevTime;
  prevTime = timestamp;

  if (dt > 200) {
    lastDropTime = timestamp;
    animFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  // ── 업데이트 ──
  if (state === 'playing' && currentPiece) {
    if (lastDropTime === 0) lastDropTime = timestamp;
    if (timestamp - lastDropTime >= dropInterval) {
      if (!move(0, 1)) {
        lock();
      }
      lastDropTime = timestamp;
    }

    // 위험 모드
    let danger = false;
    for (let r = 0; r < DANGER_ROWS; r++) {
      if (board[r].some(v => v)) { danger = true; break; }
    }
    effects.setDanger(danger);
    if (danger) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]) setCellExpression(r, c, 'scared', 500);
        }
      }
      if (Math.random() < 0.03) {
        for (let c = 0; c < COLS; c++) {
          if (board[0][c] && Math.random() < 0.15) {
            effects.spawnSweat(40 + c * cellSize + cellSize / 2, 40);
          }
        }
      }
    }
  }

  // clearing 페이즈
  if (state === 'clearing') {
    boardDirty = true; // 클리어 애니메이션 중 흔들림
    if (timestamp - clearStartTime >= 300) {
      finishClear();
    }
  }

  // 게임오버 애니메이션
  if (state === 'gameover' && gameOverFallData) {
    boardDirty = true; // 낙하 애니메이션
    const elapsed = timestamp - gameOverStartTime;
    for (const e of gameOverFallData) {
      if (!e.done && elapsed > e.delay) {
        e.vy += 0.4;
        e.dy += e.vy;
        if (e.dy > cellSize * (ROWS - e.r + 3)) e.done = true;
      }
    }
  }

  // 거의 완성된 줄 감지
  if (board) {
    const nearRows = [];
    for (let r = 0; r < ROWS; r++) {
      let filled = 0;
      for (let c = 0; c < COLS; c++) if (board[r][c]) filled++;
      if (filled >= COLS * 0.8 && filled < COLS) {
        nearRows.push({ y: r * cellSize, h: cellSize, ratio: filled / COLS });
      }
    }
    effects.setNearCompleteRows(nearRows);
  }

  updateCellAnimations(timestamp);
  effects.update(dt, timestamp);

  // ── 렌더링 ──
  render(timestamp);

  animFrameId = requestAnimationFrame(gameLoop);
}

// ─── 렌더링 ────────────────────────────────
function render(time) {
  const ctx = gameCtx;
  const cs = cellSize;
  const bw = COLS * cs, bh = ROWS * cs;

  ctx.clearRect(0, 0, bw, bh);

  if (!board) {
    ctx.strokeStyle = 'rgba(100,130,170,0.07)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(bw, r * cs); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, bh); ctx.stroke();
    }
    return;
  }

  // 그리드
  ctx.strokeStyle = 'rgba(100,130,170,0.07)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cs); ctx.lineTo(bw, r * cs); ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * cs, 0); ctx.lineTo(c * cs, bh); ctx.stroke();
  }

  // 거의 완성된 줄 하이라이트 (보드 위에 직접)
  if (state === 'playing') {
    for (let r = 0; r < ROWS; r++) {
      let filled = 0;
      for (let c = 0; c < COLS; c++) if (board[r][c]) filled++;
      if (filled >= COLS * 0.8 && filled < COLS) {
        const brightness = (filled / COLS - 0.7) / 0.3;
        const pulse = 0.5 + Math.sin(time * 0.004) * 0.5;
        ctx.fillStyle = `rgba(255,255,200,${(0.02 + brightness * 0.05) * pulse})`;
        ctx.fillRect(0, r * cs, bw, cs);
      }
    }
  }

  // 위험선
  let danger = false;
  for (let r = 0; r < DANGER_ROWS; r++) if (board[r].some(v => v)) { danger = true; break; }
  if (danger) {
    ctx.fillStyle = 'rgba(255,50,50,0.03)';
    ctx.fillRect(0, 0, bw, DANGER_ROWS * cs);
    ctx.strokeStyle = 'rgba(255,50,50,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, DANGER_ROWS * cs); ctx.lineTo(bw, DANGER_ROWS * cs); ctx.stroke();
    ctx.setLineDash([]);
  }

  // 게임오버 렌더링
  if (state === 'gameover' && gameOverFallData) {
    for (const e of gameOverFallData) {
      if (!e.animal) continue;
      const alpha = e.done ? 0 : 1;
      if (alpha === 0) continue;
      drawAnimalCell(ctx, e.animal, e.c * cs, e.r * cs + e.dy, cs, e.r, e.c, alpha);
    }
    effects.draw(0, 0, bw, bh, time);
    return;
  }

  // 고정 블록
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!board[r][c] || !boardTypes[r][c]) continue;

      let ox = 0;
      if (state === 'clearing' && clearRows && clearRows.includes(r)) {
        const t = (time - clearStartTime) / 300;
        ox = Math.sin(t * Math.PI * 8) * 3 * (1 - t);
      }

      drawAnimalCell(ctx, boardTypes[r][c], c * cs + ox, r * cs, cs, r, c, 1);
    }
  }

  // Ghost piece
  if (state === 'playing' && currentPiece) {
    const gy = ghostY();
    if (gy !== currentPiece.y) {
      const { shape, x, type } = currentPiece;
      const animal = ANIMAL_TYPES[type];
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            drawAnimalCell(ctx, animal, (x + c) * cs, (gy + r) * cs, cs, -1, -1, 0.2);
          }
        }
      }
    }

    // 현재 피스
    const { shape, x, y, type } = currentPiece;
    const animal = ANIMAL_TYPES[type];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const py = y + r;
          if (py >= 0) drawAnimalCell(ctx, animal, (x + c) * cs, py * cs, cs, -1, -1, 1);
        }
      }
    }
  }

  // 이펙트 레이어
  effects.draw(0, 0, bw, bh, time);

  // 프리뷰 플로팅
  if (state === 'playing' || state === 'clearing') {
    drawHold();
    drawNextPreviews();
  }
}

// ─── 화면 전환 감지 및 게임 루프 복원 ──────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    calcSize();
    syncEffectCanvas();
    boardDirty = true;
    if (state === 'playing') {
      prevTime = performance.now();
      lastDropTime = performance.now();
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(gameLoop);
      }
    }
  } else {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }
});

window.addEventListener('resize', () => {
  calcSize();
  syncEffectCanvas();
  adjustMobileLayout();
  boardDirty = true;
  if (state === 'playing') {
    prevTime = performance.now();
    lastDropTime = performance.now();
    if (!animFrameId) {
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }
});

document.addEventListener('fullscreenchange', () => {
  setTimeout(() => {
    calcSize();
    syncEffectCanvas();
    adjustMobileLayout();
    boardDirty = true;
    if (state === 'playing') {
      prevTime = performance.now();
      lastDropTime = performance.now();
      if (!animFrameId) {
        animFrameId = requestAnimationFrame(gameLoop);
      }
    }
  }, 150);
});

// ─── EXIT 버튼 (전역 함수 — iframe 안전: confirm() 대신 인게임 모달) ────
window.handleExit = function() {
  if (state === 'playing' || state === 'paused') {
    const prevState = state;
    state = 'paused';

    const exitModal = document.getElementById('exit-modal');
    exitModal.classList.remove('hidden');

    document.getElementById('exit-confirm-btn').onclick = function() {
      exitModal.classList.add('hidden');
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      state = 'start';
      score = 0; level = 1; lines = 0; combo = 0;
      holdType = null;
      board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
      boardTypes = Array.from({length: ROWS}, () => Array(COLS).fill(null));
      clearAllCellStates();
      gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
      effects.clear();
      localStorage.removeItem('puzooGame');
      document.getElementById('start-modal').classList.remove('hidden');
    };

    document.getElementById('exit-cancel-btn').onclick = function() {
      exitModal.classList.add('hidden');
      state = prevState;
      if (state === 'playing' && !animFrameId) {
        prevTime = performance.now();
        animFrameId = requestAnimationFrame(gameLoop);
      }
    };
  } else {
    document.getElementById('start-modal').classList.remove('hidden');
  }
};

// ─── 시작 ──────────────────────────────────
// 새로고침 시 항상 시작 모달부터
sessionStorage.removeItem('puzooGameState');
loadRanking();

window.addEventListener('load', () => {
  sessionStorage.clear();
  state = 'start';
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  document.getElementById('start-modal').classList.remove('hidden');
  setTimeout(adjustMobileLayout, 100);
  startGameLoop();
});

const exitBtn = document.getElementById('exit-btn');
if (exitBtn) {
  exitBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    window.handleExit();
  });
  // 터치 이벤트도 추가
  exitBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.handleExit();
  });
}

})();
