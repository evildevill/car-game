import * as THREE from 'three';
import './style.css';

type GameState = 'ready' | 'playing' | 'paused' | 'over';
type Lane = -1 | 0 | 1;
type HazardKind = 'car' | 'truck' | 'barrier' | 'cone' | 'tires' | 'oil' | 'sign' | 'crate' | 'pothole';

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
  const paint = material(color, 0.24, 0.58);
  const darkPaint = material('#202b35', 0.38, 0.55);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#172b3b', roughness: 0.12, metalness: 0.18, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const chrome = material('#d3dce4', 0.22, 0.82);
  const black = material('#080d12', 0.62, 0.12);
  const wheelRim = material('#aebbc7', 0.23, 0.82);
  const brakeDisc = material('#59636d', 0.4, 0.72);
  if (truck) {
    box(car, paint, [0, 0.76, -0.12], [1.68, 1.15, 3.18]);
    box(car, material('#d8dfe5', 0.4, 0.15), [0, 1.42, 0.88], [1.5, 0.45, 1.22]);
    box(car, glass, [0, 1.48, 1.51], [1.25, 0.3, 0.035], false);
  } else {
    // Low wide chassis, hood and rear deck give the silhouette a less toy-like profile.
    box(car, darkPaint, [0, 0.43, -0.02], [1.48, 0.3, 2.72]);
    box(car, paint, [0, 0.56, 0.06], [1.55, 0.39, 2.58]);
    box(car, paint, [0, 0.66, 0.72], [1.38, 0.2, 0.86]);
    box(car, paint, [0, 0.65, -0.91], [1.3, 0.18, 0.48]);
    // Roof/cabin and individually separated glass panels.
    box(car, paint, [0, 0.91, -0.16], [1.08, 0.16, 1.16]);
    const frontGlass = box(car, glass, [0, 0.84, 0.43], [0.91, 0.055, 0.47], false);
    frontGlass.rotation.x = -0.43;
    const rearGlass = box(car, glass, [0, 0.84, -0.62], [0.88, 0.055, 0.37], false);
    rearGlass.rotation.x = 0.48;
    for (const side of [-1, 1]) {
      // Side windows, door beltline, handles and wing mirrors.
      box(car, glass, [side * 0.548, 0.91, -0.15], [0.035, 0.23, 0.62], false);
      box(car, glass, [side * 0.55, 0.9, 0.27], [0.035, 0.2, 0.25], false);
      box(car, darkPaint, [side * 0.72, 0.58, -0.08], [0.025, 0.07, 1.3], false);
      box(car, chrome, [side * 0.565, 0.69, -0.24], [0.035, 0.025, 0.17], false);
      const mirror = box(car, paint, [side * 0.69, 0.81, 0.31], [0.16, 0.11, 0.2], false);
      mirror.rotation.y = side * 0.12;
    }
    // Front and rear bumpers, lower intake and grille.
    box(car, darkPaint, [0, 0.43, 1.34], [1.36, 0.18, 0.12]);
    box(car, black, [0, 0.49, 1.405], [0.58, 0.12, 0.025], false);
    box(car, chrome, [0, 0.49, 1.423], [0.025, 0.08, 0.012], false);
    box(car, darkPaint, [0, 0.43, -1.34], [1.35, 0.16, 0.12]);
    // Subtle hood creases and rear spoiler.
    for (const x of [-0.43, 0.43]) {
      const crease = box(car, material('#d8e2e9', 0.36, 0.42), [x, 0.765, 0.73], [0.018, 0.008, 0.54], false);
      crease.rotation.y = x * 0.04;
    }
    box(car, darkPaint, [0, 0.79, -1.1], [1.1, 0.035, 0.11], false);
  }
  const wheelPositions = truck ? [-1.05, 1.0] : [-0.86, 0.88];
  for (const z of wheelPositions) for (const x of [-0.77, 0.77]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(truck ? 0.39 : 0.34, truck ? 0.39 : 0.34, 0.22, 24), tireMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, truck ? 0.4 : 0.37, z);
    wheel.castShadow = true;
    car.add(wheel);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.225, 20), brakeDisc);
    disc.rotation.z = Math.PI / 2;
    disc.position.copy(wheel.position);
    car.add(disc);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.235, 16), wheelRim);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(wheel.position);
    car.add(rim);
    for (let spoke = 0; spoke < 5; spoke++) {
      const angle = spoke * Math.PI * 2 / 5;
      const spokeMesh = box(car, chrome, [x + Math.sign(x) * 0.122, wheel.position.y + Math.cos(angle) * 0.105, z + Math.sin(angle) * 0.105], [0.018, 0.025, 0.14], false);
      spokeMesh.rotation.x = angle;
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 12), chrome);
    hub.rotation.z = Math.PI / 2;
    hub.position.copy(wheel.position);
    car.add(hub);
  }
  for (const x of [-0.5, 0.5]) {
    const frontZ = truck ? 1.53 : 1.35;
    const lamp = box(car, playerCar ? headlightMat : material('#fff2ce', 0.22), [x, 0.62, frontZ], [0.28, 0.105, 0.035], false);
    lamp.rotation.y = -x * 0.08;
    box(car, tailLightMat, [x, 0.61, truck ? -1.72 : -1.34], [0.24, 0.11, 0.035], false);
    if (!truck) box(car, material('#f7f9ff', 0.2), [x, 0.48, 1.413], [0.19, 0.035, 0.02], false);
  }
  if (playerCar) {
    const underglow = new THREE.PointLight('#b9ff4f', 2.1, 3.5);
    underglow.position.set(0, 0.12, 0);
    car.add(underglow);
    box(car, material('#d8ff7a', 0.25, 0.5), [0, 0.39, 0.05], [0.045, 0.018, 1.7], false);
  }
  return car;
}

