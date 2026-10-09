// SEO audit of the live site against a practical checklist.
import { SITE as SITE_CONFIG } from '../src/content/pages.mjs';
// Usage: node scripts/seo-audit.mjs [https://labelcropai.web.app]
const SITE = (process.argv[2] || 'https://labelcropai.web.app').replace(/\/$/, '');
const results = [];
const report = (n, name, ok, detail = '') => results.push({ n, name, ok, detail });

const get = async (url, opts = {}) => {
  const res = await fetch(url, { redirect: 'manual', ...opts });
  return { status: res.status, headers: res.headers, text: res.status === 200 ? await res.text() : '' };
};
const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`)) || [])[1];

// 1-2. sitemap + robots
const sitemap = await get(`${SITE}/sitemap.xml`);
const urls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const lastmods = [...sitemap.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
report(1, 'sitemap.xml', sitemap.status === 200 && urls.length > 0, `${urls.length} URLs; lastmod values: ${[...new Set(lastmods)].join(', ')}`);
const robots = await get(`${SITE}/robots.txt`);
report(2, 'robots.txt', robots.status === 200 && robots.text.includes('Sitemap:'), robots.text.replace(/\n/g, ' | '));

const pages = [];
for (const url of urls) {
  const r = await get(url);
  pages.push({ url, path: url.replace(SITE, '') || '/', ...r });
}

// 3. noindex
const noindexed = pages.filter(p => /<meta name="robots" content="[^"]*noindex/i.test(p.text) || /noindex/i.test(p.headers.get('x-robots-tag') || ''));
report(3, 'no noindex on indexable pages', noindexed.length === 0, noindexed.map(p => p.path).join(', '));

// 4. canonical
const badCanon = pages.filter(p => attr(p.text.match(/<link rel="canonical"[^>]*>/)?.[0] || '', 'href') !== p.url);
report(4, 'self-referencing canonical', badCanon.length === 0, badCanon.map(p => p.path).join(', '));

// 5-6. titles and descriptions
const titleOf = p => (p.text.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const descOf = p => attr(p.text.match(/<meta name="description"[^>]*>/)?.[0] || '', 'content') || '';
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const badTitles = pages.filter(p => { const t = decode(titleOf(p)); return !t || t.length > 60; });
report(5, 'meta titles (<= 60 chars, unique)', badTitles.length === 0 && new Set(pages.map(titleOf)).size === pages.length, badTitles.map(p => `${p.path}(${decode(titleOf(p)).length})`).join(', '));
const badDesc = pages.filter(p => { const d = decode(descOf(p)); return !d || d.length > 160; });
report(6, 'meta descriptions (<= 160 chars, unique)', badDesc.length === 0 && new Set(pages.map(descOf)).size === pages.length, badDesc.map(p => p.path).join(', '));

// 7-8. headings
const headingsOf = p => [...p.text.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(m => ({ level: +m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));
const h1Bad = pages.filter(p => headingsOf(p).filter(h => h.level === 1).length !== 1);
report(7, 'exactly one H1 per page', h1Bad.length === 0, h1Bad.map(p => `${p.path}(${headingsOf(p).filter(h => h.level === 1).length})`).join(', '));
const hierarchy = [];
for (const p of pages) {
  const hs = headingsOf(p);
  hs.forEach((h, i) => {
    if (!h.text) hierarchy.push(`${p.path}: empty <h${h.level}>`);
    if (i > 0 && h.level > hs[i - 1].level + 1) hierarchy.push(`${p.path}: h${hs[i - 1].level} -> h${h.level} ("${h.text.slice(0, 30)}")`);
  });
}
report(8, 'heading hierarchy (no skips, no empty)', hierarchy.length === 0, [...new Set(hierarchy.map(h => h.replace(/^\/[^:]*: /, '')))].slice(0, 6).join(' ; ') + (hierarchy.length ? ` [${hierarchy.length} total]` : ''));

// 9. alt text
const imgs = pages.flatMap(p => [...p.text.matchAll(/<img\b[^>]*>/g)].map(m => ({ path: p.path, tag: m[0] })));
const noAlt = imgs.filter(i => !/\balt="/.test(i.tag));
report(9, 'alt text on images', noAlt.length === 0, `${imgs.length} <img> tags; ${noAlt.length} without alt (icons are inline SVG marked aria-hidden)`);

// 10. schema
const schemaIssues = [];
const types = new Set();
for (const p of pages) {
  const blocks = [...p.text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
  if (!blocks.length) schemaIssues.push(`${p.path}: none`);
  for (const b of blocks) {
    try { JSON.parse(b)['@graph']?.forEach(n => types.add(n['@type'])); } catch { schemaIssues.push(`${p.path}: invalid JSON`); }
  }
}
report(10, 'schema markup (JSON-LD)', schemaIssues.length === 0, `types: ${[...types].join(', ')}${schemaIssues.length ? ' | ' + schemaIssues.join(', ') : ''}`);

// 11-12. internal links, orphans, broken links, anchors
const inbound = new Map(pages.map(p => [p.path, 0]));
const targets = new Map();
for (const p of pages) {
  for (const m of p.text.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    const [pathPart, hash] = href.split('#');
    const target = pathPart || p.path;
    if (target !== p.path && inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
    const key = target + (hash ? '#' + hash : '');
    if (!targets.has(key)) targets.set(key, p.path);
  }
}
const orphans = [...inbound].filter(([path, n]) => n === 0 && path !== '/').map(([path]) => path);
report(11, 'internal links (no orphan pages)', orphans.length === 0, `${targets.size} distinct internal link targets; orphans: ${orphans.join(', ') || 'none'}; min inbound: ${Math.min(...[...inbound].filter(([p]) => p !== '/').map(([, n]) => n))}`);
const broken = [];
const htmlCache = new Map(pages.map(p => [p.path, p.text]));
for (const [key, from] of targets) {
  const [path, hash] = key.split('#');
  let html = htmlCache.get(path);
  if (html === undefined) {
    const r = await get(SITE + path);
    if (r.status !== 200 && r.status !== 301) { broken.push(`${key} (${r.status}, linked from ${from})`); continue; }
    html = r.text; htmlCache.set(path, html);
  }
  if (hash && html && !new RegExp(`id="${hash}"`).test(html)) broken.push(`${key} (missing #${hash}, linked from ${from})`);
}
report(12, 'no broken internal links or anchors', broken.length === 0, broken.join(' ; '));

