// The player: Jace Moreno, wheelman for Lena Cruz's crew. On foot he walks
// and runs, aims with the mouse and shoots or punches; in a car he drives
// it. E steals the nearest car (or steps out), and a stolen car with a
// driver in it is a crime the police notice.

import { CAR, PLAYER } from './config.js';
import { resolveBuildingCollision } from './city.js';
import { damageCar, nearestCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,
    speed: 0,
    health: PLAYER.maxHealth,
    money: 0,
    inCar: null,
    ammo: PLAYER.magSize,
    reloadTimer: 0,
    invulnerable: 0,
    meleeTimer: 0,
    meleeAngle: 0,
    radius: PLAYER.radius,
    dead: false,
    busted: false,
    wasted: false,
    regenTimer: 0,
  };
}

/** Move on foot. axes: {x, y, run}; returns nothing, mutates player. */
export function updatePlayerOnFoot(world, player, axes, dt) {
  const speed = axes.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let dx = axes.x;
  let dy = axes.y;
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    player.angle = Math.atan2(dy, dx);
    player.x += dx * speed * dt;
    player.y += dy * speed * dt;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  player.x = Math.max(130, Math.min(3180, player.x));
  player.y = Math.max(70, Math.min(2380, player.y));
  resolveBuildingCollision(world.city, player);
  if (player.reloadTimer > 0) player.reloadTimer -= dt;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  if (player.meleeTimer > 0) player.meleeTimer -= dt;
  // Slow health regen out of trouble.
  player.regenTimer += dt;
  if (player.regenTimer > 1 && player.health > 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 2);
    player.regenTimer = 0;
  }
}

/** Try to enter (or steal) the nearest car; returns the car or null. */
export function tryEnterCar(world, player) {
  const car = nearestCar(world, player.x, player.y, 56);
  if (!car) return null;
  player.inCar = car;
  player.x = car.x;
  player.y = car.y;
  car.isTraffic = false;
  if (car.driver) car.driver = null;
  // Stealing any car is a crime — once per car, so getting back into the
  // car you already stole does not raise the heat again.
  if (!car.stolen) {
    car.stolen = true;
    world.addWanted(1, 'stole a car');
    world.say('Stolen! The police will be looking for this car.');
  }
  return car;
}

/** Step out of the car onto the nearest free sidewalk spot. */
export function exitCar(world, player) {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  car.speed *= 0.3;
  const side = car.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 30;
  player.y = car.y + Math.sin(side) * 30;
  player.angle = car.angle;
  if (world.city && resolveBuildingCollision(world.city, player)) {
    player.x = car.x - Math.cos(side) * 30;
    player.y = car.y - Math.sin(side) * 30;
    resolveBuildingCollision(world.city, player);
  }
}

export function damagePlayer(world, player, amount) {
  if (player.invulnerable > 0 || player.dead) return;
  player.health -= amount;
  player.invulnerable = 0.35;
  world.shake(0.35);
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
    if (world.wanted > 0) {
      player.busted = true;
      world.sound.busted();
    } else {
      player.wasted = true;
      world.sound.busted();
    }
  }
}

/** A car ramming the player on foot: damage and a shove. */
export function carHitsPlayer(world, player, car) {
  const speed = Math.abs(car.speed);
  if (speed < 60) return;
  damagePlayer(world, player, Math.min(30, 6 + speed / 25));
  const dx = player.x - car.x;
  const dy = player.y - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  player.x += (dx / dist) * 26;
  player.y += (dy / dist) * 26;
  resolveBuildingCollision(world.city, player);
  damageCar(world, car, 4);
}
