// Combat: the player's pistol and fists, bullets, rival gang gunmen and
// the damage they all do. Shots are loud: firing near the law raises the
// wanted level, and the pedestrians nearby run for cover.

import { PLAYER } from './config.js';
import { hitsBuilding } from './city.js';
import { addWanted } from './police.js';
import { damagePlayer } from './player.js';
import { damageCar } from './vehicles.js';
import { scarePeds } from './peds.js';

export function createEnemy(x, y, health = 70) {
  return {
    x, y,
    angle: 0,
    health,
    radius: 13,
    shootTimer: 1.2,
    strafeDir: 1,
    strafeTimer: 0,
    dead: false,
    deadTimer: 0,
  };
}

/** Fire the pistol toward a world point. Returns false when it cannot fire. */
export function firePistol(world, player, targetX, targetY) {
  if (player.inCar || player.reloadTimer > 0 || player.ammo <= 0) return false;
  player.ammo -= 1;
  const angle = Math.atan2(targetY - player.y, targetX - player.x);
  player.angle = angle;
  const speed = 900;
  world.bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: PLAYER.pistolRange / speed,
    damage: PLAYER.pistolDamage,
    fromPlayer: true,
  });
  world.muzzle = { x: player.x + Math.cos(angle) * 22, y: player.y + Math.sin(angle) * 22, timer: 0.06 };
  world.sound.gunshot();
  scarePeds(world, player.x, player.y, 320);
  world.shotsFired += 1;
  if (world.shotsFired % 5 === 0) addWanted(world, 1, 'gunfire');
  if (player.ammo === 0) reloadPistol(world, player);
  return true;
}

export function reloadPistol(world, player) {
  if (player.reloadTimer > 0 || player.ammo === PLAYER.magSize) return;
  player.reloadTimer = PLAYER.reloadMs / 1000;
  player.ammo = PLAYER.magSize;
}

/** A punch in the facing direction: quick, silent, short range. */
export function meleeAttack(world, player) {
  if (player.inCar || player.meleeTimer > 0) return;
  player.meleeTimer = 0.35;
  player.meleeAngle = player.angle;
  world.sound.punch();
  const reach = PLAYER.meleeRange;
  const hx = player.x + Math.cos(player.angle) * reach;
  const hy = player.y + Math.sin(player.angle) * reach;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    if (Math.hypot(enemy.x - hx, enemy.y - hy) < 34) {
      enemy.health -= PLAYER.meleeDamage;
      if (enemy.health <= 0) killEnemy(world, enemy);
    }
  }
}

export function killEnemy(world, enemy) {
  enemy.dead = true;
  enemy.deadTimer = 0;
  world.explosion(enemy.x, enemy.y);
  world.addPickup(enemy.x, enemy.y, 'cash', 120);
  world.sound.cash();
}

function enemyShoot(world, enemy) {
  const player = world.player;
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  enemy.angle = angle;
  const speed = 620;
  world.bullets.push({
    x: enemy.x + Math.cos(angle) * 20,
    y: enemy.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 0.7,
    damage: 9,
    fromPlayer: false,
  });
  world.muzzle = { x: enemy.x + Math.cos(angle) * 22, y: enemy.y + Math.sin(angle) * 22, timer: 0.06 };
  world.sound.gunshot();
}

export function updateEnemies(world, dt) {
  const player = world.player;
  for (const enemy of world.enemies) {
    if (enemy.dead) {
      enemy.deadTimer += dt;
      continue;
    }
    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    enemy.shootTimer -= dt;
    enemy.strafeTimer -= dt;
    if (enemy.strafeTimer <= 0) {
      enemy.strafeDir *= -1;
      enemy.strafeTimer = 1 + Math.random() * 1.5;
    }
    // Strafe sideways at range; close in when far away.
    const toPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    let mx = 0;
    let my = 0;
    if (dist > 320) {
      mx = Math.cos(toPlayer);
      my = Math.sin(toPlayer);
    } else {
      mx = Math.cos(toPlayer + Math.PI / 2) * enemy.strafeDir;
      my = Math.sin(toPlayer + Math.PI / 2) * enemy.strafeDir;
    }
    enemy.x += mx * 55 * dt;
    enemy.y += my * 55 * dt;
    enemy.angle = toPlayer;
    if (dist < 380 && enemy.shootTimer <= 0 && !player.dead) {
      enemyShoot(world, enemy);
      enemy.shootTimer = 1.1 + Math.random() * 0.7;
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead || e.deadTimer < 6);
}

export function updateBullets(world, dt) {
  for (const bullet of world.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    if (hitsBuilding(world.city, bullet.x, bullet.y, 2)) {
      bullet.life = 0;
      world.spark(bullet.x, bullet.y);
      continue;
    }
    if (bullet.fromPlayer) {
      for (const enemy of world.enemies) {
        if (enemy.dead) continue;
        if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + 4) {
          enemy.health -= bullet.damage;
          bullet.life = 0;
          world.spark(bullet.x, bullet.y);
          if (enemy.health <= 0) killEnemy(world, enemy);
          break;
        }
      }
      if (bullet.life > 0) {
        for (const ped of world.peds) {
          if (ped.dead) continue;
          if (Math.hypot(ped.x - bullet.x, ped.y - bullet.y) < ped.radius + 4) {
            ped.dead = true;
            ped.deadTimer = 0;
            bullet.life = 0;
            addWanted(world, 1, 'hurt a pedestrian');
            scarePeds(world, ped.x, ped.y, 260);
            break;
          }
        }
      }
      if (bullet.life > 0) {
        for (const car of world.cars) {
          if (car.wrecked) continue;
          if (Math.hypot(car.x - bullet.x, car.y - bullet.y) < 20) {
            damageCar(world, car, bullet.damage);
            bullet.life = 0;
            world.spark(bullet.x, bullet.y);
            break;
          }
        }
      }
    } else if (!world.player.dead) {
      const player = world.player;
      if (!player.inCar && Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + 4) {
        damagePlayer(world, player, bullet.damage);
        bullet.life = 0;
      } else if (player.inCar && Math.hypot(player.inCar.x - bullet.x, player.inCar.y - bullet.y) < 20) {
        damageCar(world, player.inCar, bullet.damage);
        bullet.life = 0;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}
