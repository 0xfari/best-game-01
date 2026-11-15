// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, build, play, paused, game over and win.
//
// ?seed=N fixes the grub pattern. ?shot=start|play|surge|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, FIELD, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { EVENT_HURT, EVENT_KILL, EVENT_OVER, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN, createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_TOWER_1, ACTION_TOWER_2, ACTION_TOWER_3, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_BUILD, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, world.state.elapsed);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastShootSound = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.phase = SCREEN_BUILD;
    accumulator = 0;
    screen = SCREEN_BUILD;
    announce('Bloomguard. Plant towers, then press Space for wave 1.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won ? `Victory! Score ${world.state.score}. Best ${best}.` : `Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function playEvents(events) {
    const now = performance.now();
    if (events & EVENT_SHOOT && now - lastShootSound > 90) {
      lastShootSound = now;
      audio.shoot();
    }
    if (events & EVENT_KILL) audio.pop();
    if (events & EVENT_HURT) audio.hurt();
    if (events & EVENT_WAVE_CLEAR) audio.horn();
    if (events & EVENT_WIN) {
      audio.win();
      endGame(true);
    } else if (events & EVENT_OVER) {
      endGame(false);
    }
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    const field = renderer.toField(click.x, click.y, click.rect);
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) {
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_BUILD && screen !== SCREEN_PLAY) return;
    // Shop bar: pick a tower type.
    if (field.y >= 648) {
      const order = renderer.towerOrder;
      const totalW = order.length * 300 + (order.length - 1) * 16;
      const x0 = (FIELD.width - totalW) / 2;
      for (let i = 0; i < order.length; i += 1) {
        if (field.x >= x0 + i * 316 && field.x <= x0 + i * 316 + 300) {
          world.state.selected = order[i];
          return;
        }
      }
      return;
    }
    // A garden plot: plant the selected tower there.
    let nearest = -1;
    let nearestD = 40;
    for (let i = 0; i < world.state.plots.length; i += 1) {
      const plot = world.state.plots[i];
      const d = Math.hypot(field.x - plot.x, field.y - plot.y);
      if (d < nearestD) { nearestD = d; nearest = i; }
    }
    if (nearest >= 0 && world.plant(nearest)) audio.place();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_TOWER_1) world.state.selected = 'sun';
    if (actions & ACTION_TOWER_2) world.state.selected = 'thorn';
    if (actions & ACTION_TOWER_3) world.state.selected = 'frost';
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_BUILD) {
        if (world.startWave()) {
          screen = SCREEN_PLAY;
          audio.horn();
          announce(`Wave ${world.state.wave} of 10.`);
        }
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY || screen === SCREEN_BUILD) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, true);
      return;
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_BUILD) {
      const events = world.step(STEP, false);
      if (world.state.phase === 'build' && screen === SCREEN_PLAY) screen = SCREEN_BUILD;
      playEvents(events);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClick();
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_BUILD) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY || screen === SCREEN_BUILD)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, world.state.elapsed);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (screen === SCREEN_PLAY || screen === SCREEN_BUILD)) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Bloomguard. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
