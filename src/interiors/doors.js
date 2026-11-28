import * as THREE from 'three';

/**
 * Enter / exit markers, in the spirit of GTA San Andreas: an inverted triangle that floats and slowly spins above every enterable door.
 * Walking close to the door shows the "K" prompt (handled by the WorldManager through `nearest`).
 */
let _glow;
function glowTexture() {
  if (_glow) return _glow;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,210,90,0.95)'); r.addColorStop(0.35, 'rgba(255,170,30,0.38)'); r.addColorStop(1, 'rgba(255,150,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  _glow = new THREE.CanvasTexture(c); _glow.colorSpace = THREE.SRGBColorSpace;
  return _glow;
}

const BODY = new THREE.ConeGeometry(0.5, 0.95, 3, 1);   // 3 sides: reads as a triangle from every angle
BODY.rotateX(Math.PI);                                  // tip pointing down
const EDGES = new THREE.EdgesGeometry(BODY);

export function createMarker() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffb000, emissive: 0xff8c00, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.1, flatShading: true });
  const body = new THREE.Mesh(BODY, bodyMat);
  const line = new THREE.LineSegments(EDGES, new THREE.LineBasicMaterial({ color: 0xfff2c4 }));
  line.scale.setScalar(1.012);
  const spin = new THREE.Group(); spin.add(body, line);
  g.add(spin);
  const tex = glowTexture();
  if (tex) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.scale.setScalar(2.6); sp.position.y = 0.05; g.add(sp);
    g.userData.glow = sp;
  }
  g.userData.spin = spin; g.userData.mat = bodyMat;
  g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
  return g;
}

/** Owns the markers of one world (campus or one interior). `groundAt(x,z)` gives the floor height under a door. */
export class DoorSystem {
  constructor(parent, doors, groundAt, { radius = 2.4 } = {}) {
    this.parent = parent; this.radius = radius; this.groundAt = groundAt;
    this.items = doors.map((d) => {
      const marker = createMarker();
      const sx = d.x + d.nx * d.standOff, sz = d.z + d.nz * d.standOff;
      const gy = groundAt ? groundAt(sx, sz) : 0;
      const y0 = gy + (d.markerY ?? (d.doorH + 0.55 * (d.markerScale ?? 1)));
      marker.position.set(sx, y0, sz);
      parent.add(marker);
      return { door: d, marker, sx, sz, y0, gy, base: d.markerScale ?? 1, near: 0 };
    });
  }

  /** Animate and return the nearest door whose trigger zone contains the player (or null). */
  update(dt, t, pos, camera) {
    let best = null, bd = Infinity;
    for (const it of this.items) {
      const d = Math.hypot(pos.x - it.sx, pos.z - it.sz);
      const inside = d < (it.door.radius ?? this.radius) && Math.abs(pos.y - it.gy) < 2.2;
      it.near += ((inside ? 1 : 0) - it.near) * Math.min(1, dt * 9);
      const dc = camera ? camera.position.distanceTo(it.marker.position) : 10;
      const far = THREE.MathUtils.clamp(dc / 22, 1, 3.6);                 // bigger with distance so it stays readable from afar
      it.marker.scale.setScalar(it.base * far * (1 + 0.22 * it.near));
      it.marker.position.y = it.y0 + Math.sin(t * 2.4 + it.sx) * 0.13 * it.base * far;
      const spin = it.marker.userData.spin; spin.rotation.y += dt * (1.6 + 2.2 * it.near);
      it.marker.userData.mat.emissiveIntensity = 0.75 + 0.5 * Math.sin(t * 4) * (0.4 + it.near * 0.6) + it.near * 0.5;
      if (it.marker.userData.glow) it.marker.userData.glow.material.opacity = 0.7 + 0.3 * it.near;
      if (inside && d < bd) { bd = d; best = it.door; }
    }
    return best;
  }
}
