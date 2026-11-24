import * as THREE from 'three';

function miterNormals(pts) {
  const n = pts.length, segN = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], L = Math.hypot(dx, dz) || 1;
    segN.push([-dz / L, dx / L]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    if (i === 0) out.push([segN[0][0], segN[0][1], 1]);
    else if (i === n - 1) out.push([segN[n - 2][0], segN[n - 2][1], 1]);
    else {
      let ax = segN[i - 1][0] + segN[i][0], az = segN[i - 1][1] + segN[i][1];
      const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;
      const dot = ax * segN[i][0] + az * segN[i][1];
      out.push([ax, az, Math.min(1 / Math.max(dot, 0.3), 3)]);
    }
  }
  return out;
}

/** Polyline offset sideways by `off` metres (positive = left of travel). */
export function offsetPolyline(pts, off) {
  const nm = miterNormals(pts);
  return pts.map((p, i) => [p[0] + nm[i][0] * nm[i][2] * off, p[1] + nm[i][1] * nm[i][2] * off]);
}

/** Flat ribbon with world-metre UVs (texture repeat then sets the tile size). */
export function ribbon(pts, width, y) {
  const nm = miterNormals(pts), hw = width / 2;
  const pos = [], uv = [], idx = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const [nx, nz, m] = nm[i];
    pos.push(pts[i][0] + nx * m * hw, y, pts[i][1] + nz * m * hw, pts[i][0] - nx * m * hw, y, pts[i][1] - nz * m * hw);
    uv.push(s, hw, s, -hw);
  }
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Give a flat horizontal geometry world-metre UVs from its x/z positions. */
export function worldUV(g) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i); uv[i * 2 + 1] = p.getZ(i); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