const laneX = (lane: Lane) => lane * 3.15;
// Keep the driving surface straight and stable; lane positions are measured from the road center.
const roadCurve = (_z: number) => 0;
const road = new THREE.Group();
scene.add(road);
const roadChunks: THREE.Group[] = [];
const roadChunkLength = 6;
for (let z = -108; z <= 12; z += roadChunkLength) {
  const chunk = new THREE.Group();
  box(chunk, roadMat, [0, -0.14, 0], [10.4, 0.28, roadChunkLength + 0.08], false);
  for (const side of [-1, 1]) {
    box(chunk, curbMat, [side * 5.35, -0.045, 0], [0.38, 0.24, roadChunkLength + 0.08], false);
    box(chunk, new THREE.MeshStandardMaterial({ color: '#f5f7fa', emissive: '#a9c5d8', emissiveIntensity: 0.2, roughness: 0.55 }), [side * 5.08, 0.018, 0], [0.11, 0.035, roadChunkLength + 0.08], false);
    box(chunk, new THREE.MeshStandardMaterial({ color: '#c7ff54', emissive: '#83a92d', emissiveIntensity: 0.45, roughness: 0.5 }), [side * 5.27, 0.03, 0], [0.045, 0.035, roadChunkLength + 0.08], false);
  }
  for (const x of [-1.73, 1.73]) {
    box(chunk, stripeMat, [x, 0.025, 0], [0.12, 0.035, 3.0], false);
  }
  chunk.position.set(roadCurve(z), 0, z);
  road.add(chunk);
  roadChunks.push(chunk);
}
const buildingMaterials = ['#344351', '#46505c', '#3b4653', '#56616b', '#303c4a'].map(c => material(c, 0.92));
const windowMaterials = [
  new THREE.MeshStandardMaterial({ color: '#9fe4ff', emissive: '#4ca8d6', emissiveIntensity: 0.65, roughness: 0.35 }),
  new THREE.MeshStandardMaterial({ color: '#f6d58b', emissive: '#b87928', emissiveIntensity: 0.55, roughness: 0.35 }),
  material('#1c2a35', 0.9)
];
const buildings: THREE.Group[] = [];
const facadeMaterials = ['#c9c0b1', '#9eaaa9', '#c6a58a', '#777f88', '#d2c9b8'].map(c => material(c, 0.88));
const trimMaterial = material('#d5d9d7', 0.56, 0.12);
const storefrontGlass = new THREE.MeshPhysicalMaterial({ color: '#29404b', roughness: 0.18, metalness: 0.12, clearcoat: 0.85, transparent: true, opacity: 0.92 });
const signMaterials = ['#c65b42', '#477f85', '#d2a34d', '#4e617b'].map(c => material(c, 0.6, 0.12));
for (const side of [-1, 1]) for (let i = 0; i < 24; i++) {
  const g = new THREE.Group();
  const width = 2.4 + Math.random() * 3.2;
  const height = 3.5 + Math.random() * 12;
  const depth = 3.4 + Math.random() * 3.2;
  const x = side * (8.7 + width * 0.5 + Math.random() * 3.5);
  const z = -i * 7.5 - Math.random() * 4;
  const facade = buildingMaterials[Math.floor(Math.random() * buildingMaterials.length)];
  const facadeStyle = Math.floor(Math.random() * 4);
  box(g, facade, [0, height / 2 - 0.15, 0], [width, height, depth]);
  if (height > 7) {
    box(g, facadeMaterials[Math.floor(Math.random() * facadeMaterials.length)], [0, height + 0.08, 0], [width + 0.16, 0.22, depth + 0.16], false);
    for (let unit = 0; unit < 1 + Math.floor(Math.random() * 3); unit++) {
      const ux = (Math.random() - 0.5) * width * 0.62;
      const uz = (Math.random() - 0.5) * depth * 0.52;
      box(g, material('#707b80', 0.86), [ux, height + 0.32, uz], [0.5 + Math.random() * 0.45, 0.32, 0.45], false);
      box(g, trimMaterial, [ux, height + 0.49, uz], [0.53, 0.035, 0.48], false);
    }
  }
  const streetX = -side * (width / 2 + 0.014);
  const cols = Math.max(2, Math.floor(width / 0.65));
  const rows = Math.max(2, Math.floor(height / 0.85));
  for (let row = 1; row < rows; row++) for (let col = 0; col < cols; col++) {
    if (Math.random() < 0.16) continue;
    const wx = -width / 2 + (col + 0.5) * width / cols;
    const wy = row * height / rows - 0.15;
    const wm = windowMaterials[Math.random() > 0.72 ? 1 : Math.random() > 0.22 ? 0 : 2];
    box(g, wm, [wx, wy, depth / 2 + 0.008], [width / cols * 0.42, 0.22, 0.018], false);
    if (row % 2 === 0 && col % 2 === 0) box(g, trimMaterial, [wx, wy - 0.14, depth / 2 + 0.025], [width / cols * 0.5, 0.035, 0.045], false);
  }
  const streetRows = Math.max(2, Math.floor(height / 1.05));
  for (let row = 1; row < streetRows; row++) for (let col = 0; col < Math.max(2, Math.floor(depth / 0.8)); col++) {
    if (Math.random() < 0.12) continue;
    const count = Math.max(2, Math.floor(depth / 0.8));
    const wz = -depth / 2 + (col + 0.5) * depth / count;
    const wy = row * height / streetRows - 0.15;
    box(g, windowMaterials[Math.random() > 0.65 ? 1 : Math.random() > 0.2 ? 0 : 2], [streetX, wy, wz], [0.025, 0.24, 0.36], false);
  }
  if (facadeStyle === 0 || height < 5.5) {
    box(g, storefrontGlass, [streetX - side * 0.012, 1.05, 0], [0.045, 1.35, depth * 0.62], false);
    box(g, signMaterials[Math.floor(Math.random() * signMaterials.length)], [streetX - side * 0.045, 1.92, 0], [0.075, 0.24, depth * 0.72], false);
    box(g, material('#202b33', 0.5), [streetX - side * 0.055, 0.77, depth * 0.17], [0.08, 1.2, 0.42], false);
    box(g, trimMaterial, [streetX - side * 0.06, 0.16, 0], [0.08, 0.12, depth * 0.82], false);
  } else if (facadeStyle === 1) {
    for (let floor = 1.5; floor < height - 1; floor += 2.2) {
      box(g, trimMaterial, [streetX - side * 0.12, floor, 0], [0.18, 0.07, depth * 0.78], false);
      box(g, material('#77858b', 0.48, 0.55), [streetX - side * 0.2, floor + 0.22, 0], [0.035, 0.38, depth * 0.72], false);
      for (let rail = -1; rail <= 1; rail++) box(g, trimMaterial, [streetX - side * 0.21, floor + 0.2, rail * depth * 0.22], [0.04, 0.32, 0.025], false);
    }
  } else if (facadeStyle === 2) {
    for (let fin = -1; fin <= 1; fin++) box(g, facadeMaterials[2], [streetX - side * 0.06, height * 0.55, fin * depth * 0.28], [0.12, height * 0.78, 0.09], false);
    box(g, signMaterials[1], [streetX - side * 0.13, 1.7, 0], [0.3, 0.09, depth * 0.84], false);
  }
  g.position.set(x, 0, z);
  g.userData.side = side;
  g.userData.baseOffset = Math.abs(x);
  scene.add(g);
  buildings.push(g);
}

