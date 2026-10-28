import * as THREE from 'three';
import './style.css';

type GameState = 'ready' | 'playing' | 'paused' | 'over';
type Lane = -1 | 0 | 1;
type HazardKind = 'car' | 'truck' | 'barrier' | 'cone';

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const root = $('#game-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#8496a4');
scene.fog = new THREE.FogExp2('#8496a4', 0.011);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 180);
camera.position.set(0, 5.3, 10.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.domElement.setAttribute('aria-label', 'Three-dimensional driving game. Use arrow keys or A and D to steer.');
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d9e8ff', '#28303b', 2.1));
const sun = new THREE.DirectionalLight('#fff0d7', 3.1);
sun.position.set(-9, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -13; sun.shadow.camera.right = 13;
sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18;
sun.shadow.bias = -0.00035;
scene.add(sun);
const glow = new THREE.PointLight('#8ac8ff', 30, 26);
glow.position.set(0, 5, 2);
scene.add(glow);

const material = (color: string, roughness = 0.7, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const roadMat = material('#252d37', 0.95);
const stripeMat = material('#e1e6eb', 0.72);
const curbMat = material('#687784', 0.7);
const grassMat = material('#354b48', 0.95);
const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.23, 18);
const tireMat = material('#11151a', 0.92);
const rimMat = material('#aab8c3', 0.28, 0.7);
const headlightMat = new THREE.MeshStandardMaterial({ color: '#eaf7ff', emissive: '#9bdcff', emissiveIntensity: 2.8, roughness: 0.25 });
const tailLightMat = new THREE.MeshStandardMaterial({ color: '#ff4c52', emissive: '#ff1f36', emissiveIntensity: 2, roughness: 0.25 });

function box(parent: THREE.Object3D, material: THREE.Material, pos: [number, number, number], scale: [number, number, number], shadow = true) {
  const mesh = new THREE.Mesh(boxGeo, material);
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeCar(color: string, playerCar = false, truck = false): THREE.Group {
  const car = new THREE.Group();
  const paint = material(color, 0.28, 0.48);
  const glass = material('#152432', 0.2, 0.25);
  if (truck) {
    box(car, paint, [0, 0.75, -0.05], [1.65, 1.12, 3.1]);
    box(car, material('#d5dce2', 0.35), [0, 1.38, 0.82], [1.48, 0.38, 1.15]);
  } else {
    box(car, paint, [0, 0.54, 0], [1.42, 0.42, 2.48]);
    box(car, paint, [0, 0.87, -0.12], [1.08, 0.49, 1.28]);
    box(car, glass, [0, 0.91, -0.10], [0.94, 0.34, 1.10]);
    box(car, paint, [0, 0.73, 0.88], [1.2, 0.13, 0.46]);
    box(car, paint, [0, 0.72, -0.94], [1.2, 0.12, 0.3]);
  }
  for (const x of [-0.72, 0.72]) for (const z of [-0.82, 0.82]) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.36, z);
    wheel.castShadow = true;
    car.add(wheel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.24, 14), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(wheel.position);
    car.add(rim);
  }
  for (const x of [-0.48, 0.48]) {
    box(car, playerCar ? headlightMat : material('#f2e8c8', 0.25), [x, 0.6, truck ? 1.57 : 1.255], [0.24, 0.12, 0.035], false);
    box(car, tailLightMat, [x, 0.6, -1.26], [0.22, 0.12, 0.035], false);
  }
  if (playerCar) {
    const underglow = new THREE.PointLight('#b9ff4f', 3, 4);
    underglow.position.set(0, 0.12, 0);
    car.add(underglow);
    box(car, material('#d8ff7a', 0.25, 0.5), [0, 0.48, 0.05], [0.06, 0.025, 1.7], false);
  }
  return car;
}

const laneX = (lane: Lane) => lane * 3.15;
const road = new THREE.Group();
scene.add(road);
box(road, roadMat, [0, -0.14, -48], [10.4, 0.28, 115], false);
box(road, curbMat, [-5.35, -0.08, -48], [0.34, 0.22, 115], false);
box(road, curbMat, [5.35, -0.08, -48], [0.34, 0.22, 115], false);
box(road, grassMat, [-14, -0.25, -48], [17, 0.15, 125], false);
box(road, grassMat, [14, -0.25, -48], [17, 0.15, 125], false);

const laneMarkers: THREE.Mesh[] = [];
for (let z = -106; z < 10; z += 6) {
  for (const x of [-1.73, 1.73]) laneMarkers.push(box(road, stripeMat, [x, 0.015, z], [0.075, 0.025, 2.6], false));
  box(road, curbMat, [-5.17, 0.02, z], [0.035, 0.025, 2.6], false);
  box(road, curbMat, [5.17, 0.02, z], [0.035, 0.025, 2.6], false);
}

const buildingMaterials = ['#344351', '#46505c', '#3b4653', '#56616b', '#303c4a'].map(c => material(c, 0.92));
const windowMaterials = [
  new THREE.MeshStandardMaterial({ color: '#9fe4ff', emissive: '#4ca8d6', emissiveIntensity: 0.65, roughness: 0.35 }),
  new THREE.MeshStandardMaterial({ color: '#f6d58b', emissive: '#b87928', emissiveIntensity: 0.55, roughness: 0.35 }),
  material('#1c2a35', 0.9)
];
const buildings: THREE.Group[] = [];
for (const side of [-1, 1]) for (let i = 0; i < 24; i++) {
  const g = new THREE.Group();
  const width = 2.4 + Math.random() * 3.2;
  const height = 3.5 + Math.random() * 12;
  const depth = 3.4 + Math.random() * 3.2;
  const x = side * (8.7 + width * 0.5 + Math.random() * 3.5);
  const z = -i * 7.5 - Math.random() * 4;
  box(g, buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)], [0, height / 2 - 0.15, 0], [width, height, depth]);
  const cols = Math.max(2, Math.floor(width / 0.65));
  const rows = Math.max(2, Math.floor(height / 0.85));
  for (let row = 1; row < rows; row++) for (let col = 0; col < cols; col++) {
    if (Math.random() < 0.16) continue;
    const wx = -width / 2 + (col + 0.5) * width / cols;
    const wy = -height / 2 + row * height / rows;
    const wm = windowMaterials[Math.random() > 0.72 ? 1 : Math.random() > 0.22 ? 0 : 2];
    box(g, wm, [wx, wy, depth / 2 + 0.008], [width / cols * 0.42, 0.22, 0.018], false);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  buildings.push(g);
}

