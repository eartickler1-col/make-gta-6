// Drawing the world: ground, water and beach, the road grid, buildings
// with a little fake height, trees, and every moving thing — pedestrians,
// traffic, police, the player, bullets and particles. The camera follows
// the player (or their car) and the view is clipped to what is on screen.

import { AVENUES, DISTRICTS, PALETTE, ROAD_W, STREETS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';

export function createCamera() {
  return { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 };
}

export function updateCamera(camera, focusX, focusY, dt) {
  const tx = Math.max(0, Math.min(WORLD_W - VIEW_W, focusX - VIEW_W / 2));
  const ty = Math.max(0, Math.min(WORLD_H - VIEW_H, focusY - VIEW_H / 2));
  camera.x += (tx - camera.x) * Math.min(1, dt * 5);
  camera.y += (ty - camera.y) * Math.min(1, dt * 5);
  if (camera.shake > 0) {
    camera.shake = Math.max(0, camera.shake - dt * 2.2);
    camera.shakeX = (Math.random() * 2 - 1) * camera.shake * 9;
    camera.shakeY = (Math.random() * 2 - 1) * camera.shake * 9;
  } else {
    camera.shakeX = 0;
    camera.shakeY = 0;
  }
}

function drawGround(ctx, camera, time) {
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(camera.x - 20, camera.y - 20, VIEW_W + 40, VIEW_H + 40);
  // Water on the west edge, with slow waves.
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(camera.x - 20, camera.y - 20, 130, VIEW_H + 40);
  ctx.fillStyle = PALETTE.water;
  for (let y = 0; y < VIEW_H + 40; y += 46) {
    const wy = camera.y - 20 + y + Math.sin(time * 1.4 + y * 0.05) * 4;
    ctx.fillRect(camera.x - 20, wy, 130, 10);
  }
  // Beach.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(120, camera.y - 20, 80, VIEW_H + 40);
  // Crescent Park.
  ctx.fillStyle = PALETTE.park;
  ctx.fillRect(DISTRICTS.park.x0, DISTRICTS.park.y0, DISTRICTS.park.x1 - DISTRICTS.park.x0, DISTRICTS.park.y1 - DISTRICTS.park.y0);
  // Park pond.
  ctx.fillStyle = PALETTE.water;
  ctx.beginPath();
  ctx.ellipse(1640, 1760, 90, 55, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoads(ctx, camera) {
  ctx.fillStyle = PALETTE.sidewalk;
  for (const avenue of AVENUES) {
    ctx.fillRect(avenue - ROAD_W / 2 - 10, camera.y - 20, ROAD_W + 20, VIEW_H + 40);
  }
  for (const street of STREETS) {
    ctx.fillRect(camera.x - 20, street - ROAD_W / 2 - 10, VIEW_W + 40, ROAD_W + 20);
  }
  ctx.fillStyle = PALETTE.road;
  for (const avenue of AVENUES) {
    ctx.fillRect(avenue - ROAD_W / 2, camera.y - 20, ROAD_W, VIEW_H + 40);
  }
  for (const street of STREETS) {
    ctx.fillRect(camera.x - 20, street - ROAD_W / 2, VIEW_W + 40, ROAD_W);
  }
  // Dashed centre lines.
  ctx.fillStyle = PALETTE.roadLine;
  for (const avenue of AVENUES) {
    for (let y = Math.floor((camera.y - 20) / 44) * 44; y < camera.y + VIEW_H + 20; y += 44) {
      ctx.fillRect(avenue - 2, y, 4, 22);
    }
  }
  for (const street of STREETS) {
    for (let x = Math.floor((camera.x - 20) / 44) * 44; x < camera.x + VIEW_W + 20; x += 44) {
      ctx.fillRect(x, street - 2, 22, 4);
    }
  }
}

function drawBuilding(ctx, b) {
  // Fake height: a darker side face offset by the building's height.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(b.x + b.height * 0.45, b.y + b.height * 0.45, b.w, b.h);
  ctx.fillStyle = b.roof;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  // Roof detail: an inner rectangle and, for tall towers, window dots.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
  if (b.windows) {
    ctx.fillStyle = 'rgba(255, 240, 180, 0.5)';
    for (let wx = b.x + 12; wx < b.x + b.w - 10; wx += 18) {
      for (let wy = b.y + 12; wy < b.y + b.h - 10; wy += 18) {
        ctx.fillRect(wx, wy, 5, 5);
      }
    }
  }
}

function drawTree(ctx, tree, time) {
  const sway = Math.sin(time * 1.2 + tree.x * 0.01 + tree.y * 0.01) * 1.5;
  ctx.fillStyle = PALETTE.treeDark;
  ctx.beginPath();
  ctx.arc(tree.x + sway, tree.y, tree.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.tree;
  ctx.beginPath();
  ctx.arc(tree.x + sway - 2, tree.y - 2, tree.r * 0.75, 0, Math.PI * 2);
  ctx.fill();
  if (tree.palm) {
    ctx.strokeStyle = '#7a5a34';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tree.x, tree.y + tree.r);
    ctx.lineTo(tree.x + sway, tree.y - tree.r - 4);
    ctx.stroke();
  }
}

function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  if (car.wrecked) {
    ctx.fillStyle = '#22242a';
  } else {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-19, -11, 38, 24);
    ctx.fillStyle = car.color;
  }
  // Body.
  ctx.fillRect(-18, -10, 36, 20);
  // Cabin.
  ctx.fillStyle = car.wrecked ? '#2a2d33' : '#1c2733';
  ctx.fillRect(-6, -8, 14, 16);
  // Windshield.
  ctx.fillStyle = 'rgba(180, 220, 255, 0.7)';
  ctx.fillRect(6, -8, 4, 16);
  // Headlights.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(16, -9, 3, 4);
  ctx.fillRect(16, 5, 3, 4);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(-19, -9, 3, 4);
    ctx.fillRect(-19, 5, 3, 4);
  }
  if (car.isCop && !car.wrecked) {
    // Light bar.
    ctx.fillStyle = '#ff2e2e';
    ctx.fillRect(-4, -11, 6, 4);
    ctx.fillStyle = '#2e7dff';
    ctx.fillRect(-4, 7, 6, 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SBPD', 0, 2);
  }
  ctx.restore();
  if (car.wrecked) {
    ctx.fillStyle = 'rgba(120, 120, 120, 0.5)';
    ctx.beginPath();
    ctx.arc(car.x - 8, car.y - 6, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, ped) {
  if (ped.dead) {
    ctx.fillStyle = '#5a3a3a';
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate(ped.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, player, time) {
  if (player.dead) return;
  const blink = player.invulnerable > 0 && Math.floor(time * 12) % 2 === 0;
  if (blink) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // Jacket (teal, so the player reads at a glance) and head.
  ctx.fillStyle = '#1f9d8a';
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath();
  ctx.arc(6, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  // Pistol in hand.
  ctx.fillStyle = '#22242a';
  ctx.fillRect(8, -2, 10, 4);
  ctx.restore();
  // Melee swing arc.
  if (player.meleeTimer > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 34, player.meleeAngle - 0.9, player.meleeAngle + 0.9);
    ctx.stroke();
  }
}

function drawPickup(ctx, pickup, time) {
  const bob = Math.sin(time * 3 + pickup.x) * 3;
  if (pickup.kind === 'cash') {
    ctx.fillStyle = '#2fae4e';
    ctx.fillRect(pickup.x - 10, pickup.y - 6 + bob, 20, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', pickup.x, pickup.y + 4 + bob);
  } else {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(pickup.x - 9, pickup.y - 9 + bob, 18, 18);
    ctx.fillStyle = '#d94f3d';
    ctx.fillRect(pickup.x - 2, pickup.y - 6 + bob, 4, 12);
    ctx.fillRect(pickup.x - 6, pickup.y - 2 + bob, 12, 4);
  }
}

function drawBeacon(ctx, x, y, time, color) {
  const pulse = 1 + Math.sin(time * 4) * 0.12;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * pulse, 20 * pulse, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Light pillar so the marker reads from far away.
  const grad = ctx.createLinearGradient(x, y - 220, x, y);
  grad.addColorStop(0, 'rgba(255, 201, 60, 0)');
  grad.addColorStop(1, 'rgba(255, 201, 60, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 5, y - 220, 10, 220);
}

/** Paint the world (not the HUD) for one frame. */
export function drawWorld(ctx, world, camera, time) {
  ctx.save();
  ctx.translate(-camera.x + camera.shakeX, -camera.y + camera.shakeY);
  drawGround(ctx, camera, time);
  drawRoads(ctx, camera);
  const view = { x0: camera.x - 40, y0: camera.y - 40, x1: camera.x + VIEW_W + 40, y1: camera.y + VIEW_H + 40 };
  for (const b of world.city.buildings) {
    if (b.x + b.w < view.x0 || b.x > view.x1 || b.y + b.h < view.y0 || b.y > view.y1) continue;
    drawBuilding(ctx, b);
  }
  for (const tree of world.city.trees) {
    if (tree.x < view.x0 || tree.x > view.x1 || tree.y < view.y0 || tree.y > view.y1) continue;
    drawTree(ctx, tree, time);
  }
  // Mission marker beacon.
  if (world.marker) drawBeacon(ctx, world.marker.x, world.marker.y, time, '#ffc93c');
  for (const pickup of world.pickups) drawPickup(ctx, pickup, time);
  for (const ped of world.peds) {
    if (ped.x < view.x0 || ped.x > view.x1 || ped.y < view.y0 || ped.y > view.y1) continue;
    drawPed(ctx, ped);
  }
  for (const enemy of world.enemies) {
    if (enemy.x < view.x0 || enemy.x > view.x1 || enemy.y < view.y0 || enemy.y > view.y1) continue;
    if (enemy.dead) {
      drawPed(ctx, { ...enemy, dead: true, x: enemy.x, y: enemy.y, angle: enemy.angle });
      continue;
    }
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(6, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22242a';
    ctx.fillRect(8, -2, 10, 4);
    ctx.restore();
  }
  for (const car of world.cars) {
    if (car.x < view.x0 - 40 || car.x > view.x1 + 40 || car.y < view.y0 - 40 || car.y > view.y1 + 40) continue;
    drawCar(ctx, car);
  }
  // Skid marks under the cars.
  for (const skid of world.skids) {
    ctx.strokeStyle = `rgba(20, 20, 20, ${skid.life * 0.5})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(skid.x - Math.cos(skid.angle) * 8, skid.y - Math.sin(skid.angle) * 8);
    ctx.lineTo(skid.x + Math.cos(skid.angle) * 8, skid.y + Math.sin(skid.angle) * 8);
    ctx.stroke();
  }
  drawPlayer(ctx, world.player, time);
  // Bullets as bright tracers.
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 3;
  for (const bullet of world.bullets) {
    ctx.beginPath();
    ctx.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
    ctx.lineTo(bullet.x, bullet.y);
    ctx.stroke();
  }
  // Muzzle flash.
  if (world.muzzle && world.muzzle.timer > 0) {
    ctx.fillStyle = '#ffdf5a';
    ctx.beginPath();
    ctx.arc(world.muzzle.x, world.muzzle.y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles: sparks and smoke.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
