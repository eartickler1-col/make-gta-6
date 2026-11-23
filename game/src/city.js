// The city itself: Solara Bay's road grid, districts, buildings, trees and
// waterfront, generated once from a seed. Everything is data the renderer
// and the traffic AI read: roads, building rectangles (solid), parks and the
// named places missions point at.

import { AVENUES, DISTRICTS, PALETTE, ROAD_W, STREETS, WORLD_H, WORLD_W } from './config.js';
import { chance, pick, range } from './random.js';

export function districtAt(x, y) {
  if (x < 200) return 'marina';
  if (x >= 1400 && x < 1880 && y >= 1560 && y < 1960) return 'park';
  if (x >= 1160 && x < 2120 && y >= 560 && y < 1360) return 'downtown';
  if (x >= 2120 && y < 960) return 'oldtown';
  if (x >= 2120 && y >= 1360) return 'industrial';
  if (y >= 1560 && x < 1160) return 'suburbs';
  return 'marina';
}

function nearestLine(value, lines) {
  let best = lines[0];
  for (const line of lines) if (Math.abs(line - value) < Math.abs(best - value)) best = line;
  return best;
}

/** True when the point sits on a road (or the beach strip), i.e. drivable/walkable. */
export function isOnRoad(city, x, y) {
  if (x < 200) return true; // beach and boardwalk
  const avenue = nearestLine(x, AVENUES);
  if (Math.abs(x - avenue) <= ROAD_W / 2 + 12) return true;
  const street = nearestLine(y, STREETS);
  if (Math.abs(y - street) <= ROAD_W / 2 + 12) return true;
  return false;
}

/** The closest point on the road grid to (x, y). */
export function nearestRoadPoint(x, y) {
  const avenue = nearestLine(x, AVENUES);
  const street = nearestLine(y, STREETS);
  return Math.abs(x - avenue) < Math.abs(y - street)
    ? { x: avenue, y }
    : { x, y: street };
}

function makeBuilding(random, x, y, w, h, district) {
  const roofs = district === 'downtown' ? PALETTE.downtownRoof
    : district === 'industrial' ? PALETTE.warehouseRoof
    : district === 'oldtown' || district === 'suburbs' ? PALETTE.houseRoof
    : PALETTE.buildingRoof;
  return {
    x, y, w, h,
    roof: pick(random, roofs),
    height: district === 'downtown' ? Math.floor(range(random, 24, 64))
      : district === 'industrial' ? Math.floor(range(random, 10, 18))
      : Math.floor(range(random, 6, 16)),
    district,
    windows: district === 'downtown',
  };
}

export function generateCity(random) {
  const buildings = [];
  const trees = [];
  const blocks = [];

  // One block per cell of the road grid; each block gets buildings, a park,
  // or stays an empty lot, by district.
  for (let ai = 0; ai < AVENUES.length - 1; ai += 1) {
    for (let si = 0; si < STREETS.length - 1; si += 1) {
      const x0 = AVENUES[ai] + ROAD_W / 2 + 14;
      const y0 = STREETS[si] + ROAD_W / 2 + 14;
      const x1 = AVENUES[ai + 1] - ROAD_W / 2 - 14;
      const y1 = STREETS[si + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 40 || y1 - y0 < 40) continue;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const district = districtAt(cx, cy);
      blocks.push({ x0, y0, x1, y1, district });
      if (district === 'park') {
        for (let t = 0; t < 26; t += 1) {
          trees.push({ x: range(random, x0 + 10, x1 - 10), y: range(random, y0 + 10, y1 - 10), r: range(random, 7, 12) });
        }
        continue;
      }
      if (chance(random, 0.12)) continue; // empty lot: a yard, a car park
      if (district === 'industrial') {
        buildings.push(makeBuilding(random, x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16, district));
        continue;
      }
      if (district === 'downtown') {
        // Two towers per downtown block.
        const mid = (x0 + x1) / 2;
        buildings.push(makeBuilding(random, x0 + 6, y0 + 6, mid - x0 - 12, y1 - y0 - 12, district));
        buildings.push(makeBuilding(random, mid + 6, y0 + 6, x1 - mid - 12, y1 - y0 - 12, district));
        continue;
      }
      // Houses / shops: two or three small buildings per block.
      const count = chance(random, 0.5) ? 2 : 3;
      for (let b = 0; b < count; b += 1) {
        const bw = (x1 - x0) / count - 14;
        const bh = (y1 - y0) * range(random, 0.45, 0.7);
        buildings.push(makeBuilding(
          random,
          x0 + 7 + b * ((x1 - x0) / count),
          y0 + 8 + range(random, 0, (y1 - y0) - bh - 16),
          bw, bh, district,
        ));
      }
      // A tree or two on residential blocks.
      if (district === 'suburbs' || district === 'oldtown') {
        for (let t = 0; t < 3; t += 1) {
          trees.push({ x: range(random, x0, x1), y: range(random, y0, y1), r: range(random, 6, 10) });
        }
      }
    }
  }

  // Palm-lined boardwalk along the beach.
  for (let y = 120; y < WORLD_H; y += 130) {
    trees.push({ x: 168 + range(random, -8, 8), y: y + range(random, -20, 20), r: range(random, 8, 12), palm: true });
  }

  const places = {
    playerStart: { x: 320, y: 1180, label: 'Marina' },
    safehouse: { x: 560, y: 2080, label: 'Safehouse' },
    garage: { x: 2480, y: 1820, label: 'Rico’s Garage' },
    casino: { x: 1520, y: 880, label: 'Solara Grand Casino' },
    packageSpot: { x: 2500, y: 480, label: 'Old Town drop' },
    boat: { x: 150, y: 700, label: 'The Getaway Boat' },
    hospital: { x: 1000, y: 680, label: 'St. Anselm Hospital' },
  };

  return { buildings, trees, blocks, places };
}

/** True when the circle at (x, y, r) overlaps any building. */
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

/** Push a circle out of buildings it overlaps; returns true when it moved. */
export function resolveBuildingCollision(city, body) {
  const b = hitsBuilding(city, body.x, body.y, body.radius);
  if (!b) return false;
  const cx = Math.max(b.x, Math.min(body.x, b.x + b.w));
  const cy = Math.max(b.y, Math.min(body.y, b.y + b.h));
  let dx = body.x - cx;
  let dy = body.y - cy;
  let dist = Math.hypot(dx, dy);
  if (dist === 0) {
    // Centre inside the building: push out along the smallest penetration.
    const left = body.x - b.x + body.radius;
    const right = b.x + b.w - body.x + body.radius;
    const top = body.y - b.y + body.radius;
    const bottom = b.y + b.h - body.y + body.radius;
    const min = Math.min(left, right, top, bottom);
    if (min === left) body.x = b.x - body.radius;
    else if (min === right) body.x = b.x + b.w + body.radius;
    else if (min === top) body.y = b.y - body.radius;
    else body.y = b.y + b.h + body.radius;
    return true;
  }
  dx /= dist;
  dy /= dist;
  body.x = cx + dx * body.radius;
  body.y = cy + dy * body.radius;
  return true;
}
