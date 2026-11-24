// Headless-browser QA helpers (real Chromium + WebGL via SwiftShader). Needs: npm run qa:install
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

export async function launch({ width = 1280, height = 720 } = {}) {
  const browser = await puppeteer.launch({
    executablePath: await chromium.executablePath(), headless: 'shell',
    args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', `--window-size=${width},${height}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(process.env.URL || 'http://localhost:4173/?shadow=2048&manual=1', { waitUntil: 'load' });
  await page.waitForFunction('window.__fstReady === true || window.__fstError', { timeout: 120000 });
  const err = await page.evaluate('window.__fstError || null');
  if (err) throw new Error('app error: ' + err);
  return { browser, page, logs };
}

export async function shot(page, file, { wait = 300, labels = true } = {}) {
  await page.evaluate(`window.__fst.labels(${labels}); window.__fst.render()`);
  await new Promise((r) => setTimeout(r, wait));
  await page.evaluate(`window.__fst.render()`);
  fs.mkdirSync('docs/screenshots', { recursive: true });
  await page.screenshot({ path: `docs/screenshots/${file}.png` });
}
