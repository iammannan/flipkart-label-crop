// Static site generator for Flipkart Label Crop. Zero dependencies.
// Renders every page from src/content/pages.mjs into /public with shared layout,
// fingerprints assets, vendors PDF libraries (CDN fallback), and writes sitemap/robots/sw.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SITE, PAGES } from '../src/content/pages.mjs';
import { renderPage } from '../src/templates/layout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const out = path.join(root, 'public');
const siteUrl = (process.env.SITE_URL || SITE.url).replace(/\/$/, '');
const basePath = (process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : (SITE.basePath || '')).replace(/\/$/, '');

const rel = p => path.join(root, p);
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const copyDir = (from, to, filter = () => true) => {
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b, filter);
    else if (filter(a)) { fs.mkdirSync(to, { recursive: true }); fs.copyFileSync(a, b); }
  }
};
const listFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]);

// 1. Clean output
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

// 2. Fingerprinted asset directory (/assets/v-<hash>/...) so relative ES module imports keep working
const assetSrc = path.join(src, 'assets');
const hash = crypto.createHash('sha1');
for (const f of listFiles(assetSrc).sort()) hash.update(f.slice(assetSrc.length)).update(fs.readFileSync(f));
const version = hash.digest('hex').slice(0, 10);
const assetBase = `${basePath}/assets/v-${version}`;
copyDir(assetSrc, path.join(out, 'assets', `v-${version}`), f => !f.endsWith('.map'));

// Light CSS minification (comments + whitespace) — keeps the build dependency-free
const cssFile = path.join(out, 'assets', `v-${version}`, 'css', 'styles.css');
write(cssFile, fs.readFileSync(cssFile, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{}:;,>])\s*/g, '$1')
  .replace(/;}/g, '}')
  .trim());

// 3. Vendor fallback copies of the PDF libraries (only fetched if jsDelivr is unreachable)
const pdfjs = rel('node_modules/pdfjs-dist');
const vendor = path.join(out, 'vendor');
fs.mkdirSync(path.join(vendor, 'pdfjs'), { recursive: true });
fs.copyFileSync(path.join(pdfjs, 'legacy/build/pdf.min.mjs'), path.join(vendor, 'pdfjs/pdf.min.mjs'));
fs.copyFileSync(path.join(pdfjs, 'legacy/build/pdf.worker.min.mjs'), path.join(vendor, 'pdfjs/pdf.worker.min.mjs'));
copyDir(path.join(pdfjs, 'standard_fonts'), path.join(vendor, 'pdfjs/standard_fonts'));
copyDir(path.join(pdfjs, 'cmaps'), path.join(vendor, 'pdfjs/cmaps'));
fs.mkdirSync(path.join(vendor, 'pdf-lib'), { recursive: true });
fs.copyFileSync(rel('node_modules/pdf-lib/dist/pdf-lib.esm.min.js'), path.join(vendor, 'pdf-lib/pdf-lib.esm.min.js'));

// 4. Static files (icons, og image, manifest ...)
copyDir(path.join(src, 'static'), out);

// 5. Pages (rendered HTML kept for lastmod tracking)
const rendered = new Map();
// 5a. SEO checks — fail the build on SEO basics that would hurt rankings
{
  const problems = [];
  const warnings = [];
  const seen = { title: new Map(), description: new Map(), h1: new Map() };
  for (const p of PAGES.filter(p => !p.noindex)) {
    if (p.title.length > 60) problems.push(`${p.path}: title is ${p.title.length} chars (max 60)`);
    if (p.description.length > 160) problems.push(`${p.path}: description is ${p.description.length} chars (max 160)`);
    else if (p.description.length > 155) warnings.push(`${p.path}: description is ${p.description.length} chars (aim for 155)`);
    if (p.tool && (p.faqs || []).length < 3) problems.push(`${p.path}: tool pages need at least 3 FAQs`);
    for (const k of ['title', 'description', 'h1']) {
      if (seen[k].has(p[k])) problems.push(`${p.path}: same ${k} as ${seen[k].get(p[k])}`);
      seen[k].set(p[k], p.path);
    }
  }
  if (warnings.length) console.warn('SEO warnings:\n - ' + warnings.join('\n - '));
  if (problems.length) {
    console.error('SEO checks failed:\n - ' + problems.join('\n - '));
    process.exit(1);
  }
}
const buildDate = new Date().toISOString().slice(0, 10);
for (const page of PAGES) {
  const html = renderPage(page, { site: { ...SITE, url: siteUrl, basePath }, assetBase, pages: PAGES, buildDate });
  write(path.join(out, page.file), html);
  rendered.set(page.path, html);
}

