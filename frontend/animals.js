// animals.js - 개별 셀 독립 애니메이션 + 향상된 표정 시스템

const ANIMAL_TYPES = {
  I: 'FISH', O: 'BEAR', T: 'FOX', L: 'BUNNY',
  J: 'PENGUIN', S: 'CHICK', Z: 'FROG'
};

const ANIMAL_COLORS = {
  FISH:'#33DDFF', BEAR:'#FFAA44', FOX:'#FF6644', BUNNY:'#FF77CC',
  PENGUIN:'#88AAFF', CHICK:'#FFE044', FROG:'#44EE88'
};

// ─── 셀별 독립 애니메이션 상태 ──────────────
const cellStates = {};
let _ts = 0;

function getCellState(row, col) {
  const key = row + '_' + col;
  if (!cellStates[key]) {
    cellStates[key] = {
      blinkTimer: _ts + Math.random() * 5000,
      isBlinking: false,
      blinkInterval: 2000 + Math.random() * 4000,
      earWiggle: 0,
      isEarWiggling: false,
      earWiggleTimer: _ts + Math.random() * 8000,
      earWiggleInterval: 4000 + Math.random() * 6000,
      expression: 'normal',
      expressionTimer: 0,
      expressionDuration: 0,
      scaleY: 1,
      squishTime: 0,
      deadAngle: 0,
      deadTimer: 0
    };
  }
  return cellStates[key];
}

function clearAllCellStates() {
  for (const k in cellStates) delete cellStates[k];
}

function syncCellStates(board, ROWS, COLS) {
  for (const k in cellStates) {
    const p = k.split('_');
    const r = +p[0], c = +p[1];
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !board[r][c]) delete cellStates[k];
  }
}

function setCellExpression(row, col, expr, dur) {
  const s = getCellState(row, col);
  s.expression = expr;
  s.expressionTimer = _ts;
  s.expressionDuration = dur || 2000;
}

function triggerSquish(row, col) {
  const s = getCellState(row, col);
  s.expression = 'squished';
  s.squishTime = _ts;
  s.expressionTimer = _ts;
  s.expressionDuration = 400;
}

function triggerImpact(row, col) {
  const s = getCellState(row, col);
  if (s.expression !== 'squished') {
    s.expression = 'surprised';
    s.expressionTimer = _ts;
    s.expressionDuration = 500;
  }
  s.squishTime = _ts + 30;
  s.scaleY = 0.88;
}

function triggerDead(row, col) {
  const s = getCellState(row, col);
  s.expression = 'dead';
  s.deadTimer = _ts;
  s.expressionTimer = _ts;
  s.expressionDuration = 99999;
}

