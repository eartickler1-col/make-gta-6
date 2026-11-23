// The game world: one object holding the city, the player, every car,
// pedestrian, cop, bullet and particle, plus the helpers the systems share
// (say, shake, explosion, pickups) and the one step function that advances
// everything a frame. main.js owns the screens and the loop; this file owns
// what a frame of play does.

import { PALETTE, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { generateCity } from './city.js';
import { createSoundEngine } from './audio.js';
import { createPlayer, carHitsPlayer, damagePlayer, exitCar, tryEnterCar, updatePlayerOnFoot } from './player.js';
import { drivePlayerCar, spawnParkedCar, spawnTraffic, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds } from './peds.js';
import { addWanted, updatePolice } from './police.js';
import { firePistol, meleeAttack, reloadPistol, updateBullets, updateEnemies } from './combat.js';
import { createMissionState, currentMission, currentObjective, missionMarker, updateMissions } from './missions.js';
import { createCamera, updateCamera } from './render.js';
import { ACTION_ENTER, ACTION_MELEE, ACTION_MUTE, ACTION_RELOAD, ACTION_SHOOT } from './input.js';
import { applySave } from './save.js';

export function createWorld(seed, saveData = null) {
  const random = createRandom(seed);
  const city = generateCity(random);
  const sound = createSoundEngine();
  const start = city.places.playerStart;
  const world = {
    random,
    city,
    sound,
    time: 0,
    seed,
    player: createPlayer(start.x, start.y),
    cars: [],
    peds: [],
    cops: [],
    bullets: [],
    enemies: [],
    pickups: [],
    particles: [],
    skids: [],
    wanted: 0,
    crimeTimer: 0,
    decayTimer: 0,
    lastCrime: '',
    shotsFired: 0,
    money: 0,
    missions: createMissionState(),
    storyDone: false,
    storyShown: false,
    marker: null,
    objectiveText: '',
    hintText: '',
    subtitle: '',
    subtitleUntil: 0,
    subtitleQueue: [],
    camera: createCamera(),
    flashTimer: 0,
    muzzle: null,
    lastMissionDone: null,
    missionToastUntil: 0,
    saveTimer: 0,
  };

  // Shared helpers the systems call back through.
  world.say = (text) => {
    world.subtitleQueue.push(text);
  };
  world.addWanted = (stars, reason) => addWanted(world, stars, reason);
  world.shake = (amount) => {
    world.camera.shake = Math.max(world.camera.shake, amount);
  };
  world.explosion = (x, y) => {
    for (let i = 0; i < 26; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      world.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color: ['#ff9a3c', '#ff5a3c', '#5a5a5a', '#ffc93c'][Math.floor(Math.random() * 4)],
      });
    }
    world.shake(0.6);
  };
  world.spark = (x, y) => {
    for (let i = 0; i < 6; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      world.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25,
        maxLife: 0.25,
        size: 1.5 + Math.random() * 2,
        color: '#ffe9a8',
      });
    }
  };
  world.skid = (x, y, angle) => {
    if (world.skids.length > 220) world.skids.shift();
    world.skids.push({ x, y, angle, life: 1 });
  };
  world.addPickup = (x, y, kind, amount) => {
    world.pickups.push({ x, y, kind, amount });
  };

  // Populate the city: traffic, pedestrians, a few parked cars to steal,
  // and cash pickups to find. Parked cars sit on the beach strip (west of
  // the Marina road), clear of traffic lanes, so stealing one is always a
  // parked car — never a passing traffic car.
  spawnTraffic(world, 14);
  spawnPeds(world, 24);
  spawnParkedCar(world, 160, 1180, 0);
  spawnParkedCar(world, 160, 700, Math.PI / 2);
  spawnParkedCar(world, 160, 1000, 0);
  spawnParkedCar(world, 160, 1500, Math.PI / 2);
  spawnParkedCar(world, 160, 1900, 0);
  for (let i = 0; i < 10; i += 1) {
    const x = 300 + Math.random() * 2600;
    const y = 200 + Math.random() * 2000;
    world.addPickup(x, y, Math.random() < 0.7 ? 'cash' : 'health', Math.random() < 0.7 ? 50 + Math.floor(Math.random() * 120) : 30);
  }
  if (saveData) applySave(world, saveData);
  return world;
}

/** Aim the player at the mouse (world coordinates). */
function aimAtMouse(world, mouse) {
  const player = world.player;
  if (player.inCar) return;
  const wx = world.camera.x + mouse.x;
  const wy = world.camera.y + mouse.y;
  player.angle = Math.atan2(wy - player.y, wx - player.x);
}

/** Handle one-shot actions. Returns true when the game should pause. */
function handleActions(world, input, dt) {
  const actions = input.takeActions();
  if (actions & ACTION_MUTE) {
    const muted = world.sound.toggleMute();
    world.say(muted ? 'Sound muted.' : 'Sound on.');
  }
  const player = world.player;
  if (actions & ACTION_ENTER) {
    if (player.inCar) exitCar(world, player);
    else {
      const car = tryEnterCar(world, player);
      if (car) world.sound.pickup();
    }
  }
  if (actions & ACTION_SHOOT) {
    const mouse = input.mouse();
    const wx = world.camera.x + mouse.x;
    const wy = world.camera.y + mouse.y;
    firePistol(world, player, wx, wy);
  }
  if (actions & ACTION_RELOAD) reloadPistol(world, player);
  if (actions & ACTION_MELEE) meleeAttack(world, player);
  return actions;
}

