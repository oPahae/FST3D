import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DoorSystem } from './doors.js';
import { makeInteriorMaterials } from './kit.js';
import { buildLibrary } from './library.js';
import { buildAmphi } from './amphi.js';
import { buildD04 } from './d04.js';
import { buildBuvette } from './buvette.js';
import { buildFoot } from './foot.js';

const BUILDERS = { library: buildLibrary, amphi: buildAmphi, d04: buildD04, buvette: buildBuvette, foot: buildFoot };
const WORLD_NAMES = { library: 'Bibliothèque', amphi: 'Amphithéâtre', d04: 'Salle D04', buvette: 'Buvette', foot: 'Terrain de foot' };

/**
 * Switches the player between the campus and the interior worlds.
 * The campus stays in memory (hidden); interiors are built on first use. The follow camera, the collision world and the
 * lighting are swapped; the player avatar is the same object everywhere.
 */
export class WorldManager {
  constructor({ scene, renderer, camera, player, campus, sun, hemi, skyDome, hud, labelHost, getNamesOn, getDebug }) {
    Object.assign(this, { scene, renderer, camera, player, campus, sun, hemi, skyDome, hud, labelHost, getNamesOn, getDebug });
    this.current = 'campus';
    this.interiors = new Map();
    this.origin = null;           // campus door the player came through
    this.fade = null;             // { t, action }
    this.near = null;             // door the prompt is about
    this.t = 0;
    this.mode = null;
    this.saved = {
      bg: scene.background, fog: scene.fog, hemi: [hemi.color.clone(), hemi.groundColor.clone(), hemi.intensity],
      env: scene.environment, envI: scene.environmentIntensity, camDist: player.camDist, sun: sun.intensity,
    };
    const doors = (campus.arch.shared.enterDoors || []);
    this.campusDoors = doors;
    this.campusSystem = new DoorSystem(campus.root, doors.map((d) => ({ ...d, label: 'Entrer', where: WORLD_NAMES[d.world] })), (x, z) => campus.collision.groundHeight(x, z), { radius: 2.5 });
    this.mats = null; this.envMap = null;
  }

  ensureInterior(id) {
    let it = this.interiors.get(id);
    if (it) return it;
    if (!this.mats) this.mats = makeInteriorMaterials();
    it = BUILDERS[id](this.mats, this);
    it.group.visible = false;
    this.scene.add(it.group);
    it.system = new DoorSystem(it.group, it.exits.map((e) => ({ ...e, id: `${id}:exit${e.slot}` })), (x, z) => it.collision.groundHeight(x, z), { radius: 2.3 });
    this.interiors.set(id, it);
    return it;
  }

  get inside() { return this.current !== 'campus'; }

  // ---- input ---------------------------------------------------------------------------------------------------------
  interact() {
    if (this.fade || this.mode) return false;
    if (!this.near) { const cur = this.inside && this.interiors.get(this.current); if (cur && cur.onK) { cur.onK(); return true; } return false; }
    if (this.near.start) { const st = this.near; this.near = null; this.hud.showPrompt(null); this.startMode(st.start(this)); return true; }
    const door = this.near;
    this.near = null; this.hud.showPrompt(null);
    this.fade = { t: 0, door, swapped: false };
    this.hud.fade(true);
    return true;
  }

  // ---- per frame -----------------------------------------------------------------------------------------------------
  update(dt, elapsed) {
    this.t = elapsed;
    if (this.fade) {
      this.fade.t += dt;
      if (!this.fade.swapped && this.fade.t > 0.32) { this.fade.swapped = true; this.performSwitch(this.fade.door); this.hud.fade(false); }
      if (this.fade.swapped && this.fade.t > 0.75) this.fade = null;
    }
    if (this.mode) { this.mode.update(dt); return; }
    let near;
    if (this.inside) {
      const it = this.interiors.get(this.current);
      near = it.system.update(dt, elapsed, this.player.pos, this.camera);
      if (!near) {   // activities (write on the board, use a PC)
        let bd = Infinity;
        for (const st of it.stations) { const d = Math.hypot(this.player.pos.x - st.x, this.player.pos.z - st.z); if (d < st.r && d < bd) { bd = d; near = st; } }
      }
    } else near = this.campusSystem.update(dt, elapsed, this.player.pos, this.camera);
    if (this.fade) near = null;
    if (near !== this.near) { this.near = near; this.hud.showPrompt(near ? { label: near.label || 'Entrer', where: near.where || '' } : null); }
    if (this.inside) for (const u of this.interiors.get(this.current).updaters) u(dt, elapsed);
  }

