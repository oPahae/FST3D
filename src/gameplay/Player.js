import * as THREE from 'three';
import { U } from '../architecture/units.js';

const WALK = 4.0, RUN = 8.0, JUMP = 6.0, GRAV = 20, STEP_UP = 0.55;

/** Third-person character: camera-relative ZQSD (AZERTY), Shift to run, Space to jump, slides along walls, climbs steps. */
export class Player {
  constructor(collision, bounds) {
    this.c = collision;
    this.bounds = bounds;
    this.pos = new THREE.Vector3();
    this.vy = 0;
    this.grounded = true;
    this.camYaw = 0;          // 0 = looking north (-z)
    this.camPitch = 0.28;
    this.camDist = 6.2;
    this.ceilingFn = null;
    this.camOverride = null;
    this.ceilingY = Infinity;   // interiors: the follow camera must stay under the ceiling
    this.facing = 0;
    this.keys = new Set();
    this.speed = 0;
    this.phase = 0;
    this.avatar = this._makeAvatar();
    this.avatar.visible = false;
    this._cam = new THREE.Vector3();
    this._camInit = false;
  }

  _makeAvatar() {
    const g = new THREE.Group();
    const mat = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const jacket = mat(0x2f6fd0), jacketD = mat(0x24569f), skin = mat(0xe0b48c, 0.6), trousers = mat(0x2a2f3a), hair = mat(0x2a1d14, 0.9), shoe = mat(0xf0f0ee, 0.5), sole = mat(0x3a3a3a), bag = mat(0xb3402f), dark = mat(0x111111, 0.4), white = mat(0xffffff, 0.3);
    const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; };
    const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
    const sph = (r) => new THREE.SphereGeometry(r, 14, 10);
    const grp = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };

    this.body = grp(g, 0, 0.95, 0);                       // pelvis pivot: everything above leans / bobs with it
    this.upper = grp(this.body, 0, 0, 0);
    add(this.upper, cap(0.2, 0.3), jacket, 0, 0.3, 0, 1.12, 1, 0.78);                 // torso
    add(this.upper, new THREE.CylinderGeometry(0.215, 0.2, 0.08, 14), jacketD, 0, 0.02, 0, 1.12, 1, 0.8);   // hem
    add(this.upper, new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), jacketD, 0, 0.66, 0);                  // collar
    add(this.upper, cap(0.055, 0.06), skin, 0, 0.72, 0);                                                    // neck
    this.head = grp(this.upper, 0, 0.9, 0);
    add(this.head, sph(0.16), skin, 0, 0, 0, 0.92, 1.05, 0.98);
    add(this.head, new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hair, 0, 0.02, 0.01, 0.95, 1.05, 1.0);   // hair cap
    add(this.head, sph(0.04), skin, 0, -0.01, -0.16, 1, 0.9, 0.8);                                         // nose
    for (const sx of [-1, 1]) {
      add(this.head, sph(0.03), white, sx * 0.065, 0.025, -0.145, 1, 1, 0.5); add(this.head, sph(0.017), dark, sx * 0.065, 0.025, -0.165);   // eyes
      add(this.head, new THREE.BoxGeometry(0.07, 0.014, 0.014), hair, sx * 0.065, 0.08, -0.15);                                              // brows
      add(this.head, sph(0.035), skin, sx * 0.155, 0, 0, 0.5, 1, 1);                                                                          // ears
    }
    add(this.head, new THREE.BoxGeometry(0.07, 0.012, 0.012), mat(0x9a4a3a), 0, -0.07, -0.15);              // mouth
    add(this.upper, new THREE.BoxGeometry(0.34, 0.42, 0.14), bag, 0, 0.32, 0.22);                           // backpack (on the back = +z)
    add(this.upper, new THREE.BoxGeometry(0.28, 0.16, 0.05), mat(0x8e3123), 0, 0.2, 0.3);
    for (const sx of [-1, 1]) add(this.upper, new THREE.BoxGeometry(0.05, 0.4, 0.04), mat(0x222222), sx * 0.12, 0.38, 0.1);   // straps

    const limb = (side, hipY, hipX) => {
      const hip = grp(this.body, side * hipX, hipY, 0), knee = grp(hip, 0, -0.45, 0);
      add(hip, cap(0.092, 0.28), trousers, 0, -0.22, 0);
      add(knee, cap(0.08, 0.3), trousers, 0, -0.22, 0);
      const foot = grp(knee, 0, -0.46, 0);
      add(foot, new THREE.BoxGeometry(0.15, 0.09, 0.3), shoe, 0, 0.04, -0.05); add(foot, new THREE.BoxGeometry(0.155, 0.035, 0.31), sole, 0, -0.005, -0.05);
      return { hip, knee, foot };
    };
    this.legL = limb(-1, 0, 0.11); this.legR = limb(1, 0, 0.11);
    const arm = (side) => {
      const sh = grp(this.upper, side * 0.3, 0.55, 0), el = grp(sh, 0, -0.29, 0);
      add(sh, sph(0.075), jacket, 0, 0, 0);
      add(sh, cap(0.065, 0.2), jacket, 0, -0.14, 0);
      add(el, cap(0.058, 0.2), jacket, 0, -0.13, 0);
      add(el, sph(0.055), skin, 0, -0.3, 0);
      return { sh, el };
    };
    this.armL = arm(-1); this.armR = arm(1);
    return g;
  }

  teleport(x, z, yaw = 0) {
    this.pos.set(x, this.c.groundHeight(x, z), z);
    this.vy = 0; this.grounded = true; this.camYaw = yaw; this.facing = yaw; this._camInit = false;
    this.avatar.position.copy(this.pos); this.avatar.rotation.y = yaw;
  }

  look(dx, dy) {
    this.camYaw -= dx * 0.006;
    this.camPitch = Math.max(-0.1, Math.min(1.2, this.camPitch + dy * 0.005));
  }

  update(dt, camera) {
    if (this.camOverride) {   // first-person activity (board, PC): the camera is driven from outside, the avatar stays put
      const o = this.camOverride;
      if (Math.abs(camera.fov - o.fov) > 0.01) { camera.fov = o.fov; camera.updateProjectionMatrix(); }
      camera.position.copy(o.pos); camera.lookAt(o.target);
      return;
    }
    const k = this.keys;
    const fwd = (k.has('z') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    const str = (k.has('d') ? 1 : 0) - (k.has('q') ? 1 : 0);
    const turn = (k.has('arrowleft') ? 1 : 0) - (k.has('arrowright') ? 1 : 0);
    this.camYaw += turn * 1.8 * dt;

    let moving = false;
    if (fwd || str) {
      const sp = (k.has('shift') ? RUN : WALK);
      const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw), rx = Math.cos(this.camYaw), rz = -Math.sin(this.camYaw);
      let dx = fx * fwd + rx * str, dz = fz * fwd + rz * str;
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const total = sp * dt, steps = Math.max(1, Math.ceil(total / 0.2));
      for (let i = 0; i < steps; i++) {
        const nx = this.pos.x + (dx * total) / steps, nz = this.pos.z + (dz * total) / steps;
        this._tryMove(nx, nz);
      }
      this.facing = lerpAngle(this.facing, Math.atan2(-dx, -dz), Math.min(1, dt * 12));
      this.speed = sp; moving = true;
    } else this.speed = 0;

    if (k.has(' ') && this.grounded) { this.vy = JUMP; this.grounded = false; }
    this.vy -= GRAV * dt;
    this.pos.y += this.vy * dt;
    const gh = this.c.groundHeight(this.pos.x, this.pos.z);
    if (this.pos.y <= gh) { this.pos.y = gh; this.vy = 0; this.grounded = true; } else if (this.pos.y > gh + 0.05) this.grounded = false;

    // animation: blended idle / walk / run / jump, knees and elbows bend, body bobs and leans into the run
    const running = moving && k.has('shift');
    this.mv = (this.mv || 0) + ((moving ? 1 : 0) - (this.mv || 0)) * Math.min(1, dt * 10);
    this.rb = (this.rb || 0) + ((running ? 1 : 0) - (this.rb || 0)) * Math.min(1, dt * 6);
    this.air = (this.air || 0) + ((this.grounded ? 0 : 1) - (this.air || 0)) * Math.min(1, dt * 12);
    this.phase += dt * (moving ? this.speed * 1.3 : 0);
    this.idle = (this.idle || 0) + dt;
    const p = this.phase, mv = this.mv * (1 - this.air), rb = this.rb, A = 0.55 + 0.4 * rb;
    const leg = (L, ph, sgn) => {
      const hip = Math.sin(ph) * A, knee = -Math.max(0, Math.cos(ph)) * (0.9 + 0.7 * rb);
      L.hip.rotation.x = hip * mv + (-0.55 * sgn) * this.air;
      L.knee.rotation.x = knee * mv + (sgn > 0 ? -0.9 : -0.2) * this.air;
      L.foot.rotation.x = -knee * 0.35 * mv;
    };
    leg(this.legL, p, 1); leg(this.legR, p + Math.PI, -1);
    const armSwing = (a, ph, sgn) => {
      a.sh.rotation.x = -Math.sin(ph) * (0.5 + 0.5 * rb) * mv + (-2.1) * this.air * (sgn > 0 ? 1 : 0.8) + Math.sin(this.idle * 1.6 + sgn) * 0.03 * (1 - mv);
      a.el.rotation.x = (0.25 + 0.95 * rb + Math.max(0, Math.sin(ph)) * 0.3) * mv + 0.12 * (1 - mv) + 0.6 * this.air;
      a.sh.rotation.z = sgn * (0.06 + 0.35 * this.air);
    };
    armSwing(this.armL, p, -1); armSwing(this.armR, p + Math.PI, 1);
    const bob = Math.abs(Math.sin(p)) * (0.035 + 0.04 * rb) * mv, breathe = Math.sin(this.idle * 2.2) * 0.006 * (1 - mv);
    this.body.position.y = 0.95 + bob + breathe - 0.0;
    this.body.position.y -= (0.04 + 0.05 * rb) * mv * 0.5;
    this.upper.rotation.x = -(0.04 + 0.2 * rb) * mv - 0.1 * this.air;
    this.upper.rotation.y = Math.sin(p) * 0.12 * mv;
    this.head.rotation.x = (0.04 + 0.18 * rb) * mv;
    this.head.rotation.y = -Math.sin(p) * 0.06 * mv;
    this.avatar.position.copy(this.pos);
    this.avatar.rotation.y = this.facing;
    // wider field of view when running
    const wantFov = 55 + 6 * rb;
    if (Math.abs(camera.fov - wantFov) > 0.02) { camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }

    // follow camera with a 2D obstacle check so it does not end up inside walls
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    const cp = Math.cos(this.camPitch), sp2 = Math.sin(this.camPitch);
    const want = new THREE.Vector3(head.x + Math.sin(this.camYaw) * cp * this.camDist, head.y + sp2 * this.camDist, head.z + Math.cos(this.camYaw) * cp * this.camDist);
    let t = 1;
    for (let i = 1; i <= 14; i++) {
      const f = i / 14, x = head.x + (want.x - head.x) * f, z = head.z + (want.z - head.z) * f, y = head.y + (want.y - head.y) * f;
      if (this.c.blocked(x, z, 0.25) && y < 12) { t = Math.max(0.12, (i - 1.5) / 14); break; }
    }
    const target = new THREE.Vector3(head.x + (want.x - head.x) * t, head.y + (want.y - head.y) * t, head.z + (want.z - head.z) * t);
    target.y = Math.max(target.y, this.c.groundHeight(target.x, target.z) + 0.5);
    const cy = this.ceilingFn ? this.ceilingFn(target.x, target.z) : this.ceilingY;
    if (cy < 1e6) target.y = Math.min(target.y, cy - 0.25);
    if (!this._camInit) { this._cam.copy(target); this._camInit = true; }
    this._cam.lerp(target, Math.min(1, dt * 10));
    camera.position.copy(this._cam);
    camera.lookAt(head.x, head.y - 0.1, head.z);
  }

  _tryMove(nx, nz) {
    this.c.playerY = this.pos.y;
    const R = U.avatarR, b = this.bounds;
    nx = Math.max(b.x0, Math.min(b.x1, nx)); nz = Math.max(b.z0, Math.min(b.z1, nz));
    const [rx, rz] = this.c.resolve(nx, nz, R);
    const gh = this.c.groundHeight(rx, rz);
    if (gh - this.pos.y > STEP_UP) return false;   // too tall to step onto
    this.pos.x = rx; this.pos.z = rz;
    return true;
  }
}

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