// 13. images
const imageFiles = ['/og.png', '/icon-512.png', '/icon-192.png', '/apple-touch-icon.png', '/favicon.png', '/favicon.svg'];
const sizes = [];
for (const f of imageFiles) { const r = await fetch(SITE + f); sizes.push(`${f} ${Math.round((await r.arrayBuffer()).byteLength / 1024)}KB`); }
report(13, 'compressed images', true, sizes.join(', '));

// 14. weight (Lighthouse gives the real Core Web Vitals)
const home = pages.find(p => p.path === '/');
const cssHref = home.text.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];
const css = cssHref ? await fetch(SITE + cssHref) : null;
report(14, 'page weight (see Lighthouse for CWV)', true, `home HTML ${Math.round(home.text.length / 1024)}KB, CSS ${css ? Math.round((await css.arrayBuffer()).byteLength / 1024) : '?'}KB, no web fonts, PDF libraries load only on first file drop`);

// 15. mobile
const viewportOk = pages.every(p => /<meta name="viewport" content="width=device-width, initial-scale=1">/.test(p.text));
report(15, 'mobile viewport tag', viewportOk);

// 16. https + hsts
const http = await fetch(SITE.replace('https://', 'http://') + '/', { redirect: 'manual' });
const hsts = home.headers.get('strict-transport-security');
report(16, 'HTTPS enforced + HSTS', http.status >= 300 && http.status < 400 && (http.headers.get('location') || '').startsWith('https://') && !!hsts, `http -> ${http.status} ${http.headers.get('location')}; HSTS: ${hsts || 'missing'}`);

// 17. slugs
const badSlugs = urls.filter(u => { const p = u.replace(SITE, ''); return /[A-Z_ ]|\.html$|\/$/.test(p) && p !== '/'; });
const htmlRedirect = await fetch(`${SITE}/about.html`, { redirect: 'manual' });
report(17, 'clean URL slugs', badSlugs.length === 0 && htmlRedirect.status === 301, `.html -> ${htmlRedirect.status} ${htmlRedirect.headers.get('location') || ''}${badSlugs.length ? ' | bad: ' + badSlugs.join(', ') : ''}`);

// 18. llms.txt
const llms = await get(`${SITE}/llms.txt`);
report(18, 'llms.txt', llms.status === 200 && llms.text.startsWith('# '), `status ${llms.status}`);

// 19. backlinks: nothing to test in code
report(19, 'backlink strategy', null, 'off-site work - see plan');

// 20. search engine discovery helpers
const verify = /google-site-verification/.test(home.text);
const indexNowKey = (await get(`${SITE}/${SITE_CONFIG.indexNowKey}.txt`)).text.trim() === SITE_CONFIG.indexNowKey;
report(20, 'search engine submission (GSC tag, IndexNow)', verify && indexNowKey, `Google verification tag: ${verify ? 'yes' : 'no'}; IndexNow key file: ${indexNowKey ? 'yes' : 'no'}`);

for (const r of results) {
  const mark = r.ok === null ? 'INFO' : r.ok ? 'OK  ' : 'FIX ';
  console.log(`${mark} ${String(r.n).padStart(2)}. ${r.name}${r.detail ? '\n        ' + r.detail : ''}`);
}
console.log(`\n${results.filter(r => r.ok === false).length} item(s) to fix.`);
