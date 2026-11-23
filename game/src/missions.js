// The story: Jace Moreno, wheelman for fixer Lena Cruz, against the Vulture
// Crew who run the docks. Four linked missions with objectives, dialogue
// and rewards; after the finale the city stays open for free roam. Each
// objective is a marker the HUD points at, so the player always knows
// where the story is.

import { addWanted } from './police.js';
import { createEnemy } from './combat.js';

export const MISSIONS = [
  {
    id: 'wheels',
    title: 'First Wheels',
    giver: 'Lena Cruz',
    reward: 300,
    briefing: [
      'Lena: Jace, welcome to Solara Bay. First rule: never walk when you can drive.',
      'Lena: Steal a car — any car. Walk up to one and press E.',
    ],
    objectives: [
      { type: 'enterCar', text: 'Steal a car (walk up to one, press E)' },
      { type: 'goto', x: 440, y: 1160, radius: 70, text: 'Drive to the Marina meet' },
    ],
  },
  {
    id: 'pickup',
    title: 'The Pickup',
    giver: 'Lena Cruz',
    reward: 600,
    briefing: [
      'Lena: A package is waiting in Old Town. Pick it up on foot — cars draw eyes.',
      'Lena: Then bring it to Rico’s Garage in the Industrial district. Quietly.',
    ],
    objectives: [
      { type: 'goto', x: 2600, y: 560, radius: 60, text: 'Drive to Old Town' },
      { type: 'pickup', x: 2600, y: 560, radius: 40, text: 'Pick up the package (walk into the marker)' },
      { type: 'goto', x: 2600, y: 1760, radius: 70, text: 'Deliver the package to Rico’s Garage' },
    ],
  },
  {
    id: 'heat',
    title: 'Heat Rising',
    giver: 'Lena Cruz',
    reward: 900,
    briefing: [
      'Lena: The Vultures tipped off the police. Three stars, Jace — they are coming for you.',
      'Lena: Get to the safehouse in the Suburbs. Do not get caught.',
    ],
    objectives: [
      { type: 'escape', x: 680, y: 2160, radius: 70, text: 'Reach the safehouse — lose the police or outrun them' },
    ],
  },
  {
    id: 'score',
    title: 'The Big Score',
    giver: 'Lena Cruz',
    reward: 5000,
    briefing: [
      'Lena: Tonight we take the Solara Grand. The Vultures guard the vault — expect a fight.',
      'Lena: Grab the loot, then run for the boat at the Marina. This is the one, Jace.',
    ],
    objectives: [
      { type: 'goto', x: 1640, y: 960, radius: 70, text: 'Reach the Solara Grand Casino' },
      { type: 'grab', x: 1640, y: 960, radius: 46, text: 'Take the loot from the vault (walk in)' },
      { type: 'escape', x: 150, y: 700, radius: 70, text: 'Escape to the getaway boat at the Marina' },
    ],
  },
];

export function createMissionState() {
  return {
    index: 0,
    objectiveIndex: 0,
    active: false,
    done: [],
    started: false,
    objectiveTimer: 0,
  };
}

export function currentMission(state) {
  if (state.index >= MISSIONS.length) return null;
  return MISSIONS[state.index];
}

export function currentObjective(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.objectives[state.objectiveIndex] ?? null;
}

export function startMission(world) {
  const mission = currentMission(world.missions);
  if (!mission || world.missions.active) return;
  world.missions.active = true;
  world.missions.started = true;
  world.missions.objectiveIndex = 0;
  world.saveRequested = true;
  for (const line of mission.briefing) world.say(line);
  world.say(`${mission.title} — ${mission.objectives[0].text}`);
  if (mission.id === 'heat') addWanted(world, 3, 'the Vultures tipped off the police');
  if (mission.id === 'score') {
    // Vulture gunmen guard the casino vault.
    world.enemies.push(createEnemy(1640, 880, 70));
    world.enemies.push(createEnemy(1560, 960, 70));
    world.enemies.push(createEnemy(1720, 960, 90));
  }
}

function completeObjective(world) {
  const state = world.missions;
  const mission = currentMission(state);
  state.objectiveIndex += 1;
  world.sound.pickup();
  if (state.objectiveIndex >= mission.objectives.length) {
    completeMission(world);
    return;
  }
  const next = mission.objectives[state.objectiveIndex];
  world.say(`${mission.title} — ${next.text}`);
  if (mission.id === 'pickup' && state.objectiveIndex === 2) {
    addWanted(world, 1, 'the pickup was watched');
    world.say('Lena: A patrol saw the handoff. Keep it clean, Jace.');
  }
  if (mission.id === 'score' && state.objectiveIndex === 2) {
    addWanted(world, 4, 'the casino alarm');
    world.say('Lena: Alarms! Four stars! Get to the boat — NOW!');
  }
}

function completeMission(world) {
  const state = world.missions;
  const mission = currentMission(state);
  world.player.money += mission.reward;
  world.money = world.player.money;
  state.done.push(mission.id);
  state.active = false;
  state.index += 1;
  world.saveRequested = true;
  world.sound.missionDone();
  world.say(`Mission complete: ${mission.title} — $${mission.reward} earned.`);
  if (state.index >= MISSIONS.length) {
    world.storyDone = true;
    world.say('Lena: That was the big one, Jace. Solara Bay is yours now — free roam.');
  } else {
    const next = MISSIONS[state.index];
    world.say(`Next job: ${next.title}. Drive to the yellow marker to start it.`);
  }
}

/** The marker the HUD points at: the next mission start, or the objective. */
export function missionMarker(world) {
  const state = world.missions;
  if (state.active) {
    const objective = currentObjective(state);
    if (objective && objective.x !== undefined) return { x: objective.x, y: objective.y, label: objective.text };
    return null;
  }
  const mission = currentMission(state);
  if (!mission) return null;
  // Start markers: the first objective's spot, or the beach car for job one.
  const first = mission.objectives[0];
  if (first.type === 'enterCar') return { x: 160, y: 1180, label: `${mission.title} — start here` };
  return { x: first.x, y: first.y, label: `${mission.title} — start here` };
}

export function updateMissions(world, dt) {
  const state = world.missions;
  const player = world.player;
  if (!state.active) {
    // Standing on the start marker begins the mission.
    const marker = missionMarker(world);
    if (marker) {
      const px = player.inCar ? player.inCar.x : player.x;
      const py = player.inCar ? player.inCar.y : player.y;
      if (Math.hypot(px - marker.x, py - marker.y) < 70) startMission(world);
    }
    return;
  }
  const objective = currentObjective(state);
  if (!objective) return;
  const px = player.inCar ? player.inCar.x : player.x;
  const py = player.inCar ? player.inCar.y : player.y;
  switch (objective.type) {
    case 'enterCar':
      if (player.inCar) completeObjective(world);
      break;
    case 'goto':
    case 'escape':
      if (Math.hypot(px - objective.x, py - objective.y) < objective.radius) completeObjective(world);
      break;
    case 'pickup':
    case 'grab':
      if (!player.inCar && Math.hypot(player.x - objective.x, player.y - objective.y) < objective.radius) {
        completeObjective(world);
      }
      break;
    default:
      break;
  }
}
