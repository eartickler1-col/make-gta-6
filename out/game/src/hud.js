// The HUD and the menus: health and money, wanted stars, the current
// objective, the live minimap, subtitles, and the title / pause / busted /
// story-complete screens. Everything is drawn on the same canvas as the
// world, so a screenshot always shows the game as the player sees it.

import { AVENUES, PALETTE, STREETS, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';
import { DISTRICTS } from './config.js';

const MAP_W = 210;
const MAP_H = 156;
const MAP_X = VIEW_W - MAP_W - 16;
const MAP_Y = VIEW_H - MAP_H - 16;

function text(ctx, value, x, y, size, color, align = 'left', bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudBg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

function drawStars(ctx, wanted, x, y) {
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < wanted ? PALETTE.starOn : PALETTE.starOff;
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('★', x + i * 30, y);
  }
}

export function drawHud(ctx, world, time) {
  const player = world.player;
  // Health + money, top left.
  panel(ctx, 16, 16, 250, 64);
  text(ctx, 'JACE MORENO', 28, 40, 13, '#ffffff', 'left', true);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(28, 48, 150, 12);
  ctx.fillStyle = player.health > 30 ? '#3fce5a' : '#e5484d';
  ctx.fillRect(28, 48, 150 * Math.max(0, player.health / 100), 12);
  text(ctx, `$${player.money.toLocaleString('en-US')}`, 190, 60, 18, PALETTE.hudAccent, 'left', true);
  // Wanted stars, top right.
  panel(ctx, VIEW_W - 196, 16, 180, 56);
  text(ctx, world.wanted > 0 ? 'WANTED' : 'CLEAN', VIEW_W - 184, 38, 12, world.wanted > 0 ? '#ff6b6b' : '#9aa0a8', 'left', true);
  drawStars(ctx, world.wanted, VIEW_W - 184, 64);
  // Weapon / ammo, above the minimap.
  if (!player.inCar) {
    panel(ctx, VIEW_W - 196, VIEW_H - MAP_H - 64, 180, 32);
    text(ctx, player.reloadTimer > 0 ? 'RELOADING…' : `PISTOL  ${player.ammo} / 12`, VIEW_W - 184, VIEW_H - MAP_H - 42, 14, '#ffffff', 'left', true);
  } else {
    panel(ctx, VIEW_W - 196, VIEW_H - MAP_H - 64, 180, 32);
    const car = player.inCar;
    text(ctx, `CAR  ${Math.round(Math.abs(car.speed) * 0.9)} km/h`, VIEW_W - 184, VIEW_H - MAP_H - 42, 14, '#ffffff', 'left', true);
    ctx.fillStyle = '#2a2f38';
    ctx.fillRect(VIEW_W - 184, VIEW_H - MAP_H - 36, 156, 6);
    ctx.fillStyle = car.health > 30 ? '#3fce5a' : '#e5484d';
    ctx.fillRect(VIEW_W - 184, VIEW_H - MAP_H - 36, 156 * Math.max(0, car.health / 100), 6);
  }
  // Objective banner, top centre.
  if (world.objectiveText) {
    const w = Math.min(640, 40 + world.objectiveText.length * 8.5);
    panel(ctx, (VIEW_W - w) / 2, 16, w, 44);
    text(ctx, world.objectiveText, VIEW_W / 2, 45, 16, '#ffffff', 'center', true);
  }
  // Contextual hint, bottom left.
  if (world.hintText) {
    panel(ctx, 16, VIEW_H - 48, 20 + world.hintText.length * 7.5, 32);
    text(ctx, world.hintText, 28, VIEW_H - 26, 14, '#dfe3e8', 'left');
  }
  // Subtitles, bottom centre.
  if (world.subtitle && world.subtitleUntil > time) {
    const lines = wrapText(ctx, world.subtitle, 620, 17);
    const h = lines.length * 24 + 16;
    panel(ctx, (VIEW_W - 640) / 2, VIEW_H - MAP_H - 24 - h, 640, h);
    lines.forEach((line, i) => {
      text(ctx, line, VIEW_W / 2, VIEW_H - MAP_H - 24 - h + 26 + i * 24, 17, '#ffffff', 'center');
    });
  }
  drawMinimap(ctx, world, time);
  // Off-screen objective arrow.
  if (world.marker) drawObjectiveArrow(ctx, world);
  // Damage vignette.
  if (player.health > 0 && player.health < 35) {
    const pulse = 0.12 + Math.sin(time * 5) * 0.06;
    ctx.fillStyle = `rgba(220, 40, 40, ${pulse})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (world.flashTimer > 0) {
    ctx.fillStyle = `rgba(220, 40, 40, ${world.flashTimer * 0.5})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function wrapText(ctx, value, maxWidth, size) {
  ctx.font = `${size}px system-ui, sans-serif`;
  const words = value.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawMinimap(ctx, world, time) {
  panel(ctx, MAP_X - 6, MAP_Y - 6, MAP_W + 12, MAP_H + 12);
  const sx = MAP_W / WORLD_W;
  const sy = MAP_H / WORLD_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(MAP_X, MAP_Y, MAP_W, MAP_H);
  ctx.clip();
  ctx.fillStyle = '#4a7a3a';
  ctx.fillRect(MAP_X, MAP_Y, MAP_W, MAP_H);
  // Water and beach.
  ctx.fillStyle = '#2e7fa8';
  ctx.fillRect(MAP_X, MAP_Y, 130 * sx + 8, MAP_H);
  ctx.fillStyle = '#e8d9a0';
  ctx.fillRect(MAP_X + 130 * sx, MAP_Y, 80 * sx, MAP_H);
  // Park.
  ctx.fillStyle = '#3f7d3a';
  ctx.fillRect(MAP_X + DISTRICTS.park.x0 * sx, MAP_Y + DISTRICTS.park.y0 * sy, (DISTRICTS.park.x1 - DISTRICTS.park.x0) * sx, (DISTRICTS.park.y1 - DISTRICTS.park.y0) * sy);
  // Roads.
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = 2;
  for (const avenue of AVENUES) {
    ctx.beginPath();
    ctx.moveTo(MAP_X + avenue * sx, MAP_Y);
    ctx.lineTo(MAP_X + avenue * sx, MAP_Y + MAP_H);
    ctx.stroke();
  }
  for (const street of STREETS) {
    ctx.beginPath();
    ctx.moveTo(MAP_X, MAP_Y + street * sy);
    ctx.lineTo(MAP_X + MAP_W, MAP_Y + street * sy);
    ctx.stroke();
  }
  // Mission marker (pulsing).
  if (world.marker) {
    const r = 5 + Math.sin(time * 4) * 2;
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath();
    ctx.arc(MAP_X + world.marker.x * sx, MAP_Y + world.marker.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police.
  ctx.fillStyle = '#2e7dff';
  for (const cop of world.cops) {
    ctx.beginPath();
    ctx.arc(MAP_X + cop.x * sx, MAP_Y + cop.y * sy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Enemies.
  ctx.fillStyle = '#ff2e2e';
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    ctx.beginPath();
    ctx.arc(MAP_X + enemy.x * sx, MAP_Y + enemy.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const player = world.player;
  const px = MAP_X + player.x * sx;
  const py = MAP_Y + player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North + district label.
  text(ctx, 'N', MAP_X + MAP_W - 10, MAP_Y + 14, 11, '#ffffff', 'left', true);
  ctx.restore();
}

function drawObjectiveArrow(ctx, world) {
  const player = world.player;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  const dx = world.marker.x - px;
  const dy = world.marker.y - py;
  const dist = Math.hypot(dx, dy);
  // Only when the marker is off screen.
  const cam = world.camera;
  if (world.marker.x > cam.x && world.marker.x < cam.x + VIEW_W && world.marker.y > cam.y && world.marker.y < cam.y + VIEW_H) return;
  const angle = Math.atan2(dy, dx);
  const cx = VIEW_W / 2 + Math.cos(angle) * 260;
  const cy = VIEW_H / 2 + Math.sin(angle) * 200;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffc93c';
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  text(ctx, `${Math.round(dist)}m`, cx, cy + 28, 13, '#ffc93c', 'center', true);
}

function drawMenuPanel(ctx, title, lines, prompt, accent = '#ffc93c') {
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const w = 680;
  const h = 150 + lines.length * 30;
  const x = (VIEW_W - w) / 2;
  const y = (VIEW_H - h) / 2;
  ctx.fillStyle = 'rgba(16, 22, 32, 0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, title, VIEW_W / 2, y + 62, 44, '#ffffff', 'center', true);
  lines.forEach((line, i) => {
    text(ctx, line, VIEW_W / 2, y + 108 + i * 30, 17, '#c8cdd4', 'center');
  });
  text(ctx, prompt, VIEW_W / 2, y + h - 28, 18, accent, 'center', true);
}

export function drawTitle(ctx, world) {
  drawMenuPanel(ctx, 'SOLARA BAY', [
    'An open-world crime story in a sun-soaked coastal city.',
    'Steal cars, outrun the police, run four jobs for Lena Cruz —',
    'and take the Solara Grand in the big score.',
    '',
    'WASD / arrows — move & drive      E — steal / leave car',
    'Mouse — aim      Click — shoot      F — punch      R — reload',
    'Shift — run      Space — handbrake      P — pause      M — mute',
  ], world.hasSave ? 'ENTER — Start story      C — Continue saved game' : 'ENTER or CLICK — Start story', '#ffc93c');
}

export function drawPaused(ctx) {
  drawMenuPanel(ctx, 'PAUSED', [
    'The city waits for you.',
    'WASD — move & drive    E — steal car    Click — shoot',
    'P — resume    M — mute',
  ], 'Press P or ENTER to resume');
}

export function drawBusted(ctx, world) {
  drawMenuPanel(ctx, world.player.busted ? 'BUSTED' : 'WASTED', [
    world.player.busted
      ? 'The Solara Bay police caught you. Bail cost you $200.'
      : 'You went down in Solara Bay. The hospital patched you up for $100.',
    `Money: $${world.player.money.toLocaleString('en-US')}`,
  ], 'Press ENTER to wake up at St. Anselm Hospital', '#ff6b6b');
}

export function drawStoryComplete(ctx, world) {
  drawMenuPanel(ctx, 'THE BIG SCORE', [
    'The Solara Grand is yours. The boat is gone, the money is clean,',
    'and Solara Bay is open — free roam, any car, any street.',
    `Money: $${world.player.money.toLocaleString('en-US')}`,
  ], 'Press ENTER to keep playing', '#3fce5a');
}

export function drawMissionComplete(ctx, world) {
  const mission = world.lastMissionDone;
  if (!mission) return;
  panel(ctx, (VIEW_W - 520) / 2, 96, 520, 64);
  text(ctx, `MISSION COMPLETE — ${mission.title}`, VIEW_W / 2, 122, 18, '#3fce5a', 'center', true);
  text(ctx, `+$${mission.reward}`, VIEW_W / 2, 148, 16, PALETTE.hudAccent, 'center', true);
}
