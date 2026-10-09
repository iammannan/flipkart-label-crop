// One-off: renders the Open Graph image and PNG icons into src/static using a local Chrome/Edge.
// Usage: node scripts/gen-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'static');
const browserPath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));
const svg = fs.readFileSync(path.join(out, 'favicon.svg'), 'utf8');

const og = `<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;background:#0E1116;color:#fff;font-family:"Segoe UI",system-ui,sans-serif;overflow:hidden;position:relative}
  .glow{position:absolute;inset:-200px -100px auto auto;width:760px;height:760px;background:radial-gradient(circle,rgba(198,244,50,.28),transparent 62%)}
  .wrap{position:absolute;left:76px;top:70px;width:640px}
  .brand{display:flex;align-items:center;gap:16px;font-size:32px;font-weight:700;letter-spacing:-.5px}
  .brand svg{width:56px;height:56px}
  .brand b{color:#C6F432}
  h1{margin-top:56px;font-size:66px;line-height:1.04;letter-spacing:-2.5px;font-weight:800}
  h1 span{color:#C6F432}
  p{margin-top:26px;font-size:27px;color:#AEB4C0;line-height:1.35}
  .pills{display:flex;gap:12px;margin-top:40px}
  .pill{padding:10px 18px;border:1.5px solid #2A303B;border-radius:999px;font-size:21px;color:#E3E6EC}
  .stack{position:absolute;right:70px;top:92px;width:380px;height:460px}
  .sheet{position:absolute;background:#fff;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.45)}
  .a4{inset:0 40px 0 0;opacity:.18;transform:rotate(-6deg)}
  .label{left:40px;top:40px;width:320px;height:400px;padding:22px;color:#111}
  .row{height:12px;background:#E5E7EB;border-radius:4px;margin-bottom:10px}
  .bar{height:84px;margin:20px 0;background:repeating-linear-gradient(90deg,#111 0 4px,#fff 4px 7px,#111 7px 9px,#fff 9px 14px)}
  .crop{position:absolute;inset:26px;border:3px dashed #C6F432;border-radius:18px}
  .tag{position:absolute;right:-12px;top:-18px;background:#C6F432;color:#0E1116;font-weight:800;font-size:20px;padding:8px 14px;border-radius:10px}
</style></head><body><div class="glow"></div>
<div class="wrap">
  <div class="brand">${svg}<span>Label Crop <b>AI</b></span></div>
  <h1>Crop <span>Flipkart, Meesho &amp; Amazon</span> labels in seconds</h1>
  <p>4×6 thermal &amp; A4 · SKU sort · picklists · 100% in your browser</p>
  <div class="pills"><span class="pill">Free</span><span class="pill">No upload</span><span class="pill">No signup</span></div>
</div>
<div class="stack"><div class="sheet a4"></div><div class="sheet label">
  <div class="row" style="width:60%"></div><div class="row" style="width:85%"></div><div class="row" style="width:70%"></div>
  <div class="bar"></div><div class="row" style="width:90%"></div><div class="row" style="width:50%"></div><div class="row" style="width:75%"></div>
  <div class="bar" style="height:54px"></div></div><div class="crop"></div><div class="tag">4×6</div></div>
</body></html>`;

const iconHtml = (pad) => `<!doctype html><html><body style="margin:0;background:${pad ? '#0E1116' : 'transparent'}">
<div style="width:100vw;height:100vh;display:grid;place-items:center">${svg.replace('<svg ', `<svg style="width:${pad ? 78 : 100}vw;height:${pad ? 78 : 100}vw" `)}</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: browserPath, headless: true });
const page = await browser.newPage();
const shot = async (html, w, h, file) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(out, file), omitBackground: true });
  console.log('wrote', file);
};
await shot(og, 1200, 630, 'og.png');
await shot(iconHtml(true), 512, 512, 'icon-512.png');
await shot(iconHtml(true), 192, 192, 'icon-192.png');
await shot(iconHtml(true), 180, 180, 'apple-touch-icon.png');
await shot(iconHtml(false), 48, 48, 'favicon.png');
await browser.close();
