// Solara Bay — shared tuning and world constants.
// Everything in this file is original: a fictional sun-soaked coastal city
// with its own districts, crews and names. Nothing here comes from any
// commercial game.

export const WORLD_W = 3200;
export const WORLD_H = 2400;

export const VIEW_W = 1280;
export const VIEW_H = 800;

// Road grid: avenues run north-south, streets east-west.
export const AVENUES = [200, 440, 680, 920, 1160, 1400, 1640, 1880, 2120, 2360, 2600, 2840];
export const STREETS = [160, 360, 560, 760, 960, 1160, 1360, 1560, 1760, 1960, 2160];
export const ROAD_W = 30;

export const DISTRICTS = {
  marina:     { name: 'Marina',        x0: 0,    y0: 0,    x1: 800,  y1: 2400 },
  downtown:   { name: 'Downtown',      x0: 1160, y0: 560,  x1: 2120, y1: 1360 },
  oldtown:    { name: 'Old Town',      x0: 2120, y0: 160,  x1: 3200, y1: 960 },
  industrial: { name: 'Industrial',    x0: 2120, y0: 1360, x1: 3200, y1: 2400 },
  suburbs:    { name: 'Suburbs',       x0: 200,  y0: 1560, x1: 1160, y1: 2400 },
  park:       { name: 'Crescent Park', x0: 1400, y0: 1560, x1: 1880, y1: 1960 },
};

export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#6d9c4c',
  sand: '#e8d9a0',
  water: '#2e7fa8',
  waterDeep: '#256b8f',
  road: '#3a3f46',
  roadLine: '#d8c95a',
  sidewalk: '#9aa0a8',
  park: '#5d9b4a',
  tree: '#3f7d3a',
  treeDark: '#2f6130',
  buildingRoof: ['#c96f4a', '#b85c5c', '#7a9cc4', '#d9a441', '#8f7fb8', '#5fa08a'],
  downtownRoof: ['#5a6b7d', '#7d8ea3', '#4a5a6b', '#8a7a5c'],
  warehouseRoof: ['#8a8f96', '#6f747c', '#9aa0a6'],
  houseRoof: ['#c96f4a', '#d9a441', '#7a9cc4', '#b85c5c', '#8f7fb8'],
  carColors: ['#d94f3d', '#3d7dd9', '#e8b93c', '#e8e8e8', '#2e2e34', '#5fa08a', '#b85c9a', '#7a9cc4'],
  copCar: '#2e4a8f',
  hudBg: 'rgba(12, 16, 24, 0.72)',
  hudAccent: '#ffc93c',
  starOn: '#ffc93c',
  starOff: '#4a4f58',
};

export const PLAYER = {
  walkSpeed: 165,
  runSpeed: 245,
  radius: 13,
  maxHealth: 100,
  pistolDamage: 34,
  pistolRange: 420,
  magSize: 12,
  reloadMs: 900,
  meleeDamage: 25,
  meleeRange: 46,
};

export const CAR = {
  accel: 340,
  brake: 520,
  maxSpeed: 420,
  reverseSpeed: 140,
  turnRate: 2.6,
  radius: 16,
  maxHealth: 100,
};

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 380,
  ramDamage: 8,
  arrestRadius: 34,
  arrestSeconds: 2.0,
  spawnDistance: 700,
};

export const SAVE_KEY = 'solara-bay-save-v1';
