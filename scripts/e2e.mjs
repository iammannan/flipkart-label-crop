// End-to-end check in a real browser: upload a label PDF, verify detection, download every output.
// Usage: node scripts/e2e.mjs [path/to/labels.pdf]   (env E2E_OUT = folder for screenshots/downloads)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = process.argv[2] || path.join(os.homedir(), 'Downloads', 'Meesho-orders.pdf');
const outDir = process.env.E2E_OUT || path.join(os.tmpdir(), 'lcai-e2e');
const route = process.env.E2E_ROUTE || '/meesho-label-crop';
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const PORT = 5199;
const BASE = process.env.E2E_BASE || `http://localhost:${PORT}`;

const browserPath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));

const server = process.env.E2E_BASE ? null : spawn(process.execPath, [path.join(root, 'scripts/serve.mjs'), String(PORT)], { stdio: 'pipe' });
if (server) await new Promise(r => server.stdout.once('data', r));

const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ['--no-first-run'] });
const errors = [];
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

try {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url() + ' ' + r.failure()?.errorText));
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: outDir, eventsEnabled: true });

  const waitDownload = async (trigger, match) => {
    const before = new Set(fs.readdirSync(outDir));
    await trigger();
    for (let i = 0; i < 200; i++) {
      const f = fs.readdirSync(outDir).find(n => !before.has(n) && match.test(n) && !n.endsWith('.crdownload'));
      if (f) { await new Promise(r => setTimeout(r, 150)); return path.join(outDir, f); }
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error('download timed out: ' + match);
  };
  const waitPreview = async () => {
    await page.waitForFunction(() => !document.querySelector('#thumbs').classList.contains('is-busy') && document.querySelector('#thumbs canvas'), { timeout: 60000 });
  };

  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outDir, '01-idle.png') });

  const t0 = Date.now();
  await (await page.$('#file-input')).uploadFile(sample);
  await page.waitForSelector('.tool[data-state="ready"]', { timeout: 180000 });
  await waitPreview();
  const seconds = ((Date.now() - t0) / 1000).toFixed(1);
  const info = await page.evaluate(() => ({
    kicker: document.querySelector('#result-kicker').textContent,
    title: document.querySelector('#result-title').textContent,
    chips: [...document.querySelectorAll('#chips .chip')].map(c => c.textContent),
    meta: document.querySelector('#preview-meta').textContent,
  }));
  console.log(`processed in ${seconds}s`, info);
  check(/label/.test(info.title), 'result title mentions labels');
  await page.evaluate(() => document.querySelector('#tool').scrollIntoView());
  await page.screenshot({ path: path.join(outDir, '02-ready.png') });

  const inspect = async (file) => {
    const doc = await PDFDocument.load(fs.readFileSync(file));
    const sizes = {};
    doc.getPages().forEach(p => { const k = `${p.getWidth().toFixed(0)}x${p.getHeight().toFixed(0)}`; sizes[k] = (sizes[k] || 0) + 1; });
    return { pages: doc.getPageCount(), sizes, kb: Math.round(fs.statSync(file).size / 1024) };
  };
  const renderFirst = async (file, png, pageNo = 1) => {
    const b64 = fs.readFileSync(file).toString('base64');
    const dataUrl = await page.evaluate(async (b64, pageNo) => {
      const libsUrl = document.querySelector('link[rel=modulepreload]').href.replace('app.js', 'libs.js');
      const { loadPdfjs } = await import(libsUrl);
      const { lib, docOptions } = await loadPdfjs();
      const data = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const doc = await lib.getDocument({ data, ...docOptions }).promise;
      const pg = await doc.getPage(pageNo);
      const vp = pg.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      return c.toDataURL('image/png');
    }, b64, pageNo);
    fs.writeFileSync(path.join(outDir, png), Buffer.from(dataUrl.split(',')[1], 'base64'));
  };

  // 1. default labels (4x6)
  let f = await waitDownload(() => page.click('#btn-download'), /labels_4x6.*\.pdf$/);
  console.log(path.basename(f)); let r = await inspect(f); console.log('labels 4x6', r);
  check(r.sizes['288x432'] === r.pages, 'every page is 4x6 in');
  await renderFirst(f, '10-label-4x6.png');

  // 2. original size
  await page.$eval('input[name="paper"][value="original"]', el => el.click()); await waitPreview();
  f = await waitDownload(() => page.click('#btn-download'), /labels_original.*\.pdf$/);
  r = await inspect(f); console.log('labels original', r);
  await renderFirst(f, '11-label-original.png');

  // 3. A4 4-up with SKU footer
  await page.$eval('input[name="paper"][value="a4-4"]', el => el.click());
  await page.$eval('input[name="footerSku"] + span', el => el.click());
  await waitPreview();
  f = await waitDownload(() => page.click('#btn-download'), /labels_a4-4.*\.pdf$/);
  r = await inspect(f); console.log('labels a4-4', r);
  await renderFirst(f, '12-label-a4-4up.png');

  // 3b. A4 Smart fit (4+2 rotated) with removeMargin
  await page.$eval('input[name="paper"][value="a4-smart"]', el => el.click());
  await page.$eval('input[name="removeMargin"]', el => el.click());
  await waitPreview();
  f = await waitDownload(() => page.click('#btn-download'), /labels_a4-smart.*\.pdf$/);
  r = await inspect(f); console.log('labels a4-smart', r);
  check(r.sizes['595x842'] === r.pages, 'every page is A4 portrait in smart fit');
  await renderFirst(f, '12b-label-a4-smartfit.png');

  // 4. label + invoice on 4x6
  const hasInvoices = await page.$eval('input[name="output"][value="both"]', el => !el.disabled);
  check(hasInvoices, 'invoices detected');
  if (!hasInvoices) throw new Error('no invoices detected — skipping invoice steps');
  await page.$eval('input[name="paper"][value="4x6"]', el => el.click());
  await page.$eval('input[name="output"][value="both"]', el => el.click());
  await page.select('#sort', 'sku');
  await waitPreview();
  f = await waitDownload(() => page.click('#btn-download'), /labels-invoices.*\.pdf$/);
  console.log(path.basename(f)); r = await inspect(f); console.log('label+invoice 4x6 sorted by sku', r);
  await renderFirst(f, '13-both-p1.png', 1);
  await renderFirst(f, '14-both-p2.png', 2);
  await page.screenshot({ path: path.join(outDir, '03-ready-both.png') });

  // 5. invoices A4, picklist, CSV
  f = await waitDownload(() => page.click('#btn-invoices'), /invoices_A4.*\.pdf$/);
  r = await inspect(f); console.log('invoices A4', r);
  await renderFirst(f, '15-invoice-a4.png');
  f = await waitDownload(() => page.click('#btn-picklist'), /picklist.*\.pdf$/);
  r = await inspect(f); console.log('picklist', r);
  await renderFirst(f, '16-picklist.png');
  f = await waitDownload(() => page.click('#btn-csv'), /orders.*\.csv$/);
  const csv = fs.readFileSync(f, 'utf8').split(/\r\n/);
  console.log('csv rows', csv.length - 1, '\n' + csv.slice(0, 4).join('\n'));

  // 6. crop dialog
  await page.click('#btn-adjust');
  await page.waitForFunction(() => document.querySelector('#crop-dialog').open && document.querySelector('#crop-box').style.width);
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(outDir, '04-crop-dialog.png') });
  await page.click('[data-crop="close"]');

  // 7. content pages + mobile
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outDir, '05-home-full-dark.png'), fullPage: true });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.screenshot({ path: path.join(outDir, '05-home-full-light.png'), fullPage: true });
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, '07-home-light-top.png') });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(BASE + '/flipkart-label-crop', { waitUntil: 'load' });
  await page.screenshot({ path: path.join(outDir, '06-mobile.png') });
  // separate tab: the intentional 404 logs a console error we don't want to count
  const other = await browser.newPage();
  const res404 = await other.goto(BASE + '/nope', { waitUntil: 'load' });
  check(res404.status() === 404, '404 page served');

} catch (e) {
  failures++;
  console.error('E2E error:', e);
} finally {
  const relevant = errors.filter(e => !/(favicon|google|doubleclick|googletagmanager)/.test(e));
  check(relevant.length === 0, `no browser errors${relevant.length ? ':\n  ' + relevant.join('\n  ') : ''}`);
  await browser.close();
  server?.kill();
  console.log(`\nArtifacts in ${outDir}`);
  process.exit(failures ? 1 : 0);
}