function collectPickups(world) {
  const player = world.player;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  for (const pickup of world.pickups) {
    if (Math.hypot(pickup.x - px, pickup.y - py) < 30) {
      if (pickup.kind === 'cash') {
        player.money += pickup.amount;
        world.money = player.money;
        world.sound.cash();
        world.say(`+$${pickup.amount} found.`);
      } else {
        player.health = Math.min(PLAYER.maxHealth, player.health + pickup.amount);
        world.sound.pickup();
        world.say('Health restored.');
      }
      pickup.taken = true;
    }
  }
  world.pickups = world.pickups.filter((p) => !p.taken);
}

function carHitsPeds(world) {
  const player = world.player;
  if (!player.inCar) return;
  const car = player.inCar;
  if (Math.abs(car.speed) < 80) return;
  for (const ped of world.peds) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 22) {
      ped.dead = true;
      ped.deadTimer = 0;
      addWanted(world, 1, 'ran over a pedestrian');
      world.sound.crash();
    }
  }
}

function updateSubtitles(world, dt) {
  if (world.subtitleUntil > world.time && world.subtitle) return;
  const next = world.subtitleQueue.shift();
  if (next) {
    world.subtitle = next;
    world.subtitleUntil = world.time + 4.5;
  } else {
    world.subtitle = '';
  }
}

function updateObjectiveLine(world) {
  const state = world.missions;
  if (state.active) {
    const objective = currentObjective(state);
    const mission = currentMission(state);
    world.objectiveText = objective ? `${mission.title}: ${objective.text}` : '';
  } else if (state.index < 4) {
    const next = currentMission(state);
    world.objectiveText = `Next job: ${next.title} — drive to the yellow marker`;
  } else {
    world.objectiveText = 'Free roam — Solara Bay is yours';
  }
  // Mission complete toast.
  if (world.lastMissionDone && world.missionToastUntil < world.time) {
    world.lastMissionDone = null;
  }
  // Contextual hint.
  const player = world.player;
  if (!player.inCar) {
    world.hintText = 'E — steal car    Click — shoot    F — punch    R — reload';
  } else {
    world.hintText = 'E — leave car    Space — handbrake    Shift — (driving)';
  }
}

/**
 * One fixed step of play. `input` is the live input (or a scripted stand-in
 * with the same shape: axes(), mouse(), mouseDown, takeActions()).
 */
export function stepWorld(world, input, dt) {
  world.time += dt;
  const player = world.player;
  const axes = input.axes();
  if (player.inCar) {
    drivePlayerCar(world, player.inCar, axes, dt, input.held ? input.held('Space') : false);
    player.x = player.inCar.x;
    player.y = player.inCar.y;
    player.angle = player.inCar.angle;
    world.sound.engine(Math.abs(player.inCar.speed) / 420);
    if (player.reloadTimer > 0) player.reloadTimer -= dt;
  } else {
    updatePlayerOnFoot(world, player, axes, dt);
    world.sound.engine(0);
    // Face the mouse while on foot.
    aimAtMouse(world, input.mouse());
    // Hold the mouse to keep shooting.
    if (input.mouseDown) {
      const mouse = input.mouse();
      firePistol(world, player, world.camera.x + mouse.x, world.camera.y + mouse.y);
    }
  }
  handleActions(world, input, dt);
  updateTraffic(world, dt);
  updatePeds(world, dt);
  updatePolice(world, dt);
  updateEnemies(world, dt);
  updateBullets(world, dt);
  updateMissions(world, dt);
  collectPickups(world);
  carHitsPeds(world);
  // Cars running over the player on foot.
  if (!player.inCar && !player.dead) {
    for (const car of world.cars) {
      if (car.wrecked || Math.abs(car.speed) < 60) continue;
      if (Math.hypot(car.x - player.x, car.y - player.y) < 24) {
        carHitsPlayer(world, player, car);
        break;
      }
    }
  }
  // Particles and skid marks fade.
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const skid of world.skids) skid.life -= dt * 0.25;
  world.skids = world.skids.filter((s) => s.life > 0);
  if (world.muzzle) {
    world.muzzle.timer -= dt;
    if (world.muzzle.timer <= 0) world.muzzle = null;
  }
  if (world.flashTimer > 0) world.flashTimer -= dt;
  // Mission marker and objective line.
  world.marker = missionMarker(world);
  updateObjectiveLine(world);
  updateSubtitles(world, dt);
  // Camera follows the player (or their car).
  updateCamera(world.camera, player.x, player.y, dt);
  // Autosave every 25 seconds of play.
  world.saveTimer += dt;
  if (world.saveTimer > 25) {
    world.saveTimer = 0;
    world.saveRequested = true;
  }
}
