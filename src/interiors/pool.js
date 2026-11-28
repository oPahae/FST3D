import * as THREE from 'three';

/**
 * Golvazer (UK blackball: 7 yellow, 7 red, 1 black) on the buvette tables: you (first break) against the computer.
 * Table-local metres, origin = table centre. Playing surface at y = 0.80.
 * Rules implemented: open table after the break, group assignment on the first legal pocketed ball, first-contact rule,
 * rail-or-pocket rule, scratch / foul -> ball in hand for the opponent, 8-ball win / loss conditions.
 */
const R = 0.0262, HX = 0.92, HZ = 0.46, Y0 = 0.80;
const POCKETS = [[-HX - 0.015, -HZ - 0.015, 0.078], [HX + 0.015, -HZ - 0.015, 0.078], [-HX - 0.015, HZ + 0.015, 0.078], [HX + 0.015, HZ + 0.015, 0.078], [0, -HZ - 0.035, 0.07], [0, HZ + 0.035, 0.07]];
const YEL = 0xf0c20a, RED = 0xc9211e, BLK = 0x111111;
const ballColor = (n) => (n === 8 ? BLK : n < 8 ? YEL : RED);
const typeOf = (n) => (n === 8 ? 'eight' : n < 8 ? 'yellow' : 'red');
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const GROUP_FR = { yellow: 'jaunes', red: 'rouges' };

