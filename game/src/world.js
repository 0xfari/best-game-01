// The game's rules and state, with no drawing and no browser in it: the garden plots and
// towers, the grubs walking the serpentine path, gold, score, combo, waves, lives and the
// win/lose conditions. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sounds, announcements) without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import { BLOOM, BOSS, COMBO_WINDOW, FIELD, GRUB, KILL_GOLD, LIVES, MAX_WAVE, PATH, PLOTS, START_GOLD, TOWERS } from './config.js';

export const EVENT_SHOOT = 1;
export const EVENT_KILL = 2;
export const EVENT_HURT = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_OVER = 16;
export const EVENT_WIN = 32;
export const EVENT_PLACE = 64;

const TOWER_TYPES = ['sun', 'thorn', 'frost'];

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function pathLength() {
  let total = 0;
  for (let i = 1; i < PATH.length; i += 1) total += dist(PATH[i - 1].x, PATH[i - 1].y, PATH[i].x, PATH[i].y);
  return total;
}

export function createWorld(random) {
  const towers = [];
  const grubs = [];
  const shots = [];
  const particles = [];
  const floats = [];
  for (let i = 0; i < 96; i += 1) grubs.push({ active: false, x: 0, y: 0, wp: 1, hp: 1, maxHp: 1, speed: 0, slow: 0, radius: GRUB.radius, boss: false, hearts: 1, gold: KILL_GOLD, score: 10 });
  for (let i = 0; i < 64; i += 1) shots.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, target: null, damage: 0, kind: 'sun' });
  for (let i = 0; i < 128; i += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 3 });
  for (let i = 0; i < 24; i += 1) floats.push({ active: false, x: 0, y: 0, life: 0, text: '' });

  const state = {
    phase: 'title', gold: START_GOLD, score: 0, lives: LIVES, wave: 0,
    combo: 0, comboTimer: 0, kills: 0, elapsed: 0, selected: 'sun',
    waveTotal: 0, waveLeft: 0, spawnLeft: 0, spawnTimer: 0, bossSpawned: false,
    towers, grubs, shots, particles, floats, plots: PLOTS.map((p) => ({ ...p, tower: null })),
  };

  function reset() {
    for (const g of grubs) g.active = false;
    for (const s of shots) s.active = false;
    for (const p of particles) p.active = false;
    for (const f of floats) f.active = false;
    for (const plot of state.plots) plot.tower = null;
    towers.length = 0;
    state.phase = 'title';
    state.gold = START_GOLD;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.kills = 0;
    state.elapsed = 0;
    state.selected = 'sun';
    state.waveTotal = 0;
    state.waveLeft = 0;
    state.spawnLeft = 0;
    state.spawnTimer = 0;
    state.bossSpawned = false;
  }

  function free(list) {
    for (let i = 0; i < list.length; i += 1) if (!list[i].active) return list[i];
    return null;
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i += 1) {
      const p = free(particles);
      if (!p) return;
      const a = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true; p.x = x; p.y = y;
      p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v - 30;
      p.life = p.max = 0.4 + random() * 0.4;
      p.color = color; p.size = 2 + random() * 4;
    }
  }

  function floatText(x, y, text) {
    const f = free(floats);
    if (!f) return;
    f.active = true; f.x = x; f.y = y; f.life = 0.9; f.text = text;
  }

  function waveHp(n) { return Math.round(GRUB.baseHp + GRUB.hpPerWave * (n - 1)); }
  function waveSpeed(n) { return Math.min(GRUB.maxSpeed, GRUB.baseSpeed + GRUB.speedPerWave * (n - 1)); }
  function waveCount(n) { return 6 + 3 * n; }

  function spawnGrub(boss) {
    const g = free(grubs);
    if (!g) return;
    g.active = true;
    g.x = PATH[0].x; g.y = PATH[0].y + (random() - 0.5) * 20;
    g.wp = 1;
    if (boss) {
      g.hp = g.maxHp = BOSS.hp; g.speed = BOSS.speed; g.radius = BOSS.radius;
      g.boss = true; g.hearts = BOSS.hearts; g.gold = BOSS.gold; g.score = BOSS.score;
    } else {
      g.hp = g.maxHp = waveHp(state.wave); g.speed = waveSpeed(state.wave);
      g.radius = GRUB.radius; g.boss = false; g.hearts = 1; g.gold = KILL_GOLD; g.score = 10;
    }
    g.slow = 0;
  }

  /** Plant the selected tower on a plot; false when the plot is taken or gold is short. */
  function plant(plotIndex) {
    const plot = state.plots[plotIndex];
    if (!plot || plot.tower) return false;
    const def = TOWERS[state.selected];
    if (state.gold < def.cost) return false;
    state.gold -= def.cost;
    const tower = { plot: plotIndex, type: state.selected, x: plot.x, y: plot.y, cooldown: 0, angle: -Math.PI / 2, flash: 0 };
    towers.push(tower);
    plot.tower = tower;
    burst(plot.x, plot.y, def.color, 10, 120);
    return true;
  }

  function startWave() {
    if (state.phase !== 'build' && state.phase !== 'title') return false;
    if (state.wave >= MAX_WAVE) return false;
    state.wave += 1;
    state.phase = 'play';
    state.waveTotal = waveCount(state.wave);
    state.waveLeft = state.waveTotal;
    state.spawnLeft = state.waveTotal;
    state.spawnTimer = 0.6;
    state.bossSpawned = false;
    return true;
  }

  function killGrub(g, events) {
    g.active = false;
    state.kills += 1;
    state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
    state.comboTimer = COMBO_WINDOW;
    const mult = Math.min(state.combo, 5);
    const gained = g.score * mult;
    state.score += gained;
    state.gold += g.gold;
    burst(g.x, g.y, g.boss ? '#c77dff' : '#b8a7e6', g.boss ? 26 : 10, g.boss ? 260 : 160);
    floatText(g.x, g.y - 20, `+${gained}`);
    return events | EVENT_KILL;
  }

  function damageGrub(g, dmg, events) {
    g.hp -= dmg;
    if (g.hp <= 0) return killGrub(g, events);
    return events;
  }

  /** One fixed step. With `harmless` set (the title screen's backdrop) grubs stroll in and
   *  melt away at the bloom: nothing scores, nothing hurts, nothing is lost. */
  function step(dt, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }

    if (harmless) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0 && state.waveLeft < 6) {
        spawnGrub(false);
        state.waveLeft += 1;
        state.spawnTimer = 1.6;
      }
    } else if (state.phase === 'play') {
      if (state.spawnLeft > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          if (state.wave === MAX_WAVE && !state.bossSpawned && state.spawnLeft === 1) {
            spawnGrub(true);
            state.bossSpawned = true;
          } else {
            spawnGrub(false);
          }
          state.spawnLeft -= 1;
          state.spawnTimer = Math.max(0.35, 0.9 - state.wave * 0.04);
        }
      }
    }

    // Towers act.
    for (const t of towers) {
      const def = TOWERS[t.type];
      if (t.cooldown > 0) t.cooldown -= dt;
      if (t.flash > 0) t.flash -= dt;
      let target = null;
      let best = -Infinity;
      for (const g of grubs) {
        if (!g.active) continue;
        const d = dist(t.x, t.y, g.x, g.y);
        if (d > def.range + g.radius) continue;
        const progress = g.wp * 1000 - dist(g.x, g.y, PATH[g.wp].x, PATH[g.wp].y);
        const key = progress - d * 0.01;
        if (key > best) { best = key; target = g; }
      }
      if (!target || t.cooldown > 0) continue;
      t.cooldown = 1 / def.rate;
      t.flash = 0.12;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      if (t.type === 'sun') {
        const s = free(shots);
        if (s) {
          s.active = true; s.x = t.x; s.y = t.y; s.target = target; s.damage = def.damage; s.kind = 'sun';
          const d = Math.max(1, dist(t.x, t.y, target.x, target.y));
          s.vx = ((target.x - t.x) / d) * 520; s.vy = ((target.y - t.y) / d) * 520;
        }
        events |= EVENT_SHOOT;
      } else if (t.type === 'thorn') {
        for (const g of grubs) {
          if (!g.active) continue;
          if (dist(t.x, t.y, g.x, g.y) <= def.range + g.radius) events = damageGrub(g, def.damage, events);
        }
        burst(t.x, t.y, def.color, 4, 90);
      } else {
        for (const g of grubs) {
          if (!g.active) continue;
          if (dist(t.x, t.y, g.x, g.y) <= def.range + g.radius) {
            g.slow = 2.0;
            events = damageGrub(g, def.damage, events);
          }
        }
        burst(t.x, t.y, def.color, 4, 70);
      }
    }

    // Seeds fly; a dead target means the seed fizzles where it is.
    for (const s of shots) {
      if (!s.active) continue;
      if (!s.target || !s.target.active) { s.active = false; continue; }
      const d = dist(s.x, s.y, s.target.x, s.target.y);
      const stepLen = 520 * dt;
      if (d <= stepLen + s.target.radius) {
        s.active = false;
        events = damageGrub(s.target, s.damage, events);
        burst(s.target.x, s.target.y, '#ffd166', 3, 80);
      } else {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
    }

    // Grubs walk the path.
    for (const g of grubs) {
      if (!g.active) continue;
      if (g.slow > 0) g.slow -= dt;
      const speed = g.speed * (g.slow > 0 ? 0.5 : 1);
      const tx = PATH[g.wp].x;
      const ty = PATH[g.wp].y;
      const d = dist(g.x, g.y, tx, ty);
      const move = speed * dt;
      if (d <= move) {
        g.x = tx; g.y = ty;
        g.wp += 1;
        if (g.wp >= PATH.length) {
          g.active = false;
          if (harmless) continue;
          state.lives -= g.hearts;
          state.combo = 0;
          state.comboTimer = 0;
          burst(BLOOM.x, BLOOM.y, '#ff5d73', 14, 180);
          events |= EVENT_HURT;
          if (state.lives <= 0) {
            state.lives = 0;
            state.phase = 'over';
            events |= EVENT_OVER;
          }
        }
      } else {
        g.x += ((tx - g.x) / d) * move;
        g.y += ((ty - g.y) / d) * move;
      }
    }

    // Particles and floating scores fade.
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
    }
    for (const f of floats) {
      if (!f.active) continue;
      f.life -= dt;
      f.y -= 34 * dt;
      if (f.life <= 0) f.active = false;
    }

    // Wave cleared: bonus gold and score, then build phase (or victory on wave 10).
    if (!harmless && state.phase === 'play' && state.spawnLeft === 0) {
      let any = false;
      for (const g of grubs) if (g.active) { any = true; break; }
      if (!any) {
        const bonus = 30 + 10 * state.wave;
        state.gold += bonus;
        state.score += 50 * state.wave;
        events |= EVENT_WAVE_CLEAR;
        if (state.wave >= MAX_WAVE) {
          state.phase = 'win';
          state.score += 1000;
          events |= EVENT_WIN;
        } else {
          state.phase = 'build';
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, plant, startWave, waveHp, waveSpeed, waveCount, pathLength: pathLength() };
}
