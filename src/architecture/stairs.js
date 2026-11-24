/** Solid steps climbing along `dir`; every tread is also registered as a walkable surface. */
export function buildStairs(ctx, { origin, dir, width, steps, rise = 0.17, tread = 0.34, mat = 'concrete', side = 0, base = 0 }) {
  const { b, collision } = ctx;
  const [ox, oz] = origin;
  const nx = -dir[1], nz = dir[0];
  const yaw = -Math.atan2(dir[1], dir[0]);
  for (let k = 0; k < steps; k++) {
    const h = rise * (k + 1);
    const cx = ox + dir[0] * (k + 0.5) * tread, cz = oz + dir[1] * (k + 0.5) * tread;
    b.box(mat, cx, base + h / 2, cz, tread, h, width, yaw);
    const a = [ox + dir[0] * k * tread, oz + dir[1] * k * tread], c = [ox + dir[0] * (k + 1) * tread, oz + dir[1] * (k + 1) * tread];
    const hw = width / 2;
    collision.addSurface([[a[0] + nx * hw, a[1] + nz * hw], [c[0] + nx * hw, c[1] + nz * hw], [c[0] - nx * hw, c[1] - nz * hw], [a[0] - nx * hw, a[1] - nz * hw]], base + h);
  }
  return { topH: base + rise * steps, topAt: [ox + dir[0] * steps * tread, oz + dir[1] * steps * tread] };
}