const texCache = new Map();
function ballTexture(n) {
  if (texCache.has(n)) return texCache.get(n);
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = n === 0 ? '#f4f4ef' : hex(ballColor(n)); g.fillRect(0, 0, 128, 64);
  g.fillStyle = n === 0 ? '#c33' : 'rgba(255,255,255,.55)';        // small spots so the rolling is visible
  for (const u of [32, 96]) { g.beginPath(); g.arc(u, 32, 5, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  texCache.set(n, t); return t;
}

function injectStyle() {
  if (document.getElementById('pool-style')) return;
  const st = document.createElement('style'); st.id = 'pool-style';
  st.textContent = `
  #modeHint{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:rgba(14,18,24,.8);color:#cfd6de;font:12px system-ui,sans-serif;padding:5px 12px;border-radius:8px;pointer-events:none;z-index:30}
  #modeHint b{color:#fff}
    #pool{position:absolute;left:12px;top:12px;z-index:25;background:rgba(14,18,24,.84);color:#e6ebf0;font:13px system-ui,sans-serif;padding:10px 12px;border-radius:10px;min-width:230px;max-width:290px;pointer-events:none}
  #pool h4{margin:0 0 6px;font-size:13px;font-weight:700;color:#ffd25a}
  #pool .row{display:flex;justify-content:space-between;gap:10px;padding:2px 0}
  #pool .row.turn b{color:#7CFC9A}
  #pool .tray{display:flex;flex-wrap:wrap;gap:3px;margin:4px 0 2px;min-height:18px}
  #pool .ball{width:17px;height:17px;border-radius:50%;display:grid;place-items:center;font-size:9px;font-weight:800;color:#fff;border:1px solid rgba(255,255,255,.5)}
  #pool .msg{margin-top:6px;color:#ffe9a6;min-height:1.2em}
  #poolPower{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);width:300px;height:14px;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.35);border-radius:8px;overflow:hidden;z-index:25;display:none}
  #poolPower i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3fd16b,#ffd24a,#ff4d3a)}
  #poolBig{position:absolute;left:50%;top:22%;transform:translateX(-50%);z-index:26;background:rgba(14,18,24,.9);color:#fff;font:700 26px system-ui,sans-serif;padding:14px 26px;border-radius:12px;display:none;text-align:center}
  #poolBig small{display:block;font:13px system-ui;color:#cfd6de;margin-top:6px}
  `;
  document.head.appendChild(st);
}

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
  let t = ((px - ax) * dx + (pz - az) * dz) / L2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function createPoolMode(mgr, it, table) {
  injectStyle();
  const hintEl = () => document.getElementById('modeHint');
  const setHint = (html) => { let el = hintEl(); if (!el) { el = document.createElement('div'); el.id = 'modeHint'; document.body.appendChild(el); } el.innerHTML = html; el.style.display = html ? '' : 'none'; };

  const g = new THREE.Group(); g.position.set(table.cx, 0, table.cz); g.rotation.y = table.rot || 0; it.group.add(g); g.updateMatrixWorld(true);
  const geo = new THREE.SphereGeometry(R, 24, 16);
  const balls = [];
  for (let n = 0; n <= 15; n++) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: ballTexture(n), roughness: 0.22, metalness: 0.02 }));
    mesh.position.y = Y0 + R; mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); g.add(mesh);
    balls.push({ n, x: 0, z: 0, vx: 0, vz: 0, active: true, mesh, sink: null });
  }
  const cueBall = balls[0];

  // aim helpers
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthTest: false });
  const lineMat2 = new THREE.LineBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.85, depthTest: false });
  const mkLine = (m) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), m); l.renderOrder = 10; l.frustumCulled = false; g.add(l); return l; };
  const aimLine = mkLine(lineMat), objLine = mkLine(lineMat2);
  const zoneLine = mkLine(lineMat2); zoneLine.geometry.setFromPoints([new THREE.Vector3(-HX / 2, Y0 + 0.006, -HZ), new THREE.Vector3(-HX / 2, Y0 + 0.006, HZ)]); zoneLine.visible = false;
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.86, R, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 11; g.add(ring);
  const cueGeo = new THREE.CylinderGeometry(0.0052, 0.0085, 1.45, 10); cueGeo.translate(0, -0.725, 0);
  const cue = new THREE.Group();
  const shaft = new THREE.Mesh(cueGeo, new THREE.MeshStandardMaterial({ color: 0xd9a35f, roughness: 0.45 }));
  const tipM = new THREE.Mesh(new THREE.CylinderGeometry(0.0054, 0.0054, 0.012, 8), new THREE.MeshStandardMaterial({ color: 0x3a6fb0, roughness: 0.8 })); tipM.position.y = 0.006;
  const butt = new THREE.Mesh(new THREE.CylinderGeometry(0.0086, 0.0092, 0.5, 10), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.5 })); butt.position.y = -1.2;
  cue.add(shaft, tipM, butt); g.add(cue);

  // HUD
  const hud = document.createElement('div'); hud.id = 'pool'; document.body.appendChild(hud);
  const pbar = document.createElement('div'); pbar.id = 'poolPower'; pbar.innerHTML = '<i></i>'; document.body.appendChild(pbar);
  const big = document.createElement('div'); big.id = 'poolBig'; document.body.appendChild(big);

  // ---- game state -----------------------------------------------------------------------------------------------------------
  const S = {
    phase: 'aim', turn: 'you', visits: 1, groups: { you: null, cpu: null }, breakShot: true, aim: 0, power: 0, t: 0,
    shot: null, msg: 'À vous de casser !', strike: null, pocketedAll: [], over: null, cpuT: 0, cpuPlan: null,
  };

  function rack() {
    const dx = 2 * R * 0.8660254 + 0.0006, dz = 2 * R + 0.0008, fx = HX / 2;
    const rest = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const slots = []; for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) slots.push([fx + r * dx, (k - r / 2) * dz]);
    const order = new Array(15);
    order[0] = null; order[4] = 8;                                             // apex, centre of the third row (index 4 = row 2 middle)
    // slots index: row0:0 ; row1:1,2 ; row2:3,4,5 ; row3:6..9 ; row4:10..14 ; corners of last row = 10 and 14 must be one solid + one stripe
    const solids = rest.filter((n) => n < 8), stripes = rest.filter((n) => n > 8);
    const arr = new Array(15).fill(0); arr[4] = 8;
    arr[10] = solids.pop(); arr[14] = stripes.pop();
    const pool = [...solids, ...stripes]; for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (let i = 0; i < 15; i++) if (!arr[i]) arr[i] = pool.pop();
    arr.forEach((n, i) => { const b = balls[n]; b.x = slots[i][0] + (Math.random() - 0.5) * 0.0006; b.z = slots[i][1]; b.vx = b.vz = 0; b.active = true; b.sink = null; b.mesh.visible = true; });
    Object.assign(cueBall, { x: -HX / 2, z: 0, vx: 0, vz: 0, active: true, sink: null }); cueBall.mesh.visible = true;
    syncMeshes();
  }
  function syncMeshes() { for (const b of balls) if (!b.sink) b.mesh.position.set(b.x, Y0 + R, b.z); }

  const free = (x, z, skip) => Math.abs(x) <= HX - R - 0.002 && Math.abs(z) <= HZ - R - 0.002 && balls.every((b) => b === skip || !b.active || Math.hypot(b.x - x, b.z - z) > 2 * R + 0.003);
  const groupBalls = (grp) => balls.filter((b) => b.n > 0 && b.n !== 8 && typeOf(b.n) === grp);
  const cleared = (who) => !!S.groups[who] && groupBalls(S.groups[who]).every((b) => !b.active);
  const legalTarget = (who, b) => b.n === 8 ? cleared(who) : (!S.groups[who] || typeOf(b.n) === S.groups[who]);

  // ---- physics -----------------------------------------------------------------------------------------------------------------
  const moving = () => balls.some((b) => b.active && (Math.abs(b.vx) > 0.003 || Math.abs(b.vz) > 0.003));
  function sub(dt) {
    for (const b of balls) {
      if (!b.active) continue;
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) {
        const dec = (0.3 + 0.35 * sp) * dt;
        if (dec >= sp || sp < 0.012) { b.vx = b.vz = 0; } else { const k = (sp - dec) / sp; b.vx *= k; b.vz *= k; }
        b.x += b.vx * dt; b.z += b.vz * dt;
      }
      // pockets
      for (const [px, pz, pr] of POCKETS) {
        if (Math.hypot(b.x - px, b.z - pz) < pr) {
          b.active = false; b.sink = { t: 0, px, pz, sx: b.x, sz: b.z };
          if (b === cueBall) S.shot.cuePocketed = true; else { S.shot.pocketed.push(b.n); S.pocketedAll.push(b.n); }
          b.vx = b.vz = 0; break;
        }
      }
      if (!b.active) continue;
      // cushions (no bounce inside a pocket mouth)
      let mouth = false; for (const [px, pz, pr] of POCKETS) if (Math.hypot(b.x - px, b.z - pz) < pr + 0.03) { mouth = true; break; }
      if (!mouth) {
        const lx = HX - R, lz = HZ - R; let hit = false;
        if (b.x > lx && b.vx > 0) { b.x = lx; b.vx = -b.vx * 0.78; b.vz *= 0.97; hit = true; } else if (b.x < -lx && b.vx < 0) { b.x = -lx; b.vx = -b.vx * 0.78; b.vz *= 0.97; hit = true; }
        if (b.z > lz && b.vz > 0) { b.z = lz; b.vz = -b.vz * 0.78; b.vx *= 0.97; hit = true; } else if (b.z < -lz && b.vz < 0) { b.z = -lz; b.vz = -b.vz * 0.78; b.vx *= 0.97; hit = true; }
        if (hit && S.shot && S.shot.contact) S.shot.rail = true;
      }
    }
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i]; if (!a.active) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const c = balls[j]; if (!c.active) continue;
        const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = 2 * R - d;
        a.x -= nx * ov / 2; a.z -= nz * ov / 2; c.x += nx * ov / 2; c.z += nz * ov / 2;
        const vn = (a.vx - c.vx) * nx + (a.vz - c.vz) * nz;
        if (vn > 0) {
          const im = (1 + 0.96) / 2 * vn;
          a.vx -= im * nx; a.vz -= im * nz; c.vx += im * nx; c.vz += im * nz;
          if (S.shot && !S.shot.contact && (a === cueBall || c === cueBall)) { S.shot.contact = true; S.shot.first = a === cueBall ? c.n : a.n; }
        }
      }
    }
  }
  function stepPhysics(dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 480)));
    for (let i = 0; i < n; i++) sub(dt / n);
    for (const b of balls) {
      if (b.sink) {
        b.sink.t += dt; const k = Math.min(1, b.sink.t / 0.28);
        b.mesh.position.set(b.sink.sx + (b.sink.px - b.sink.sx) * k, Y0 + R - k * 0.12, b.sink.sz + (b.sink.pz - b.sink.sz) * k);
        if (k >= 1) { b.mesh.visible = false; b.sink = null; }
      } else if (b.active) {
        b.mesh.position.set(b.x, Y0 + R, b.z);
        const sp = Math.hypot(b.vx, b.vz);
        if (sp > 0.001) { const ax = new THREE.Vector3(b.vz, 0, -b.vx).normalize(); b.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, sp * dt / R)); }
      }
    }
  }

  // ---- aim prediction -------------------------------------------------------------------------------------------------------------
  function predict(ox, oz, ang, skip = cueBall) {
    const dx = Math.cos(ang), dz = Math.sin(ang);
    let tBest = Infinity, hitBall = null;
    for (const b of balls) {
      if (!b.active || b === skip) continue;
      const fx = b.x - ox, fz = b.z - oz, proj = fx * dx + fz * dz;
      if (proj <= 0) continue;
      const perp2 = fx * fx + fz * fz - proj * proj, rr = 4 * R * R;
      if (perp2 > rr) continue;
      const t = proj - Math.sqrt(rr - perp2);
      if (t < tBest) { tBest = t; hitBall = b; }
    }
    const lx = HX - R, lz = HZ - R;
    let tw = Infinity;
    if (dx > 1e-6) tw = Math.min(tw, (lx - ox) / dx); else if (dx < -1e-6) tw = Math.min(tw, (-lx - ox) / dx);
    if (dz > 1e-6) tw = Math.min(tw, (lz - oz) / dz); else if (dz < -1e-6) tw = Math.min(tw, (-lz - oz) / dz);
    if (tw < tBest) return { t: tw, ball: null };
    return { t: tBest, ball: hitBall };
  }
  function updateGuide(show) {
    aimLine.visible = objLine.visible = ring.visible = show;
    if (!show) return;
    const y = Y0 + 0.006, p = predict(cueBall.x, cueBall.z, S.aim), dx = Math.cos(S.aim), dz = Math.sin(S.aim);
    const hx = cueBall.x + dx * p.t, hz = cueBall.z + dz * p.t;
    aimLine.geometry.setFromPoints([new THREE.Vector3(cueBall.x, y, cueBall.z), new THREE.Vector3(hx, y, hz)]);
    ring.position.set(hx, y, hz);
    if (p.ball) {
      const nx = p.ball.x - hx, nz = p.ball.z - hz, L = Math.hypot(nx, nz) || 1;
      objLine.visible = true; objLine.geometry.setFromPoints([new THREE.Vector3(p.ball.x, y, p.ball.z), new THREE.Vector3(p.ball.x + nx / L * 0.3, y, p.ball.z + nz / L * 0.3)]);
    } else objLine.visible = false;
  }
  function placeCue(pull) {
    const dir = new THREE.Vector3(Math.cos(S.aim), -0.07, Math.sin(S.aim)).normalize();
    cue.position.set(cueBall.x - Math.cos(S.aim) * (R + 0.012 + pull), Y0 + R + 0.004 + pull * 0.05, cueBall.z - Math.sin(S.aim) * (R + 0.012 + pull));
    cue.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  }

  // ---- AI ----------------------------------------------------------------------------------------------------------------------------
  function planFrom(cx, cz, who) {
    let best = null;
    const targets = balls.filter((b) => b.n > 0 && b.active && legalTarget(who, b));
    for (const t of targets) for (const [px, pz] of POCKETS) {
      const tx = px - t.x, tz = pz - t.z, tl = Math.hypot(tx, tz) || 1, ux = tx / tl, uz = tz / tl;
      const gx = t.x - ux * 2 * R, gz = t.z - uz * 2 * R, vx = gx - cx, vz = gz - cz, dcg = Math.hypot(vx, vz);
      if (dcg < 0.02) continue;
      const cos = (vx * ux + vz * uz) / dcg; if (cos < 0.28) continue;
      let blocked = false;
      for (const o of balls) {
        if (!o.active || o === cueBall || o === t) continue;
        if (segDist(o.x, o.z, cx, cz, gx, gz) < 2 * R * 1.06 || segDist(o.x, o.z, t.x, t.z, px, pz) < 2 * R * 1.06) { blocked = true; break; }
      }
      if (blocked) continue;
      if (Math.abs(gx) > HX - R || Math.abs(gz) > HZ - R) continue;
      const score = dcg + 1.5 * tl + (1 - cos) * 2.5;
      if (!best || score < best.score) best = { score, angle: Math.atan2(vz, vx), dcg, tl, cos };
    }
    return best;
  }
  function cpuDecide() {
    if (S.breakShot) return { angle: Math.atan2(0, 1) + gauss() * 0.01, p: 0.97 };
    const pl = planFrom(cueBall.x, cueBall.z, 'cpu');
    if (pl) {
      const v = Math.min(5.2, 1.2 + 1.6 * (pl.dcg + pl.tl)), p = Math.sqrt(Math.max(0, v - 0.3) / 6.2);
      return { angle: pl.angle + gauss() * (0.006 + (1 - pl.cos) * 0.02), p: Math.max(0.3, Math.min(0.9, p)) };
    }
    // no clean shot: tap the nearest legal ball
    let nb = null, nd = Infinity;
    for (const b of balls) if (b.n > 0 && b.active && legalTarget('cpu', b)) { const d = Math.hypot(b.x - cueBall.x, b.z - cueBall.z); if (d < nd) { nd = d; nb = b; } }
    if (!nb) nb = balls.find((b) => b.n > 0 && b.active);
    return { angle: Math.atan2(nb.z - cueBall.z, nb.x - cueBall.x) + gauss() * 0.02, p: 0.42 };
  }
  function cpuPlaceCue() {
    let best = null;
    for (let i = 0; i < 60; i++) {
      const x = -HX + R + 0.01 + Math.random() * (HX / 2 - R - 0.02), z = (Math.random() * 2 - 1) * (HZ - 0.08);
      if (!free(x, z, cueBall)) continue;
      const pl = planFrom(x, z, 'cpu'); const sc = pl ? pl.score : 99;
      if (!best || sc < best.sc) best = { x, z, sc };
    }
    if (!best) best = { x: -HX * 0.75, z: 0 };
    cueBall.x = best.x; cueBall.z = best.z; cueBall.vx = cueBall.vz = 0;
  }

  // ---- turn flow -------------------------------------------------------------------------------------------------------------------
  const who = (t) => (t === 'you' ? 'Vous' : 'Ordinateur');
  function beginShot(angle, p) {
    S.aim = angle; S.phase = 'strike';
    S.strike = { t: 0, p, pull: 0.04 + p * 0.25 };
    pbar.style.display = 'none';
  }
  function fire(p) {
    const v = 0.3 + 6.2 * p * p;
    cueBall.vx = Math.cos(S.aim) * v; cueBall.vz = Math.sin(S.aim) * v;
    S.shot = { pocketed: [], cuePocketed: false, first: null, contact: false, rail: false, clearedBefore: cleared(S.turn) };
    S.phase = 'rolling'; S.idle = 0; cue.visible = false; updateGuide(false);
  }
  function respot8() {
    const b = balls[8]; b.active = true; b.sink = null; b.mesh.visible = true; b.vx = b.vz = 0;
    let x = HX / 2; b.z = 0;
    while (!free(x, 0, b) && x < HX - 0.1) x += 2 * R + 0.002;
    b.x = x; S.pocketedAll = S.pocketedAll.filter((n) => n !== 8);
  }
  function evaluate() {
    const s = S.turn, opp = s === 'you' ? 'cpu' : 'you', sh = S.shot, pk = sh.pocketed;
    let foul = false, reason = '';
    const myGroup = S.groups[s];
    if (sh.first === null) { foul = true; reason = 'aucune bille touchée'; }
    else if (!S.breakShot) {
      if (sh.clearedBefore) { if (sh.first !== 8) { foul = true; reason = 'il fallait toucher la noire en premier'; } }
      else if (myGroup) { if (typeOf(sh.first) !== myGroup) { foul = true; reason = 'mauvaise bille touchée en premier'; } }
      else if (sh.first === 8) { foul = true; reason = 'la noire ne peut pas être touchée en premier'; }
    }
    if (sh.cuePocketed) { foul = true; reason = 'la blanche est tombée'; }
    if (!foul && pk.length === 0 && !sh.rail) { foul = true; reason = 'aucune bille n’a touché une bande'; }
    // 8-ball pocketed
    if (pk.includes(8)) {
      if (S.breakShot) { respot8(); pk.splice(pk.indexOf(8), 1); S.msg = 'La noire est tombée au cassage : elle est replacée.'; }
      else {
        const win = sh.clearedBefore && !foul;
        S.over = win ? s : opp; S.phase = 'over';
        S.msg = win ? `${who(s)} : noire empochée, victoire !` : `${who(s)} a empoché la noire trop tôt${foul ? ' / faute' : ''} : défaite.`;
        return finish();
      }
    }
    // group assignment (open table, after the break, no foul)
    if (!S.groups.you && !S.breakShot && !foul) {
      const first = pk.find((n) => n !== 8);
      if (first) { S.groups[s] = typeOf(first); S.groups[opp] = S.groups[s] === 'yellow' ? 'red' : 'yellow'; }
    }
    const g2 = S.groups[s];
    const potted = g2 ? pk.some((n) => typeOf(n) === g2) : pk.length > 0;
    let msg = '';
    if (foul) {
      msg = sh.cuePocketed ? `Faute (${reason}) — ${who(opp)} a 2 coups et pose la blanche dans le premier quart.` : `Faute (${reason}) — ${who(opp)} a 2 coups.`;
      S.turn = opp; S.ballInHand = !!sh.cuePocketed; S.visits = 2;
    } else if (potted) { msg = `${who(s)} rejoue.`; S.ballInHand = false; S.visits = 1; }
    else if (S.visits > 1) { msg = `${who(s)} n’a rien empoché — il lui reste un coup.`; S.visits -= 1; S.ballInHand = false; }
    else { msg = `${who(s)} n’a rien empoché — au tour de ${who(opp)}.`; S.turn = opp; S.ballInHand = false; S.visits = 1; }
    if (!foul && pk.length && S.groups[s] && !myGroup) msg = `${who(s)} : ${GROUP_FR[S.groups[s]]}. ` + msg;
    if (cueBall.sink === null && !cueBall.active) { cueBall.active = true; cueBall.mesh.visible = true; cueBall.x = -HX * 0.75; cueBall.z = 0; cueBall.vx = cueBall.vz = 0; if (!free(cueBall.x, cueBall.z, cueBall)) { cueBall.x = -HX * 0.6; } }
    S.breakShot = false; S.msg = msg; finish();
  }
  function finish() {
    syncMeshes(); updateHud();
    if (S.phase === 'over') { updateGuide(false); cue.visible = false; big.innerHTML = S.over === 'you' ? '🎱 Vous avez gagné !<small>K : rejouer · Échap : quitter</small>' : '🎱 Ordinateur gagne<small>K : rejouer · Échap : quitter</small>'; big.style.display = 'block'; setHint('<b>K</b> rejouer · <b>Échap</b> quitter'); return; }
    if (S.turn === 'you') { S.phase = S.ballInHand ? 'place' : 'aim'; cue.visible = S.phase === 'aim'; setHint(S.phase === 'place' ? '<b>← → ↑ ↓</b> placer la blanche (premier quart seulement, ligne jaune) · <b>K</b> poser · <b>Échap</b> quitter' : HINT_AIM); }
    else { S.phase = 'cpuWait'; S.cpuT = 0; cue.visible = false; updateGuide(false); setHint('Tour de l’ordinateur…'); }
  }
  const HINT_AIM = '<b>← →</b> ou glisser la souris : viser (Maj = précis) · <b>K</b> : lancer la jauge puis <b>K</b> : frapper · <b>Échap</b> quitter';

  function updateHud() {
    const gr = (w) => S.groups[w] ? GROUP_FR[S.groups[w]] : 'table ouverte';
    const trayFor = (list) => list.map((n) => `<span class="ball" style="background:${hex(ballColor(n))}"></span>`).join('');
    hud.innerHTML = `<h4>Billard — golvazer</h4>
      <div class="row ${S.turn === 'you' ? 'turn' : ''}"><span><b>Vous</b></span><span>${gr('you')}${S.turn === 'you' && S.visits > 1 ? ' · 2 coups' : ''}</span></div>
      <div class="row ${S.turn === 'cpu' ? 'turn' : ''}"><span><b>Ordinateur</b></span><span>${gr('cpu')}${S.turn === 'cpu' && S.visits > 1 ? ' · 2 coups' : ''}</span></div>
      <div class="tray">${trayFor(S.pocketedAll)}</div><div class="msg">${S.msg}</div>`;
  }

  // ---- new game --------------------------------------------------------------------------------------------------------------------
  function newGame() {
    Object.assign(S, { phase: 'aim', turn: 'you', visits: 1, groups: { you: null, cpu: null }, breakShot: true, aim: 0, power: 0, shot: null, msg: 'À vous de casser !', strike: null, pocketedAll: [], over: null, ballInHand: false });
    big.style.display = 'none'; rack(); cue.visible = true; updateHud(); setHint(HINT_AIM);
  }

  // ---- camera ------------------------------------------------------------------------------------------------------------------------
  const camObj = { pos: g.localToWorld(new THREE.Vector3(0, 2.2, 0.95)), target: g.localToWorld(new THREE.Vector3(0, Y0 - 0.02, -0.02)), fov: 50 };

  // ---- loop ----------------------------------------------------------------------------------------------------------------------------
  function update(dt) {
    dt = Math.min(dt, 0.05);
    if (S.phase === 'aim') {
      updateGuide(true); placeCue(0.02 + (S.power ? 0 : 0)); cue.visible = true;
    } else if (S.phase === 'power') {
      S.t += dt; S.power = 0.5 - 0.5 * Math.cos(S.t * 2 * Math.PI * 0.55);
      pbar.firstChild.style.width = (S.power * 100) + '%'; updateGuide(true); placeCue(0.03 + S.power * 0.22);
    } else if (S.phase === 'place') {
      updateGuide(false); cue.visible = false; zoneLine.visible = true;
      cueBall.mesh.position.set(cueBall.x, Y0 + R + 0.0 + Math.sin(performance.now() / 180) * 0.004, cueBall.z);
    } else if (S.phase === 'strike') {
      const st = S.strike; st.t += dt;
      const dur = S.turn === 'cpu' ? 0.55 : 0.3;
      const k = Math.min(1, st.t / dur);
      if (k < 0.75) placeCue(0.03 + st.pull * (k / 0.75)); else placeCue(st.pull * (1 - (k - 0.75) / 0.25) * 0.9 + 0.005);
      updateGuide(S.turn === 'cpu' ? false : true);
      if (k >= 1) fire(st.p);
    } else if (S.phase === 'rolling') {
      stepPhysics(dt);
      if (!moving() && !balls.some((b) => b.sink)) { S.idle += dt; if (S.idle > 0.35) evaluate(); } else S.idle = 0;
    } else if (S.phase === 'cpuWait') {
      stepPhysics(dt); S.cpuT += dt;
      if (S.cpuT > 0.9) {
        zoneLine.visible = false;
        if (S.ballInHand) { cpuPlaceCue(); S.ballInHand = false; syncMeshes(); }
        const d = cpuDecide(); S.aim = d.angle; S.phase = 'strike'; S.strike = { t: 0, p: d.p, pull: 0.04 + d.p * 0.25 }; cue.visible = true;
      }
    } else if (S.phase === 'over') stepPhysics(dt);
  }

  function onKey(e) {
    if (e.type !== 'keydown') return true;
    e.preventDefault();
    const k = e.key.toLowerCase(), fine = e.shiftKey ? 0.25 : 1;
    if (k === 'escape') { end(); return true; }
    if (S.phase === 'over') { if (k === 'k') newGame(); return true; }
    if (S.phase === 'aim' || S.phase === 'power') {
      if (k === 'arrowleft' || k === 'q' || k === 'a') S.aim -= 0.022 * fine;
      else if (k === 'arrowright' || k === 'd') S.aim += 0.022 * fine;
      else if (k === 'k' && !e.repeat) {
        if (S.phase === 'aim') { S.phase = 'power'; S.t = 0; S.power = 0; pbar.style.display = 'block'; setHint('<b>K</b> : frapper (jauge de puissance) · <b>Échap</b> annuler'); }
        else beginShot(S.aim, Math.max(0.04, S.power));
      }
      if (S.phase === 'power' && k === 'escape') { S.phase = 'aim'; pbar.style.display = 'none'; setHint(HINT_AIM); }
    } else if (S.phase === 'place') {
      const st = 0.02; let dx = 0, dz = 0;
      if (k === 'arrowleft' || k === 'q' || k === 'a') dx = -st; if (k === 'arrowright' || k === 'd') dx = st;
      if (k === 'arrowup' || k === 'z' || k === 'w') dz = -st; if (k === 'arrowdown' || k === 's') dz = st;
      if (dx || dz) { const nx = Math.max(-HX + R + 0.005, Math.min(-HX / 2, cueBall.x + dx)), nz = Math.max(-HZ + R + 0.005, Math.min(HZ - R - 0.005, cueBall.z + dz)); if (free(nx, nz, cueBall)) { cueBall.x = nx; cueBall.z = nz; } }
      if (k === 'k' && !e.repeat) { if (free(cueBall.x, cueBall.z, cueBall)) { S.phase = 'aim'; zoneLine.visible = false; syncMeshes(); setHint(HINT_AIM); } }
    }
    return true;
  }
  // mouse drag = aim
  let dragging = false;
  const pd = (e) => { dragging = true; }, pu = () => { dragging = false; };
  const pm = (e) => { if (dragging && (S.phase === 'aim' || S.phase === 'power')) S.aim += e.movementX * 0.0035 * (e.shiftKey ? 0.25 : 1); };
  window.addEventListener('pointerdown', pd); window.addEventListener('pointerup', pu); window.addEventListener('pointermove', pm);

  function end() {
    window.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu); window.removeEventListener('pointermove', pm);
    it.group.remove(g); hud.remove(); pbar.remove(); big.remove(); setHint(''); mgr.endMode();
  }

  newGame();
  return { cam: camObj, update, onKey };
}