let _lastCellUpdate = 0;
function updateCellAnimations(timestamp) {
  _ts = timestamp;
  // 셀 애니메이션은 ~15fps로 제한 (표정/깜빡임은 고fps 불필요)
  if (timestamp - _lastCellUpdate < 66) return;
  _lastCellUpdate = timestamp;
  for (const k in cellStates) {
    const s = cellStates[k];

    // ── 독립 깜빡임 ──
    if (!s.isBlinking && timestamp - s.blinkTimer >= s.blinkInterval) {
      s.isBlinking = true;
      s.blinkTimer = timestamp;
    }
    if (s.isBlinking && timestamp - s.blinkTimer >= 150) {
      s.isBlinking = false;
      s.blinkInterval = 2000 + Math.random() * 4000;
    }

    // ── 독립 귀 움찔 ──
    if (!s.isEarWiggling && timestamp - s.earWiggleTimer >= s.earWiggleInterval) {
      s.isEarWiggling = true;
      s.earWiggleTimer = timestamp;
    }
    if (s.isEarWiggling) {
      const el = timestamp - s.earWiggleTimer;
      if (el < 300) s.earWiggle = Math.sin(el / 300 * Math.PI);
      else { s.earWiggle = 0; s.isEarWiggling = false; s.earWiggleInterval = 4000 + Math.random() * 6000; }
    }

    // ── 표정별 귀 오버라이드 ──
    if (s.expression === 'happy') s.earWiggle = Math.sin(timestamp * 0.012) * 0.8;
    if (s.expression === 'surprised') s.earWiggle = 1;

    // ── 납작 바운스 ──
    if (s.squishTime > 0) {
      const el = timestamp - s.squishTime;
      if (s.expression === 'squished') {
        if (el < 80) s.scaleY = 1 - 0.4 * (el / 80);
        else if (el < 180) s.scaleY = 0.6 + 0.7 * ((el - 80) / 100);
        else if (el < 400) s.scaleY = 1.3 - 0.3 * ((el - 180) / 220);
        else { s.scaleY = 1; s.squishTime = 0; }
      } else {
        if (el < 200) s.scaleY = 0.88 + 0.12 * (el / 200);
        else { s.scaleY = 1; s.squishTime = 0; }
      }
    }

    // ── 사망 기울기 ──
    if (s.expression === 'dead') {
      const el = timestamp - s.deadTimer;
      s.deadAngle = Math.min(Math.PI / 2, el / 800 * Math.PI / 2);
    }

    // ── 표정 자동 복귀 ──
    if (s.expression !== 'normal' && s.expression !== 'scared' && s.expression !== 'dead' &&
        s.expressionDuration > 0 && timestamp - s.expressionTimer >= s.expressionDuration) {
      s.expression = 'normal';
      s.deadAngle = 0;
    }
  }
}

