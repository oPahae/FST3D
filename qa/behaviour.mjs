import { launch, shot } from './qa.mjs';
import { px } from './common.mjs';
import { walkPath } from './auto.mjs';
const { browser, page, logs } = await launch({ width: 1280, height: 720 });
const P = (x, y) => px(x, y);
const toPx = (x, z) => [Math.round(x / (150 / 330) + 360), Math.round(z / (150 / 330) + 340)];
const tp = async (x, y, yaw = 0) => { const [a, b] = P(x, y); await page.evaluate(`window.__fst.walkTo(${a}, ${b}, ${yaw})`); };
const res = {};
// (also run: stairs test below)

// 1) wall: walking from the garden straight into Block A's gallery back wall must stop inside the gallery
await tp(440, 430);
let log = await walkPath(page, [P(505, 430)]);
let st = await page.evaluate('window.__fst.state()');
res.wall = { reached: log[0].reached, finalPx: toPx(st.x, st.z), expect: 'stops in the gallery (x px 488..497), not beyond the wall' };

// 3) jump on flat ground
await tp(300, 330);
const jump = await page.evaluate(`(() => { const f = window.__fst, p = f.player; let maxY = 0; f.hold(' ', true); for (let i = 0; i < 40; i++) { f.stepSim(1/30, 1); maxY = Math.max(maxY, p.pos.y); f.hold(' ', i < 2); } return { maxY: +maxY.toFixed(2), landed: p.grounded }; })()`);
res.jump = { ...jump, expect: 'apex ~0.8-0.9 m then lands' };

// 4) both connector passages, west then east (around the patio palms)
await tp(150, 335, -Math.PI / 2);
res.westConnector = await walkPath(page, [P(185, 335), P(200, 343), P(212, 343), P(228, 335), P(262, 335)]);
await tp(560, 337, Math.PI / 2);
res.eastConnector = await walkPath(page, [P(538, 337), P(520, 347), P(505, 347), P(490, 337), P(465, 337)]);

// 5) walk the arcade of Block A (screenshot while walking)
await tp(492, 470, 0);
res.arcade = await walkPath(page, [P(493, 440), P(493, 412)]);

// 6) random walk: the player must never end up inside a solid, over 6 starts x 4000 steps
res.randomWalk = await page.evaluate(`(() => {
  const f = window.__fst, p = f.player, c = f.campus.collision;
  const starts = [[-3.6, 147], [-95, 0], [36, 41], [-3, -100], [150, 180], [-110, 190]];
  let violations = 0, steps = 0, rng = 12345;
  const rnd = () => (rng = (rng * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (const [x, z] of starts) {
    f.walkTo(x, z, 0);
    for (let i = 0; i < 4000; i++) {
      if (i % 25 === 0) p.camYaw = rnd() * 6.283;
      f.hold('z', true); f.hold('shift', rnd() < 0.5); f.hold(' ', rnd() < 0.02);
      f.stepSim(0.05, 1); steps++;
      if (c.solidAt(p.pos.x, p.pos.z)) violations++;
    }
  }
  f.hold('z', false); f.hold('shift', false); f.hold(' ', false);
  return { steps, violations };
})()`);
const brief = (l) => l.map((w) => (w.reached ? 'ok' : 'STOP@' + w.at.join(','))).join(' ');
console.log('wall      ', JSON.stringify(res.wall));
console.log('jump      ', JSON.stringify(res.jump));
console.log('west conn ', brief(res.westConnector));
console.log('east conn ', brief(res.eastConnector));
console.log('arcade    ', brief(res.arcade));
console.log('randomWalk', JSON.stringify(res.randomWalk));
console.log(logs.slice(0, 5));
const stairs = [];
for (const [name, from, to] of [['south', [358, 396], [358, 376.2]], ['north', [358, 280], [358, 296]], ['west', [300, 336], [329, 336]]]) {
  await tp(...from);
  const l = await walkPath(page, [P(...to)]);
  const s2 = await page.evaluate('window.__fst.state()');
  stairs.push(`${name}: reached=${l[0].reached} y=${s2.y.toFixed(2)}`);
}
console.log('platform steps', stairs.join(' | '), '(expect y ~ 0.51)');
const failed = res.randomWalk.violations > 0 || res.wall.finalPx[0] < 488 || res.wall.finalPx[0] > 497 || res.jump.maxY < 0.6;
console.log(failed ? 'BEHAVIOUR: FAIL' : 'BEHAVIOUR: PASS');
await browser.close();
process.exit(failed ? 1 : 0);
