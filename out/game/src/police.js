// The wanted level and the Solara Bay Police Department. Crimes raise
// stars; stars bring patrol cars that chase, ram and try to arrest the
// player. Lay low and the heat fades; get caught on foot and it is over.

import { PALETTE, POLICE, WORLD_H, WORLD_W } from './config.js';
import { nearestRoadPoint } from './city.js';
import { createCar, damageCar } from './vehicles.js';
import { carHitsPlayer } from './player.js';

/** Raise the wanted level (max 5) and note what did it. */
export function addWanted(world, stars, reason) {
  if (world.wanted >= 5) return;
  world.wanted = Math.min(5, world.wanted + stars);
  world.crimeTimer = 0;
  world.lastCrime = reason || '';
}

function spawnCopCar(world) {
  const player = world.player;
  const angle = world.random() * Math.PI * 2;
  const sx = player.x + Math.cos(angle) * POLICE.spawnDistance;
  const sy = player.y + Math.sin(angle) * POLICE.spawnDistance;
  const spot = nearestRoadPoint(
    Math.max(220, Math.min(WORLD_W - 100, sx)),
    Math.max(100, Math.min(WORLD_H - 100, sy)),
  );
  const car = createCar(spot.x, spot.y, 0, PALETTE.copCar, { isCop: true, isTraffic: false });
  car.siren = true;
  car.arrestTimer = 0;
  world.cars.push(car);
  world.cops.push(car);
  return car;
}

function steerToward(car, tx, ty, dt, turnRate) {
  const want = Math.atan2(ty - car.y, tx - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  car.angle += turn;
}

function updateCopCar(world, car, dt) {
  const player = world.player;
  if (player.dead) {
    // Nothing to chase: drive off and disappear.
    car.speed = Math.max(car.speed - 100 * dt, 0);
    if (car.speed <= 0) car.gone = true;
    return;
  }
  const targetX = player.inCar ? player.inCar.x : player.x;
  const targetY = player.inCar ? player.inCar.y : player.y;
  const dist = Math.hypot(targetX - car.x, targetY - car.y);

  if (world.wanted === 0) {
    // Heat gone: the patrol leaves.
    steerToward(car, car.x + (car.x - targetX), car.y + (car.y - targetY), dt, 2.2);
    car.speed = Math.min(car.speed + 200 * dt, 300);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (dist > 950) car.gone = true;
    return;
  }

  // Chase: steer at the player, faster with more stars.
  const chaseSpeed = Math.min(POLICE.chaseSpeed + world.wanted * 12, 470);
  steerToward(car, targetX, targetY, dt, 2.4);
  car.speed += (chaseSpeed - car.speed) * 0.8 * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(120, Math.min(WORLD_W - 20, car.x));
  car.y = Math.max(60, Math.min(WORLD_H - 20, car.y));

  if (player.inCar) {
    // Ram the player's car.
    const dx = player.inCar.x - car.x;
    const dy = player.inCar.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 40) {
      damageCar(world, player.inCar, POLICE.ramDamage * dt * 3);
      damageCar(world, car, 1.5 * dt);
      player.inCar.speed *= 0.92;
      if (Math.abs(player.inCar.speed) > 150) world.shake(0.2);
    }
    car.arrestTimer = 0;
  } else {
    // On foot: get close and hold the player to arrest them.
    if (dist < POLICE.arrestRadius) {
      car.arrestTimer += dt;
      if (car.arrestTimer >= POLICE.arrestSeconds) {
        player.health = 0;
        player.dead = true;
        player.busted = true;
        world.sound.busted();
      }
    } else {
      car.arrestTimer = Math.max(0, car.arrestTimer - dt * 2);
    }
    // A cop car that touches the player on foot hurts.
    if (dist < 30) carHitsPlayer(world, player, car);
  }
}

export function updatePolice(world, dt) {
  // Wanted decay: stay clean and out of sight and the heat fades.
  world.crimeTimer += dt;
  if (world.wanted > 0 && world.crimeTimer > 15) {
    let nearestCop = Infinity;
    for (const cop of world.cops) {
      nearestCop = Math.min(nearestCop, Math.hypot(cop.x - world.player.x, cop.y - world.player.y));
    }
    if (nearestCop > 450) {
      world.decayTimer += dt;
      if (world.decayTimer > 8) {
        world.wanted -= 1;
        world.decayTimer = 0;
        world.crimeTimer = 0;
      }
    } else {
      world.decayTimer = 0;
    }
  }

  // Keep one patrol car per star on the road.
  const want = world.wanted;
  const alive = world.cops.filter((c) => !c.gone && !c.wrecked).length;
  if (want > alive && world.cops.length < POLICE.maxCars) {
    spawnCopCar(world);
  }
  for (const cop of world.cops) updateCopCar(world, cop, dt);
  // Wrecked or departed patrol cars leave the force.
  world.cops = world.cops.filter((c) => !c.gone);
  world.cars = world.cars.filter((c) => !c.gone || !c.isCop);
  world.sound.siren(world.cops.length > 0, dt);
}