// ─── 메인 그리기 ─────────────────────────────
function drawAnimalCell(ctx, animalType, x, y, s, row, col, alpha) {
  if (!animalType) return;
  alpha = (alpha != null) ? alpha : 1;

  const hasCell = (row != null && row >= 0 && col != null && col >= 0);
  const st = hasCell ? getCellState(row, col) : null;
  const expr = st ? st.expression : 'normal';
  const scY  = st ? st.scaleY : 1;
  const ear  = st ? st.earWiggle : 0;
  const blink = st ? st.isBlinking : false;
  const deadA = st ? (st.deadAngle || 0) : 0;
  const color = ANIMAL_COLORS[animalType] || '#888';

  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = x + s / 2, bot = y + s;

  // 사망 기울기
  if (deadA > 0) {
    ctx.translate(cx, bot);
    ctx.rotate(deadA);
    ctx.translate(-cx, -bot);
  }

  // 공포 흔들림
  if (expr === 'scared') {
    ctx.translate(Math.sin(_ts * 0.03) * 1.5, 0);
  }

  // 납작 스케일 (바닥 앵커)
  if (scY !== 1) {
    ctx.translate(0, bot);
    ctx.scale(1, scY);
    ctx.translate(0, -bot);
  }

  // 네온 글로우 배경 (shadowBlur 제거 → 밝은 테두리로 대체)
  const pad = 1, rad = 5;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.8;
  _roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, rad);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha = alpha * 0.15;
  ctx.fillStyle = '#fff';
  _roundRect(ctx, x + pad + 1, y + pad + 1, s - pad * 2 - 2, (s - pad * 2) * 0.4, rad);
  ctx.fill();

  // 외곽 글로우 테두리 (shadowBlur 대체)
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  _roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, rad);
  ctx.stroke();

  // 색상 테두리
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  _roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, rad);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  const opts = { expr, blink, ear, ts: _ts };

  switch (animalType) {
    case 'FISH':    _drawFish(ctx, x, y, s, opts); break;
    case 'BEAR':    _drawBear(ctx, x, y, s, opts); break;
    case 'FOX':     _drawFox(ctx, x, y, s, opts); break;
    case 'BUNNY':   _drawBunny(ctx, x, y, s, opts); break;
    case 'PENGUIN': _drawPenguin(ctx, x, y, s, opts); break;
    case 'CHICK':   _drawChick(ctx, x, y, s, opts); break;
    case 'FROG':    _drawFrog(ctx, x, y, s, opts); break;
  }

  // 놀람: 머리 위 삐죽 털
  if (expr === 'surprised') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha * 0.7;
    for (let i = 0; i < 4; i++) {
      const sx = x + s * 0.2 + i * s * 0.2;
      ctx.beginPath();
      ctx.moveTo(sx, y + pad);
      ctx.lineTo(sx + (Math.sin(i * 2.1) * 2), y - 3 - i % 2 * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─── 눈 그리기 (side: -1=왼, 1=오른) ─────────
function _drawEye(ctx, ex, ey, r, opts, side) {
  side = side || 0;
  const { expr, blink, ts } = opts;

  // 깜빡임
  if (blink && expr !== 'dizzy' && expr !== 'dead' && expr !== 'squished') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, r * 0.4);
    ctx.beginPath(); ctx.moveTo(ex - r * 0.7, ey); ctx.lineTo(ex + r * 0.7, ey); ctx.stroke();
    return;
  }

  // 행복: ^^ 호
  if (expr === 'happy') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.beginPath(); ctx.arc(ex, ey + r * 0.2, r * 0.6, Math.PI + 0.3, -0.3); ctx.stroke();
    return;
  }

  // 어지러움 / 사망: X X
  if (expr === 'dizzy' || expr === 'dead') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, r * 0.35);
    const d = r * 0.5;
    ctx.beginPath();
    ctx.moveTo(ex - d, ey - d); ctx.lineTo(ex + d, ey + d);
    ctx.moveTo(ex + d, ey - d); ctx.lineTo(ex - d, ey + d);
    ctx.stroke();
    return;
  }

  // 찌그러짐: > < 눈
  if (expr === 'squished') {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, r * 0.4);
    const d = r * 0.5;
    const dir = side <= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(ex - d * dir, ey - d);
    ctx.lineTo(ex + d * 0.6 * dir, ey);
    ctx.lineTo(ex - d * dir, ey + d);
    ctx.stroke();
    return;
  }

  // 공포: 흔들림 + 동공 쏠림
  let ox = 0, oy = 0, pupilShift = 0;
  if (expr === 'scared') {
    ox = Math.sin((ts || 0) * 0.05) * r * 0.3;
    oy = Math.cos((ts || 0) * 0.07) * r * 0.15;
    pupilShift = r * 0.2;
  }

  // 평상시: 숨쉬기 스케일
  let breathSc = 1;
  if (expr === 'normal') breathSc = 1 + Math.sin((ts || 0) * 0.002) * 0.04;

  const eyeR = expr === 'surprised' ? r * 1.3 : r * breathSc;
  const pupilR = expr === 'surprised' ? eyeR * 0.3 : eyeR * 0.55;

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ex + ox, ey + oy, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(ex + ox + pupilShift, ey + oy, pupilR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ex + ox - eyeR * 0.22, ey + oy - eyeR * 0.22, eyeR * 0.28, 0, Math.PI * 2); ctx.fill();
}

// ─── 입 유틸 ──────────────────────────────────
function _drawMouth(ctx, mx, my, s, opts) {
  const { expr } = opts;
  if (expr === 'surprised' || expr === 'scared') {
    const mr = expr === 'surprised' ? s * 0.06 : s * 0.04;
    ctx.fillStyle = '#664433';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  } else if (expr === 'happy') {
    ctx.strokeStyle = '#664433'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx, my - s * 0.02, s * 0.08, 0.1, Math.PI - 0.1); ctx.stroke();
  } else if (expr === 'squished' || expr === 'dizzy' || expr === 'dead') {
    ctx.strokeStyle = '#664433'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(mx - s * 0.06, my);
    ctx.bezierCurveTo(mx - s * 0.02, my - s * 0.03, mx + s * 0.02, my + s * 0.03, mx + s * 0.06, my);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#664433'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(mx - s * 0.05, my);
    ctx.quadraticCurveTo(mx - s * 0.025, my + s * 0.04, mx, my + s * 0.01);
    ctx.quadraticCurveTo(mx + s * 0.025, my + s * 0.04, mx + s * 0.05, my);
    ctx.stroke();
  }
}

