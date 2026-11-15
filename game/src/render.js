// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the backdrop
// colour. Flat shapes, glows and canvas text for the HUD and the panels.
import { BLOOM, FIELD, FONT, LIVES, MAX_WAVE, PALETTE, PATH, TOWERS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_BUILD = 'build';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const TOWER_ORDER = ['sun', 'thorn', 'frost'];
const SHOP = { y: 648, height: 72, cardW: 300, gap: 16 };
const HEART = '♥';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  /** Convert window CSS pixels to playfield coordinates (for clicks). */
  function toField(clientX, clientY, rect) {
    const ratio = window.devicePixelRatio || 1;
    const px = (clientX - rect.left) * ratio;
    const py = (clientY - rect.top) * ratio;
    return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
  }

  function drawGrass(t) {
    context.fillStyle = PALETTE.grassA;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.grassB;
    const cell = 80;
    for (let y = 0; y < FIELD.height / cell; y += 1) {
      for (let x = 0; x < FIELD.width / cell; x += 1) {
        if ((x + y) % 2 === 0) context.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    // A few decorative flowers that never move.
    const flowers = [[90, 90, '#ff8fb3'], [1150, 90, '#ffd166'], [640, 90, '#c77dff'], [90, 500, '#7dd7f7'], [1150, 470, '#ff8fb3'], [420, 620, '#ffd166']];
    for (const [fx, fy, color] of flowers) {
      context.fillStyle = color;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2;
        context.beginPath();
        context.arc(fx + Math.cos(a) * 6, fy + Math.sin(a) * 6, 4, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#fff3b0';
      context.beginPath();
      context.arc(fx, fy, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    void t;
  }

  function drawPath() {
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = PALETTE.pathEdge;
    context.lineWidth = 62;
    context.beginPath();
    context.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i += 1) context.lineTo(PATH[i].x, PATH[i].y);
    context.stroke();
    context.strokeStyle = PALETTE.path;
    context.lineWidth = 50;
    context.beginPath();
    context.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i += 1) context.lineTo(PATH[i].x, PATH[i].y);
    context.stroke();
  }

  function drawPlots(state) {
    for (let i = 0; i < state.plots.length; i += 1) {
      const plot = state.plots[i];
      if (plot.tower) continue;
      context.fillStyle = PALETTE.plot;
      roundRect(context, plot.x - 30, plot.y - 30, 60, 60, 10);
      context.fill();
      context.strokeStyle = PALETTE.plotEdge;
      context.lineWidth = 2;
      context.setLineDash([6, 5]);
      roundRect(context, plot.x - 30, plot.y - 30, 60, 60, 10);
      context.stroke();
      context.setLineDash([]);
      text('+', plot.x, plot.y + 8, 26, PALETTE.muted, 'center');
    }
  }

  function drawBloom(state, t) {
    const pulse = 1 + Math.sin(t * 2.4) * 0.06;
    const glow = context.createRadialGradient(BLOOM.x, BLOOM.y, 10, BLOOM.x, BLOOM.y, 90 * pulse);
    glow.addColorStop(0, 'rgba(255, 111, 165, 0.5)');
    glow.addColorStop(1, 'rgba(255, 111, 165, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(BLOOM.x, BLOOM.y, 90 * pulse, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.bloom;
    for (let p = 0; p < 8; p += 1) {
      const a = (p / 8) * Math.PI * 2 + t * 0.2;
      context.beginPath();
      context.ellipse(BLOOM.x + Math.cos(a) * 30, BLOOM.y + Math.sin(a) * 30, 16, 10, a, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.bloomCore;
    context.beginPath();
    context.arc(BLOOM.x, BLOOM.y, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#7a2e4a';
    context.beginPath();
    context.arc(BLOOM.x - 6, BLOOM.y - 3, 2.5, 0, Math.PI * 2);
    context.arc(BLOOM.x + 6, BLOOM.y - 3, 2.5, 0, Math.PI * 2);
    context.fill();
    if (state.phase === 'build' || state.phase === 'play') {
      text('HEARTBLOOM', BLOOM.x, BLOOM.y - 62, 15, PALETTE.text, 'center', '700');
    }
  }

  function drawTower(tower) {
    const def = TOWERS[tower.type];
    const { x, y } = tower;
    if (tower.type === 'sun') {
      context.fillStyle = '#e8a91c';
      for (let p = 0; p < 8; p += 1) {
        const a = (p / 8) * Math.PI * 2;
        context.beginPath();
        context.arc(x + Math.cos(a) * 20, y + Math.sin(a) * 20, 8, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = def.color;
      context.beginPath();
      context.arc(x, y, 15, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#7a4a00';
      context.beginPath();
      context.arc(x - 5, y - 2, 2, 0, Math.PI * 2);
      context.arc(x + 5, y - 2, 2, 0, Math.PI * 2);
      context.fill();
    } else if (tower.type === 'thorn') {
      context.fillStyle = '#2f9e44';
      context.beginPath();
      context.arc(x, y, 22, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#b7f5c0';
      context.lineWidth = 3;
      for (let p = 0; p < 8; p += 1) {
        const a = (p / 8) * Math.PI * 2;
        context.beginPath();
        context.moveTo(x + Math.cos(a) * 14, y + Math.sin(a) * 14);
        context.lineTo(x + Math.cos(a) * 28, y + Math.sin(a) * 28);
        context.stroke();
      }
      context.fillStyle = def.color;
      context.beginPath();
      context.arc(x, y, 9, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillStyle = '#2b7ea6';
      context.beginPath();
      context.moveTo(x, y - 26);
      context.lineTo(x + 18, y + 8);
      context.lineTo(x + 10, y + 20);
      context.lineTo(x - 10, y + 20);
      context.lineTo(x - 18, y + 8);
      context.closePath();
      context.fill();
      context.fillStyle = def.color;
      context.beginPath();
      context.moveTo(x, y - 16);
      context.lineTo(x + 10, y + 6);
      context.lineTo(x - 10, y + 6);
      context.closePath();
      context.fill();
    }
    if (tower.flash > 0) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(x, y, 28, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawGrub(g, t) {
    const wobble = Math.sin(t * 6 + g.x * 0.05) * 2;
    const color = g.boss ? PALETTE.boss : PALETTE.grub;
    const dark = g.boss ? '#5b1a8a' : PALETTE.grubDark;
    context.fillStyle = color;
    context.beginPath();
    context.arc(g.x, g.y + wobble, g.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = dark;
    context.beginPath();
    context.arc(g.x - g.radius * 0.35, g.y + wobble - g.radius * 0.3, g.radius * 0.45, 0, Math.PI * 2);
    context.arc(g.x + g.radius * 0.35, g.y + wobble - g.radius * 0.3, g.radius * 0.45, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.grubEye;
    context.beginPath();
    context.arc(g.x - 6, g.y + wobble - 2, 4, 0, Math.PI * 2);
    context.arc(g.x + 6, g.y + wobble - 2, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1d1426';
    context.beginPath();
    context.arc(g.x - 6, g.y + wobble - 2, 2, 0, Math.PI * 2);
    context.arc(g.x + 6, g.y + wobble - 2, 2, 0, Math.PI * 2);
    context.fill();
    if (g.slow > 0) {
      context.strokeStyle = 'rgba(125, 215, 247, 0.9)';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(g.x, g.y + wobble, g.radius + 3, 0, Math.PI * 2);
      context.stroke();
    }
    if (g.hp < g.maxHp) {
      const w = g.boss ? 64 : 34;
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(g.x - w / 2, g.y - g.radius - 12, w, 6);
      context.fillStyle = g.boss ? '#c77dff' : '#ff5d73';
      context.fillRect(g.x - w / 2, g.y - g.radius - 12, w * Math.max(0, g.hp / g.maxHp), 6);
    }
  }

  function drawShots(state) {
    for (const s of state.shots) {
      if (!s.active) continue;
      context.fillStyle = '#ffe066';
      context.beginPath();
      context.arc(s.x, s.y, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff3b0';
      context.beginPath();
      context.arc(s.x, s.y, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.max);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      if (!f.active) continue;
      context.globalAlpha = Math.min(1, f.life / 0.4);
      text(f.text, f.x, f.y, 18, '#ffffff', 'center', '700');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state) {
    context.fillStyle = 'rgba(10, 26, 17, 0.82)';
    context.fillRect(0, 0, FIELD.width, 52);
    context.textBaseline = 'top';
    text(`SCORE ${state.score}`, 20, 14, 26, PALETTE.text, 'left', '700');
    text(`GOLD ${state.gold}`, 300, 14, 26, PALETTE.gold, 'left', '700');
    text(`WAVE ${Math.max(1, state.wave)}/${MAX_WAVE}`, 560, 14, 26, PALETTE.text, 'left', '700');
    if (state.phase === 'play') {
      const done = state.waveTotal - state.spawnLeft;
      const alive = state.grubs.reduce((n, g) => n + (g.active ? 1 : 0), 0);
      const left = state.spawnLeft + alive;
      text(`GRUBS ${left}`, 780, 14, 22, PALETTE.muted, 'left');
    }
    let hearts = '';
    for (let i = 0; i < LIVES; i += 1) hearts += i < state.lives ? HEART : '♡';
    text(hearts, FIELD.width - 20, 12, 26, PALETTE.heart, 'right');
    if (state.combo >= 2) {
      text(`COMBO x${Math.min(state.combo, 5)}`, FIELD.width - 150, 14, 22, '#ff9f1c', 'right', '700');
    }
    // Wave progress bar.
    if (state.phase === 'play' && state.waveTotal > 0) {
      const cleared = state.waveTotal - state.spawnLeft - state.grubs.reduce((n, g) => n + (g.active ? 1 : 0), 0);
      const frac = Math.max(0, Math.min(1, cleared / state.waveTotal));
      context.fillStyle = 'rgba(255,255,255,0.18)';
      context.fillRect(20, 44, 300, 6);
      context.fillStyle = PALETTE.gold;
      context.fillRect(20, 44, 300 * frac, 6);
    }
  }

  function drawShop(state) {
    context.fillStyle = 'rgba(10, 26, 17, 0.85)';
    context.fillRect(0, SHOP.y, FIELD.width, SHOP.height);
    const totalW = TOWER_ORDER.length * SHOP.cardW + (TOWER_ORDER.length - 1) * SHOP.gap;
    let x = (FIELD.width - totalW) / 2;
    for (const type of TOWER_ORDER) {
      const def = TOWERS[type];
      const afford = state.gold >= def.cost;
      const selected = state.selected === type;
      context.fillStyle = selected ? 'rgba(255, 209, 102, 0.25)' : 'rgba(255,255,255,0.06)';
      roundRect(context, x, SHOP.y + 8, SHOP.cardW, 56, 10);
      context.fill();
      context.strokeStyle = selected ? PALETTE.gold : 'rgba(255,255,255,0.18)';
      context.lineWidth = selected ? 3 : 1;
      roundRect(context, x, SHOP.y + 8, SHOP.cardW, 56, 10);
      context.stroke();
      context.globalAlpha = afford ? 1 : 0.45;
      text(`[${def.key}] ${def.name}`, x + 16, SHOP.y + 20, 20, def.color, 'left', '700');
      text(`${def.cost} gold — ${def.desc}`, x + 16, SHOP.y + 46, 15, PALETTE.text, 'left');
      context.globalAlpha = 1;
      x += SHOP.cardW + SHOP.gap;
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2 - 20;
    context.fillStyle = 'rgba(6, 18, 12, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    roundRect(context, x, y, width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 72, 46, accent || PALETTE.text, 'center', '800');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + 122 + i * 34, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 30, 22, PALETTE.gold, 'center', '700');
  }

  /** Paint one frame: field, towers, grubs, HUD/shop, then a panel for the screen. */
  function draw(state, screen, best, t) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawGrass(t);
    drawPath();
    drawPlots(state);
    drawBloom(state, t);
    for (const tower of state.towers) drawTower(tower);
    for (const g of state.grubs) if (g.active) drawGrub(g, t);
    drawShots(state);
    drawParticles(state);
    drawFloats(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('BLOOMGUARD', [
        'Blight grubs march on the Heartbloom. Plant defenders,',
        'hold all 10 waves, and keep the garden alive.',
        `Best score: ${best}`,
      ], 'Press Space or click to start');
      return;
    }
    drawHud(state);
    drawShop(state);
    if (screen === SCREEN_BUILD) {
      context.fillStyle = 'rgba(6, 18, 12, 0.55)';
      context.fillRect(0, 52, FIELD.width, 120);
      text(`Wave ${state.wave} cleared!  +${30 + 10 * state.wave} gold`, FIELD.width / 2, 92, 30, PALETTE.gold, 'center', '800');
      text('Plant towers, then press Space for the next wave', FIELD.width / 2, 130, 21, PALETTE.text, 'center');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The grubs will wait for you.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The garden fell…', [
        `Score ${state.score}   •   Best ${best}   •   Wave ${state.wave}/${MAX_WAVE}`,
        `${state.kills} grubs popped`,
      ], 'Press Space or click to play again', PALETTE.danger);
    } else if (screen === SCREEN_WIN) {
      drawPanel('THE GARDEN BLOOMS!', [
        `Score ${state.score}   •   Best ${best}`,
        `All 10 waves held   •   ${state.kills} grubs popped`,
      ], 'Press Space or click to play again', PALETTE.bloom);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField, shop: SHOP, towerOrder: TOWER_ORDER };
}
