# Solara Bay

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-gta6--01-blue)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01) — a top-down 2D coastal city you can steal cars in, outrun the police through, and run jobs across. Everything — the city, the characters, the story, the art, the sound — is original work drawn in code. Nothing is taken from Rockstar or any commercial game.

## The game

You are **Jace Moreno**, a wheelman who owes the fixer **Lena Cruz** one last run. The city is **Solara Bay**: five districts (Marina, Downtown, Old Town, Industrial, Suburbs) plus Crescent Park, all connected by a street grid with traffic, pedestrians, and cars worth stealing.

- **Open world** — drive or walk anywhere in a 3200×2400 city. Traffic cars follow the roads, pedestrians walk the sidewalks and flee when they hear gunfire, and parked cars are yours for the taking.
- **Wanted level** — steal a car, hit a pedestrian, or shoot in public and the stars climb (0–5). Solara Bay police dispatch cars that chase, ram, and try to arrest you. Lay low and the heat cools off.
- **Four linked story missions** — *First Wheels* (steal a car for Lena), *The Pickup* (a package in Old Town, with the Vulture Crew waiting), *Heat Rising* (survive three stars and reach the safehouse), and *The Big Score* (the Solara Grand casino vault, then lose a four-star tail to the Marina boat). Each has objectives, dialogue, and a cash payout. Finish the story and free roam continues.
- **Combat** — a pistol with mouse aim, a punch for close work, reloads, and armed Vulture gunmen who shoot back.
- **HUD** — health, money, wanted stars, the current objective, subtitles, and a live minimap showing the player, police, enemies, and the mission marker.
- **Save and continue** — progress (money, missions, position) is saved in localStorage; continue from the title screen.
- **Sound** — synthesized WebAudio effects: engine hum, police sirens, gunshots, crashes, and cash chimes. No audio files, no network.

## Controls

| Keys | Action |
| --- | --- |
| WASD / arrow keys | Move on foot, drive |
| Shift | Run (on foot) |
| Mouse | Aim |
| Click / hold | Shoot |
| E | Steal / leave a car |
| F | Punch |
| R | Reload |
| Space | Handbrake (while driving) |
| P / Esc | Pause |
| M | Mute |

## How to run

```bash
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network — the game is plain static files under `game/`.

## How to submit

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot and the loop
- `game/src/config.js` — tuning, districts, palette
- `game/src/random.js` — seeded RNG
- `game/src/city.js` — city generation (roads, buildings, trees, beach)
- `game/src/audio.js` — WebAudio synth sound
- `game/src/input.js` — keyboard and mouse
- `game/src/vehicles.js` — traffic AI and arcade driving
- `game/src/peds.js` — pedestrian AI
- `game/src/player.js` — on-foot movement, entering/exiting cars, damage
- `game/src/police.js` — wanted level, cop chases, arrests
- `game/src/combat.js` — pistol, melee, bullets, enemies
- `game/src/missions.js` — the four story missions and their objectives
- `game/src/save.js` — localStorage save / load
- `game/src/render.js` — drawing the world
- `game/src/hud.js` — HUD, minimap, menus
- `game/src/game.js` — the world object and one step of play
- `game/src/shots.js` — the staged screenshot scenes (`?shot=`)
