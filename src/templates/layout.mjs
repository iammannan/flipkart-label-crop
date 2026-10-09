// Shared HTML layout. Every page is pre-rendered static HTML (fast + crawlable).

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = s => String(s).replace(/<[^>]+>/g, '');

export const urlFor = (path, basePath = '') => {
  if (!path || path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('#')) return path;
  const base = (basePath || '').replace(/\/$/, '');
  if (path === '/' || path === '') return base ? `${base}/` : '/';
  if (path.startsWith('/#')) return base ? `${base}/${path.slice(1)}` : path;
  const clean = path.replace(/^\//, '');
  return base ? `${base}/${clean}` : `/${clean}`;
};

export const ICONS = {
  lock: '<path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="4" y="11" width="16" height="10" rx="2.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  barcode: '<path d="M4 5v14M8 5v14M11 5v14M15 5v14M18 5v14M20 5v14"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  crop: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  share: '<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
};
export const icon = (name, cls = 'i') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const brandMark = `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="currentColor"/><path d="M18 14v32h32" fill="none" stroke="#C6F432" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 18h32v32" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/><circle cx="32" cy="32" r="5" fill="#C6F432"/></svg>`;

export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=ecom.label.crop.tool&hl=en';

export const googlePlayIcon = (cls = 'play-logo') => `
<svg class="${cls}" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
  <path d="M3.6 1.8A1.8 1.8 0 0 0 3 3.3v17.4c0 .6.2 1.1.6 1.5l9.2-9.2L3.6 1.8z" fill="#00E676"/>
  <path d="m16.5 9.7-3.7 3.3 3.7 3.3 4.2-2.4c1.2-.7 1.2-1.8 0-2.5l-4.2-2.4z" fill="#FFD600"/>
  <path d="M12.8 13 3.6 22.2c.4.4 1 .4 1.6.1l11.3-6.5L12.8 13z" fill="#FF3D00"/>
  <path d="M12.8 13l3.7-3.3L5.2 3.2c-.6-.3-1.2-.3-1.6.1L12.8 13z" fill="#00B0FF"/>
</svg>`;

export const googlePlayBadge = (cls = '') => `
<a class="google-play-badge${cls ? ' ' + cls : ''}" href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener" aria-label="Get Label Crop Tool on Google Play">
  ${googlePlayIcon()}
  <span class="play-badge-text">
    <span class="play-sub">GET IT ON</span>
    <span class="play-brand">Google Play</span>
  </span>
</a>`;

const TABS = [
  ['auto', 'Auto-detect'], ['meesho', 'Meesho'], ['flipkart', 'Flipkart'], ['amazon', 'Amazon'], ['snapdeal', 'Snapdeal'],
];

function toolMarkup(platform, preset) {
  const tabs = TABS.map(([id, name]) => `<button type="button" role="tab" class="tab tab-${id}" data-platform="${id}" aria-selected="${id === platform}">${id === 'auto' ? icon('spark', 'i i-sm') : '<span class="dot"></span>'}${name}</button>`).join('');
  return `
<section class="tool-wrap" id="tool" aria-label="Label crop tool">
  <div class="tool" data-state="idle" data-platform="${platform}"${preset ? ` data-preset="${esc(JSON.stringify(preset))}"` : ''}>
    <div class="tool-top">
      <div class="tabs" role="tablist" aria-label="Marketplace">${tabs}</div>
      <span class="badge">${icon('lock', 'i i-sm')} On-device</span>
    </div>

    <div class="stage stage-idle" data-stage="idle">
      <label class="drop" id="drop" for="file-input">
        <input id="file-input" type="file" accept="application/pdf,.pdf" multiple class="sr-only">
        <span class="drop-icon">${icon('upload')}</span>
        <strong class="drop-title">Drop your label PDFs here</strong>
        <span class="drop-sub">or <span class="u">browse files</span> &middot; select several PDFs to merge them</span>
        <span class="drop-meta"><span>${icon('check', 'i i-sm')} Meesho</span><span>${icon('check', 'i i-sm')} Flipkart</span><span>${icon('check', 'i i-sm')} Amazon</span><span>${icon('check', 'i i-sm')} Snapdeal</span></span>
      </label>
    </div>

    <div class="stage stage-processing" data-stage="processing" hidden>
      <div class="scan">
        <div class="scan-doc" aria-hidden="true">
          <span class="scan-block b1"></span><span class="scan-block b2"></span><span class="scan-rule"></span>
          <span class="scan-block b3"></span><span class="scan-block b4"></span><span class="scan-line"></span>
        </div>
        <div class="scan-body">
          <p class="scan-title" id="scan-title">Smart Detect is reading your PDFs&hellip;</p>
          <ol class="steps" id="steps">
            <li data-step="read">Reading pages</li>
            <li data-step="detect">Finding labels &amp; invoices</li>
            <li data-step="extract">Reading SKU, courier &amp; payment mode</li>
            <li data-step="build">Building your print-ready PDF</li>
          </ol>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progress-bar"></span></div>
          <p class="scan-count" id="scan-count">&nbsp;</p>
        </div>
      </div>
    </div>

    <div class="stage stage-ready" data-stage="ready" hidden>
      <div class="result-head">
        <div>
          <p class="kicker" id="result-kicker"></p>
          <p class="result-title" id="result-title" aria-live="polite"></p>
        </div>
        <div class="chips" id="chips"></div>
      </div>
      <div class="workspace">
        <form class="settings" id="settings" autocomplete="off">
          <fieldset>
            <legend>Print</legend>
            <div class="segmented" role="radiogroup">
              <label><input type="radio" name="output" value="labels" checked><span>Labels</span></label>
              <label><input type="radio" name="output" value="both"><span>Label + invoice</span></label>
              <label><input type="radio" name="output" value="invoices"><span>Invoices</span></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Paper</legend>
            <div class="papers" id="papers"></div>
          </fieldset>
          <fieldset>
            <legend><label for="sort">Sort orders</label></legend>
            <div class="select"><select id="sort" name="sort"></select></div>
          </fieldset>
          <fieldset>
            <legend>Print on each label</legend>
            <label class="switch"><input type="checkbox" name="footerSku"><span></span>SKU, size &amp; qty</label>
            <label class="switch"><input type="checkbox" name="highlightMulti" checked><span></span>Highlight multi-qty orders</label>
            <label class="switch"><input type="checkbox" name="footerDate"><span></span>Print date</label>
            <input class="text-input" type="text" name="footerText" maxlength="60" placeholder="Custom text, e.g. Handle with care" aria-label="Custom text on label">
          </fieldset>
          <fieldset>
            <legend>Layout</legend>
            <label class="switch"><input type="checkbox" name="autoRotate" checked><span></span>Auto-rotate to fill the paper</label>
            <label class="switch"><input type="checkbox" name="smartFit"><span></span>Smart fit (4 + 2 rotated to save space)</label>
            <label class="switch"><input type="checkbox" name="removeMargin"><span></span>Remove margins (larger QR &amp; barcode)</label>
            <label class="switch"><input type="checkbox" name="cutGuides" checked><span></span>Cut guides on A4 sheets</label>
          </fieldset>
        </form>

        <div class="preview">
          <div class="preview-head">
            <span id="preview-meta" class="preview-meta">Preview</span>
            <button type="button" class="btn-ghost" id="btn-adjust">${icon('crop', 'i i-sm')} Adjust crop</button>
          </div>
          <div class="thumbs" id="thumbs" aria-live="polite"></div>
          <div class="actions">
            <button type="button" class="btn btn-primary btn-lg" id="btn-download">${icon('download')} Download PDF</button>
            <button type="button" class="btn btn-lg" id="btn-print">${icon('printer')} Print</button>
            <button type="button" class="btn btn-lg" id="btn-share" hidden>${icon('share')} Share</button>
          </div>
          <div class="actions-more">
            <button type="button" class="btn-ghost" id="btn-invoices">${icon('file', 'i i-sm')} Invoices (A4)</button>
            <button type="button" class="btn-ghost" id="btn-picklist">${icon('list', 'i i-sm')} Picklist PDF</button>
            <button type="button" class="btn-ghost" id="btn-csv">${icon('layers', 'i i-sm')} Orders CSV</button>
            <button type="button" class="btn-ghost" id="btn-reset">${icon('upload', 'i i-sm')} New files</button>
          </div>
        </div>
      </div>
    </div>

    <div class="tool-error" id="tool-error" role="alert" hidden></div>
  </div>
  <p class="tool-note">${icon('lock', 'i i-sm')} Your PDFs never leave this device. Cropping runs 100% locally. On Android? <a href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener">Get our free app on Google Play &rarr;</a></p>
</section>

<dialog class="crop-dialog" id="crop-dialog" aria-labelledby="crop-title">
  <div class="crop-card">
    <header class="crop-header">
      <div>
        <h2 id="crop-title">Adjust crop area</h2>
        <p>Drag the box or its corners. Your crop is applied to every page.</p>
      </div>
      <button type="button" class="icon-btn" data-crop="close" aria-label="Close">&times;</button>
    </header>
    <div class="segmented crop-kinds" role="radiogroup">
      <label><input type="radio" name="cropKind" value="label" checked><span>Label area</span></label>
      <label><input type="radio" name="cropKind" value="invoice"><span>Invoice area</span></label>
    </div>
    <div class="crop-stage" id="crop-stage">
      <canvas id="crop-canvas"></canvas>
      <div class="crop-box" id="crop-box">
        <span class="h" data-h="nw"></span><span class="h" data-h="ne"></span><span class="h" data-h="sw"></span><span class="h" data-h="se"></span>
      </div>
    </div>
    <footer class="crop-footer">
      <button type="button" class="btn-ghost" data-crop="reset">Reset to Smart Detect</button>
      <button type="button" class="btn btn-primary" data-crop="apply">Apply to all pages</button>
    </footer>
  </div>
</dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>`;
}

function jsonLd(page, ctx) {
  const { site } = ctx;
  const siteUrl = site.url.replace(/\/$/, '');
  const url = siteUrl + (page.path === '/' ? '/' : page.path);
  const graph = [];
  if (page.path === '/') {
    graph.push({
      '@type': 'WebSite', '@id': siteUrl + '/#website', name: site.name, url: siteUrl + '/', inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: siteUrl + '/?q={search_term_string}' },
        'query-input': 'required name=search_term_string',
      },
    });
    graph.push({
      '@type': 'Organization',
      '@id': siteUrl + '/#org',
      name: site.name,
      url: siteUrl + '/',
      logo: siteUrl + '/icon-512.png',
      sameAs: [
        'https://github.com/iammannan/flipkart-label-crop',
        GOOGLE_PLAY_URL,
        'https://labelcropai.web.app',
      ],
    });
  }
  if (page.tool) {
    graph.push({
      '@type': 'WebApplication', name: page.appName || site.name, url, applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'E-commerce Utility Tool',
      operatingSystem: 'Any (runs in the web browser)', browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      featureList: page.features || site.features, description: page.description,
    });
  }
  if (page.howToSteps?.length) {
    graph.push({
      '@type': 'HowTo',
      name: page.crumb || strip(page.h1),
      description: page.description,
      step: page.howToSteps.map((s, idx) => ({
        '@type': 'HowToStep',
        position: idx + 1,
        name: s.name,
        text: s.text,
      })),
    });
  }
  if (page.faqs?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: page.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: strip(f.a) } })),
    });
  }
  if (page.path !== '/') {
    graph.push({
      '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl + '/' },
        { '@type': 'ListItem', position: 2, name: page.crumb || strip(page.h1), item: url },
      ],
    });
  }
  if (page.path === '/') {
    graph.push({
      '@type': 'MobileApplication',
      name: 'Label Crop Tool for e-Commerce',
      operatingSystem: 'Android',
      applicationCategory: 'BusinessApplication',
      installUrl: GOOGLE_PLAY_URL,
      url: GOOGLE_PLAY_URL,
      description: 'Crop Meesho, Flipkart, Amazon and Snapdeal shipping labels directly on Android phones for 4x6 thermal printers.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    });
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
}

function header(page, ctx) {
  const b = ctx.site.basePath || '';
  const nav = ctx.pages.filter(p => p.nav).map(p =>
    `<a href="${urlFor(p.path, b)}"${p.path === page.path ? ' aria-current="page"' : ''}>${p.nav}</a>`).join('');
  return `
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${urlFor('/', b)}" aria-label="${esc(ctx.site.name)} home">${brandMark}<span>${ctx.site.brandHtml || 'Flipkart Label <b>Crop</b>'}</span></a>
    <nav class="nav" aria-label="Primary">${nav}<a href="${page.tool ? '#faq' : urlFor('/#faq', b)}">FAQ</a></nav>
    <a class="header-app" href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener" title="Get Label Crop Tool on Google Play">${googlePlayIcon('play-logo-sm')}<span>Android App</span></a>
    <button type="button" class="btn btn-sm header-enq" data-enq="open">I want software for my business</button>
    <a class="btn btn-dark btn-sm header-cta" href="${page.tool ? '#tool' : urlFor('/#tool', b)}">Crop labels</a>
  </div>
</header>`;
}

function footer(ctx) {
  const b = ctx.site.basePath || '';
  const tools = ctx.pages.filter(p => p.nav).map(p => `<li><a href="${urlFor(p.path, b)}">${esc(p.crumb || p.nav)}</a></li>`).join('');
  return `
<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="brand" href="${urlFor('/', b)}">${brandMark}<span>${ctx.site.brandHtml || 'Flipkart Label <b>Crop</b>'}</span></a>
      <p>Free, 100% private Flipkart label crop and Flipkart label cutter tool for e-commerce sellers. Quick label crop for 4x6 thermal printers and A4 sticker sheets.</p>
      <div class="footer-app">
        ${googlePlayBadge()}
      </div>
    </div>
    <div><h3>Tools</h3><ul><li><a href="${urlFor('/', b)}">Flipkart label crop</a></li>${tools}</ul></div>
${['Printers', 'Workflows', 'Guides'].map(g => { const items = ctx.pages.filter(p => p.group === g); return items.length ? `    <div><h3>${g}</h3><ul>${items.map(p => `<li><a href="${urlFor(p.path, b)}">${esc(p.crumb || p.title)}</a></li>`).join('')}</ul></div>
` : ''; }).join('')}    <div><h3>Apps &amp; Links</h3><ul><li><a href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener">Android App (Google Play)</a></li><li><a href="https://github.com/iammannan/flipkart-label-crop" target="_blank" rel="noopener">GitHub Project</a></li><li><a href="https://labelcropai.web.app" target="_blank" rel="noopener">All-in-one Tool</a></li><li><a href="${urlFor('/about', b)}">About</a></li><li><a href="${urlFor('/privacy', b)}">Privacy</a></li><li><a href="${urlFor('/#faq', b)}">FAQ</a></li></ul></div>
  </div>
  <div class="container footer-legal">
    <p>&copy; ${new Date().getFullYear()} ${esc(ctx.site.name)}. Flipkart Label Crop is an independent seller utility and is not affiliated with, endorsed by or sponsored by Flipkart Internet Private Limited or any marketplace. All trademarks belong to their respective owners.</p>
  </div>
</footer>`;
}

function faqSection(faqs) {
  if (!faqs?.length) return '';
  return `
<section class="section" id="faq">
  <div class="container narrow">
    <p class="kicker">FAQ</p>
    <h2 class="section-title">Questions sellers ask</h2>
    <div class="faq">
      ${faqs.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><div class="faq-a">${f.a}</div></details>`).join('\n      ')}
    </div>
  </div>
</section>`;
}


const androidAppBand = () => `
<section class="section" id="android-app">
  <div class="container">
    <div class="app-band">
      <div class="app-band-info">
        <span class="badge badge-android">${googlePlayIcon('play-logo-sm')} Free on Google Play</span>
        <h2>Label Crop Tool for e-Commerce</h2>
        <p>Crop Flipkart, Meesho, Amazon and Snapdeal shipping labels directly on your Android phone. Print to 4&times;6 thermal printers via Bluetooth or Wi-Fi in seconds &mdash; 100% free with offline on-device privacy.</p>
        <ul class="app-highlights">
          <li>${icon('check', 'i i-sm')} 4&times;6 thermal rolls &amp; A4 sticker sheets</li>
          <li>${icon('check', 'i i-sm')} Bluetooth, USB &amp; Wi-Fi printers (TSC, TVS, Zebra, Xprinter)</li>
          <li>${icon('check', 'i i-sm')} High-contrast crisp barcode scanning</li>
          <li>${icon('check', 'i i-sm')} 100% on-device &amp; offline friendly</li>
        </ul>
      </div>
      <div class="app-band-cta">
        ${googlePlayBadge('play-badge-large')}
        <p class="app-rating">&#9733; 4.2+ &middot; Free download</p>
      </div>
    </div>
  </div>
</section>`;

const softwareBand = () => `
<section class="section" id="software-enquiry">
  <div class="container">
    <div class="soft-band">
      <div>
        <p class="kicker">Custom software</p>
        <h2>Need software built for your business?</h2>
        <p>Inventory, billing, order automation, dashboards, websites or mobile apps &mdash; tell us what you need and we will get back to you.</p>
      </div>
      <button type="button" class="btn btn-lime btn-lg" data-enq="open">${icon('spark')} I want software for my business</button>
    </div>
  </div>
</section>`;

const enquiryDialog = () => `
<dialog class="enq-dialog" id="enq-dialog" aria-labelledby="enq-dialog-title">
  <form class="enq-card" id="enq-form" novalidate>
    <div class="enq-head">
      <div>
        <h2 id="enq-dialog-title">Tell us what you need</h2>
        <p>Software for your business &mdash; we will reply on your email or phone.</p>
      </div>
      <button type="button" class="icon-btn" data-enq="close" aria-label="Close">&times;</button>
    </div>
    <label>Your name<input type="text" name="name" maxlength="80" autocomplete="name" placeholder="Optional"></label>
    <div class="enq-row">
      <label>Email<input type="email" name="email" maxlength="120" autocomplete="email" placeholder="you@example.com"></label>
      <label>Phone / WhatsApp<input type="tel" name="phone" maxlength="25" autocomplete="tel" placeholder="10-digit number"></label>
    </div>
    <label>What do you need?<textarea name="message" rows="4" maxlength="2000" required placeholder="e.g. an order and inventory system for my Flipkart and Meesho business"></textarea></label>
    <input type="text" name="company" class="sr-only" tabindex="-1" autocomplete="off" aria-hidden="true">
    <p class="enq-error" id="enq-error" role="alert" hidden></p>
    <div class="enq-foot">
      <span class="enq-note">Your details are stored securely and used only to reply to you.</span>
      <button type="submit" class="btn btn-primary btn-lg" id="enq-send">Send enquiry</button>
    </div>
  </form>
</dialog>`;

export function renderPage(page, ctx) {
  const { site, assetBase } = ctx;
  const b = site.basePath || '';
  const siteUrl = site.url.replace(/\/$/, '');
  const url = siteUrl + (page.path === '/' ? '/' : page.path);
  const ogImage = siteUrl + '/og.png';
  const body = page.tool ? `
<section class="hero">
  <div class="hero-glow" aria-hidden="true"></div>
  <div class="container hero-inner">
    <p class="eyebrow"><span class="eyebrow-dot"></span>${page.eyebrow || 'Smart Detect &middot; runs on your device'}</p>
    <h1>${page.h1}</h1>
    <p class="lede">${page.lede}</p>
    <ul class="proof">
      <li>${icon('check', 'i i-sm')} No upload, no login</li>
      <li>${icon('check', 'i i-sm')} 4&times;6 thermal &amp; A4</li>
      <li>${icon('check', 'i i-sm')} SKU sort &amp; picklist</li>
    </ul>
  </div>
  <div class="container">${toolMarkup(page.platform, page.preset)}</div>
</section>
${page.body || ''}
${faqSection(page.faqs)}
${page.after || ''}` : `
<section class="page-hero">
  <div class="container narrow">
    <p class="kicker">${esc(page.crumb || '')}</p>
    <h1>${page.h1}</h1>
    ${page.lede ? `<p class="lede">${page.lede}</p>` : ''}
  </div>
</section>
<section class="section section-tight"><div class="container narrow prose">${page.body || ''}</div></section>`;

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#0E1116">
${Array.isArray(site.verification) ? site.verification.map(v => `<meta name="google-site-verification" content="${esc(v)}">`).join('\n') : (site.verification ? `<meta name="google-site-verification" content="${esc(site.verification)}">` : "")}
${site.googleAdsId ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.googleAdsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${site.googleAdsId}');
</script>` : ""}
${site.googleAdsPageViewLabel ? `<!-- Event snippet for Page view conversion page -->
<script>
  gtag('event', 'conversion', {'send_to': '${site.googleAdsPageViewLabel}'});
</script>` : ""}
<link rel="icon" href="${urlFor('/favicon.svg', b)}" type="image/svg+xml">
<link rel="icon" href="${urlFor('/favicon.png', b)}" sizes="48x48" type="image/png">
<link rel="apple-touch-icon" href="${urlFor('/apple-touch-icon.png', b)}">
<link rel="manifest" href="${urlFor('/site.webmanifest', b)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(page.ogTitle || page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.ogTitle || page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="${assetBase}/css/styles.css">
${page.tool ? `<link rel="modulepreload" href="${assetBase}/js/app.js">` : ''}
<script type="application/ld+json">${jsonLd(page, ctx)}</script>
</head>
<body${page.tool ? ` data-platform="${page.platform}"` : ''}>
${header(page, ctx)}
<main id="main">
${body}
${page.admin ? '' : androidAppBand()}
${page.admin ? '' : softwareBand()}
</main>
${footer(ctx)}
${page.admin ? '' : enquiryDialog()}
<script type="module" src="${assetBase}/js/${page.script || (page.tool ? 'app' : 'site')}.js"></script>
</body>
</html>
`;
}