// ═══════ BEAR ═══════
function _drawBear(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const earOff = -opts.ear * 4;

  ctx.fillStyle = '#FFAA44';
  ctx.beginPath(); ctx.arc(cx - s * 0.26, y - s * 0.05 + earOff, s * 0.2, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.26, y - s * 0.05 + earOff, s * 0.2, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#FF9999';
  ctx.beginPath(); ctx.arc(cx - s * 0.26, y - s * 0.05 + earOff, s * 0.1, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.26, y - s * 0.05 + earOff, s * 0.1, Math.PI, 0); ctx.fill();

  const eyeR = s * 0.075, eyeY = cy - s * 0.08;
  _drawEye(ctx, cx - s * 0.18, eyeY, eyeR, opts, -1);
  _drawEye(ctx, cx + s * 0.18, eyeY, eyeR, opts, 1);

  ctx.fillStyle = '#FF8888'; ctx.globalAlpha *= 0.4;
  ctx.beginPath(); ctx.ellipse(cx - s * 0.26, eyeY + s * 0.13, s * 0.08, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.26, eyeY + s * 0.13, s * 0.08, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.4;

  ctx.fillStyle = '#FF7788';
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.06, s * 0.06, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();

  _drawMouth(ctx, cx, cy + s * 0.14, s, opts);
  _drawSweat(ctx, cx + s * 0.3, eyeY - s * 0.06, s, opts.expr);
}

// ═══════ FISH ═══════
function _drawFish(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const finOff = opts.ear * 3;

  ctx.fillStyle = '#29bbdd';
  ctx.beginPath();
  ctx.moveTo(x + 2, cy - s * 0.08); ctx.lineTo(x - s * 0.15, cy - s * 0.2 + finOff);
  ctx.lineTo(x - s * 0.05, cy); ctx.lineTo(x - s * 0.15, cy + s * 0.2 - finOff);
  ctx.lineTo(x + 2, cy + s * 0.08); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.1, y + 2); ctx.lineTo(cx, y - s * 0.12 + finOff);
  ctx.lineTo(cx + s * 0.1, y + 2); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + s - 3, cy + s * 0.05); ctx.lineTo(x + s + s * 0.08, cy + s * 0.15);
  ctx.lineTo(x + s - 3, cy + s * 0.15); ctx.closePath(); ctx.fill();

  _drawEye(ctx, cx + s * 0.08, cy - s * 0.08, s * 0.11, opts, 0);

  if (opts.expr === 'surprised') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.15, s * 0.05, 0, Math.PI * 2); ctx.fill();
  } else if (opts.expr === 'happy') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.12, s * 0.05, 0.1, Math.PI - 0.1); ctx.stroke();
  } else {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx + s * 0.08, cy + s * 0.12, s * 0.04, 0, Math.PI * 2); ctx.stroke();
  }

  ctx.strokeStyle = '#55ccee'; ctx.lineWidth = 0.5; ctx.globalAlpha *= 0.35;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(cx - s * 0.15 + i * s * 0.12, cy + s * 0.02, s * 0.06, -0.8, 0.8); ctx.stroke();
  }
  ctx.globalAlpha /= 0.35;
  _drawSweat(ctx, cx + s * 0.22, cy - s * 0.2, s, opts.expr);
}

