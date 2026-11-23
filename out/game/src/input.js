// Keyboard and pointer input. Held keys give movement and driving axes;
// one-shot presses (enter car, shoot, reload, pause, accept) are queued as
// bit flags and taken once by the loop, so a press between two frames is
// never lost and never counted twice. The mouse aim is tracked in screen
// space and converted to world space by the loop.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_RELOAD = 16;
export const ACTION_MELEE = 32;
export const ACTION_MUTE = 64;
export const ACTION_MISSION = 128;
export const ACTION_CONTINUE = 256;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let transform = null;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'KeyR') actions |= ACTION_RELOAD;
    else if (event.code === 'KeyF') actions |= ACTION_MELEE;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'KeyC') actions |= ACTION_CONTINUE;
    else if (event.code === 'Tab') {
      actions |= ACTION_MISSION;
      event.preventDefault();
    }
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || event.code === 'Space') {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    if (event.button === 0) actions |= ACTION_SHOOT;
    else actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  return {
    /** -1/0/1 on each axis from the held movement keys. */
    axes() {
      // Scan the held set once for the movement axes.
      let ax = 0;
      let ay = 0;
      for (const code of keys) {
        if (RIGHT.has(code)) ax += 1;
        else if (LEFT.has(code)) ax -= 1;
        else if (DOWN.has(code)) ay += 1;
        else if (UP.has(code)) ay -= 1;
      }
      return { x: ax, y: ay, run: [...keys].some((k) => RUN.has(k)) };
    },
    get mouseDown() {
      return mouseDown;
    },
    /** True while the named key (event.code) is held down. */
    held(code) {
      return keys.has(code);
    },
    mouse() {
      if (!transform) return { x: mouseX, y: mouseY };
      const t = transform();
      const ratio = t.ratio || 1;
      return {
        x: (mouseX * ratio - t.ox) / t.scale,
        y: (mouseY * ratio - t.oy) / t.scale,
      };
    },
    /** Convert raw canvas (CSS) mouse coordinates into logical game
     * coordinates. `fn` returns {scale, ox, oy} in device pixels plus the
     * device pixel ratio. */
    setTransform(fn) {
      transform = fn;
    },
    /** Queued one-shot actions without clearing them. */
    peekActions() {
      return actions;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