const sidewalks: THREE.Group[] = [];
for (let z = -108; z <= 12; z += 12) {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    box(g, material('#a5a7a2', 0.94), [side * 6.45, -0.075, 0], [1.55, 0.16, 12.08], false);
    box(g, material('#6b777a', 0.92), [side * 5.7, -0.02, 0], [0.12, 0.2, 12.08], false);
    for (let seam = -4.5; seam <= 4.6; seam += 1.5) box(g, material('#747d7e', 0.95), [side * 6.45, 0.009, seam], [1.45, 0.012, 0.025], false);
  }
  g.position.z = z; scene.add(g); sidewalks.push(g);
}
const roadsideProps: THREE.Group[] = [];
for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.7, 8), material('#67503d', 0.95));
  trunk.position.y = 0.85; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.78 + Math.random() * 0.28, 1), material(['#476b54', '#52765a', '#3f6250'][i % 3], 0.98));
  crown.position.y = 2.05; crown.scale.set(1, 1.22, 0.9); crown.castShadow = true; g.add(crown);
  box(g, material('#747d7c', 0.9), [0, 0.12, 0], [1.05, 0.24, 0.95], false);
  g.position.set(side * (7.35 + Math.random() * 0.35), 0, -i * 12 - 4);
  g.userData.side = side; scene.add(g); roadsideProps.push(g);
  if (i % 2 === 0) {
    const utility = new THREE.Group();
    box(utility, material('#4f6267', 0.78), [0, 0.55, 0], [0.55, 1.1, 0.48]);
    box(utility, trimMaterial, [0, 0.55, 0.25], [0.34, 0.72, 0.025], false);
    utility.position.set(side * 6.95, 0, -i * 12 - 10);
    utility.userData.side = side; scene.add(utility); roadsideProps.push(utility);
  }
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
  } else if (kind === 'cone') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.78, 16), material('#ff793e'));
    cone.position.y = 0.4; cone.castShadow = true; g.add(cone);
    box(g, material('#f3eee1'), [0, 0.08, 0], [0.39, 0.08, 0.39]);
    box(g, material('#f3eee1'), [0, 0.42, 0], [0.29, 0.07, 0.29]);
  } else if (kind === 'tires') {
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 10, 20), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(0, 0.34, 0);
    tire.castShadow = true;
    g.add(tire);
    const second = tire.clone();
    second.position.set(0.22, 0.62, 0);
    g.add(second);
  } else if (kind === 'sign') {
    box(g, material('#5d6871', 0.65, 0.55), [0, 0.48, 0], [0.1, 0.92, 0.1]);
    box(g, material('#f4d35e', 0.72), [0, 1.0, 0], [0.92, 0.7, 0.12]);
    box(g, material('#242e37', 0.7), [0, 1.0, 0.071], [0.66, 0.42, 0.025], false);
    box(g, material('#f4d35e', 0.65), [0, 1.0, 0.09], [0.09, 0.28, 0.025], false);
  } else if (kind === 'crate') {
    box(g, material('#a86f42', 0.94), [0, 0.42, 0], [0.88, 0.82, 0.82]);
    for (const x of [-0.28, 0.28]) box(g, material('#d39a5c', 0.92), [x, 0.42, 0.425], [0.075, 0.78, 0.025], false);
    box(g, material('#d39a5c', 0.92), [0, 0.42, 0.43], [0.78, 0.075, 0.025], false);
  } else if (kind === 'pothole') {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.09, 7, 24), material('#747c7e', 0.95));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.035; g.add(rim);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.43, 24), material('#080b10', 0.98));
    hole.rotation.x = -Math.PI / 2; hole.position.y = 0.025; g.add(hole);
  } else {
    const slick = new THREE.Mesh(new THREE.CircleGeometry(0.57, 24), material('#10151a', 0.24, 0.18));
    slick.rotation.x = -Math.PI / 2;
    slick.scale.set(1.15, 0.65, 1);
    slick.position.y = 0.025;
    g.add(slick);
    const sheen = new THREE.Mesh(new THREE.CircleGeometry(0.28, 18), material('#45515a', 0.2, 0.3));
    sheen.rotation.x = -Math.PI / 2;
    sheen.scale.set(1.2, 0.55, 1);
    sheen.position.set(-0.12, 0.03, 0.04);
    g.add(sheen);
  }
  return g;
}

