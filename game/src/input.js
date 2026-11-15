// Keyboard and pointer input. One-shot presses (start a wave, pause, restart, pick a
// tower) are queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. Pointer clicks carry their position.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_TOWER_1 = 4;
export const ACTION_TOWER_2 = 8;
export const ACTION_TOWER_3 = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const TOWER_KEYS = { Digit1: ACTION_TOWER_1, Numpad1: ACTION_TOWER_1, Digit2: ACTION_TOWER_2, Numpad2: ACTION_TOWER_2, Digit3: ACTION_TOWER_3, Numpad3: ACTION_TOWER_3 };

export function createInput(target) {
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (TOWER_KEYS[event.code]) {
      if (!event.repeat) actions |= TOWER_KEYS[event.code];
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: nothing held here needs it.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    click = { x: event.clientX - rect.left, y: event.clientY - rect.top, rect };
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The click since the last call, in canvas CSS pixels, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
