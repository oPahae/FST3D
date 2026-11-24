/** Spiral steel staircase with railings (field photos "PV bldg"): decorative, collision is a circle. */
export function spiralStair(shared, x, z, { r = 1.5, h = 7.6, turns = 1.5, color = 'frame' } = {}) {
  const b = shared.builder, N = 30;
  b.box('frame', x, h / 2, z, 0.28, h, 0.28);
  for (let i = 0; i < N; i++) {
    const t = i / N, th = t * turns * Math.PI * 2, y = 0.3 + t * (h - 0.3);
    const cx = x + Math.cos(th) * (0.2 + r / 2), cz = z + Math.sin(th) * (0.2 + r / 2);
    b.box('metal', cx, y, cz, r, 0.07, 0.45, -th);
    const ox = x + Math.cos(th) * (r + 0.15), oz = z + Math.sin(th) * (r + 0.15);
    b.box(color, ox, y + 0.55, oz, 0.04, 1.05, 0.04);
    if (i % 3 === 0) b.box('metal', ox, y + 1.05, oz, 0.1, 0.05, 0.1);
  }
  for (const lvl of [h * 0.5, h]) b.box('metal', x + r * 0.9, lvl, z, r * 1.2, 0.08, 1.2);
  shared.collision.addCircle(x, z, r + 0.35, 'spiral-stair');
}
