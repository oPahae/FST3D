import * as THREE from 'three';

/**
 * Activities of room D04.
 *  1. Board: first-person view of the whiteboard; type to write with a marker (animated hand), Backspace erases.
 *  2. PC: sit at a workstation, boot it, log in (password fsts@2024) and browse https://www.pahae.online in an iframe.
 * Both are "modes" owned by the WorldManager: { cam, update(dt), onKey(e) -> bool }.
 */
const SITE = 'https://www.pahae.online';
const PASSWORD = 'fsts@2024';

function injectStyle() {
  if (document.getElementById('d04-style')) return;
  const st = document.createElement('style'); st.id = 'd04-style';
  st.textContent = `
  #modeHint{position:absolute;left:50%;bottom:56px;transform:translateX(-50%);background:rgba(14,18,24,.8);color:#cfd6de;font:12px system-ui,sans-serif;padding:5px 12px;border-radius:8px;pointer-events:none;z-index:30}
  #modeHint a{pointer-events:auto}
  #modeHint b{color:#fff}
  #pc{position:absolute;z-index:20;overflow:hidden;background:#000;font-family:"Segoe UI",system-ui,sans-serif;color:#fff}
  #pc .scr{position:absolute;inset:0;display:none}
  #pc .scr.on{display:flex}
  #pc .boot{flex-direction:column;align-items:center;justify-content:center;gap:2.2em;background:#000}
  #pc .logo{display:grid;grid-template-columns:1fr 1fr;gap:.18em;width:4.2em;height:4.2em}
  #pc .logo i{background:#1da1f2}
  #pc .spin{width:2em;height:2em;border:.22em solid #333;border-top-color:#fff;border-radius:50%;animation:sp 1s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  #pc .login{flex-direction:column;align-items:center;justify-content:center;gap:.7em;background:radial-gradient(120% 120% at 30% 20%,#2a7be0,#0b3a8c 60%,#06214f)}
  #pc .av{width:6.2em;height:6.2em;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font-size:1em}
  #pc .av svg{width:3.6em;height:3.6em;fill:#fff}
  #pc .nm{font-size:1.9em;font-weight:300}
  #pc .pw{display:flex;gap:.3em}
  #pc input{font:inherit;font-size:1.05em;width:14em;padding:.45em .7em;border:.1em solid rgba(255,255,255,.5);background:rgba(255,255,255,.88);color:#111;outline:none}
  #pc button{font:inherit;cursor:pointer}
  #pc .go{width:2.4em;border:0;background:rgba(255,255,255,.25);color:#fff;font-size:1.1em}
  #pc .err{height:1.2em;font-size:.85em;color:#ffd0d0}
  #pc .note{position:absolute;right:1.4em;bottom:1.4em;background:#ffe36e;color:#3a2f00;padding:.7em .9em;font-size:.9em;transform:rotate(2deg);box-shadow:0 .2em .6em rgba(0,0,0,.4);font-family:"Segoe Print","Comic Sans MS",cursive}
  #pc .desk{flex-direction:column;background:#0b3a8c}
  #pc iframe{flex:1;border:0;width:100%;background:#fff}
  #pc .bar{height:7%;min-height:1.9em;display:flex;align-items:center;gap:.6em;padding:0 .6em;background:rgba(20,24,34,.96);font-size:.8em}
  #pc .bar .win{display:grid;grid-template-columns:1fr 1fr;gap:.12em;width:1.2em;height:1.2em}
  #pc .bar .win i{background:#1da1f2}
  #pc .bar .pill{background:rgba(255,255,255,.12);padding:.2em .8em;border-radius:.4em}
  #pc .bar .sp{flex:1}
  #pc .bar a,#pc .bar button{color:#fff;background:rgba(255,255,255,.14);border:0;border-radius:.4em;padding:.25em .8em;text-decoration:none;font-size:1em}
  #pc .bar button:hover,#pc .bar a:hover{background:rgba(255,255,255,.28)}
  `;
  document.head.appendChild(st);
}
function hintBar(html) {
  let el = document.getElementById('modeHint');
  if (!el) { el = document.createElement('div'); el.id = 'modeHint'; document.body.appendChild(el); }
  el.innerHTML = html; el.style.display = html ? '' : 'none';
}

// =====================================================================================================================
// Board
// =====================================================================================================================
const CW = 1600, CH = 820, MARGIN = 90, LINE = 118;