const streetlights: THREE.Group[] = [];
for (let z = 5; z > -110; z -= 14) for (const [side, offset] of [[-1, 0], [1, -5]] as const) {
  const g = new THREE.Group();
  const metal = material('#687987', 0.4, 0.65);
  box(g, metal, [0, 2, 0], [0.08, 4, 0.08]);
  box(g, metal, [-side * 0.38, 3.88, 0], [0.8, 0.07, 0.08]);
  const lamp = new THREE.Mesh(boxGeo, headlightMat);
  lamp.position.set(-side * 0.7, 3.82, 0); lamp.scale.set(0.27, 0.1, 0.25); g.add(lamp);
  const light = new THREE.PointLight('#9edcff', 2.2, 6);
  light.position.set(-side * 0.7, 3.65, 0); g.add(light);
  g.position.set(side * 6.25, 0, z + offset); scene.add(g); streetlights.push(g);
}

const player = makeCar('#b8f34d', true);
player.position.set(0, 0.02, 2.8);
scene.add(player);

interface Entity { group: THREE.Group; kind: HazardKind; lane: Lane; z: number; passed: boolean }
const entities: Entity[] = [];
const trafficColors = ['#e85b54', '#3d9fda', '#e8e8df', '#e7b44e', '#7e82ee', '#252c34', '#eb7749'];

function makeHazard(kind: HazardKind): THREE.Group {
  if (kind === 'car') return makeCar(trafficColors[Math.floor(Math.random() * trafficColors.length)]);
  if (kind === 'truck') return makeCar(trafficColors[Math.floor(Math.random() * trafficColors.length)], false, true);
  const g = new THREE.Group();
  if (kind === 'barrier') {
    box(g, material('#f4f3e9'), [0, 0.48, 0], [1.55, 0.8, 0.34]);
    for (let x = -0.5; x <= 0.51; x += 0.5) {
      const stripe = box(g, material('#f05245'), [x, 0.48, 0.18], [0.23, 0.82, 0.025]);
      stripe.rotation.z = -0.45;
    }
    box(g, material('#d6d9dc'), [0, 0.05, 0], [1.85, 0.12, 0.5]);
  } else {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 16), material('#ff793e'));
    cone.position.y = 0.4; cone.castShadow = true; g.add(cone);
    box(g, material('#f3eee1'), [0, 0.08, 0], [0.39, 0.08, 0.39]);
    box(g, material('#f3eee1'), [0, 0.42, 0], [0.29, 0.07, 0.29]);
  }
  return g;
}