  // ---- first-person activities (board, PC) ------------------------------------------------------------------------------------
  startMode(mode) {
    this.mode = mode;
    this.player.keys.clear();
    this.player.avatar.visible = false;
    this.player.camOverride = mode.cam;
    this.hud.showPrompt(null);
  }
  endMode() {
    this.mode = null;
    this.player.camOverride = null; this.player.avatar.visible = true;
    this.player._camInit = false; this.player.keys.clear();
    this.camera.fov = 55; this.camera.updateProjectionMatrix();
  }
  /** Keyboard routing: true = the active mode owns the key. */
  captureKey(e) { return this.mode ? this.mode.onKey(e) : false; }

  /** Called at the middle of the fade (screen is black). */
  performSwitch(door) {
    if (!this.inside) {
      this.origin = door;
      this.enterNow(door.world, door.slot, door);
    } else this.leaveNow(door.slot);
  }

  // ---- switching -----------------------------------------------------------------------------------------------------
  enterNow(id, slot = 0, fromDoor = null) {
    const it = this.ensureInterior(id);
    if (fromDoor) this.origin = fromDoor;
    const { scene, hemi, player, sun } = this;
    this.campus.root.visible = false;
    this.skyDome.setVisible(false);
    this.labelHost.style.display = 'none';
    sun.intensity = 0;
    scene.background = new THREE.Color(it.bg);
    scene.fog = null;
    hemi.color.set(it.hemi[0]); hemi.groundColor.set(it.hemi[1]); hemi.intensity = it.hemi[2];
    if (!this.envMap) {
      const pm = new THREE.PMREMGenerator(this.renderer);
      this.envMap = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    }
    scene.environment = this.envMap; scene.environmentIntensity = it.envIntensity;
    it.group.visible = true;
    this.current = id;
    player.c = it.collision; player.bounds = it.bounds; player.ceilingY = it.ceilingY; player.ceilingFn = (x, z) => it.ceilingAt(x, z); player.camDist = it.camDist;
    const sp = it.spawns[slot] || it.spawns[0];
    player.teleport(sp.x, sp.z, sp.yaw);
    this.hud.banner(WORLD_NAMES[id]);
    if (it.onEnter) it.onEnter();
    this.near = null; this.hud.showPrompt(null);
  }

  leaveNow(exitSlot = 0) {
    const id = this.current, it = this.interiors.get(id);
    const { scene, hemi, player, sun, saved } = this;
    // door to come out of: same building, matching slot, else the door we came through
    const o = this.origin;
    let door = o && it.exits.length > 1 ? this.campusDoors.find((d) => d.building === o.building && d.slot === exitSlot && d.world === id) : null;
    door = door || o || this.campusDoors.find((d) => d.world === id);
    it.group.visible = false;
    if (it.onLeave) it.onLeave();
    const wl = document.getElementById('wallet'); if (wl) wl.style.display = 'none';
    this.campus.root.visible = true;
    this.skyDome.setVisible(true);
    this.labelHost.style.display = this.getNamesOn() ? '' : 'none';
    sun.intensity = saved.sun;
    scene.background = saved.bg; scene.fog = saved.fog;
    hemi.color.copy(saved.hemi[0]); hemi.groundColor.copy(saved.hemi[1]); hemi.intensity = saved.hemi[2];
    scene.environment = saved.env; scene.environmentIntensity = saved.envI ?? 1;
    this.current = 'campus';
    player.c = this.campus.collision; player.bounds = this.campus.extentWorld; player.ceilingY = Infinity; player.ceilingFn = null; player.camDist = saved.camDist;
    const off = door.standOff + 1.6;
    const x = door.x + door.nx * off, z = door.z + door.nz * off, yaw = Math.atan2(-door.nx, -door.nz);
    player.teleport(x, z, yaw);
    this.near = null; this.hud.showPrompt(null);
  }
}
