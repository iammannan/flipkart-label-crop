// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver...) that pages changed, so they recrawl
// quickly. Run after a deploy: `npm run indexnow` (all sitemap URLs) or `npm run indexnow -- /path /other`.
// Google does not use IndexNow — submit the sitemap in Google Search Console instead.
import { SITE } from '../src/content/pages.mjs';

const site = (process.env.SITE_URL || SITE.url).replace(/\/$/, '');
const host = new URL(site).host;
const key = SITE.indexNowKey;
if (!key) throw new Error('SITE.indexNowKey is not set in src/content/pages.mjs');

// the key file must be live first, otherwise IndexNow rejects the submission
const keyUrl = `${site}/${key}.txt`;
const keyRes = await fetch(keyUrl);
if (!keyRes.ok || (await keyRes.text()).trim() !== key) {
  throw new Error(`Key file ${keyUrl} is not live yet. Deploy first (npm run deploy), then run this again.`);
}

const args = process.argv.slice(2);
const urlList = args.length
  ? args.map(p => (p.startsWith('http') ? p : site + p))
  : [...(await (await fetch(`${site}/sitemap.xml`)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: keyUrl, urlList }),
});
const meaning = { 200: 'accepted', 202: 'accepted, key will be validated', 400: 'bad request', 403: 'key not valid', 422: 'URLs do not match the host', 429: 'too many requests' };
console.log(`IndexNow: ${res.status} ${meaning[res.status] || ''} — ${urlList.length} URL(s) submitted for ${host}`);
if (res.status >= 400) process.exit(1);