export class BoardWriter {
  /** board: { x, y, w, h, z } world rectangle centre/size; canvas texture is created here and returned by `texture`. */
  constructor(board, initial) {
    this.b = board;
    this.canvas = document.createElement('canvas'); this.canvas.width = CW; this.canvas.height = CH;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas); this.texture.colorSpace = THREE.SRGBColorSpace; this.texture.anisotropy = 8;
    this.text = initial || '';
    this.queue = []; this.cur = null;       // char being written: { ch, t }
    this.scrub = 0;
    this.render();
  }
  font() { return 'italic 600 78px "Segoe Print","Bradley Hand","Comic Sans MS","Segoe Script",cursive'; }
  layout(text) {   // wrap into lines (explicit \n + width)
    const ctx = this.ctx; ctx.font = this.font();
    const lines = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const ch of para) {
        if (ctx.measureText(line + ch).width > CW - MARGIN * 2) { lines.push(line); line = ''; }
        line += ch;
      }
      lines.push(line);
    }
    return lines;
  }
  render(partial = null) {
    const ctx = this.ctx;
    ctx.fillStyle = '#f5f5f2'; ctx.fillRect(0, 0, CW, CH);
    for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(140,145,170,${0.025 + ((i * 37) % 10) / 400})`; ctx.fillRect((i * 263) % CW, (i * 151) % CH, 40 + (i * 29) % 90, 7); }
    ctx.font = this.font(); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#233f9c';
    const lines = this.layout(this.text);
    lines.forEach((l, i) => ctx.fillText(l, MARGIN, 150 + i * LINE));
    const last = lines.length - 1, lw = ctx.measureText(lines[last]).width;
    let cx = MARGIN + lw;
    if (partial) {   // reveal the char being written, left to right
      const cw = ctx.measureText(partial.ch).width;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 2, 0, cw * partial.k + 4, CH); ctx.clip(); ctx.fillText(partial.ch, cx, 150 + last * LINE); ctx.restore();
      cx += cw * partial.k;
    }
    this.caret = { x: cx, y: 150 + last * LINE - 30 };
    this.texture.needsUpdate = true;
  }
  px2w(px, py) { const { x, y, w, h } = this.b; return new THREE.Vector3(x - w / 2 + (px / CW) * w, y + h / 2 - (py / CH) * h, this.b.z); }
  type(ch) { if (this.text.length + this.queue.length < 150) this.queue.push(ch); }
  backspace() { if (this.queue.length) this.queue.pop(); else if (this.text.length) { this.text = this.text.slice(0, -1); this.scrub = 0.25; this.render(); } }
  update(dt) {
    if (!this.cur && this.queue.length) this.cur = { ch: this.queue.shift(), t: 0 };
    if (this.cur) {
      this.cur.t += dt;
      const dur = this.cur.ch === '\n' ? 0.08 : 0.11, k = Math.min(1, this.cur.t / dur);
      if (this.cur.ch === '\n') { if (k >= 1) { this.text += '\n'; this.cur = null; this.render(); } return true; }
      if (k >= 1) { this.text += this.cur.ch; this.cur = null; this.render(); } else this.render({ ch: this.cur.ch, k });
      return true;
    }
    if (this.scrub > 0) this.scrub -= dt;
    return false;
  }
}

/** First-person writing mode in front of the board. */
export function createBoardMode(mgr, it, B) {
  injectStyle();
  const W = B.writer;
  // 3D hand + marker
  const hand = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xe0b48c, roughness: 0.6 }), sleeve = new THREE.MeshStandardMaterial({ color: 0x2f6fd0, roughness: 0.75 }), pen = new THREE.MeshStandardMaterial({ color: 0x1b2f7a, roughness: 0.4 });
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.05, 3, 8), skin); palm.rotation.z = Math.PI / 2; palm.rotation.y = 0.4; hand.add(palm);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.04, 3, 6), skin); thumb.position.set(-0.03, 0.0, -0.04); thumb.rotation.x = 1.0; hand.add(thumb);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.04, 3, 6), skin); f.position.set(-0.045, 0.012 - i * 0.017, -0.05); f.rotation.x = 1.1; hand.add(f); }
  const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.16, 10), pen); marker.position.set(-0.07, 0.01, -0.08); marker.rotation.x = Math.PI / 2 + 0.3; hand.add(marker);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x2457d6 })); cap.position.set(-0.07, 0.02, 0.0); cap.rotation.x = Math.PI / 2 + 0.3; hand.add(cap);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.55, 4, 10), sleeve); hand.add(arm);
  it.group.add(hand);
  const tip = new THREE.Vector3(), target = new THREE.Vector3();
  const place = () => {
    // palm sits behind and to the right of the pen tip; forearm leaves towards the lower-right of the screen
    hand.position.copy(tip).add(new THREE.Vector3(0.095, -0.025, 0.1));
    const dir = new THREE.Vector3(0.55, -0.55, 0.62).normalize();
    arm.position.copy(dir).multiplyScalar(0.34);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    marker.rotation.set(Math.PI / 2 + 0.25, 0, 0.5);
  };
  const cam = { pos: new THREE.Vector3(B.x, B.y - 0.08, 1.75), target: new THREE.Vector3(B.x, B.y - 0.08, 0), fov: 52 };
  hintBar('<b>Tapez</b> pour écrire · <b>Retour arrière</b> efface · <b>Entrée</b> ligne suivante · <b>Échap</b> quitter');
  W.render(); tip.copy(W.px2w(W.caret.x, W.caret.y)); tip.z += 0.07; place();
  const mode = {
    cam,
    update(dt) {
      const writing = W.update(dt);
      target.copy(W.px2w(W.caret.x, W.caret.y));
      const t = performance.now() / 1000;
      if (writing) { target.x += Math.sin(t * 38) * 0.006; target.y += Math.cos(t * 52) * 0.009; target.z += 0.004; }
      else if (W.scrub > 0) { target.x -= (0.25 - W.scrub) * 0.5; target.y += Math.sin(t * 30) * 0.02; target.z += 0.004; }
      else target.z += 0.07;                      // hand lifts off the board when idle
      tip.lerp(target, Math.min(1, dt * 18)); place();
    },
    onKey(e) {
      if (e.type !== 'keydown') return true;
      e.preventDefault();
      if (e.key === 'Escape') { end(); return true; }
      if (e.key === 'Backspace') W.backspace();
      else if (e.key === 'Enter') W.type('\n');
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) W.type(e.key);
      return true;
    },
  };
  function end() { it.group.remove(hand); hintBar(''); mgr.endMode(); }
  return mode;
}

// =====================================================================================================================
// PC
// =====================================================================================================================
export function createPcMode(mgr, st) {
  injectStyle();
  const { mx, my, mz, s } = st;                   // monitor centre and the side (+1 / -1) the user sits on
  const cam = { pos: new THREE.Vector3(mx + s * 0.62, my, mz), target: new THREE.Vector3(mx, my, mz), fov: 40 };
  const host = document.getElementById('viewport').parentElement;
  const pc = document.createElement('div'); pc.id = 'pc'; host.appendChild(pc);
  pc.innerHTML = `
    <div class="scr boot on"><div class="logo"><i></i><i></i><i></i><i></i></div><div class="spin"></div></div>
    <div class="scr login"><div class="av"><svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"/></svg></div><div class="nm">FSTS</div>
      <div class="pw"><input type="password" placeholder="Mot de passe" autocomplete="off" spellcheck="false"><button class="go">➜</button></div><div class="err"></div>
      <div class="note">Mot de passe :<br><b>${PASSWORD}</b></div></div>
    <div class="scr desk"><iframe title="pahae.online" src="about:blank" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
</div>`;
  const scr = (c) => pc.querySelector('.' + c), show = (c) => { pc.querySelectorAll('.scr').forEach((e) => e.classList.remove('on')); scr(c).classList.add('on'); };
  const input = pc.querySelector('input'), err = pc.querySelector('.err');
  // overlay rectangle = projection of the monitor's screen
  const layout = () => {
    const c = new THREE.PerspectiveCamera(cam.fov, mgr.camera.aspect, 0.05, 50); c.position.copy(cam.pos); c.lookAt(cam.target); c.updateMatrixWorld(); c.updateProjectionMatrix();
    const vp = document.getElementById('viewport'), W = vp.clientWidth, H = vp.clientHeight;
    const xf = mx + s * 0.0185, pts = [[-0.25, 0.14], [0.25, -0.14]].map(([dz, dy]) => { const v = new THREE.Vector3(xf, my + dy, mz + dz).project(c); return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H]; });
    const left = Math.min(pts[0][0], pts[1][0]), top = Math.min(pts[0][1], pts[1][1]), w = Math.abs(pts[1][0] - pts[0][0]), h = Math.abs(pts[1][1] - pts[0][1]);
    Object.assign(pc.style, { left: left + 'px', top: top + 'px', width: w + 'px', height: h + 'px', fontSize: Math.max(10, w / 62) + 'px' });
  };
  layout(); window.addEventListener('resize', layout);
  let t0 = setTimeout(() => { show('login'); input.focus(); }, 1700);
  const tryLogin = () => {
    if (input.value === PASSWORD) {
      err.textContent = ''; show('desk');
      const f = pc.querySelector('iframe'); if (!f.dataset.on) { f.src = SITE; f.dataset.on = '1'; }
    } else { err.textContent = 'Le mot de passe est incorrect.'; input.select(); }
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryLogin(); e.stopPropagation(); if (e.key === 'Escape') end(); });
  pc.querySelector('.go').addEventListener('click', tryLogin);
  hintBar('<b>Échap</b> : se lever · si le site reste blanc : <a href="'+SITE+'" target="_blank" rel="noopener" style="color:#ffd25a">ouvrir pahae.online dans un onglet ↗</a>');
  function end() { clearTimeout(t0); window.removeEventListener('resize', layout); pc.remove(); hintBar(''); mgr.endMode(); }
  return {
    cam,
    update() {},
    onKey(e) { if (e.type === 'keydown' && e.key === 'Escape') { end(); } return true; },   // everything else goes to the page (input / iframe)
  };
}
