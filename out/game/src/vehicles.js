// Cars: traffic that drives the road grid, and the driving model for the
// car the player steals. Traffic cars stay on roads, turn at intersections
// and slow for the car ahead; the player's car uses simple arcade physics
// (accelerate, brake/reverse, steer, handbrake) with building collision.

import { AVENUES, CAR, PALETTE, ROAD_W, STREETS, WORLD_H, WORLD_W } from './config.js';
import { hitsBuilding, isOnRoad, nearestRoadPoint, resolveBuildingCollision } from './city.js';
import { chance, pick, range } from './random.js';

export function createCar(x, y, angle, color, opts = {}) {
  return {
    x, y, angle, speed: 0,
    color,
    radius: CAR.radius,
    health: opts.health ?? CAR.maxHealth,
    isCop: opts.isCop ?? false,
    isTraffic: opts.isTraffic ?? false,
    wrecked: false,
    smokeTimer: 0,
    // Traffic AI: which road it follows and which way it drives.
    road: opts.road ?? 'avenue',
    line: opts.line ?? x,
    dir: opts.dir ?? 1,
    targetSpeed: opts.targetSpeed ?? range(Math.random, 90, 150),
    turnCooldown: 0,
    brakeLight: false,
  };
}

function randomRoadCar(random) {
  const useAvenue = chance(random, 0.5);
  if (useAvenue) {
    const line = pick(random, AVENUES);
    return createCar(line + range(random, -8, 8), range(random, 100, WORLD_H - 100), chance(random, 0.5) ? Math.PI / 2 : -Math.PI / 2, pick(random, PALETTE.carColors), {
      isTraffic: true, road: 'avenue', line, dir: chance(random, 0.5) ? 1 : -1, targetSpeed: range(random, 90, 150),
    });
  }
  const line = pick(random, STREETS);
  return createCar(range(random, 200, WORLD_W - 200), line + range(random, -8, 8), chance(random, 0.5) ? 0 : Math.PI, pick(random, PALETTE.carColors), {
    isTraffic: true, road: 'street', line, dir: chance(random, 0.5) ? 1 : -1, targetSpeed: range(random, 90, 150),
  });
}

export function spawnTraffic(world, count) {
  for (let i = 0; i < count; i += 1) {
    const car = randomRoadCar(world.random);
    world.cars.push(car);
  }
}

/** A parked car the player can steal, placed on a road near (x, y). */
export function spawnParkedCar(world, x, y, angle) {
  const spot = nearestRoadPoint(x, y);
  const car = createCar(spot.x, spot.y, angle ?? 0, pick(world.random, PALETTE.carColors), { isTraffic: false });
  world.cars.push(car);
  return car;
}

function carAhead(world, car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  let best = null;
  let bestDist = 70;
  for (const other of world.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * fx + dy * fy;
    const across = Math.abs(-dx * fy + dy * fx);
    if (along > 0 && along < bestDist && across < 26) {
      bestDist = along;
      best = other;
    }
  }
  return best;
}

function atIntersection(car) {
  if (car.road === 'avenue') {
    for (const street of STREETS) if (Math.abs(car.y - street) < 14) return street;
  } else {
    for (const avenue of AVENUES) if (Math.abs(car.x - avenue) < 14) return avenue;
  }
  return null;
}

function turnAtIntersection(world, car, crossing) {
  if (car.road === 'avenue') {
    car.road = 'street';
    car.line = crossing;
    car.y = crossing + (car.dir > 0 ? -8 : 8);
    car.angle = chance(world.random, 0.5) ? 0 : Math.PI;
    car.dir = car.angle === 0 ? 1 : -1;
  } else {
    car.road = 'avenue';
    car.line = crossing;
    car.x = crossing + (car.dir > 0 ? 8 : -8);
    car.angle = chance(world.random, 0.5) ? Math.PI / 2 : -Math.PI / 2;
    car.dir = car.angle === Math.PI / 2 ? 1 : -1;
  }
  car.turnCooldown = 2;
}