let state: GameState = 'ready';
let targetLane: Lane = 0;
let lanePosition = 0;
let distance = 0, score = 0, speed = 120, difficulty = 1, spawnTimer = 0.7, elapsed = 0, crashCooldown = 0;
let bestScore = Number(localStorage.getItem('neon-drive-best') || 0);
let boostHeld = false;
const keys = new Set<string>();
const startScreen = $('#start-screen');
const pauseScreen = $('#pause-screen');
const overScreen = $('#gameover-screen');
const distanceEl = $('#distance');
const scoreEl = $('#score');
const speedEl = $('#speed');
const meter = $('#speed-meter-fill');
const engineStatus = $('#engine-status');
const flash = $('#crash-flash');

function setState(next: GameState) {
  state = next;
  startScreen.classList.toggle('hidden', next !== 'ready');
  pauseScreen.classList.toggle('hidden', next !== 'paused');
  overScreen.classList.toggle('hidden', next !== 'over');
  engineStatus.textContent = next === 'playing' ? 'LIVE' : next === 'paused' ? 'PAUSED' : next === 'over' ? 'FINISHED' : 'READY';
}
function updateHud() {
  distanceEl.textContent = Math.floor(distance).toString().padStart(4, '0');
  scoreEl.textContent = Math.floor(score).toString().padStart(6, '0');
  speedEl.textContent = Math.round(speed).toString();
  meter.style.width = Math.min(100, Math.max(0, (speed - 80) / 1.2)) + '%';
}
function clearEntities() {
  for (const entity of entities) scene.remove(entity.group);
  entities.length = 0;
}
function resetGame() {
  clearEntities(); distance = 0; score = 0; speed = 120; difficulty = 1; spawnTimer = 0.65;
  targetLane = 0; lanePosition = 0; elapsed = 0; crashCooldown = 0;
  player.position.set(0, 0.02, 2.8); player.rotation.set(0, 0, 0);
  updateHud(); setState('playing');
}
function spawnEntity() {
  const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
  const roll = Math.random();
  const kind: HazardKind = roll < 0.62 ? 'car' : roll < 0.75 ? 'truck' : roll < 0.9 ? 'barrier' : 'cone';
  const group = makeHazard(kind);
  group.position.set(laneX(lane), 0, -92); scene.add(group);
  entities.push({ group, kind, lane, z: -92, passed: false });
  if (difficulty > 1.5 && Math.random() < 0.25) {
    const options = ([-1, 0, 1] as Lane[]).filter(l => l !== lane);
    const secondLane = options[Math.floor(Math.random() * options.length)];
    const secondKind: HazardKind = Math.random() < 0.7 ? 'car' : 'barrier';
    const second = makeHazard(secondKind);
    second.position.set(laneX(secondLane), 0, -105); scene.add(second);
    entities.push({ group: second, kind: secondKind, lane: secondLane, z: -105, passed: false });
  }
}
function crash() {
  if (crashCooldown > 0 || state !== 'playing') return;
  crashCooldown = 1.2; flash.classList.add('show');
  window.setTimeout(() => flash.classList.remove('show'), 160);
  setState('over');
  $('#final-distance').textContent = Math.floor(distance) + ' m';
  $('#final-score').textContent = Math.floor(score).toString().padStart(6, '0');
  bestScore = Math.max(bestScore, Math.floor(score));
  localStorage.setItem('neon-drive-best', String(bestScore));
  $('#best-score').textContent = bestScore.toString().padStart(6, '0');
}
function steer(direction: -1 | 1) {
  if (state === 'playing') targetLane = Math.max(-1, Math.min(1, targetLane + direction)) as Lane;
}
function togglePause() {
  if (state === 'playing') setState('paused');
  else if (state === 'paused') setState('playing');
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) event.preventDefault();
  keys.add(key);
  if (event.repeat) return;
  if (key === 'arrowleft' || key === 'a') steer(-1);
  if (key === 'arrowright' || key === 'd') steer(1);
  if (key === 'p' || key === 'escape') togglePause();
  if (key === 'enter' && (state === 'ready' || state === 'over')) resetGame();
  if ((key === ' ' || key === 'w' || key === 'arrowup') && state === 'ready') resetGame();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); boostHeld = false; if (state === 'playing') setState('paused'); });