// ═══════ FOX ═══════
function _drawFox(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const earOff = -opts.ear * 4;

  ctx.fillStyle = '#FF6644';
  ctx.beginPath(); ctx.moveTo(cx - s * 0.34, y + 3); ctx.lineTo(cx - s * 0.2, y - s * 0.28 + earOff); ctx.lineTo(cx - s * 0.06, y + 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.06, y + 3); ctx.lineTo(cx + s * 0.2, y - s * 0.28 + earOff); ctx.lineTo(cx + s * 0.34, y + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFaa88';
  ctx.beginPath(); ctx.moveTo(cx - s * 0.28, y + 3); ctx.lineTo(cx - s * 0.2, y - s * 0.12 + earOff); ctx.lineTo(cx - s * 0.12, y + 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.12, y + 3); ctx.lineTo(cx + s * 0.2, y - s * 0.12 + earOff); ctx.lineTo(cx + s * 0.28, y + 3); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#FFeecc'; ctx.globalAlpha *= 0.7;
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.13, s * 0.2, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.7;

  const eyeR = s * 0.07, eyeY = cy - s * 0.06;
  _drawEye(ctx, cx - s * 0.17, eyeY, eyeR, opts, -1);
  _drawEye(ctx, cx + s * 0.17, eyeY, eyeR, opts, 1);

  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(cx, cy + s * 0.05, s * 0.04, 0, Math.PI * 2); ctx.fill();

  _drawMouth(ctx, cx, cy + s * 0.14, s, opts);
  _drawSweat(ctx, cx + s * 0.28, eyeY - s * 0.08, s, opts.expr);
}

// ═══════ BUNNY ═══════
function _drawBunny(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const earOff = -opts.ear * 5;

  ctx.fillStyle = '#FF77CC';
  ctx.beginPath(); ctx.ellipse(cx - s * 0.17, y - s * 0.18 + earOff, s * 0.1, s * 0.3, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.17, y - s * 0.18 + earOff, s * 0.1, s * 0.3, 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFbbdd';
  ctx.beginPath(); ctx.ellipse(cx - s * 0.17, y - s * 0.15 + earOff, s * 0.055, s * 0.2, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.17, y - s * 0.15 + earOff, s * 0.055, s * 0.2, 0.1, 0, Math.PI * 2); ctx.fill();

  const eyeR = s * 0.08, eyeY = cy - s * 0.06;
  _drawEye(ctx, cx - s * 0.17, eyeY, eyeR, opts, -1);
  _drawEye(ctx, cx + s * 0.17, eyeY, eyeR, opts, 1);

  ctx.fillStyle = '#FF5599';
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.06, s * 0.05, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#fff'; ctx.globalAlpha *= 0.45; ctx.lineWidth = 0.6;
  [-1, 1].forEach(side => {
    ctx.beginPath(); ctx.moveTo(cx + side * s * 0.1, cy + s * 0.06); ctx.lineTo(cx + side * s * 0.35, cy + s * 0.01); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + side * s * 0.1, cy + s * 0.1); ctx.lineTo(cx + side * s * 0.35, cy + s * 0.12); ctx.stroke();
  });
  ctx.globalAlpha /= 0.45;

  _drawMouth(ctx, cx, cy + s * 0.14, s, opts);
  _drawSweat(ctx, cx + s * 0.28, eyeY - s * 0.1, s, opts.expr);
}

// ═══════ PENGUIN ═══════
function _drawPenguin(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const flipOff = opts.ear * 3;

  ctx.fillStyle = '#6688cc';
  ctx.beginPath(); ctx.ellipse(x - s * 0.06, cy + s * 0.05 + flipOff, s * 0.08, s * 0.2, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s + s * 0.06, cy + s * 0.05 - flipOff, s * 0.08, s * 0.2, 0.3, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#fff'; ctx.globalAlpha *= 0.55;
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.22, s * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.55;

  const eyeR = s * 0.075, eyeY = cy - s * 0.08;
  _drawEye(ctx, cx - s * 0.15, eyeY, eyeR, opts, -1);
  _drawEye(ctx, cx + s * 0.15, eyeY, eyeR, opts, 1);

  ctx.fillStyle = '#FF8833';
  ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.04); ctx.lineTo(cx - s * 0.07, cy - s * 0.04);
  ctx.lineTo(cx + s * 0.07, cy - s * 0.04); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - s * 0.13, y + s + s * 0.04, s * 0.09, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.13, y + s + s * 0.04, s * 0.09, s * 0.04, 0, 0, Math.PI * 2); ctx.fill();

  if (opts.expr === 'happy') {
    ctx.strokeStyle = '#FF8833'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.04, 0.1, Math.PI - 0.1); ctx.stroke();
  } else if (opts.expr !== 'normal') {
    _drawMouth(ctx, cx, cy + s * 0.1, s, opts);
  }
  _drawSweat(ctx, cx + s * 0.26, eyeY - s * 0.08, s, opts.expr);
}

