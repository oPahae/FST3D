import * as THREE from 'three';
import { Interior } from './Interior.js';

/**
 * Mini football pitch (door beside the lighting pole): artificial turf, white markings, two goals with nets, fenced.
 * A ball lies at the centre: run into it to dribble, press K near it to shoot (aim-assist towards the nearest goal).
 * Plan: x 0..20, z 0..34. Goal lines at z = GZ and z = L - GZ, goal width 3.6 m, height 2.2 m.
 */
export function buildFoot({ mats, tex }, mgr) {
  const W = 20, L = 34, GZ = 1.8, GW = 1.8, GH = 2.2, CX = W / 2, R = 0.22;
  const it = new Interior('foot', { name: 'Terrain de foot', mats, tex, bg: 0x9fcdf0, hemi: [0xffffff, 0xa9c98f, 1.9], envIntensity: 0.55, ceilingY: 60, camDist: 5.2 });
  const k = it.kit;

  // ---- ground ---------------------------------------------------------------------------------------------------------------
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  { const g = cv.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f8a3f' : '#34964a'; g.fillRect(0, i * 32, 256, 32); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(20,80,30,.18)' : 'rgba(120,200,110,.14)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }
  const turfTex = new THREE.CanvasTexture(cv); turfTex.wrapS = turfTex.wrapT = THREE.RepeatWrapping; turfTex.repeat.set(W / 8, L / 8); turfTex.colorSpace = THREE.SRGBColorSpace; turfTex.anisotropy = 8;
  const turf = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshStandardMaterial({ map: turfTex, roughness: 1 }));
  turf.rotation.x = -Math.PI / 2; turf.position.set(CX, 0, L / 2); it.group.add(turf);
  const out = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x6f8f4d, roughness: 1 }));
  out.rotation.x = -Math.PI / 2; out.position.set(CX, -0.05, L / 2); it.group.add(out);

  // markings
  const m = 0.9, ln = (x0, x1, z0, z1) => k.span('white', x0, x1, 0.005, 0.02, z0, z1), t = 0.1;
  ln(m, W - m, m, m + t); ln(m, W - m, L - m - t, L - m); ln(m, m + t, m, L - m); ln(W - m - t, W - m, m, L - m); ln(m, W - m, L / 2 - t / 2, L / 2 + t / 2);
  for (let i = 0; i < 32; i++) { const a = (i / 32) * 6.2832; k.box('white', CX + Math.cos(a) * 2.6, 0.012, L / 2 + Math.sin(a) * 2.6, 0.55, 0.014, 0.1, -a + Math.PI / 2); }
  k.span('white', CX - 0.12, CX + 0.12, 0.005, 0.02, L / 2 - 0.12, L / 2 + 0.12);
  for (const s of [0, 1]) {   // penalty areas
    const z = s ? L - m : m, d = s ? -1 : 1, z2 = z + d * 4.2;
    ln(CX - 4, CX + 4, Math.min(z2, z2 + d * t) - (s ? 0 : 0), Math.max(z2, z2 + d * t)); ln(CX - 4, CX - 4 + t, Math.min(z, z2), Math.max(z, z2)); ln(CX + 4 - t, CX + 4, Math.min(z, z2), Math.max(z, z2));
  }

  // ---- fence ------------------------------------------------------------------------------------------------------------------
  const FH = 3.6;
  k.span('wallYellow', -0.3, 0, 0, 0.7, 0, L); k.span('wallYellow', W, W + 0.3, 0, 0.7, 0, L); k.span('wallYellow', 0, W, 0, 0.7, -0.3, 0); k.span('wallYellow', 0, W, 0, 0.7, L, L + 0.3);
  k.span('glass', -0.05, 0, 0.7, FH, 0, L); k.span('glass', W, W + 0.05, 0.7, FH, 0, L); k.span('glass', 0, W, 0.7, FH, -0.05, 0); k.span('glass', 0, W, 0.7, FH, L, L + 0.05);
  for (const x of [0, W]) { k.span('frameGreen', x - 0.06, x + 0.06, FH - 0.06, FH + 0.04, 0, L); for (let z = 0; z <= L + 0.01; z += 3.4) k.span('frameGreen', x - 0.05, x + 0.05, 0, FH, z - 0.05, z + 0.05); }
  for (const z of [0, L]) { k.span('frameGreen', 0, W, FH - 0.06, FH + 0.04, z - 0.06, z + 0.06); for (let x = 0; x <= W + 0.01; x += 3.4) k.span('frameGreen', x - 0.05, x + 0.05, 0, FH, z - 0.05, z + 0.05); }
  it.roomWalls(0, 0, W, L);

  // floodlight poles in the corners
  for (const [x, z] of [[0.4, 0.4], [W - 0.4, 0.4], [0.4, L - 0.4], [W - 0.4, L - 0.4]]) { k.span('poleGrey' in mats ? 'poleGrey' : 'metalGrey', x - 0.07, x + 0.07, 0, 6, z - 0.07, z + 0.07); k.span('lamp', x - 0.3, x + 0.3, 6, 6.15, z - 0.2, z + 0.2); }
  const sun = new THREE.DirectionalLight(0xfff4de, 1.3); sun.position.set(CX + 8, 30, L / 2 + 6); sun.target.position.set(CX, 0, L / 2); it.group.add(sun, sun.target);

  // ---- goals --------------------------------------------------------------------------------------------------------------------
  const nc = document.createElement('canvas'); nc.width = nc.height = 64;
  { const g = nc.getContext('2d'); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64); }
  const netTex = new THREE.CanvasTexture(nc); netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.colorSpace = THREE.SRGBColorSpace;
  const netMat = (rx, ry) => { const t2 = netTex.clone(); t2.needsUpdate = true; t2.repeat.set(rx, ry); return new THREE.MeshBasicMaterial({ map: t2, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.1 }); };
  const panel = (w, h, x, y, z, rx, ry, rot) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), netMat(w / 0.12, h / 0.12)); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); if (rot) p.rotation.z = rot; it.group.add(p); };
  const goals = [];
  for (const s of [0, 1]) {
    const gz = s ? L - GZ : GZ, d = s ? 1 : -1, back = s ? L - 0.1 : 0.1, D = Math.abs(back - gz);
    for (const x of [CX - GW, CX + GW]) k.span('white', x - 0.06, x + 0.06, 0, GH, gz - 0.06, gz + 0.06);
    k.span('white', CX - GW, CX + GW, GH - 0.06, GH + 0.06, gz - 0.06, gz + 0.06);
    for (const x of [CX - GW, CX + GW]) { k.span('white', x - 0.03, x + 0.03, GH - 0.03, GH + 0.03, Math.min(gz, back), Math.max(gz, back)); k.span('white', x - 0.03, x + 0.03, 0, 0.06, Math.min(gz, back), Math.max(gz, back)); }
    k.span('white', CX - GW, CX + GW, GH - 0.03, GH + 0.03, back - 0.03, back + 0.03);
    panel(2 * GW, GH, CX, GH / 2, back, 0, 0);
    panel(D, GH, CX - GW, GH / 2, (gz + back) / 2, 0, Math.PI / 2); panel(D, GH, CX + GW, GH / 2, (gz + back) / 2, 0, Math.PI / 2);
    panel(2 * GW, D, CX, GH, (gz + back) / 2, Math.PI / 2, 0);
    it.solid(CX - GW - 0.1, Math.min(gz, back) - 0.2, CX + GW + 0.1, Math.max(gz, back) + 0.2, 'goal');   // players stay out of the goals
    goals.push({ gz, d, back });
  }

  // ---- exit door: same fence side and same relative position as the door used to come in -------------------------------------------
  const cd = (mgr.campusDoors || []).find((d) => d.world === 'foot') || { side: 'W', frac: 0.5 };
  const fr = Math.min(0.92, Math.max(0.08, cd.frac ?? 0.5));
  const ex = cd.side === 'W' ? 0 : cd.side === 'E' ? W : fr * W, ez = cd.side === 'N' ? 0 : cd.side === 'S' ? L : fr * L;
  const inx = cd.side === 'W' ? 1 : cd.side === 'E' ? -1 : 0, inz = cd.side === 'N' ? 1 : cd.side === 'S' ? -1 : 0;
  const hz = inx ? [0.14, 0.65] : [0.65, 0.14];
  k.box('doorGreen', ex - inx * 0.05, 1.1, ez - inz * 0.05, hz[0] * (inx ? 1 : 2) , 2.2, hz[1] * (inx ? 2 : 1));
  it.addExit(ex, ez, inx, inz, 0, { standOff: 1.3, doorH: 2.4, markerScale: 0.7, markerY: 2.6, label: 'Sortir' });
  it.spawns.push({ x: ex + inx * 2.6, z: ez + inz * 2.6, yaw: Math.atan2(-inx, -inz) });

  // ---- ball ---------------------------------------------------------------------------------------------------------------------
  const geo = new THREE.IcosahedronGeometry(R, 1).toNonIndexed();
  const cols = []; for (let i = 0; i < geo.attributes.position.count / 3; i++) { const c = i % 4 === 0 ? 0.1 : 0.96; for (let j = 0; j < 3; j++) cols.push(c, c, c); }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const ball = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true }));
  it.group.add(ball);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; it.group.add(shadow);

  const S = { x: CX, y: R, z: L / 2, vx: 0, vy: 0, vz: 0, goals: 0, scored: false, timer: 0, px: 0, pz: 0, init: false };
  const reset = () => { S.x = CX; S.y = R; S.z = L / 2; S.vx = S.vy = S.vz = 0; S.scored = false; };
  reset();

  const segPush = (ax, az, bx, bz, r, damp) => {   // circle (ball) vs segment
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
    let tt = ((S.x - ax) * dx + (S.z - az) * dz) / l2; tt = Math.max(0, Math.min(1, tt));
    const qx = ax + dx * tt, qz = az + dz * tt, ex = S.x - qx, ez = S.z - qz, dd = Math.hypot(ex, ez);
    if (dd < r) {
      const nx = dd > 1e-6 ? ex / dd : 1, nz = dd > 1e-6 ? ez / dd : 0, vn = S.vx * nx + S.vz * nz;
      S.x = qx + nx * r; S.z = qz + nz * r;
      if (vn < 0) { S.vx -= (1 + damp) * vn * nx; S.vz -= (1 + damp) * vn * nz; }
    }
  };
  const q = new THREE.Quaternion(), ax = new THREE.Vector3();
  const step = (h) => {
    S.vy -= 9.8 * h; S.y += S.vy * h;
    if (S.y < R) { S.y = R; if (S.vy < -1.2) S.vy = -S.vy * 0.6; else S.vy = 0; }
    const px = S.x, pz = S.z;
    S.x += S.vx * h; S.z += S.vz * h;
    if (S.y <= R + 0.02) { const sp = Math.hypot(S.vx, S.vz), ns = Math.max(0, sp - (1.1 + 0.3 * sp) * h); if (sp > 1e-6) { S.vx *= ns / sp; S.vz *= ns / sp; } } else { S.vx *= 1 - 0.05 * h; S.vz *= 1 - 0.05 * h; }
    // pitch walls
    if (S.x < R) { S.x = R; S.vx = Math.abs(S.vx) * 0.6; } if (S.x > W - R) { S.x = W - R; S.vx = -Math.abs(S.vx) * 0.6; }
    if (S.z < R) { S.z = R; S.vz = Math.abs(S.vz) * 0.3; } if (S.z > L - R) { S.z = L - R; S.vz = -Math.abs(S.vz) * 0.3; }
    for (const g of goals) {
      const lo = Math.min(g.gz, g.back), hi = Math.max(g.gz, g.back);
      if (S.y < GH + 0.1) {
        for (const sx of [CX - GW, CX + GW]) segPush(sx, lo, sx, hi, R + 0.03, 0.25);            // side nets
        for (const sx of [CX - GW, CX + GW]) segPush(sx, g.gz, sx, g.gz, R + 0.06, 0.8);           // posts
      }
      // crossbar (cylinder along x at z = gz, y = GH)
      if (Math.abs(S.x - CX) < GW) { const dz = S.z - g.gz, dy = S.y - GH, dd = Math.hypot(dz, dy); if (dd < R + 0.06 && dd > 1e-4) { const nz = dz / dd, ny = dy / dd, vn = S.vz * nz + S.vy * ny; S.z = g.gz + nz * (R + 0.06); S.y = GH + ny * (R + 0.06); if (vn < 0) { S.vz -= 1.5 * vn * nz; S.vy -= 1.5 * vn * ny; } } }
      // inside the net: roof and back
      if (Math.abs(S.x - CX) < GW && S.z > lo && S.z < hi && S.y > GH - R) { S.y = GH - R; if (S.vy > 0) S.vy = -S.vy * 0.2; }
      const inNet = Math.abs(S.x - CX) < GW && (g.d < 0 ? S.z < g.gz : S.z > g.gz);
      if (inNet) { S.vx *= 1 - 3 * h; S.vz *= 1 - 3 * h; }
      // goal line crossing
      const crossed = g.d < 0 ? (pz >= g.gz && S.z < g.gz) : (pz <= g.gz && S.z > g.gz);
      if (crossed && !S.scored && Math.abs(S.x - CX) < GW && S.y < GH) {
        S.scored = true; S.timer = 2.6; S.goals++; mgr.hud.banner(`BUT ! ⚽  (${S.goals})`); updHud();
      }
    }
  };

  // ---- HUD (hint + score) -------------------------------------------------------------------------------------------------------
  let hud = null;
  const updHud = () => { if (hud) hud.innerHTML = `⚽ <b>Buts : ${S.goals}</b> &nbsp;·&nbsp; courez dans le ballon pour dribbler &nbsp;·&nbsp; <b>K</b> tirer &nbsp;·&nbsp; <b>Maj</b> sprint`; };
  it.onEnter = () => {
    if (!hud) { hud = document.createElement('div'); hud.style.cssText = 'position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:rgba(14,18,24,.8);color:#cfd6de;font:12px system-ui,sans-serif;padding:5px 12px;border-radius:8px;pointer-events:none;z-index:30'; document.body.appendChild(hud); }
    hud.style.display = ''; updHud(); reset(); S.init = false;
  };
  it.onLeave = () => { if (hud) hud.style.display = 'none'; };

  // ---- kick -----------------------------------------------------------------------------------------------------------------------
  it.onK = () => {
    const p = mgr.player, dx = S.x - p.pos.x, dz = S.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d > 1.7 || S.y > 1.2) return;
    let fx = -Math.sin(p.facing), fz = -Math.cos(p.facing);
    if (dx * fx + dz * fz < -0.3 * d) return;   // ball behind the player
    let best = null, ba = 0.7;
    for (const g of goals) { const gx = CX - S.x, gzv = g.gz - S.z, gl = Math.hypot(gx, gzv) || 1, c = (fx * gx + fz * gzv) / gl; const a = Math.acos(Math.min(1, c)); if (a < ba) { ba = a; best = [gx / gl, gzv / gl]; } }
    if (best) { fx = fx * 0.4 + best[0] * 0.6; fz = fz * 0.4 + best[1] * 0.6; const l = Math.hypot(fx, fz); fx /= l; fz /= l; }
    const pw = 19;
    S.vx = fx * pw; S.vz = fz * pw; S.vy = 2.6;
  };

  it.updaters.push((dt) => {
    const p = mgr.player;
    if (!S.init) { S.px = p.pos.x; S.pz = p.pos.z; S.init = true; }
    const pvx = (p.pos.x - S.px) / Math.max(dt, 1e-3), pvz = (p.pos.z - S.pz) / Math.max(dt, 1e-3);
    S.px = p.pos.x; S.pz = p.pos.z;
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) {
      step(h);
      // player contact: dribble
      const dx = S.x - p.pos.x, dz = S.z - p.pos.z, d = Math.hypot(dx, dz), rr = 0.36 + R;
      if (d < rr && S.y < 0.9 && p.pos.y < 0.6) {
        const nx = d > 1e-5 ? dx / d : -Math.sin(p.facing), nz = d > 1e-5 ? dz / d : -Math.cos(p.facing);
        S.x = p.pos.x + nx * rr; S.z = p.pos.z + nz * rr;
        const pn = pvx * nx + pvz * nz, bn = S.vx * nx + S.vz * nz, want = Math.max(pn * 1.25, 0.6 * Math.abs(pn));
        if (bn < want) { S.vx += nx * (want - bn); S.vz += nz * (want - bn); }
      }
    }
    if (S.scored) { S.timer -= dt; if (S.timer <= 0) reset(); }
    ball.position.set(S.x, S.y, S.z); shadow.position.set(S.x, 0.03, S.z); shadow.scale.setScalar(Math.max(0.4, 1.2 - S.y * 0.4));
    const sp = Math.hypot(S.vx, S.vz);
    if (sp > 0.02) { ax.set(S.vz, 0, -S.vx).normalize(); q.setFromAxisAngle(ax, (sp * dt) / R); ball.quaternion.premultiply(q); }
  });

  it.ballState = S;
  return it.finalize();
}
