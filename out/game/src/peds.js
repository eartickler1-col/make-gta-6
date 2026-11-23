// Pedestrians: the city's foot traffic. They stroll the sidewalks, turn at
// intersections, and run from gunfire, explosions and speeding cars. A
// pedestrian the player hits or shoots raises the wanted level.

import { AVENUES, PALETTE, ROAD_W, STREETS, WORLD_H, WORLD_W } from './config.js';
import { chance, pick, range } from './random.js';

const SHIRT_COLORS = ['#e8e8e8', '#d94f3d', '#3d7dd9', '#e8b93c', '#5fa08a', '#b85c9a', '#8a8f96', '#2e2e34'];

export function createPed(random, x, y) {
  return {
    x, y,
    angle: range(random, 0, Math.PI * 2),
    speed: range(random, 28, 52),
    shirt: pick(random, SHIRT_COLORS),
    radius: 9,
    state: 'walk', // 'walk' | 'flee'
    fleeX: 0,
    fleeY: 0,
    fleeTimer: 0,
    walkTimer: range(random, 2, 6),
    targetX: x,
    targetY: y,
    dead: false,
    deadTimer: 0,
  };
}

function randomSidewalkSpot(random) {
  if (chance(random, 0.5)) {
    const avenue = pick(random, AVENUES);
    return { x: avenue + (chance(random, 0.5) ? 1 : -1) * (ROAD_W / 2 + 8), y: range(random, 100, WORLD_H - 100) };
  }
  const street = pick(random, STREETS);
  return { x: range(random, 220, WORLD_W - 100), y: street + (chance(random, 0.5) ? 1 : -1) * (ROAD_W / 2 + 8) };
}

export function spawnPeds(world, count) {
  for (let i = 0; i < count; i += 1) {
    const spot = randomSidewalkSpot(world.random);
    world.peds.push(createPed(world.random, spot.x, spot.y));
  }
}

export function scarePeds(world, x, y, radius) {
  for (const ped of world.peds) {
    if (ped.dead) continue;
    const dist = Math.hypot(ped.x - x, ped.y - y);
    if (dist < radius) {
      ped.state = 'flee';
      ped.fleeX = x;
      ped.fleeY = y;
      ped.fleeTimer = 2.5;
    }
  }
}

function walkStep(world, ped, dt) {
  ped.walkTimer -= dt;
  if (ped.walkTimer <= 0) {
    // Pick a new direction along the road grid.
    const alongX = chance(world.random, 0.5);
    const dir = chance(world.random, 0.5) ? 1 : -1;
    if (alongX) {
      ped.targetX = ped.x + dir * range(world.random, 120, 320);
      ped.targetY = ped.y;
    } else {
      ped.targetX = ped.x;
      ped.targetY = ped.y + dir * range(world.random, 120, 320);
    }
    ped.walkTimer = range(world.random, 3, 7);
  }
  const dx = ped.targetX - ped.x;
  const dy = ped.targetY - ped.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 4) {
    ped.angle = Math.atan2(dy, dx);
    ped.x += (dx / dist) * ped.speed * dt;
    ped.y += (dy / dist) * ped.speed * dt;
  }
  ped.x = Math.max(150, Math.min(WORLD_W - 40, ped.x));
  ped.y = Math.max(80, Math.min(WORLD_H - 40, ped.y));
}

function fleeStep(world, ped, dt) {
  ped.fleeTimer -= dt;
  if (ped.fleeTimer <= 0) {
    ped.state = 'walk';
    ped.walkTimer = 0;
    return;
  }
  const dx = ped.x - ped.fleeX;
  const dy = ped.y - ped.fleeY;
  const dist = Math.hypot(dx, dy) || 1;
  ped.angle = Math.atan2(dy, dx);
  const runSpeed = ped.speed * 2.4;
  ped.x += (dx / dist) * runSpeed * dt;
  ped.y += (dy / dist) * runSpeed * dt;
  ped.x = Math.max(150, Math.min(WORLD_W - 40, ped.x));
  ped.y = Math.max(80, Math.min(WORLD_H - 40, ped.y));
}

export function updatePeds(world, dt) {
  for (const ped of world.peds) {
    if (ped.dead) {
      ped.deadTimer += dt;
      continue;
    }
    if (ped.state === 'flee') fleeStep(world, ped, dt);
    else walkStep(world, ped, dt);
  }
  // The dead are cleared after a while; the city tops the living back up.
  world.peds = world.peds.filter((p) => !p.dead || p.deadTimer < 8);
  const alive = world.peds.filter((p) => !p.dead).length;
  if (alive < 20) spawnPeds(world, 1);
}