let state: GameState = 'ready';
let targetLane: Lane = 0;
let lanePosition = 0;
let distance = 0, score = 0, speed = 120, difficulty = 1, spawnTimer = 0.9, coinSpawnTimer = 1.2, magnetSpawnTimer = 9, magnetTimer = 0, elapsed = 0, crashCooldown = 0, coinsCollected = 0;
const readSavedNumber = (key: string) => {
  try { const value = Number(localStorage.getItem(key) || 0); return Number.isFinite(value) && value >= 0 ? value : 0; }
  catch { return 0; }
};
let bestScore = readSavedNumber('neon-drive-best');
let lifetimeCoins = readSavedNumber('neon-drive-coins');
let runsPlayed = readSavedNumber('neon-drive-runs');
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
  meter.style.width = Math.min(100, Math.max(0, (speed - 80) / 1.2)) + '%';
  coinsEl.textContent = lifetimeCoins.toString().padStart(3, '0');
  $('#best-score').textContent = bestScore.toString().padStart(6, '0');
  $('#lifetime-coins').textContent = String(lifetimeCoins);
  $('#runs-played').textContent = String(runsPlayed);
  $('#magnet-timer').textContent = magnetTimer > 0 ? `${Math.ceil(magnetTimer)}s` : 'OFF';
  $('#magnet-card').classList.toggle('active', magnetTimer > 0);
}
function clearEntities() {
  for (const entity of entities) scene.remove(entity.group);
  entities.length = 0;
  for (const coin of coins) scene.remove(coin.group);
  coins.length = 0;
  for (const powerup of powerups) scene.remove(powerup.group);
  powerups.length = 0;
}
function resetGame() {
  clearEntities(); distance = 0; score = 0; speed = 120; difficulty = 1; spawnTimer = 0.9; coinSpawnTimer = 1.2; magnetSpawnTimer = 9; magnetTimer = 0; coinsCollected = 0; brakeHeld = false; boostHeld = false;
  runsPlayed += 1;
  try { localStorage.setItem('neon-drive-runs', String(runsPlayed)); } catch { /* Keep the game playable when storage is unavailable. */ }
  $('#runs-played').textContent = String(runsPlayed);
  $('#lifetime-coins').textContent = String(lifetimeCoins);
  targetLane = 0; lanePosition = 0; elapsed = 0; crashCooldown = 0;
  player.position.set(roadCurve(2.8 - distance * 0.95), 0.02, 2.8); player.rotation.set(0, 0, 0);
  updateHud(); setState('playing');
}
function spawnEntity() {
  const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
  const roll = Math.random();
  const kind: HazardKind = roll < 0.31 ? 'car' : roll < 0.41 ? 'truck' : roll < 0.53 ? 'barrier' : roll < 0.63 ? 'cone' : roll < 0.72 ? 'tires' : roll < 0.80 ? 'oil' : roll < 0.87 ? 'sign' : roll < 0.94 ? 'crate' : 'pothole';
  const group = makeHazard(kind);
  group.position.set(roadCurve(-92 - distance * 0.95) + laneX(lane), 0, -92); scene.add(group);
  entities.push({ group, kind, lane, z: -92, passed: false });
  if (difficulty > 1.5 && Math.random() < 0.25) {
    const options = ([-1, 0, 1] as Lane[]).filter(l => l !== lane);
    const secondLane = options[Math.floor(Math.random() * options.length)];
    const secondKind: HazardKind = (['car', 'truck', 'barrier', 'cone', 'tires', 'oil', 'sign', 'crate', 'pothole'] as HazardKind[])[Math.floor(Math.random() * 9)];
    const second = makeHazard(secondKind);
    second.position.set(roadCurve(-105 - distance * 0.95) + laneX(secondLane), 0, -105); scene.add(second);
    entities.push({ group: second, kind: secondKind, lane: secondLane, z: -105, passed: false });
  }
}
interface Coin { group: THREE.Group; lane: Lane; z: number; collected: boolean }
const coins: Coin[] = [];
interface PowerUp { group: THREE.Group; lane: Lane; z: number }
const powerups: PowerUp[] = [];
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
function makeMagnetPickup(): THREE.Group {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: '#ff4f61', emissive: '#b7193c', emissiveIntensity: 1.15, metalness: 0.22, roughness: 0.28 });
  const blue = new THREE.MeshStandardMaterial({ color: '#55c8ff', emissive: '#117fc7', emissiveIntensity: 1.1, metalness: 0.28, roughness: 0.25 });
  const arc = new THREE.TorusGeometry(0.43, 0.13, 12, 16, Math.PI / 2);
  const magnetRed = new THREE.Mesh(arc, red); group.add(magnetRed);
  const magnetBlue = new THREE.Mesh(arc, blue); magnetBlue.rotation.z = Math.PI / 2; group.add(magnetBlue);
  for (const x of [-0.43, 0.43]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.22), x < 0 ? red : blue);
    cap.position.set(x, 0, 0); group.add(cap);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: '#a9f2ff' }));
  halo.rotation.x = 0.2; group.add(halo);
  return group;
}
function spawnMagnet() {
  const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
  const group = makeMagnetPickup();
  group.position.set(laneX(lane), 1.45, -86);
  scene.add(group); powerups.push({ group, lane, z: -86 });
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
  $('#final-coins').textContent = String(coinsCollected);
  $('#lifetime-coins').textContent = String(lifetimeCoins);
  $('#runs-played').textContent = String(runsPlayed);
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
  // Restore the original fast arcade pace; Space/S/Down remain a dedicated brake.
  const targetSpeed = braking ? 82 : boost ? 205 : 120 + Math.min(48, difficulty * 5);
  speed = THREE.MathUtils.damp(speed, targetSpeed, 1.8, dt);
  const travel = speed / 3.6 * dt;
  distance += travel * 0.95; score += travel * 10; difficulty = 1 + distance / 280;
  spawnTimer -= dt;
  if (spawnTimer <= 0) { spawnEntity(); spawnTimer = Math.max(0.78, 1.7 - difficulty * 0.1) + Math.random() * 0.5; }
  coinSpawnTimer -= dt;
  if (coinSpawnTimer <= 0) { spawnCoins(); coinSpawnTimer = 3.8 + Math.random() * 2.2; }
  magnetSpawnTimer -= dt;
  if (magnetSpawnTimer <= 0) { spawnMagnet(); magnetSpawnTimer = 17 + Math.random() * 10; }
  magnetTimer = Math.max(0, magnetTimer - dt);

  const currentRoadCenter = roadCurve(2.8 - distance * 0.95);
  const targetX = laneX(targetLane);
  lanePosition = THREE.MathUtils.damp(lanePosition, targetX, 8.5, dt);
  player.position.x = currentRoadCenter + lanePosition;
  const roadHeading = THREE.MathUtils.clamp(roadCurve(2.8 - distance * 0.95) - roadCurve(0.8 - distance * 0.95), -0.12, 0.12);
  player.position.y = 0.02 + Math.sin(elapsed * 16) * 0.012 * (speed / 120);
  player.rotation.z = THREE.MathUtils.clamp((targetX - lanePosition) * -0.045, -0.12, 0.12);
  player.rotation.y = roadHeading + THREE.MathUtils.clamp((lanePosition - targetX) * 0.045, -0.12, 0.12);

  for (const chunk of roadChunks) {
    chunk.position.z += travel;
    if (chunk.position.z > 15) chunk.position.z -= 126;
    chunk.position.x = roadCurve(chunk.position.z - distance * 0.95);
  }
  for (const light of streetlights) {
    light.position.z += travel;
    if (light.position.z > 12) light.position.z -= 118;
    light.position.x = Math.sign(light.position.x || 1) * 6.25 + roadCurve(light.position.z - distance * 0.95) * 0.92;
  }
  for (const building of buildings) {
    building.position.z += travel * 0.72;
    if (building.position.z > 16) building.position.z -= 180;
    const side = building.userData.side as number;
    building.position.x = side * (Number(building.userData.baseOffset) || 10);
  }
  for (const sidewalk of sidewalks) {
    sidewalk.position.z += travel;
    if (sidewalk.position.z > 15) sidewalk.position.z -= 120;
  }
  for (const prop of roadsideProps) {
    prop.position.z += travel * 0.82;
    if (prop.position.z > 14) prop.position.z -= 144;
  }

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    entity.z += travel; entity.group.position.z = entity.z;
    if (entity.kind === 'car' || entity.kind === 'truck') entity.group.position.x = laneX(entity.lane) + Math.sin(elapsed * 1.4 + i) * 0.035;
    const collisionZone = entity.z > 0.55 && entity.z < 5.2;
    entity.group.position.x = roadCurve(entity.z - distance * 0.95) + laneX(entity.lane) + (entity.kind === 'car' || entity.kind === 'truck' ? Math.sin(elapsed * 1.4 + i) * 0.035 : 0);
    const overlaps = Math.abs(entity.group.position.x - player.position.x) < (entity.kind === 'cone' || entity.kind === 'oil' || entity.kind === 'pothole' ? 0.95 : entity.kind === 'tires' || entity.kind === 'crate' ? 1.15 : entity.kind === 'sign' ? 1.0 : 1.42);
    if (collisionZone && overlaps) { crash(); break; }
    if (!entity.passed && entity.z > 5.2) { entity.passed = true; score += entity.kind === 'car' || entity.kind === 'truck' ? 100 : 150; }
    if (entity.z > 15) { scene.remove(entity.group); entities.splice(i, 1); }
  }
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    powerup.z += travel;
    powerup.group.position.z = powerup.z;
    powerup.group.position.y = 1.45 + Math.sin(elapsed * 4 + i) * 0.13;
    powerup.group.rotation.y += dt * 1.6;
    powerup.group.position.x = laneX(powerup.lane);
    if (Math.abs(powerup.z - player.position.z) < 1.7 && Math.abs(powerup.group.position.x - player.position.x) < 1.35) {
      magnetTimer = 30;
      scene.remove(powerup.group); powerups.splice(i, 1);
      $('#magnet-card').classList.add('active');
      $('#magnet-timer').textContent = '30s';
      continue;
    }
    if (powerup.z > 14) { scene.remove(powerup.group); powerups.splice(i, 1); }
  }
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    coin.z += travel;
    coin.group.position.z = coin.z;
    const normalCoinX = roadCurve(coin.z - distance * 0.95) + laneX(coin.lane);
    if (magnetTimer > 0 && coin.z > -42) {
      coin.group.position.x = THREE.MathUtils.damp(coin.group.position.x, player.position.x, 4.2, dt);
    } else coin.group.position.x = normalCoinX;
    coin.group.rotation.y += dt * 2.8;
    coin.group.position.y = 1.15 + Math.sin(elapsed * 5 + i * 0.6) * 0.08;
    const magnetRange = magnetTimer > 0;
    if (Math.abs(coin.z - player.position.z) < (magnetRange ? 5.8 : 1.35) && Math.abs(coin.group.position.x - player.position.x) < (magnetRange ? 2.35 : 1.12)) {
      coinsCollected += 1;
      lifetimeCoins += 1;
      try { localStorage.setItem('neon-drive-coins', String(lifetimeCoins)); } catch { /* Keep collecting if storage is unavailable. */ }
      $('#lifetime-coins').textContent = String(lifetimeCoins);
      score += 250;
      scene.remove(coin.group);
      coins.splice(i, 1);
      continue;
    }
    if (coin.z > 14) { scene.remove(coin.group); coins.splice(i, 1); }
  }
  crashCooldown = Math.max(0, crashCooldown - dt);
  $('#magnet-timer').textContent = magnetTimer > 0 ? `${Math.ceil(magnetTimer)}s` : 'OFF';
  $('#magnet-card').classList.toggle('active', magnetTimer > 0);
  updateHud();
}

function updateCamera(dt: number) {
  const roadCameraOffset = roadCurve(2.8 - distance * 0.95) * 0.3 + (boostHeld ? Math.sin(elapsed * 26) * 0.018 : 0);
  const desired = new THREE.Vector3(player.position.x * 0.36 + roadCameraOffset, 5.3, 10.5);
  camera.position.lerp(desired, 1 - Math.exp(-2.5 * dt));
  camera.lookAt(player.position.x * 0.23, 0.7, -8.5);
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
