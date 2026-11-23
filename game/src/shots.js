// The screenshot scenes behind ?shot=chase|drive|foot|mission. Each one
// builds a real game state with the game's own systems — spawn the cars,
// start the mission, set the wanted level — then steps the simulation
// forward with a scripted driver, so the frame is what real play looks
// like and the same seed always gives the same frame.

import { PALETTE } from './config.js';
import { createCar, spawnParkedCar } from './vehicles.js';
import { createEnemy } from './combat.js';
import { startMission } from './missions.js';
import { addWanted } from './police.js';
import { stepWorld } from './game.js';

const STEP = 1 / 60;

/** A scripted stand-in for the live input: fixed axes, no actions. */
function scriptedInput(axes, mouseDown = false) {
  return {
    axes() {
      return { x: axes.x ?? 0, y: axes.y ?? 0, run: false };
    },
    mouse() {
      return { x: 640, y: 400 };
    },
    get mouseDown() {
      return mouseDown;
    },
    held() {
      return false;
    },
    takeActions() {
      return 0;
    },
  };
}

function placePlayerInCar(world, x, y, angle, speed) {
  const car = spawnParkedCar(world, x, y, angle);
  car.speed = speed;
  world.player.inCar = car;
  world.player.x = car.x;
  world.player.y = car.y;
  world.player.angle = angle;
  car.isTraffic = false;
  return car;
}

function placeCop(world, x, y, angle) {
  const car = createCar(x, y, angle, PALETTE.copCar, { isCop: true, isTraffic: false });
  car.speed = 300;
  world.cars.push(car);
  world.cops.push(car);
  return car;
}

/**
 * Set `world` to the named scene and step it forward so it is alive.
 * Returns the screen the renderer should draw over it.
 */
export function stageShot(name, world) {
  const player = world.player;
  if (name === 'chase') {
    // The cover: a three-star police chase through Downtown, mid-mission.
    world.missions.index = 2;
    startMission(world);
    const car = placePlayerInCar(world, 1500, 900, 0, 260);
    placeCop(world, 1380, 900, 0);
    placeCop(world, 1420, 860, 0.3);
    placeCop(world, 1440, 950, -0.3);
    addWanted(world, 0, '');
    world.wanted = 3;
    world.crimeTimer = 0;
    for (let i = 0; i < 40; i += 1) {
      stepWorld(world, scriptedInput({ x: 0, y: -1 }), STEP);
    }
    void car;
    return 'play';
  }
  if (name === 'drive') {
    // Cruising Downtown in a stolen car, traffic around, no heat.
    placePlayerInCar(world, 1160, 1160, Math.PI / 2, 240);
    for (let i = 0; i < 70; i += 1) {
      stepWorld(world, scriptedInput({ x: 0, y: -1 }), STEP);
    }
    return 'play';
  }
  if (name === 'mission') {
    // Mission two: on foot in Old Town at the package marker, a Vulture
    // gunman watching the drop.
    world.missions.index = 1;
    startMission(world);
    player.x = 2420;
    player.y = 480;
    player.angle = 0;
    world.enemies.push(createEnemy(2560, 420, 70));
    world.enemies.push(createEnemy(2430, 560, 70));
    for (let i = 0; i < 30; i += 1) {
      stepWorld(world, scriptedInput({ x: 0, y: 0 }), STEP);
    }
    return 'play';
  }
  // 'foot' (and any other name): on foot on the Marina boardwalk.
  player.x = 320;
  player.y = 1180;
  player.angle = 0;
  for (let i = 0; i < 30; i += 1) {
    stepWorld(world, scriptedInput({ x: 0, y: 0 }), STEP);
  }
  return 'play';
}