// ═══════ CHICK ═══════
function _drawChick(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const featherOff = -opts.ear * 4;

  ctx.fillStyle = '#FFE044';
  ctx.beginPath(); ctx.moveTo(cx - s * 0.04, y + 2); ctx.lineTo(cx, y - s * 0.22 + featherOff); ctx.lineTo(cx + s * 0.04, y + 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx - s * 0.12, y + 2); ctx.lineTo(cx - s * 0.1, y - s * 0.1 + featherOff * 0.5); ctx.lineTo(cx - s * 0.04, y + 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + s * 0.04, y + 2); ctx.lineTo(cx + s * 0.1, y - s * 0.1 + featherOff * 0.5); ctx.lineTo(cx + s * 0.12, y + 2); ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#eec830';
  ctx.beginPath(); ctx.ellipse(x - s * 0.03, cy + s * 0.05, s * 0.07, s * 0.13, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s + s * 0.03, cy + s * 0.05, s * 0.07, s * 0.13, 0.4, 0, Math.PI * 2); ctx.fill();

  const eyeR = s * 0.065, eyeY = cy - s * 0.06;
  _drawEye(ctx, cx - s * 0.16, eyeY, eyeR, opts, -1);
  _drawEye(ctx, cx + s * 0.16, eyeY, eyeR, opts, 1);

  ctx.fillStyle = '#FFAA55'; ctx.globalAlpha *= 0.4;
  ctx.beginPath(); ctx.arc(cx - s * 0.22, eyeY + s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.22, eyeY + s * 0.1, s * 0.06, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.4;

  ctx.fillStyle = '#FF8833';
  ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.06); ctx.lineTo(cx - s * 0.06, cy - s * 0.02);
  ctx.lineTo(cx + s * 0.06, cy - s * 0.02); ctx.closePath(); ctx.fill();

  if (opts.expr === 'happy') {
    ctx.strokeStyle = '#cc7722'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.14, s * 0.05, 0.1, Math.PI - 0.1); ctx.stroke();
  } else if (opts.expr !== 'normal') {
    _drawMouth(ctx, cx, cy + s * 0.14, s, opts);
  }
  _drawSweat(ctx, cx + s * 0.26, eyeY - s * 0.08, s, opts.expr);
}

