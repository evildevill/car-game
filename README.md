# Neon Drive — Three.js Traffic Run

A browser-based arcade driving game built with Three.js, WebGL, TypeScript, and Vite. The city and vehicles use procedural geometry; no external 3D asset downloads are required.

## Features

- Real-time 3D scene with lighting, fog, shadows, road markings, city buildings, glowing windows, and streetlights.
- Three-lane driving with smooth steering and car body roll.
- Traffic cars, trucks, road barriers, and cones with collision detection.
- Gentle default cruising speed, hold-to-boost acceleration, and reliable Space/S/down braking.
- Procedurally curving zig-zag road with road-aligned lane markings and scenery.
- Golden coin trails with collection effects, bonus points, and a live coin counter.
- Score, distance, speed meter, saved best score, increasing difficulty, pause, and restart.
- Keyboard controls plus touch controls on mobile.
- Responsive HUD and start, pause, and game-over screens.
- `.gitignore` for Node/Vite build output, dependencies, local environment files, logs, and editor clutter.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

With npm:

```bash
npm install
npm run dev
```

## Controls

- **A / D** or **Left / Right arrows** — change lanes
- **W / Up arrow** — boost
- **Space / S / Down arrow** — brake
- **P** or **Escape** — pause/resume
- **Enter** — start or restart
- On mobile, use the on-screen arrows and hold BOOST or BRAKE.

## Build

```bash
pnpm build
pnpm preview
```

This is an arcade-style traffic dodger rather than a physics simulator. Cars, buildings, and hazards are procedural geometry; collision detection uses lane and position bounds.