$('#start-button').addEventListener('click', resetGame);
$('#resume-button').addEventListener('click', () => setState('playing'));
$('#restart-button').addEventListener('click', resetGame);

function bindHold(id: string, start: () => void, end: () => void) {
  const button = $<HTMLButtonElement>(id);
  button.addEventListener('pointerdown', event => { event.preventDefault(); start(); button.setPointerCapture(event.pointerId); });
  button.addEventListener('pointerup', end);
  button.addEventListener('pointercancel', end);
  button.addEventListener('lostpointercapture', end);
}
bindHold('#left-button', () => steer(-1), () => {});
bindHold('#right-button', () => steer(1), () => {});
bindHold('#boost-button', () => { boostHeld = true; }, () => { boostHeld = false; });

function update(dt: number) {
  elapsed += dt;
  const boost = boostHeld || keys.has('w') || keys.has('arrowup');
  const braking = keys.has('s') || keys.has('arrowdown');
  speed = THREE.MathUtils.damp(speed, braking ? 82 : boost ? 205 : 120 + Math.min(48, difficulty * 5), 1.8, dt);
  const travel = speed / 3.6 * dt;
  distance += travel * 0.95; score += travel * 10; difficulty = 1 + distance / 280;
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawnEntity(); spawnTimer = Math.max(0.58, 1.48 - difficulty * 0.12) + Math.random() * 0.45; }

  const targetX = laneX(targetLane);
  lanePosition = THREE.MathUtils.damp(lanePosition, targetX, 8.5, dt);
  player.position.x = lanePosition;
  player.position.y = 0.02 + Math.sin(elapsed * 16) * 0.012 * (speed / 120);
  player.rotation.z = THREE.MathUtils.clamp((targetX - lanePosition) * -0.045, -0.12, 0.12);
  player.rotation.y = THREE.MathUtils.clamp((lanePosition - targetX) * 0.045, -0.12, 0.12);

  for (const marker of laneMarkers) { marker.position.z += travel; if (marker.position.z > 8) marker.position.z -= 114; }
  for (const light of streetlights) { light.position.z += travel; if (light.position.z > 12) light.position.z -= 118; }
  for (const building of buildings) { building.position.z += travel * 0.72; if (building.position.z > 16) building.position.z -= 180; }

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    entity.z += travel; entity.group.position.z = entity.z;
    if (entity.kind === 'car' || entity.kind === 'truck') entity.group.position.x = laneX(entity.lane) + Math.sin(elapsed * 1.4 + i) * 0.035;
    const collisionZone = entity.z > 0.55 && entity.z < 5.2;
    const overlaps = Math.abs(entity.group.position.x - player.position.x) < (entity.kind === 'cone' ? 0.95 : 1.42);
    if (collisionZone && overlaps) { crash(); break; }
    if (!entity.passed && entity.z > 5.2) { entity.passed = true; score += entity.kind === 'car' || entity.kind === 'truck' ? 100 : 150; }
    if (entity.z > 15) { scene.remove(entity.group); entities.splice(i, 1); }
  }
  crashCooldown = Math.max(0, crashCooldown - dt);
  updateHud();
}

function updateCamera(dt: number) {
  const desired = new THREE.Vector3(player.position.x * 0.36, 5.3, 10.5);
  camera.position.lerp(desired, 1 - Math.exp(-2.5 * dt));
  camera.lookAt(player.position.x * 0.23, 0.7, -8.5);
  if (boostHeld) camera.position.x += Math.sin(elapsed * 26) * 0.018;
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.045);
  if (state === 'playing') update(dt);
  else elapsed += dt * 0.22;
  updateCamera(state === 'playing' ? dt : 0.016);
  renderer.render(scene, camera);
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
});
if (!renderer.capabilities.isWebGL2) engineStatus.textContent = 'WEBGL 1';
