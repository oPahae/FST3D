import * as THREE from 'three';
import { buildSky } from './world/sky.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { LAYOUT_URL } from './config.js';
import { loadLayout } from './layout/loadLayout.js';
import { buildCampus, buildCollisionDebug } from './CampusWorld.js';
import { applyLabelFilter } from './world/labels.js';
import { Player } from './gameplay/Player.js';
import { initHud } from './ui/hud.js';

const params = new URLSearchParams(location.search);
const MANUAL = params.has('manual');   // QA: render only when asked
const viewport = document.getElementById('viewport');
const labelHost = document.getElementById('labels');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: MANUAL });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
viewport.appendChild(renderer.domElement);
const labelRenderer = new CSS2DRenderer({ element: labelHost });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9d3ea);   // fallback behind the sky dome
scene.fog = new THREE.Fog(0xc4d8ea, 900, 3200);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0xb8b29c, 1.35));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.castShadow = true;
const SM = +(params.get('shadow') || 4096);
sun.shadow.mapSize.set(SM, SM);
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.35;
scene.add(sun, sun.target);

const SUN_DIR = new THREE.Vector3(-260, 420, 190).normalize();
const skyDome = buildSky(scene, SUN_DIR);
const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 7000);
const hud = initHud();
let campus = null, player = null, debugLines = null;

// Place names: "O" shows / hides every label (roads stay off by default, as before).
const LABEL_FILTER = { named: true, provisional: true, unidentified: true, outside: true, entrances: true, places: true, roads: false };
let namesOn = true;
function setNames(on) {
  namesOn = on;
  labelHost.style.display = on ? '' : 'none';
  hud.setNamesVisible(on);
}

async function loadWorld(url) {
  try {
    const layout = await loadLayout(url);
    campus = buildCampus(layout);
    scene.add(campus.root);
    debugLines = buildCollisionDebug(campus.collision);
    scene.add(debugLines);

    const ex = campus.extentWorld;
    const cx = (ex.x0 + ex.x1) / 2, cz = (ex.z0 + ex.z1) / 2;
    sun.position.set(cx - 260, 420, cz + 190);
    sun.target.position.set(cx, 0, cz);
    const half = Math.max(ex.x1 - ex.x0, ex.z1 - ex.z0) * 0.62;
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 1400 });
    sun.shadow.camera.updateProjectionMatrix();

    applyLabelFilter(campus.labels.items, LABEL_FILTER);
    setNames(namesOn);

    player = new Player(campus.collision, ex);
    scene.add(player.avatar);
    const g = campus.entrance;
    player.teleport(g[0], g[1] - 10, 0);
    player.avatar.visible = true;

    resize();
    window.__fstReady = true;
  } catch (err) {
    console.error(err);
    hud.showError(String(err.message || err));
    window.__fstError = String(err.stack || err);
  }
}

function resize() {
  const w = viewport.clientWidth, h = viewport.clientHeight;
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---- look around: drag the mouse -----------------------------------------------------------------------------------
let lookDrag = null;
renderer.domElement.addEventListener('pointerdown', (e) => { lookDrag = { x: e.clientX, y: e.clientY }; });
window.addEventListener('pointerup', () => { lookDrag = null; });
window.addEventListener('pointermove', (e) => {
  if (lookDrag && player) { player.look(e.clientX - lookDrag.x, e.clientY - lookDrag.y); lookDrag = { x: e.clientX, y: e.clientY }; }
});

// ---- keyboard: ZQSD (AZERTY) / arrows, Shift, Space, O = place names, C = collision debug --------------------------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (player) player.keys.add(k);
  if (!e.repeat) {
    if (k === 'o') setNames(!namesOn);
    if (k === 'c' && debugLines) debugLines.visible = !debugLines.visible;
  }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', (e) => player && player.keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => player && player.keys.clear());

// ---- loop ---------------------------------------------------------------------------------------------------------
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  skyDome.update(camera, clock.elapsedTime);
  if (player) { player.update(dt, camera); for (const u of campus.env.updaters || []) u(dt, player.pos); }
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (!MANUAL) requestAnimationFrame(frame);
}

// ---- QA hooks (qa/*.mjs) ------------------------------------------------------------------------------------------
window.__fst = {
  get campus() { return campus; }, get player() { return player; }, THREE, camera, scene,
  walkTo(x, z, yaw = 0) { player.teleport(x, z, yaw); },
  hold(key, on) { if (on) player.keys.add(key); else player.keys.delete(key); },
  stepSim(dt = 1 / 30, n = 1) { for (let i = 0; i < n; i++) player.update(dt, camera); },
  render() { renderer.render(scene, camera); labelRenderer.render(scene, camera); },
  state: () => ({ x: player?.pos.x, y: player?.pos.y, z: player?.pos.z }),
  labels: (on) => { labelHost.style.display = on ? '' : 'none'; },
};

resize();
loadWorld(LAYOUT_URL).then(() => { if (!MANUAL) requestAnimationFrame(frame); });
