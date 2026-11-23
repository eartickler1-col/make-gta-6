// Saving: the player's money, story progress and position live in
// localStorage (this browser only). Continue resumes where the last visit
// ended; a fresh start wipes it.

import { SAVE_KEY } from './config.js';

export function saveGame(world) {
  try {
    const data = {
      money: world.player.money,
      missionsDone: world.missions.done,
      missionIndex: world.missions.index,
      x: world.player.x,
      y: world.player.y,
      health: world.player.health,
      storyDone: world.storyDone,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

/** Apply a loaded save to a fresh world. */
export function applySave(world, data) {
  world.player.money = data.money || 0;
  world.money = world.player.money;
  world.player.health = data.health || 100;
  world.player.x = data.x ?? world.player.x;
  world.player.y = data.y ?? world.player.y;
  world.missions.done = Array.isArray(data.missionsDone) ? data.missionsDone : [];
  world.missions.index = typeof data.missionIndex === 'number' ? data.missionIndex : 0;
  world.storyDone = !!data.storyDone;
}
