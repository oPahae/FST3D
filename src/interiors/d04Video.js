import * as THREE from 'three';

const hint = (html) => {
  let el = document.getElementById('modeHint');
  if (!el) { el = document.createElement('div'); el.id = 'modeHint'; document.body.appendChild(el); }
  el.innerHTML = html; el.style.display = html ? '' : 'none';
};
function style() {
  if (document.getElementById('vid-style')) return;
  const s = document.createElement('style'); s.id = 'vid-style';
  s.textContent = `#vids{position:absolute;top:0;right:0;bottom:0;width:290px;z-index:25;background:rgba(10,13,18,.9);color:#e6ebf1;font:13px system-ui,sans-serif;display:flex;flex-direction:column;border-left:1px solid #2b3340}
  #vids h3{margin:0;padding:14px 16px;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#9fb3c8;border-bottom:1px solid #2b3340}
  #vids ul{list-style:none;margin:0;padding:6px;overflow:auto;flex:1}
  #vids li{padding:9px 12px;border-radius:8px;cursor:pointer;display:flex;gap:8px;align-items:center;word-break:break-all}
  #vids li:hover{background:rgba(255,255,255,.08)}
  #vids li.sel{background:rgba(255,255,255,.14);outline:1px solid #4b6a8c}
  #vids li.play{color:#ffd25a}
  #vids li.play::before{content:"▶";font-size:11px}
  #vids button{margin:10px 10px 4px;padding:9px;border:1px solid #3a4658;border-radius:8px;background:#1a212c;color:#e6ebf1;font:inherit;cursor:pointer}
  #vids button:hover{background:#263143}
  #vids .empty{padding:16px;line-height:1.5;color:#9fb3c8}`;
  document.head.appendChild(s);
}

/** Smart panel of D04: K starts it, right sidebar lists public/vids/*, any video plays on the 3D screen. */
export function createVideoMode(mgr, it, scr) {
  style();
  const { mesh, x, y, z, w, h } = scr;
  const origMat = mesh.material, base = import.meta.env.BASE_URL;
  const box = document.createElement('div'); box.id = 'vids';
  box.innerHTML = '<h3>Vidéos</h3><button id="vidLight">💡 Lumière : allumée (L)</button><ul></ul>';
  document.body.appendChild(box);
  const ul = box.querySelector('ul');
  let list = [], sel = 0, cur = -1, vid = null, tex = null, dark = false;
  const lights = []; it.group.traverse((o) => { if (o.isLight) lights.push([o, o.intensity]); });
  const em = ['lamp', 'lampWarm', 'daylight', 'screenWhite'].map((n) => mgr.mats && mgr.mats[n]).filter(Boolean).map((m) => [m, m.emissiveIntensity]);
  const hemi0 = mgr.hemi.intensity, env0 = mgr.scene.environmentIntensity;
  const btn = box.querySelector('#vidLight');
  const setDark = (d) => {
    dark = d;
    const f = d ? 0.04 : 1;
    for (const [l, i] of lights) l.intensity = i * f;
    for (const [m, i] of em) m.emissiveIntensity = i * (d ? 0.05 : 1);
    mgr.hemi.intensity = hemi0 * (d ? 0.05 : 1); mgr.scene.environmentIntensity = env0 * (d ? 0.03 : 1);
    btn.textContent = d ? '🌙 Lumière : éteinte (L)' : '💡 Lumière : allumée (L)';
  };
  btn.onclick = () => setDark(!dark);

  const render = () => {
    ul.innerHTML = '';
    if (!list.length) { ul.innerHTML = '<div class="empty">Aucune vidéo trouvée.<br>Placez vos fichiers .mp4 / .webm dans <b>public/vids</b> puis relancez <b>npm run dev</b> (ou <b>npm run build</b>).</div>'; return; }
    list.forEach((n, i) => {
      const li = document.createElement('li'); li.textContent = n.replace(/\.[^.]+$/, '');
      if (i === sel) li.classList.add('sel'); if (i === cur) li.classList.add('play');
      li.onclick = () => { sel = i; play(i); };
      ul.appendChild(li);
    });
    const s = ul.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  };
  const fit = () => {
    const a = vid && vid.videoWidth ? vid.videoWidth / vid.videoHeight : w / h;
    let sw = 1, sh = 1; if (a > w / h) sh = (w / h) / a; else sw = a / (w / h);
    mesh.scale.set(sw, sh, 1);
  };
  const play = (i) => {
    cur = i;
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    vid = document.createElement('video'); vid.playsInline = true; vid.crossOrigin = 'anonymous';
    vid.src = base + 'vids/' + encodeURIComponent(list[i]);
    vid.onloadedmetadata = fit;
    vid.onended = () => { if (cur + 1 < list.length) { sel = cur + 1; play(cur + 1); } };
    if (tex) tex.dispose(); if (mesh.material !== origMat) mesh.material.dispose();
    tex = new THREE.VideoTexture(vid); tex.colorSpace = THREE.SRGBColorSpace;
    mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });   // shown exactly as the file, no lighting / tone mapping
    vid.play().catch(() => {});
    render();
  };
  fetch(base + 'vids/index.json', { cache: 'no-store' }).then((r) => r.json()).then((l) => { list = Array.isArray(l) ? l : []; render(); }).catch(() => { list = []; render(); });
  render();
  hint('<b>↑ ↓</b> choisir · <b>K</b>/<b>Entrée</b> lire · <b>Espace</b> pause · <b>L</b> lumière · <b>Échap</b> quitter');

  function end() {
    if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); }
    if (tex) tex.dispose();
    if (mesh.material !== origMat) mesh.material.dispose();
    mesh.material = origMat; mesh.scale.set(1, 1, 1); setDark(false);
    box.remove(); hint(''); mgr.endMode();
  }
  return {
    cam: { pos: new THREE.Vector3(x + 0.55, y - 0.05, z + 2.7), target: new THREE.Vector3(x + 0.55, y - 0.05, 0), fov: 48 },
    update() {},
    onKey(e) {
      if (e.type !== 'keydown') return true;
      e.preventDefault();
      const k = e.key;
      if (k === 'Escape') end();
      else if (k === 'ArrowDown' && list.length) { sel = (sel + 1) % list.length; render(); }
      else if (k === 'ArrowUp' && list.length) { sel = (sel - 1 + list.length) % list.length; render(); }
      else if ((k === 'k' || k === 'K' || k === 'Enter') && list.length) play(sel);
      else if (k === 'l' || k === 'L') setDark(!dark);
      else if (k === ' ' && vid) { vid.paused ? vid.play() : vid.pause(); }
      return true;
    },
  };
}
