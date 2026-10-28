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
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
const roadChunks: THREE.Group[] = [];
const roadChunkLength = 6;
for (let z = -108; z <= 12; z += roadChunkLength) {
  const chunk = new THREE.Group();
  box(chunk, roadMat, [0, -0.14, 0], [10.4, 0.28, roadChunkLength + 0.08], false);
  for (const side of [-1, 1]) {
    box(chunk, curbMat, [side * 5.35, -0.08, 0], [0.34, 0.22, roadChunkLength + 0.08], false);
    box(chunk, new THREE.MeshStandardMaterial({ color: '#b8f34d', emissive: '#7da52b', emissiveIntensity: 0.35, roughness: 0.65 }), [side * 5.18, 0.025, 0], [0.035, 0.025, roadChunkLength + 0.08], false);
  }
  for (const x of [-1.73, 1.73]) box(chunk, stripeMat, [x, 0.015, 0], [0.075, 0.025, 2.65], false);
  road.add(chunk);
  roadChunks.push(chunk);
}
const roadCurve = (z: number) =>
  2.15 * Math.sin(z / 27) + 1.05 * Math.sin(z / 13.5) + 0.35 * Math.sin(z / 7.5);
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
  g.userData.side = side;
  g.userData.baseOffset = Math.abs(x);
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
let distance = 0, score = 0, speed = 0, difficulty = 1, spawnTimer = 0.9, coinSpawnTimer = 1.2, elapsed = 0, crashCooldown = 0, coinsCollected = 0;
let bestScore = Number(localStorage.getItem('neon-drive-best') || 0);
let boostHeld = false;
let brakeHeld = false;
const keys = new Set<string>();
const startScreen = $('#start-screen');
const pauseScreen = $('#pause-screen');
const overScreen = $('#gameover-screen');
const distanceEl = $('#distance');
const scoreEl = $('#score');
const speedEl = $('#speed');
const coinsEl = $('#coins');
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
  meter.style.width = Math.min(100, Math.max(0, speed / 1.15)) + '%';
  coinsEl.textContent = coinsCollected.toString().padStart(3, '0');
}
function clearEntities() {
  for (const entity of entities) scene.remove(entity.group);
  entities.length = 0;
  for (const coin of coins) scene.remove(coin.group);
  coins.length = 0;
}
function resetGame() {
  clearEntities(); distance = 0; score = 0; speed = 0; difficulty = 1; spawnTimer = 1.1; coinSpawnTimer = 0.8; coinsCollected = 0; brakeHeld = false; boostHeld = false;
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
interface Coin { group: THREE.Group; lane: Lane; z: number; collected: boolean }
const coins: Coin[] = [];
const coinMaterial = new THREE.MeshStandardMaterial({ color: '#ffd75a', metalness: 0.78, roughness: 0.22, emissive: '#b77812', emissiveIntensity: 0.7 });
const coinEdgeMaterial = new THREE.MeshStandardMaterial({ color: '#fff0a6', metalness: 0.72, roughness: 0.2, emissive: '#ffba2e', emissiveIntensity: 1.1 });
function makeCoin(): THREE.Group {
  const group = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.09, 24), coinMaterial);
  disk.rotation.x = Math.PI / 2;
  disk.castShadow = true;
  group.add(disk);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.045, 8, 24), coinEdgeMaterial);
  group.add(ring);
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), coinEdgeMaterial);
  center.position.z = 0.055;
  group.add(center);
  return group;
}
function spawnCoins() {
  const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
  for (let i = 0; i < 5; i++) {
    const group = makeCoin();
    const z = -72 - i * 2.5;
    group.position.set(roadCurve(z - distance * 0.95) + laneX(lane), 1.15, z);
    scene.add(group);
    coins.push({ group, lane, z, collected: false });
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
  if ((key === 'w' || key === 'arrowup') && state === 'ready') resetGame();
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); boostHeld = false; brakeHeld = false; if (state === 'playing') setState('paused'); });
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
bindHold('#brake-button', () => { brakeHeld = true; }, () => { brakeHeld = false; });

