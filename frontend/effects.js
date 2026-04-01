// effects.js - 파티클/텍스트팝업/플래시/흔들림/별빛/위험경고 전담

class EffectsManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Object Pool: 사전 할당된 파티클 풀
    this.MAX_PARTICLES = 200;
    this.particles = new Array(this.MAX_PARTICLES);
    this.particleCount = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles[i] = { active: false, x:0, y:0, vx:0, vy:0, gravity:0, type:'dust', color:'#fff', size:3, life:0, decay:0.03, rot:0, rotV:0 };
    }
    this.textPopups = [];
    this.scorePopups = [];
    this.stars = [];
    this.borderHue = 0;
    this.feverActive = false;
    this.feverAlpha = 0;
    this.dangerActive = false;
    this.dangerPulse = 0;
    this.shakeAmount = 0;
    this.shakeDecay = 0.88;
    this.flashAlpha = 0;
    this.flashColor = '#fff';
    this.flashDecay = 0.06;
    this.comboLevel = 0;
    this.nearCompleteRows = [];
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  clear() {
    for (let i = 0; i < this.MAX_PARTICLES; i++) this.particles[i].active = false;
    this.particleCount = 0;
    this.textPopups = [];
    this.scorePopups = [];
    this.feverActive = false;
    this.feverAlpha = 0;
    this.dangerActive = false;
    this.shakeAmount = 0;
    this.flashAlpha = 0;
    this.comboLevel = 0;
    this.nearCompleteRows = [];
    this.initStars();
  }

  // ─── 별빛 배경 ────────────────────────────────
  initStars() {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * (this.canvas.width || 400),
        y: Math.random() * (this.canvas.height || 700),
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5
      });
    }
  }

  setFever(on) { this.feverActive = on; }
  setDanger(on) { this.dangerActive = on; }
  setComboLevel(n) {
    this.comboLevel = n;
    // 고콤보: 임시 별 추가
    if (n >= 3 && this.stars.length < 80) {
      for (let i = 0; i < 10; i++) {
        this.stars.push({
          x: Math.random() * (this.canvas.width || 400),
          y: Math.random() * (this.canvas.height || 700),
          size: Math.random() * 2 + 0.5,
          phase: Math.random() * Math.PI * 2,
          speed: 1 + Math.random() * 2
        });
      }
    }
  }
  setNearCompleteRows(rows) { this.nearCompleteRows = rows; }

  shake(amount) { this.shakeAmount = Math.max(this.shakeAmount, amount); }

  flash(color, alpha) {
    this.flashColor = color || '#fff';
    this.flashAlpha = alpha || 0.3;
  }

  // ─── 파티클 추가 (Object Pool) ──────────────────
  _addParticle(p) {
    // 풀에서 비활성 슬롯 찾기
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (!this.particles[i].active) {
        const slot = this.particles[i];
        slot.active = true;
        slot.x = p.x; slot.y = p.y;
        slot.vx = p.vx; slot.vy = p.vy;
        slot.gravity = p.gravity;
        slot.type = p.type; slot.color = p.color;
        slot.size = p.size; slot.life = p.life;
        slot.decay = p.decay;
        slot.rot = p.rot; slot.rotV = p.rotV;
        this.particleCount++;
        return;
      }
    }
    // 풀 꽉 찼으면 가장 오래된(life 가장 낮은) 파티클 재활용
    let minLife = 2, minIdx = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (this.particles[i].life < minLife) { minLife = this.particles[i].life; minIdx = i; }
    }
    const slot = this.particles[minIdx];
    slot.x = p.x; slot.y = p.y;
    slot.vx = p.vx; slot.vy = p.vy;
    slot.gravity = p.gravity;
    slot.type = p.type; slot.color = p.color;
    slot.size = p.size; slot.life = p.life;
    slot.decay = p.decay;
    slot.rot = p.rot; slot.rotV = p.rotV;
  }

  // ─── 착지 먼지 ────────────────────────────────
  spawnLandingDust(x, y, width, color) {
    for (let i = 0; i < 8; i++) {
      this._addParticle({
        x: x + Math.random() * width, y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 2 - 0.5,
        gravity: 0.06,
        type: 'dust', color: color || '#aab',
        size: Math.random() * 4 + 2,
        life: 1, decay: 0.03,
        rot: 0, rotV: 0
      });
    }
  }

  // ─── 충격파 ───────────────────────────────────
  spawnShockwave(x, y, color) {
    this._addParticle({
      x, y, vx: 0, vy: 0, gravity: 0,
      type: 'shockwave', color: color || '#fff',
      size: 5, life: 1, decay: 0.025,
      rot: 0, rotV: 0
    });
  }

  // ─── 하드드롭 (경량화) ──────────────────────────
  spawnHardDrop(x, y, width, color) {
    this.shake(5);
    for (let i = 0; i < 8; i++) {
      this._addParticle({
        x: x + Math.random() * width, y,
        vx: (Math.random() - 0.5) * 7,
        vy: -Math.random() * 4 - 1,
        gravity: 0.1,
        type: 'dust', color: color || '#dde',
        size: Math.random() * 5 + 2,
        life: 1, decay: 0.03,
        rot: 0, rotV: 0
      });
    }
    for (let i = 0; i < 2; i++) {
      this._addParticle({
        x: x + width * 0.2 + Math.random() * width * 0.6,
        y: y - 10,
        vx: 0, vy: -6 - Math.random() * 3,
        gravity: 0,
        type: 'speedline', color: '#fff',
        size: 2, life: 1, decay: 0.05,
        rot: 0, rotV: 0
      });
    }
    // 충격파
    this.spawnShockwave(x + width / 2, y, color);
  }

  // ─── 라인 클리어 (경량화) ──────────────────────
  spawnLineClear(x, y, w, cellSize, lineCount) {
    const colors = ['#FF77CC','#FFE044','#33DDFF','#44EE88','#FF6644','#88AAFF'];
    const types = ['heart','star','bubble'];

    // 파티클 수 감소: 기존 20+lineCount*10 → 10+lineCount*4
    const count = 10 + lineCount * 4;
    const sizeMult = this.feverActive ? 1.5 : 1;
    for (let i = 0; i < count; i++) {
      this._addParticle({
        x: x + Math.random() * w, y: y + cellSize / 2,
        vx: (Math.random() - 0.5) * 7,
        vy: -Math.random() * 6 - 2,
        gravity: 0.08,
        type: types[Math.floor(Math.random() * types.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        size: (3 + Math.random() * 7) * sizeMult,
        life: 1, decay: 0.015 + Math.random() * 0.01,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.15
      });
    }

    // 빔 2개로 축소 (기존 4개)
    for (let i = 0; i < 2; i++) {
      this._addParticle({
        x: x, y: y + cellSize / 2,
        vx: 8 + Math.random() * 4, vy: (Math.random() - 0.5) * 2,
        gravity: 0,
        type: 'beam', color: '#fff',
        size: 3, life: 1, decay: 0.03,
        rot: 0, rotV: 0
      });
    }

    this.flash('#fff', lineCount >= 4 ? 0.4 : 0.15);

    if (lineCount >= 2) {
      // 별 파티클 20 → 8개
      for (let i = 0; i < 8; i++) {
        this._addParticle({
          x: x + Math.random() * w, y: y + cellSize / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: -Math.random() * 8 - 3,
          gravity: 0.07,
          type: 'star',
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 4 + Math.random() * 5,
          life: 1, decay: 0.012,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.2
        });
      }
    }

    if (lineCount >= 4) {
      this.shake(8);
      // 테트리스 파티클 50 → 20개 (decay 약간 올려서 수명 단축)
      for (let i = 0; i < 20; i++) {
        const hue = (i / 20) * 360;
        this._addParticle({
          x: x + w / 2 + (Math.random() - 0.5) * w,
          y: y + cellSize / 2,
          vx: (Math.random() - 0.5) * 10,
          vy: -Math.random() * 10 - 2,
          gravity: 0.06,
          type: Math.random() > 0.5 ? 'heart' : 'star',
          color: `hsl(${hue},80%,65%)`,
          size: 4 + Math.random() * 6,
          life: 1, decay: 0.01,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.2
        });
      }
    }
  }

  // ─── All Clear / Perfect ──────────────────────
  spawnAllClear(w, h) {
    const colors = ['#FF77CC','#FFE044','#33DDFF','#44EE88','#FF6644','#88AAFF','#FFAA44'];
    this.shake(12);
    this.flash('#FFD700', 0.4);

    for (let b = 0; b < 5; b++) {
      const bx = w * 0.1 + Math.random() * w * 0.8;
      const by = h * 0.1 + Math.random() * h * 0.5;
      const col = colors[b % colors.length];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10;
        const spd = 2 + Math.random() * 4;
        this._addParticle({
          x: bx, y: by,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
          gravity: 0.03,
          type: 'spark', color: col,
          size: 2 + Math.random() * 3,
          life: 1, decay: 0.008,
          rot: 0, rotV: 0
        });
      }
    }

    this.spawnTextPopup('PERFECT!!', '#FFD700', 32, w / 2, h * 0.35);
  }

  // ─── 점수 팝업 ────────────────────────────────
  spawnScorePopup(x, y, scoreText, color) {
    this.scorePopups.push({
      x, y, text: '+' + scoreText,
      color: color || '#FFD700',
      alpha: 1, vy: -2, life: 70
    });
  }

  // ─── 텍스트 팝업 ──────────────────────────────
  spawnTextPopup(text, color, size, x, y) {
    this.textPopups.push({
      x: x || this.canvas.width / 2,
      y: y || this.canvas.height * 0.4,
      text, color: color || '#fff',
      size: size || 24,
      alpha: 1, scale: 2.0,
      life: 90
    });
  }

  // ─── 콤보 텍스트 (Puyo Puyo 스타일) ──────────
  spawnComboText(combo, x, y) {
    let color, text;
    if (combo >= 5) { color = '#FF3366'; text = combo + ' COMBO!! \u26A1'; }
    else if (combo >= 4) { color = '#FF6644'; text = combo + ' COMBO!! \u26A1'; }
    else if (combo >= 3) { color = '#FF8833'; text = combo + ' COMBO! \uD83D\uDD25'; }
    else { color = '#FFE044'; text = combo + ' COMBO!'; }

    this.spawnTextPopup(text, color, combo >= 4 ? 26 : 20, x, y);

    if (combo >= 2) {
      for (let i = 0; i < combo * 3; i++) {
        this._addParticle({
          x: x + (Math.random() - 0.5) * 80,
          y: y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2 - 1,
          gravity: 0.04,
          type: 'spark', color,
          size: 2 + Math.random() * 3,
          life: 1, decay: 0.015,
          rot: 0, rotV: 0
        });
      }
    }
    if (combo >= 4) this.shake(4);
  }

  // ─── 식은땀 ──────────────────────────────────
  spawnSweat(x, y) {
    this._addParticle({
      x, y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: 0.8 + Math.random() * 0.5,
      gravity: 0.03,
      type: 'sweat', color: '#66ccff',
      size: 2 + Math.random() * 2,
      life: 1, decay: 0.025,
      rot: 0, rotV: 0
    });
  }

  // ─── 친화도 하트 ──────────────────────────────
  spawnAffinityHeart(x, y) {
    this._addParticle({
      x, y,
      vx: (Math.random() - 0.5) * 1,
      vy: -1.5 - Math.random(),
      gravity: 0.01,
      type: 'heart', color: '#FF77CC',
      size: 4 + Math.random() * 2,
      life: 1, decay: 0.015,
      rot: 0, rotV: 0
    });
  }

  // ─── 어지러움 별 ──────────────────────────────
  spawnDizzyStars(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5;
      this._addParticle({
        x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 8 - 8,
        vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.3 - 0.5,
        gravity: 0,
        type: 'star', color: '#FFE044',
        size: 3 + Math.random() * 2,
        life: 1, decay: 0.01,
        rot: a, rotV: 0.08
      });
    }
  }

  // ─── 업데이트 ─────────────────────────────────
  update(dt, timestamp) {
    // Object Pool 업데이트 (splice 제거 → active 플래그)
    this.particleCount = 0;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      p.rot += p.rotV;
      if (p.life <= 0) p.active = false;
      else this.particleCount++;
    }

    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const s = this.scorePopups[i];
      s.y += s.vy;
      s.vy *= 0.97;
      s.life--;
      s.alpha = Math.min(1, s.life / 20);
      if (s.life <= 0) this.scorePopups.splice(i, 1);
    }

    for (let i = this.textPopups.length - 1; i >= 0; i--) {
      const t = this.textPopups[i];
      t.life--;
      t.scale = 1 + Math.max(0, (t.scale - 1) * 0.9);
      if (t.life < 20) t.alpha = t.life / 20;
      if (t.life <= 0) this.textPopups.splice(i, 1);
    }

    if (this.feverActive) {
      this.borderHue = (this.borderHue + 3) % 360;
      this.feverAlpha = Math.min(1, this.feverAlpha + 0.05);
    } else {
      this.feverAlpha = Math.max(0, this.feverAlpha - 0.03);
    }

    if (this.dangerActive) {
      this.dangerPulse = (this.dangerPulse + 0.08) % (Math.PI * 2);
    }

    if (this.shakeAmount > 0.3) this.shakeAmount *= this.shakeDecay;
    else this.shakeAmount = 0;

    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay);

    // 별 수 정상화 (콤보 끝나면 서서히 줄이기)
    if (this.comboLevel < 3 && this.stars.length > 50) {
      this.stars.pop();
    }
  }

  // ─── 그리기 ───────────────────────────────────
  draw(boardX, boardY, boardW, boardH, timestamp) {
    const ctx = this.ctx;
    const cw = this.canvas.width, ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    if (this.shakeAmount > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeAmount * 2,
        (Math.random() - 0.5) * this.shakeAmount * 2
      );
    }

    // ── 배경 별빛 (콤보 반응) ──
    const ts = timestamp || 0;
    const starBright = 1 + Math.min(1, this.comboLevel * 0.2);
    for (const star of this.stars) {
      const a = (0.2 + Math.sin(ts * 0.001 * star.speed + star.phase) * 0.25) * starBright;
      ctx.fillStyle = `rgba(200,220,255,${Math.max(0, Math.min(1, a))})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // ── 거의 완성된 줄 하이라이트 ──
    for (const nr of this.nearCompleteRows) {
      const brightness = (nr.ratio - 0.7) / 0.3;
      const pulse = 0.5 + Math.sin(ts * 0.005) * 0.5;
      ctx.fillStyle = `rgba(255,255,200,${(0.02 + brightness * 0.06) * pulse})`;
      ctx.fillRect(boardX, boardY + nr.y, boardW, nr.h);
      // 테두리 살짝
      ctx.strokeStyle = `rgba(255,255,150,${brightness * 0.15 * pulse})`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(boardX, boardY + nr.y, boardW, nr.h);
    }

    // ── Danger 테두리 (shadowBlur 제거 → 이중 테두리로 대체) ──
    if (this.dangerActive) {
      const pulseA = 0.15 + Math.sin(this.dangerPulse) * 0.15;
      ctx.save();
      ctx.globalAlpha = pulseA;
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 3;
      ctx.strokeRect(boardX, boardY, boardW, boardH);
      ctx.globalAlpha = pulseA * 0.4;
      ctx.strokeStyle = '#ff6666';
      ctx.lineWidth = 6;
      ctx.strokeRect(boardX - 2, boardY - 2, boardW + 4, boardH + 4);
      ctx.restore();
    }

    // ── Fever 보더 (shadowBlur 제거 → 다중 테두리) ──
    if (this.feverAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.feverAlpha * 0.7;
      const c1 = `hsl(${this.borderHue},80%,60%)`;
      const c2 = `hsl(${(this.borderHue + 60) % 360},80%,60%)`;
      ctx.strokeStyle = c1; ctx.lineWidth = 3;
      ctx.strokeRect(boardX - 1, boardY - 1, boardW + 2, boardH + 2);
      ctx.globalAlpha = this.feverAlpha * 0.3;
      ctx.strokeStyle = c2; ctx.lineWidth = 5;
      ctx.strokeRect(boardX - 4, boardY - 4, boardW + 8, boardH + 8);
      ctx.restore();
    }

    // ── 파티클 (Object Pool) ──
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      switch (p.type) {
        case 'heart': this._heart(ctx, p); break;
        case 'star': this._star(ctx, p); break;
        case 'spark': this._spark(ctx, p); break;
        case 'sweat': this._sweatDrop(ctx, p); break;
        case 'dust': this._dust(ctx, p); break;
        case 'beam': this._beam(ctx, p); break;
        case 'speedline': this._speedline(ctx, p); break;
        case 'shockwave': this._shockwave(ctx, p); break;
        default: this._bubble(ctx, p); break;
      }
      ctx.restore();
    }

    // ── 점수 팝업 (shadowBlur 제거) ──
    for (const s of this.scorePopups) {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = s.color;
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    }

    // ── 텍스트 팝업 ──
    for (const t of this.textPopups) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 12;
      ctx.font = `bold ${t.size}px "Courier New", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, 0, 0);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.strokeText(t.text, 0, 0);
      ctx.restore();
    }

    // ── Danger 텍스트 (shadowBlur 제거) ──
    if (this.dangerActive) {
      const blinkOn = Math.sin(ts * 0.008) > 0;
      if (blinkOn) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(ts * 0.01) * 0.3;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DANGER!', boardX + boardW / 2, boardY + 14);
        ctx.restore();
      }
    }

    // ── 화면 플래시 ──
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }

    ctx.restore();
  }

  // ── 파티클 서브루틴 ──

  _heart(ctx, p) {
    const s = p.size;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.5, -s * 0.3, -s, s * 0.1, 0, s);
    ctx.bezierCurveTo(s, s * 0.1, s * 0.5, -s * 0.3, 0, s * 0.3);
    ctx.fill();
  }

  _star(ctx, p) {
    const s = p.size;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * s, Math.sin(a) * s);
    }
    ctx.closePath(); ctx.fill();
  }

  _bubble(ctx, p) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
  }

  _spark(ctx, p) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2); ctx.fill();
  }

  _dust(ctx, p) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha *= 0.6;
    ctx.beginPath(); ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2); ctx.fill();
  }

  _beam(ctx, p) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = p.size * p.life;
    ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.stroke();
  }

  _speedline(ctx, p) {
    ctx.strokeStyle = p.color;
    ctx.globalAlpha *= 0.4;
    ctx.lineWidth = p.size;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke();
  }

  _sweatDrop(ctx, p) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.quadraticCurveTo(p.size * 0.6, 0, 0, p.size);
    ctx.quadraticCurveTo(-p.size * 0.6, 0, 0, -p.size);
    ctx.fill();
  }

  _shockwave(ctx, p) {
    const radius = (1 - p.life) * 40 + 5;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2 * p.life;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  }
}