function updateTrafficCar(world, car, dt) {
  if (car.wrecked) return;
  car.turnCooldown = Math.max(0, car.turnCooldown - dt);
  const ahead = carAhead(world, car);
  const want = ahead ? 0 : car.targetSpeed;
  car.speed += Math.sign(want - car.speed) * 220 * dt;
  car.speed = Math.max(0, Math.min(car.targetSpeed + 40, car.speed));
  car.brakeLight = !!ahead;
  const crossing = atIntersection(car);
  if (crossing !== null && car.turnCooldown <= 0 && chance(world.random, 0.45)) {
    turnAtIntersection(world, car, crossing);
  }
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Keep inside the world: turn around at the edges.
  if (car.x < 150 || car.x > WORLD_W - 60 || car.y < 80 || car.y > WORLD_H - 60) {
    car.angle += Math.PI;
    car.dir *= -1;
    car.x = Math.max(150, Math.min(WORLD_W - 60, car.x));
    car.y = Math.max(80, Math.min(WORLD_H - 60, car.y));
  }
  // Gentle nudge back onto its road line.
  if (car.road === 'avenue') car.x += (car.line - car.x) * 0.5 * dt;
  else car.y += (car.line - car.y) * 0.5 * dt;
}

export function updateTraffic(world, dt) {
  for (const car of world.cars) {
    if (car.isTraffic) updateTrafficCar(world, car, dt);
  }
  // Top the traffic back up so the city never feels empty.
  const alive = world.cars.filter((c) => c.isTraffic && !c.wrecked).length;
  if (alive < 12) spawnTraffic(world, 1);
}

/** Arcade driving for the car the player is in. axes: {x: steer, y: throttle}. */
export function drivePlayerCar(world, car, axes, dt, handbrake) {
  if (car.wrecked) return;
  const throttle = -axes.y; // up key = forward
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 120 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  if (handbrake) {
    car.speed -= Math.sign(car.speed) * 500 * dt;
    if (Math.abs(car.speed) < 20) car.speed = 0;
    world.skid(car.x, car.y, car.angle);
  }
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const steer = axes.x * CAR.turnRate * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  car.angle += steer;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  car.x = Math.max(120, Math.min(WORLD_W - 20, nx));
  car.y = Math.max(60, Math.min(WORLD_H - 20, ny));
  // Buildings are solid: bounce the car off them and hurt it a little.
  const before = { x: car.x, y: car.y };
  resolveBuildingCollision(world.city, car);
  if ((car.x !== before.x || car.y !== before.y) && Math.abs(car.speed) > 120) {
    car.speed *= 0.45;
    damageCar(world, car, 6);
    world.shake(0.25);
    world.sound.crash();
  }
  // Bumping traffic cars: always separate the bodies, but only take speed
  // off on a fresh impact (bumpCooldown), so pushing a slower car does not
  // glue both cars to a stop frame after frame.
  car.bumpCooldown = Math.max(0, (car.bumpCooldown || 0) - dt);
  for (const other of world.cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < CAR.radius + 15 && dist > 0) {
      const push = (CAR.radius + 15 - dist) / 2;
      const ux = dx / dist;
      const uy = dy / dist;
      other.x += ux * push;
      other.y += uy * push;
      car.x -= ux * push;
      car.y -= uy * push;
      if (car.bumpCooldown <= 0) {
        car.speed *= 0.7;
        other.speed *= 0.5;
        car.bumpCooldown = 0.3;
        if (Math.abs(car.speed) > 120) {
          world.spark(car.x + ux * 20, car.y + uy * 20);
          world.sound.crash();
        }
      }
    }
  }
}

export function damageCar(world, car, amount) {
  if (car.wrecked) return;
  car.health -= amount;
  if (car.health <= 0) {
    car.health = 0;
    car.wrecked = true;
    car.speed = 0;
    world.explosion(car.x, car.y);
    world.sound.crash();
  }
}

/** The nearest car within reach of a point (for stealing / entering). */
export function nearestCar(world, x, y, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const car of world.cars) {
    if (car.wrecked) continue;
    const dist = Math.hypot(car.x - x, car.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = car;
    }
  }
  return best;
}