function update(dt: number) {
  elapsed += dt;
  const boost = boostHeld || keys.has('w') || keys.has('arrowup');
  const braking = brakeHeld || keys.has(' ') || keys.has('s') || keys.has('arrowdown');
  // A gentle cruise by default; acceleration is deliberately reserved for the boost key.
  const targetSpeed = braking ? 0 : boost ? 112 : 22 + Math.min(8, difficulty * 0.8);
  speed = THREE.MathUtils.damp(speed, targetSpeed, braking ? 7.5 : boost ? 1.45 : 0.95, dt);
  const travel = speed / 3.6 * dt * 0.72;
  distance += travel * 0.95; score += travel * 10; difficulty = 1 + distance / 280;
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawnEntity(); spawnTimer = Math.max(0.78, 1.7 - difficulty * 0.1) + Math.random() * 0.5; }
  coinSpawnTimer -= dt;
  if (coinSpawnTimer <= 0) { spawnCoins(); coinSpawnTimer = 3.8 + Math.random() * 2.2; }

  const targetX = laneX(targetLane);
  lanePosition = THREE.MathUtils.damp(lanePosition, targetX, 8.5, dt);
  player.position.x = currentRoadCenter + lanePosition;
  player.position.y = 0.02 + Math.sin(elapsed * 16) * 0.012 * (speed / 120);
  player.rotation.z = THREE.MathUtils.clamp((targetX - lanePosition) * -0.045, -0.12, 0.12);
  player.rotation.y = THREE.MathUtils.clamp((lanePosition - targetX) * 0.045, -0.12, 0.12);

  for (const chunk of roadChunks) {
    chunk.position.z += travel;
    if (chunk.position.z > 15) chunk.position.z -= 126;
    chunk.position.x = roadCurve(chunk.position.z - distance * 0.95);
  }
  const currentRoadCenter = roadCurve(2.8 - distance * 0.95);
  for (const light of streetlights) {
    light.position.z += travel;
    if (light.position.z > 12) light.position.z -= 118;
    light.position.x = Math.sign(light.position.x || 1) * 6.25 + roadCurve(light.position.z - distance * 0.95) * 0.92;
  }
  for (const building of buildings) {
    building.position.z += travel * 0.72;
    if (building.position.z > 16) building.position.z -= 180;
    const side = building.userData.side as number;
    building.position.x = side * (Number(building.userData.baseOffset) || 10) + roadCurve(building.position.z - distance * 0.95) * 0.5;
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    entity.z += travel; entity.group.position.z = entity.z;
    if (entity.kind === 'car' || entity.kind === 'truck') entity.group.position.x = laneX(entity.lane) + Math.sin(elapsed * 1.4 + i) * 0.035;
    const collisionZone = entity.z > 0.55 && entity.z < 5.2;
    entity.group.position.x = roadCurve(entity.z - distance * 0.95) + laneX(entity.lane) + (entity.kind === 'car' || entity.kind === 'truck' ? Math.sin(elapsed * 1.4 + i) * 0.035 : 0);
    const overlaps = Math.abs(entity.group.position.x - player.position.x) < (entity.kind === 'cone' ? 0.95 : 1.42);
    if (collisionZone && overlaps) { crash(); break; }
    if (!entity.passed && entity.z > 5.2) { entity.passed = true; score += entity.kind === 'car' || entity.kind === 'truck' ? 100 : 150; }
    if (entity.z > 15) { scene.remove(entity.group); entities.splice(i, 1); }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.z += travel;
    coin.group.position.z = coin.z;
    coin.group.position.x = roadCurve(coin.z - distance * 0.95) + laneX(coin.lane);
    coin.group.rotation.y += dt * 2.8;
    coin.group.position.y = 1.15 + Math.sin(elapsed * 5 + i * 0.6) * 0.08;
    if (Math.abs(coin.z - player.position.z) < 1.35 && Math.abs(coin.group.position.x - player.position.x) < 1.12) {
      coinsCollected += 1;
      score += 250;
      scene.remove(coin.group);
      coins.splice(i, 1);
      continue;
    }
    if (coin.z > 14) { scene.remove(coin.group); coins.splice(i, 1); }
  }
  crashCooldown = Math.max(0, crashCooldown - dt);
  updateHud();
}

function updateCamera(dt: number) {
  const desired = new THREE.Vector3(player.position.x * 0.36, 5.3, 10.5);
  camera.position.lerp(desired, 1 - Math.exp(-2.5 * dt));
  camera.position.x += roadCurve(2.8 - distance * 0.95) * 0.3;
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