// 6. sitemap.xml + robots.txt
// lastmod only changes when a page's content changes (asset fingerprints ignored), so search
// engines can trust it. History is kept in src/content/lastmod.json.
const lastmodFile = path.join(src, 'content', 'lastmod.json');
const lastmodDb = fs.existsSync(lastmodFile) ? JSON.parse(fs.readFileSync(lastmodFile, 'utf8')) : {};
for (const [p, html] of rendered) {
  const normalized = html.replace(/\/assets\/v-[a-f0-9]+\//g, '/assets/');
  const digest = crypto.createHash('sha1').update(normalized).digest('hex');
  if (lastmodDb[p]?.hash !== digest) lastmodDb[p] = { hash: digest, date: buildDate };
}
fs.writeFileSync(lastmodFile, JSON.stringify(Object.fromEntries(Object.entries(lastmodDb).sort()), null, 2) + '\n');
const indexable = PAGES.filter(p => !p.noindex);
write(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(p => `  <url><loc>${siteUrl}${p.path === '/' ? '/' : p.path}</loc><lastmod>${lastmodDb[p.path]?.date || buildDate}</lastmod><changefreq>${p.changefreq || 'monthly'}</changefreq><priority>${Number(p.priority ?? 0.5).toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`);
write(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /vendor/
Disallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

// 6b. llms.txt — a plain-text map of the site for AI assistants and LLM crawlers (llmstxt.org)
{
  const link = p => `- [${p.crumb || p.nav || 'Flipkart Label Crop'}](${siteUrl}${p.path === '/' ? '/' : p.path}): ${p.description}`;
  const idx = PAGES.filter(p => !p.noindex);
  const group = g => idx.filter(p => p.group === g).map(link).join('\n');
  const core = idx.filter(p => p.tool && !p.group).map(link).join('\n');
  const info = idx.filter(p => !p.tool).map(link).join('\n');
  write(path.join(out, 'llms.txt'), `# Flipkart Label Crop & Cutter

> Free browser-based Flipkart label crop and Flipkart label cutter tool for 4x6 thermal printers and A4 sticker sheets. Separates shipping labels from tax invoices automatically. PDFs are processed on the user's own device and are never uploaded.

Key facts:
- Free, no signup, no watermark, no page or daily limit.
- Automatic tax invoice cutter and separator for Flipkart Seller Hub and Shopsy label PDFs.
- Paper layouts: 4x6, 4x4 and 3x5 inch thermal; A4 with 1, 2, 4, 6 (Smart fit) or 8 labels per sheet; original size.
- Sorts labels by SKU, Ekart courier partner, COD / prepaid or multi-quantity; SKU picklist PDF and orders CSV.
- Merges multiple PDF files into one print job.
- Compatible with TVS, TSC, Zebra and Xprinter thermal printers.
- Runs on desktop and mobile browsers; works offline after first use; installable as an app.
- Privacy: PDFs are read and cropped in the browser with pdf.js and pdf-lib; customer data never leaves the device.

## Core label crop tools
${core}

## Printer setup
${group('Printers')}

## Seller workflows
${group('Workflows')}

## Guides
${group('Guides')}

## About
${info}
`);
}

// 6c. IndexNow key file (see scripts/indexnow.mjs)
if (SITE.indexNowKey) write(path.join(out, `${SITE.indexNowKey}.txt`), SITE.indexNowKey);

// 6d. GitHub Pages helpers: .nojekyll & redirect alias for /flipkart-label-crop
write(path.join(out, '.nojekyll'), '# Disable Jekyll\n');
write(path.join(out, 'flipkart-label-crop.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=./">
<link rel="canonical" href="${siteUrl}/">
<meta name="robots" content="noindex">
<title>Flipkart Label Crop &amp; Cutter</title>
</head>
<body>
<p>Redirecting to <a href="./">Flipkart Label Crop &amp; Cutter</a>...</p>
</body>
</html>
`);

// 7. Service worker (versioned so each deploy refreshes caches)
const sw = fs.readFileSync(path.join(src, 'sw.js'), 'utf8').replace('__VERSION__', version);
write(path.join(out, 'sw.js'), sw);

const kb = f => (fs.statSync(f).size / 1024).toFixed(1) + ' KB';
console.log(`Built ${PAGES.length} pages -> public/  (assets v-${version}, site ${siteUrl}, base ${basePath})`);
for (const p of PAGES) console.log(`  ${p.path.padEnd(22)} ${kb(path.join(out, p.file))}`);