// ═══════ FROG ═══════
function _drawFrog(ctx, x, y, s, opts) {
  const cx = x + s / 2, cy = y + s / 2;
  const bulgeR = s * 0.16;
  const bulgeOff = -opts.ear * 3;
  const { expr, blink, ts } = opts;

  ctx.fillStyle = '#44EE88';
  ctx.beginPath(); ctx.arc(cx - s * 0.2, y - s * 0.02 + bulgeOff, bulgeR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.2, y - s * 0.02 + bulgeOff, bulgeR, 0, Math.PI * 2); ctx.fill();

  const feyeR = bulgeR * 0.65;
  const feyeY = y - s * 0.02 + bulgeOff;

  if (blink && expr !== 'dizzy' && expr !== 'dead') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, feyeR * 0.4);
    ctx.beginPath(); ctx.moveTo(cx - s * 0.2 - feyeR * 0.5, feyeY); ctx.lineTo(cx - s * 0.2 + feyeR * 0.5, feyeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + s * 0.2 - feyeR * 0.5, feyeY); ctx.lineTo(cx + s * 0.2 + feyeR * 0.5, feyeY); ctx.stroke();
  } else if (expr === 'happy') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, feyeR * 0.35);
    ctx.beginPath(); ctx.arc(cx - s * 0.2, feyeY + feyeR * 0.2, feyeR * 0.5, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + s * 0.2, feyeY + feyeR * 0.2, feyeR * 0.5, Math.PI + 0.3, -0.3); ctx.stroke();
  } else if (expr === 'dizzy' || expr === 'dead') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, feyeR * 0.35);
    const d = feyeR * 0.4;
    [cx - s * 0.2, cx + s * 0.2].forEach(ex2 => {
      ctx.beginPath(); ctx.moveTo(ex2 - d, feyeY - d); ctx.lineTo(ex2 + d, feyeY + d); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex2 + d, feyeY - d); ctx.lineTo(ex2 - d, feyeY + d); ctx.stroke();
    });
  } else if (expr === 'squished') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(1, feyeR * 0.4);
    const d = feyeR * 0.4;
    [cx - s * 0.2, cx + s * 0.2].forEach((ex2, i) => {
      const dir = i === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(ex2 - d * dir, feyeY - d); ctx.lineTo(ex2 + d * 0.6 * dir, feyeY);
      ctx.lineTo(ex2 - d * dir, feyeY + d); ctx.stroke();
    });
  } else {
    let fox = 0, foy = 0;
    if (expr === 'scared') {
      fox = Math.sin((ts || 0) * 0.05) * feyeR * 0.25;
      foy = Math.cos((ts || 0) * 0.07) * feyeR * 0.1;
    }
    const actualR = expr === 'surprised' ? feyeR * 1.2 : feyeR;
    const pupR = expr === 'surprised' ? actualR * 0.3 : actualR * 0.5;

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.2 + fox, feyeY + foy, actualR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.2 + fox, feyeY + foy, actualR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(cx - s * 0.2 + fox, feyeY + foy, pupR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.2 + fox, feyeY + foy, pupR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - s * 0.2 - actualR * 0.2, feyeY - actualR * 0.2, actualR * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + s * 0.2 - actualR * 0.2, feyeY - actualR * 0.2, actualR * 0.22, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = '#33cc66';
  ctx.beginPath(); ctx.ellipse(cx - s * 0.16, y + s + s * 0.05, s * 0.11, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + s * 0.16, y + s + s * 0.05, s * 0.11, s * 0.045, 0, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#88ffbb'; ctx.globalAlpha *= 0.3;
  ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.2, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.3;

  if (expr === 'surprised') {
    ctx.fillStyle = '#228844';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.18, s * 0.05, s * 0.06, 0, 0, Math.PI * 2); ctx.fill();
  } else if (expr === 'happy') {
    ctx.strokeStyle = '#228844'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.16, 0.15, Math.PI - 0.15); ctx.stroke();
  } else {
    ctx.strokeStyle = '#228844'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy + s * 0.1, s * 0.12, 0.15, Math.PI - 0.15); ctx.stroke();
  }

  ctx.fillStyle = '#33aa66'; ctx.globalAlpha *= 0.3;
  ctx.beginPath(); ctx.arc(cx - s * 0.25, cy + s * 0.12, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.25, cy + s * 0.12, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha /= 0.3;
  _drawSweat(ctx, cx + s * 0.32, y - s * 0.05, s, expr);
}

// ═══════ 유틸 ═══════
function _drawSweat(ctx, x, y, s, expr) {
  if (expr !== 'sweat' && expr !== 'scared') return;
  ctx.fillStyle = '#66ccff'; ctx.globalAlpha *= 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.04);
  ctx.quadraticCurveTo(x + s * 0.04, y + s * 0.01, x, y + s * 0.06);
  ctx.quadraticCurveTo(x - s * 0.04, y + s * 0.01, x, y - s * 0.04);
  ctx.fill();
  ctx.globalAlpha /= 0.7;
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
