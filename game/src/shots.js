// The screenshot scenes behind ?shot=start|play|surge|end. Each one plays the real rules
// forward from a fresh world, steered by a simple autopilot (plant the best towers on the
// plots nearest the path, start each wave as soon as the garden is ready), so the frame
// is what a real game looks like and the same seed always gives the same frame.
import { FIELD, PATH, PLOTS, STEP } from './config.js';
import { SCREEN_BUILD, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** Distance from a point to one path segment. */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Plots ordered by closeness to the path: the best places to plant. */
function plotPriority() {
  return PLOTS.map((p, i) => {
    let best = Infinity;
    for (let s = 1; s < PATH.length; s += 1) best = Math.min(best, segDist(p.x, p.y, PATH[s - 1].x, PATH[s - 1].y, PATH[s].x, PATH[s].y));
    return { i, best };
  }).sort((a, b) => a.best - b.best).map((o) => o.i);
}

const PLOT_ORDER = plotPriority();
const TYPE_ROTATION = ['sun', 'sun', 'frost', 'sun', 'thorn', 'sun', 'frost', 'thorn', 'sun', 'sun', 'frost', 'thorn', 'sun'];

/** Plant what the garden can afford, then start the next wave when there is one. */
export function autopilot(world) {
  const s = world.state;
  if (s.phase === 'title') return;
  let planted = 0;
  for (let k = 0; k < PLOT_ORDER.length && planted < 2; k += 1) {
    const plotIndex = PLOT_ORDER[k];
    if (s.plots[plotIndex].tower) continue;
    const type = TYPE_ROTATION[k % TYPE_ROTATION.length];
    s.selected = type;
    if (world.plant(plotIndex)) planted += 1;
    else break;
  }
  if (s.phase === 'build') world.startWave();
}

/**
 * Play the real game forward until the named scene is reached. Returns the screen to
 * draw over it and the best score to show. Caps the simulation so a scene always returns.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'surge' && name !== 'end') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const targetWave = name === 'play' ? 4 : name === 'surge' ? 8 : 10;
  const cap = name === 'end' ? 3600 : 1800;
  let sinceWave = 0;
  let lastWave = 0;
  for (let i = 0; i < cap / STEP; i += 1) {
    const s = world.state;
    if (s.phase === 'title') { s.phase = 'build'; }
    if (s.phase === 'build') autopilot(world);
    else if (s.phase === 'play' && i % 15 === 0) autopilot(world);
    world.step(STEP, false);
    if (s.wave !== lastWave) { lastWave = s.wave; sinceWave = 0; } else sinceWave += STEP;
    if (s.phase === 'over') break;
    if (s.phase === 'win') break;
    if (name === 'play' && s.phase === 'play' && s.wave === targetWave && sinceWave > 8) break;
    if (name === 'surge' && s.phase === 'play' && s.wave === targetWave) {
      let active = 0;
      for (const g of s.grubs) if (g.active) active += 1;
      if (active >= 8 && sinceWave > 14) break;
    }
  }
  const s = world.state;
  if (s.phase === 'win') return { screen: SCREEN_WIN, best: s.score };
  if (s.phase === 'over') return { screen: SCREEN_OVER, best: s.score };
  if (s.phase === 'build') return { screen: SCREEN_BUILD, best: s.score };
  return { screen: SCREEN_PLAY, best: s.score };
}
