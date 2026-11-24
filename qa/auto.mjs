// Autopilot helper: drives the real player through the real collision world inside the browser.
export async function walkPath(page, pts, { run = false, dt = 1 / 20, maxSteps = 900, onStep } = {}) {
  return page.evaluate(async ({ pts, run, dt, maxSteps }) => {
    const f = window.__fst, p = f.player;
    const log = [];
    for (const [tx, tz] of pts) {
      let ok = false;
      for (let i = 0; i < maxSteps; i++) {
        const dx = tx - p.pos.x, dz = tz - p.pos.z, L = Math.hypot(dx, dz);
        if (L < 1.2) { ok = true; break; }
        p.camYaw = Math.atan2(-dx, -dz);
        f.hold('z', true); f.hold('shift', run);
        f.stepSim(dt, 1);
      }
      log.push({ target: [Math.round(tx), Math.round(tz)], reached: ok, at: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)], y: +p.pos.y.toFixed(2) });
      if (!ok) break;
    }
    f.hold('z', false); f.hold('shift', false);
    return log;
  }, { pts, run, dt, maxSteps });
}
