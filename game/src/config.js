// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The serpentine path the grubs walk, from the left edge to the Heartbloom. */
export const PATH = [
  { x: -40, y: 130 },
  { x: 1060, y: 130 },
  { x: 1060, y: 360 },
  { x: 220, y: 360 },
  { x: 220, y: 600 },
  { x: 1140, y: 600 },
];

/** The Heartbloom the grubs are marching toward: the thing the player protects. */
export const BLOOM = { x: 1140, y: 600, radius: 46 };

/** Garden beds where towers may be planted (never on the path). */
export const PLOTS = [
  { x: 300, y: 210 }, { x: 520, y: 210 }, { x: 740, y: 210 }, { x: 940, y: 210 },
  { x: 420, y: 440 }, { x: 640, y: 440 }, { x: 860, y: 440 },
  { x: 340, y: 520 }, { x: 560, y: 520 }, { x: 780, y: 520 }, { x: 980, y: 520 },
  { x: 120, y: 210 }, { x: 120, y: 440 },
];

export const LIVES = 3;
export const START_GOLD = 160;
export const MAX_WAVE = 10;
export const KILL_GOLD = 8;
export const BOSS_GOLD = 100;

export const TOWERS = {
  sun: { key: '1', name: 'Sunspitter', cost: 60, range: 170, damage: 12, rate: 1.5, color: '#ffc93c', desc: 'Shoots seeds at grubs' },
  thorn: { key: '2', name: 'Thornwall', cost: 40, range: 95, damage: 8, rate: 2.2, color: '#7ee081', desc: 'Thorns slash grubs nearby' },
  frost: { key: '3', name: 'Frostbloom', cost: 90, range: 150, damage: 3, rate: 1.0, color: '#7dd7f7', desc: 'Chills grubs, slows them' },
};

export const GRUB = {
  radius: 17,
  baseHp: 26,
  hpPerWave: 20,
  baseSpeed: 54,
  speedPerWave: 4,
  maxSpeed: 110,
};

export const BOSS = { radius: 34, hp: 2000, speed: 26, hearts: 2, gold: BOSS_GOLD, score: 500 };

/** A kill within this many seconds of the last one extends the combo. */
export const COMBO_WINDOW = 2.0;

export const PALETTE = {
  backdrop: '#0d1f16',
  grassA: '#1d5c33',
  grassB: '#256b3c',
  path: '#c9a35f',
  pathEdge: '#a9853f',
  plot: '#2e7d46',
  plotEdge: '#57a773',
  bloom: '#ff6fa5',
  bloomCore: '#ffd166',
  grub: '#5b4a8a',
  grubDark: '#3e3160',
  grubEye: '#ffffff',
  boss: '#8a2be2',
  sun: '#ffc93c',
  thorn: '#7ee081',
  frost: '#7dd7f7',
  panel: '#10281a',
  panelEdge: '#3a7d54',
  text: '#f2f7ee',
  muted: '#a8c3ae',
  gold: '#ffd166',
  heart: '#ff5d73',
  danger: '#ff5d5d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'bloomguard.best';
