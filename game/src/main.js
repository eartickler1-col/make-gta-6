// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, busted and story-complete. The title screen shows
// the living city panning behind the menu.
//
// ?seed=N fixes the city. ?shot=chase|drive|foot|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { VIEW_H, VIEW_W } from './config.js';
import { createWorld, stepWorld } from './game.js';
import { currentObjective } from './missions.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE } from './input.js';
import { drawWorld } from './render.js';
import { drawBusted, drawHud, drawMissionComplete, drawPaused, drawStoryComplete, drawTitle } from './hud.js';
import { stageShot } from './shots.js';
import { applySave, clearSave, hasSave, loadGame, saveGame } from './save.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const context = canvas.getContext('2d');
const view = { scale: 1, ox: 0, oy: 0 };

function resize() {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(window.innerWidth * ratio);
  const height = Math.round(window.innerHeight * ratio);
  canvas.width = width;
  canvas.height = height;
  view.scale = Math.min(width / VIEW_W, height / VIEW_H);
  view.ox = (width - VIEW_W * view.scale) / 2;
  view.oy = (height - VIEW_H * view.scale) / 2;
}

window.addEventListener('resize', resize);
window.addEventListener('error', (event) => {
  document.title = `ERROR: ${event.message}`;
});

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const world = createWorld(seed);
  const screen = stageShot(name, world);
  let painted = 0;
  function paint() {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0c1018';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    drawWorld(context, world, world.camera, world.time);
    drawHud(context, world, world.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      document.title = 'Solara Bay — shot ready';
    }
  }
  resize();
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  input.setTransform(() => ({ scale: view.scale, ox: view.ox, oy: view.oy, ratio: window.devicePixelRatio || 1 }));
  let world = createWorld(seed);
  let screen = 'title';
  let accumulator = 0;
  let last = performance.now();
  let titlePan = 0;

  // Read-only handle for automated tests (and curious players): the live
  // world and a one-line summary of the current state.
  window.__world = world;
  window.__debug = () => ({
    screen,
    x: Math.round(world.player.x),
    y: Math.round(world.player.y),
    inCar: !!world.player.inCar,
    health: Math.round(world.player.health),
    money: world.player.money,
    wanted: world.wanted,
    cops: world.cops.length,
    missionIndex: world.missions.index,
    missionActive: !!world.missions.active,
    missionObjective: world.missions.active ? currentObjective(world.missions)?.type ?? null : null,
    storyDone: world.storyDone,
  });

  function startGame(continueSave) {
    world = createWorld(seed, continueSave ? loadGame() : null);
    window.__world = world;
    if (!continueSave) clearSave();
    world.sound.unlock();
    accumulator = 0;
    screen = 'play';
    announce('Playing. Follow the yellow marker to start the first job.');
  }

  function respawn() {
    const player = world.player;
    const cost = player.busted ? 200 : 100;
    player.money = Math.max(0, player.money - cost);
    world.money = player.money;
    player.health = 100;
    player.dead = false;
    player.busted = false;
    player.wasted = false;
    player.inCar = null;
    player.x = world.city.places.hospital.x;
    player.y = world.city.places.hospital.y;
    world.wanted = 0;
    world.cops = [];
    world.cars = world.cars.filter((c) => !c.isCop);
    world.camera.x = Math.max(0, player.x - VIEW_W / 2);
    world.camera.y = Math.max(0, player.y - VIEW_H / 2);
    screen = 'play';
    announce('You woke up at St. Anselm Hospital.');
  }

  function handleActions() {
    // During play the world owns the action queue (enter car, shoot,
    // reload...); the loop only peeks for the pause key so it never eats a
    // press meant for the world.
    if (screen === 'play') {
      if (input.peekActions() & ACTION_PAUSE) {
        input.takeActions();
        screen = 'paused';
        announce('Paused.');
      }
      return;
    }
    const actions = input.takeActions();
    if (screen === 'title') {
      if (actions & ACTION_CONFIRM) startGame(false);
      return;
    }
    if (screen === 'paused') {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = 'play';
        announce('Playing.');
      }
      return;
    }
    if (screen === 'busted' || screen === 'story') {
      if (actions & ACTION_CONFIRM) {
        if (screen === 'busted') respawn();
        else {
          world.storyShown = true;
          screen = 'play';
        }
      }
      return;
    }
  }

  function step() {
    if (screen === 'title') {
      // The living city behind the menu: traffic and pedestrians move,
      // the camera drifts slowly over Downtown.
      titlePan += STEP;
      const input = {
        axes: () => ({ x: 0, y: 0, run: false }),
        mouse: () => ({ x: 640, y: 400 }),
        get mouseDown() { return false; },
        held: () => false,
        takeActions: () => 0,
      };
      stepWorld(world, input, STEP);
      world.camera.x = 1100 + Math.sin(titlePan * 0.07) * 500;
      world.camera.y = 800 + Math.cos(titlePan * 0.05) * 300;
      return;
    }
    if (screen !== 'play') return;
    stepWorld(world, input, STEP);
    if (world.saveRequested) {
      world.saveRequested = false;
      saveGame(world);
    }
    if (world.player.dead) {
      screen = 'busted';
      announce(world.player.busted ? 'Busted by the police.' : 'Wasted.');
      return;
    }
    if (world.storyDone && !world.storyShown) {
      screen = 'story';
      world.storyShown = true;
      announce('Story complete — the big score is yours.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    // Title screen: Enter starts a new game, C continues a save.
    if (screen === 'title') {
      if (input.held && input.held('KeyC') && hasSave()) startGame(true);
      while (accumulator >= STEP && screen === 'title') {
        step();
        accumulator -= STEP;
      }
    } else if (screen === 'play') {
      while (accumulator >= STEP && screen === 'play') {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    // Paint.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#0c1018';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    drawWorld(context, world, world.camera, world.time);
    if (screen === 'play' || screen === 'paused') drawHud(context, world, world.time);
    if (world.lastMissionDone && world.missionToastUntil > world.time && screen === 'play') {
      drawMissionComplete(context, world);
    }
    if (screen === 'title') drawTitle(context, world);
    else if (screen === 'paused') drawPaused(context);
    else if (screen === 'busted') drawBusted(context, world);
    else if (screen === 'story') drawStoryComplete(context, world);
    if (world.time === 0) document.title = 'Solara Bay — running';
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      announce('Paused.');
    }
  });

  world.hasSave = hasSave();
  resize();
  announce('Solara Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
