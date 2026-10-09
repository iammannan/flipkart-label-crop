// Smart Detect: finds shipping labels & invoices on every page and reads order details.
// Works entirely in the browser: pdf.js text positions + a low-res render to measure where ink is.
import { loadPdfjs } from './libs.js';

const RENDER_SCALE = 1.5;     // px per pt used for ink measurement
const INK_LUMA = 215;         // darker than this counts as ink
const PAD = 4;                // pt of breathing room around detected content
const BLOCK_GAP = 28;         // pt of empty rows that separate unrelated content blocks

export const PLATFORM_NAMES = { meesho: 'Meesho', flipkart: 'Flipkart', amazon: 'Amazon', snapdeal: 'Snapdeal', other: 'Other' };

const SEPARATOR = /^\s*[-–—.\s]*fold\s*here[-–—.\s]*$/i;
const INVOICE_HEADER = /^\s*(tax\s+invoice|bill\s+of\s+supply|retail\s+invoice)\b/i;

const COURIERS = [
  ['Valmo', /\bvalmo\b/i],
  ['Delhivery', /\bdelhivery\b/i],
  ['Xpressbees', /\bxpress\s*bees\b/i],
  ['Shadowfax', /\bshadowfax\b/i],
  ['Ecom Express', /\becom\s*express\b/i],
  ['Ekart', /\be-?kart\b/i],
  ['DTDC', /\bdtdc\b/i],
  ['Blue Dart', /\bblue\s*dart\b/i],
  ['India Post', /\b(india\s*post|speed\s*post)\b/i],
  ['Amazon Shipping', /\b(amazon\s+shipping|amazon\s+transportation|\bATS\b)/i],
  ['Smartr', /\bsmartr\b/i],
  ['Gati', /\bgati\b/i],
  ['Shiprocket', /\bshiprocket\b/i],
  ['Professional', /\bprofessional\s+couriers?\b/i],
  ['Elasticrun', /\belastic\s*run\b/i],
  ['Loadshare', /\bload\s*share\b/i],
];

const COLUMN_KEYS = [
  ['sku', /^(sku|sku\s*id|seller\s*sku|product)$/i],
  ['size', /^size$/i],
  ['qty', /^(qty|quantity)$/i],
  ['color', /^colou?r$/i],
  ['order', /^order\s*(no\.?|id|number)$/i],
];

/** Sniff which marketplace produced the PDF from its first page text. */
export function detectPlatform(text) {
  const score = {
    meesho: (text.match(/meesho|fashnear|valmo|if undelivered, return to|fold here/gi) || []).length,
    flipkart: (text.match(/flipkart|e-?kart|\bOD\d{12,}\b/gi) || []).length,
    amazon: (text.match(/amazon|\b\d{3}-\d{7}-\d{7}\b/gi) || []).length,
    snapdeal: (text.match(/snapdeal|snapdeal\.com|\bSLP\d+\b/gi) || []).length,
  };
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'other';
}

/**
 * Load one PDF and analyse every page.
 * @returns {{ pdf, pages: PageInfo[], platform: string }}
 */
export async function analyzeFile(file, fileIndex, { platform = 'auto', onPage } = {}) {
  const { lib, docOptions } = await loadPdfjs();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await lib.getDocument({ data: bytes.slice(), ...docOptions }).promise;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const pages = [];
  let resolvedPlatform = platform;

  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const info = await analyzePage(lib, page, canvas, ctx, resolvedPlatform);
    info.fileIndex = fileIndex;
    info.pageIndex = n - 1;
    if (resolvedPlatform === 'auto' && n === 1) resolvedPlatform = detectPlatform(info.text);
    pages.push(info);
    page.cleanup();
    onPage?.(n, pdf.numPages);
    if (n % 4 === 0) await new Promise(r => setTimeout(r)); // keep the UI responsive
  }
  canvas.width = canvas.height = 0;
  for (const p of pages) p.meta = extractMeta(p, resolvedPlatform);
  return { pdf, bytes, pages, platform: resolvedPlatform === 'auto' ? 'other' : resolvedPlatform };
}

async function analyzePage(lib, page, canvas, ctx, platform = 'auto') {
  const vp = page.getViewport({ scale: 1 });
  const W = vp.width, H = vp.height;

  // ---- text with positions (top-left origin, pt) ----
  const tc = await page.getTextContent();
  const items = [];
  for (const it of tc.items) {
    if (!it.str || !it.str.trim()) continue;
    const t = lib.Util.transform(vp.transform, it.transform);
    const size = Math.hypot(t[2], t[3]) || it.height || 8;
    items.push({ str: it.str.trim(), x: t[4], y: t[5], top: t[5] - size, size, w: it.width });
  }
  const lines = groupLines(items);
  const text = lines.map(l => l.text).join('\n');
  const pagePlatform = platform === 'auto' ? detectPlatform(text) : platform;

  // ---- ink map from a low-res render ----
  const rvp = page.getViewport({ scale: RENDER_SCALE });
  canvas.width = Math.ceil(rvp.width);
  canvas.height = Math.ceil(rvp.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: rvp, background: 'rgb(255,255,255)' }).promise;
  const ink = inkMap(ctx.getImageData(0, 0, canvas.width, canvas.height));

  const regions = findRegions({ items, ink, W, H, platform: pagePlatform });
  return {
    width: W, height: H, rotate: page.rotate, viewport: vp,
    items, lines, text, regions,
  };
}

function groupLines(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const it of sorted) {
    const line = lines.find(l => Math.abs(l.y - it.y) < Math.max(2, it.size * 0.3));
    if (line) line.items.push(it); else lines.push({ y: it.y, items: [it] });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = l.items.map(i => i.str).join(' ');
  }
  return lines.sort((a, b) => a.y - b.y);
}

/** Collapse the render into a 1-bit ink mask plus per-row counts. */
function inkMap({ data, width, height }) {
  const mask = new Uint8Array(width * height);
  const rows = new Uint32Array(height);
  for (let y = 0, i = 0; y < height; y++) {
    let c = 0;
    for (let x = 0; x < width; x++, i++) {
      const o = i * 4;
      const luma = (data[o] * 299 + data[o + 1] * 587 + data[o + 2] * 114) / 1000;
      if (luma < INK_LUMA) { mask[i] = 1; c++; }
    }
    rows[y] = c;
  }
  return { mask, rows, width, height, scale: RENDER_SCALE };
}

const isBlankRow = (ink, py) => py < 0 || py >= ink.height || ink.rows[py] <= 1;

/** Walk from a pt position up (dir -1) or down (dir 1) until an empty row. Returns pt. */
function walkToGap(ink, yPt, dir, limitPt) {
  let py = Math.round(yPt * ink.scale);
  const limit = Math.round(limitPt * ink.scale);
  while (!isBlankRow(ink, py)) {
    py += dir;
    if ((dir < 0 && py <= limit) || (dir > 0 && py >= limit)) return null;
  }
  return py / ink.scale;
}

/** A printed horizontal rule: ink across most of the width, solid rather than text. */
function isRuleRow(ink, py) {
  if (py < 0 || py >= ink.height || ink.rows[py] < ink.width * 0.5) return false;
  const row = py * ink.width;
  let minX = -1, maxX = -1;
  for (let x = 0; x < ink.width; x++) if (ink.mask[row + x]) { minX = x; break; }
  for (let x = ink.width - 1; x >= 0; x--) if (ink.mask[row + x]) { maxX = x; break; }
  if (minX < 0 || maxX - minX < ink.width * 0.6) return false;
  return ink.rows[py] / (maxX - minX + 1) > 0.9;
}

/**
 * Where the block above an invoice heading ends: the nearest blank row or box
 * border above it. Meesho bill-of-supply labels have no gap at all between the
 * label box and the invoice box, only the shared border line.
 */
function boundaryAbove(ink, yPt, limitPt) {
  const from = Math.round(yPt * ink.scale);
  const to = Math.max(0, Math.round(limitPt * ink.scale));
  for (let py = from; py >= to; py--) {
    if (isBlankRow(ink, py)) return py / ink.scale;
    if (isRuleRow(ink, py)) return (py + 1) / ink.scale;   // the border stays with the label
  }
  return null;
}

/** Tight bounding box (pt) of ink between two y positions (and optional x bounds), keeping only the dominant block. */
function inkBox(ink, y0Pt, y1Pt, W, H, x0Pt = 0, x1Pt = W) {
  const s = ink.scale;
  const py0 = Math.max(0, Math.floor(y0Pt * s)), py1 = Math.min(ink.height - 1, Math.ceil(y1Pt * s));
  const px0 = Math.max(0, Math.floor(x0Pt * s)), px1 = Math.min(ink.width - 1, Math.ceil(x1Pt * s));

  const countInRow = (y) => {
    if (px0 === 0 && px1 >= ink.width - 1) return ink.rows[y];
    let c = 0;
    const row = y * ink.width;
    for (let x = px0; x <= px1; x++) if (ink.mask[row + x]) c++;
    return c;
  };

  // split the band into vertical blocks separated by big empty gaps, keep the heaviest one
  const blocks = [];
  let cur = null, gap = 0;
  for (let y = py0; y <= py1; y++) {
    const n = countInRow(y);
    if (n > 1) {
      if (!cur || gap > BLOCK_GAP * s) { cur = { y0: y, y1: y, weight: 0 }; blocks.push(cur); }
      cur.y1 = y; cur.weight += n; gap = 0;
    } else if (cur) gap++;
  }
  if (!blocks.length) return null;
  const block = blocks.reduce((a, b) => (b.weight > a.weight ? b : a));

  // horizontal extent of every row in the block
  const count = block.y1 - block.y0 + 1;
  const mins = new Int32Array(count).fill(-1);
  const maxs = new Int32Array(count).fill(-1);
  for (let y = block.y0; y <= block.y1; y++) {
    const row = y * ink.width;
    let lo = -1, hi = -1;
    for (let x = px0; x <= px1; x++) if (ink.mask[row + x]) { lo = x; break; }
    if (lo >= 0) for (let x = px1; x >= lo; x--) if (ink.mask[row + x]) { hi = x; break; }
    mins[y - block.y0] = lo;
    maxs[y - block.y0] = hi;
  }
  const spanAt = i => (mins[i] < 0 ? 0 : maxs[i] - mins[i] + 1);
  const spans = [...Array(count).keys()].map(spanAt).filter(v => v > 0).sort((a, b) => a - b);
  if (!spans.length) return null;
  const median = spans[Math.floor(spans.length / 2)];

  // A cut line printed right across the sheet (Flipkart prints one under the label) is far
  // wider than the label itself. Trimming it off the edges keeps the crop tight instead of
  // stretching it to the page width. The median guard leaves full-width labels alone.
  const boxW = px1 - px0 + 1;
  const isSeparator = i => spanAt(i) > Math.max(boxW * 0.75, median * 1.5);
  let top = 0, bottom = count - 1;
  while (top < bottom && (spanAt(top) === 0 || isSeparator(top))) top++;
  while (bottom > top && (spanAt(bottom) === 0 || isSeparator(bottom))) bottom--;

  let minX = ink.width, maxX = -1;
  for (let i = top; i <= bottom; i++) {
    if (mins[i] < 0) continue;
    if (mins[i] < minX) minX = mins[i];
    if (maxs[i] > maxX) maxX = maxs[i];
  }
  if (maxX < minX) return null;

  // Padding never crosses the band edges (e.g. the Fold Here line below a Meesho label),
  // and never reaches back over a separator row we just trimmed off.
  const padTop = top > 0 ? 1 : PAD;
  const padBottom = bottom < count - 1 ? 1 : PAD;
  return {
    x0: Math.max(x0Pt, minX / s - PAD), x1: Math.min(x1Pt, (maxX + 1) / s + PAD),
    y0: Math.max(0, y0Pt, (block.y0 + top) / s - padTop),
    y1: Math.min(H, y1Pt, (block.y0 + bottom + 1) / s + padBottom),
  };
}

/** Find the lowest ink column separating side-by-side label and invoice columns. */
function findColSplit(ink, W, H, minFraction = 0.35, maxFraction = 0.60) {
  const minCol = Math.floor(ink.width * minFraction);
  const maxCol = Math.floor(ink.width * maxFraction);
  const maxRow = Math.floor(ink.height * 0.65);
  let bestX = Math.floor(ink.width * 0.48), bestInk = Infinity;
  for (let x = minCol; x <= maxCol; x++) {
    let count = 0;
    for (let y = 0; y < maxRow; y++) {
      if (ink.mask[y * ink.width + x]) count++;
    }
    if (count < bestInk) {
      bestInk = count;
      bestX = x;
      if (count === 0) {
        let gapEnd = x;
        while (gapEnd + 1 <= maxCol) {
          let c = 0;
          for (let y = 0; y < maxRow; y++) if (ink.mask[y * ink.width + (gapEnd + 1)]) c++;
          if (c > 0) break;
          gapEnd++;
        }
        bestX = Math.floor((x + gapEnd) / 2);
        break;
      }
    }
  }
  return bestX / ink.scale;
}

function findRegions({ items, ink, W, H, platform = 'other' }) {
  const regions = [];
  const push = (kind, y0, y1, x0 = 0, x1 = W) => {
    const box = inkBox(ink, y0, y1, W, H, x0, x1);
    if (box && box.y1 - box.y0 > 30 && box.x1 - box.x0 > 30) regions.push({ kind, box });
  };

  const sep = items.find(i => SEPARATOR.test(i.str));
  const header = items.find(i => INVOICE_HEADER.test(i.str));

  const isSideBySide = platform === 'snapdeal'
    || items.some(i => /snapdeal|SLP\d+/i.test(i.str))
    || (!sep && platform !== 'meesho' && platform !== 'flipkart' && header && header.top < H * 0.3 && header.x > W * 0.45 && items.some(i => i.x < header.x - 40));

  if (isSideBySide) {
    // Side-by-side format (Snapdeal): left box is shipping label, right side is tax invoice
    const split = findColSplit(ink, W, H);
    push('label', 0, H, 0, split);
    push('invoice', 0, H, split, W);
  } else if (sep) {
    // Meesho style: label above the "Fold Here" line, invoice below it
    const up = walkToGap(ink, sep.top - 1, -1, 0) ?? sep.top - 2;
    const down = walkToGap(ink, sep.y + 2, 1, H) ?? sep.y + 3;
    push('label', 0, up - 1);
    push('invoice', down + 1, H);
  } else if (header && header.top > H * 0.18) {
    // Label on top, invoice underneath. The two may be separated by white space
    // (Flipkart) or only by the box border they share (Meesho bill of supply).
    const split = boundaryAbove(ink, header.top - 1, header.top - 90) ?? header.top - 4;
    push('label', 0, split);
    push('invoice', split, H);
  } else if (header) {
    push('invoice', 0, H);          // whole page is an invoice (Amazon style)
  } else {
    // No text anchors (e.g. image-only / scanned PDFs): look for the dashed cut line visually
    const dash = findDashedRow(ink);
    if (dash) {
      push('label', 0, dash.top - 1);
      push('invoice', dash.bottom + 1, H);
    } else {
      push('label', 0, H);          // whole page is a label
    }
  }
  return regions;
}

const trimmedCv = (values) => {
  const a = [...values].sort((x, y) => x - y);
  const cut = Math.floor(a.length * 0.1);
  const t = a.slice(cut, a.length - cut);
  const mean = t.reduce((s, v) => s + v, 0) / t.length;
  const sd = Math.sqrt(t.reduce((s, v) => s + (v - mean) ** 2, 0) / t.length);
  return mean ? sd / mean : Infinity;
};

/** A dashed row = many evenly sized ink runs with even gaps across most of the page width. */
function isDashedRow(ink, y) {
  const { mask, width: w } = ink;
  const row = y * w;
  const runs = [], gaps = [];
  let x = 0, first = -1, last = -1;
  while (x < w) {
    const start = x;
    if (mask[row + x]) {
      while (x < w && mask[row + x]) x++;
      runs.push(x - start);
      if (first < 0) first = start;
      last = x;
    } else {
      while (x < w && !mask[row + x]) x++;
      if (first >= 0 && x < w) gaps.push(x - start);
    }
  }
  if (runs.length < 20 || gaps.length < 19 || last - first < w * 0.6) return false;
  return trimmedCv(runs) < 0.35 && trimmedCv(gaps) < 0.6;
}

/** Find the first dashed cut line in the middle of the page. Returns pt range or null. */
function findDashedRow(ink) {
  const y0 = Math.floor(ink.height * 0.15), y1 = Math.floor(ink.height * 0.9);
  let group = null;
  for (let y = y0; y < y1; y++) {
    const n = ink.rows[y];
    const candidate = n > ink.width * 0.08 && n < ink.width * 0.8 && isDashedRow(ink, y);
    if (candidate) {
      if (!group) group = { top: y, bottom: y };
      else group.bottom = y;
    } else if (group) break;
  }
  return group && { top: group.top / ink.scale, bottom: (group.bottom + 1) / ink.scale };
}

// ---------------------------------------------------------------- order details

function linesIn(page, kind) {
  const r = page.regions.find(x => x.kind === kind);
  if (!r) return [];
  const b = r.box;
  if (b.x0 > 20 || b.x1 < page.width - 20) {
    const regionItems = page.items.filter(it =>
      it.x >= b.x0 - 4 && (it.x + (it.w || 0)) <= b.x1 + 10 &&
      it.y >= b.y0 - 4 && it.y <= b.y1 + 6
    );
    return groupLines(regionItems);
  }
  return page.lines.filter(l => l.y >= b.y0 && l.y <= b.y1 + 4);
}

function readProductTable(lines) {
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = [];
    for (const it of lines[i].items) {
      const key = COLUMN_KEYS.find(([, re]) => re.test(it.str))?.[0];
      if (key && !cols.some(c => c.key === key)) cols.push({ key, x: it.x });
    }
    if (!cols.some(c => c.key === 'sku') || cols.length < 2) continue;
    cols.sort((a, b) => a.x - b.x);
    for (let j = i + 1; j < lines.length && rows.length < 30; j++) {
      const l = lines[j];
      if (SEPARATOR.test(l.text) || INVOICE_HEADER.test(l.text) || l.y - lines[j - 1].y > 40) break;
      const row = {};
      for (const it of l.items) {
        const col = [...cols].reverse().find(c => it.x >= c.x - 6) || cols[0];
        row[col.key] = row[col.key] ? `${row[col.key]} ${it.str}` : it.str;
      }
      if (Object.keys(row).length < 2 || !row.sku) break;
      rows.push(row);
    }
    if (rows.length) break;
  }
  return rows.map(r => ({
    sku: r.sku.trim(), size: (r.size || '').trim(), color: (r.color || '').trim(),
    qty: Math.max(1, parseInt(r.qty, 10) || 1), order: (r.order || '').trim(),
  }));
}

export function extractMeta(page, platform) {
  const labelLines = linesIn(page, 'label');
  const invoiceLines = linesIn(page, 'invoice');
  const labelText = labelLines.map(l => l.text).join('\n');
  const all = page.text;

  const meta = { platform, courier: '', payment: '', orderNo: '', awb: '', customer: '', products: [] };
  const courierSrc = labelText || all;
  meta.courier = COURIERS.find(([, re]) => re.test(courierSrc))?.[0] || '';
  if (/\b(cod|cash\s+on\s+delivery)\b/i.test(courierSrc)) meta.payment = 'COD';
  else if (/\bprepaid\b/i.test(courierSrc)) meta.payment = 'Prepaid';

  meta.products = readProductTable(labelLines.length ? labelLines : page.lines);
  if (!meta.products.length && invoiceLines.length) meta.products = readProductTable(invoiceLines);

  if (platform === 'amazon' || !meta.products.length) {
    const m = all.match(/\bB0[A-Z0-9]{8}\s*\(\s*([^)\s]{2,60})\s*\)/);
    if (m) meta.products = [{ sku: m[1], size: '', color: '', qty: 1, order: '' }];
  }

  const orderPatterns = {
    amazon: /\b\d{3}-\d{7}-\d{7}\b/,
    flipkart: /\bOD\d{12,}\b/,
    meesho: /\b\d{12}(?:_\d+)?\b/,
    snapdeal: /\b(?:66\d{9}|75\d{9})\b/,
  };
  meta.orderNo = meta.products[0]?.order
    || all.match(orderPatterns[platform] || /\b(OD\d{12,}|\d{3}-\d{7}-\d{7})\b/)?.[0] || '';
  meta.orderNo = meta.orderNo.replace(/_\d+$/, '');

  if (platform === 'snapdeal' || (!meta.products.length && /snapdeal|SLP\d+/i.test(all))) {
    const invoiceText = invoiceLines.map(l => l.text).join('\n');
    const fullText = (labelText + '\n' + invoiceText) || all;
    const skuM = fullText.match(/SKU\s*CODE:\s*([^\s,\r\n]+)/i);
    const colorSizeM = fullText.match(/COLOR\s*([^,\r\n]+?)\s*,\s*SIZE\s*([^\s\r\n]+)/i);
    const sizeQtyM = fullText.match(/SIZE\s*(\S+)\s+(\d+)\s+[\d.]+/i);
    const orderM = fullText.match(/ORDER\s*NO\.?:\s*(\d+)/i)
      || fullText.match(/\b(66\d{9})\b/)
      || fullText.match(/SUBORDER\s*(?:NO\.?|CODE)?\s*[:|]?\s*(\d+)/i);
    const qtyM = sizeQtyM?.[2] || fullText.match(/\bTOTAL\s*ITEMS\s*(\d+)/i)?.[1] || '1';

    if (skuM || orderM) {
      meta.products = [{
        sku: (skuM?.[1] || '').trim(),
        size: (sizeQtyM?.[1] || colorSizeM?.[2] || '').trim(),
        color: (colorSizeM?.[1] || '').trim(),
        qty: parseInt(qtyM, 10) || 1,
        order: (orderM?.[1] || '').trim(),
      }];
      if (meta.products[0].order) meta.orderNo = meta.products[0].order;
    }
  }

  // AWB / tracking: the prominent long code printed near the barcode
  const awb = labelLines.flatMap(l => l.items)
    .filter(i => /^[A-Z]{0,4}\d{9,18}[A-Z]{0,4}$/.test(i.str) && !i.str.startsWith(meta.orderNo || '#'))
    .sort((a, b) => b.size - a.size)[0];
  meta.awb = awb?.str || '';

  if (!meta.awb && (platform === 'snapdeal' || /snapdeal/i.test(all))) {
    const slp = (labelText + ' ' + all).match(/\bSLP\d{9,12}\b/i);
    const sub = (labelText + ' ' + all).match(/SUBORDER\s*(?:NO\.?|CODE)?\s*[:|]?\s*(\d{11})/i)
      || (labelText + ' ' + all).match(/\b(75\d{9})\b/);
    meta.awb = slp ? slp[0] : (sub ? (sub[1] || sub[0]) : '');
  }

  const custIdx = labelLines.findIndex(l => /customer\s+address|delivery\s+address|ship\s*to|deliver\s*to/i.test(l.text));
  if (custIdx >= 0) meta.customer = (labelLines[custIdx + 1]?.text || '').slice(0, 60);

  meta.qty = meta.products.reduce((s, p) => s + p.qty, 0) || 1;
  meta.sku = meta.products.map(p => p.sku).join(' + ');
  return meta;
}

/** Turn per-page regions into orders: label + matching invoice (same page or following page). */
export function buildOrders(files) {
  const orders = [];
  files.forEach(f => {
    for (const page of f.pages) {
      const label = page.regions.find(r => r.kind === 'label');
      const invoice = page.regions.find(r => r.kind === 'invoice');
      const ref = (region) => region && ({ fileIndex: page.fileIndex, pageIndex: page.pageIndex, page, box: region.box });

      if (label) {
        orders.push({ id: orders.length, label: ref(label), invoice: ref(invoice), meta: { ...page.meta } });
      } else if (invoice) {
        const m = page.meta;
        const target = [...orders].reverse().find(o => !o.invoice && o.label.fileIndex === page.fileIndex
          && (!m.orderNo || !o.meta.orderNo || o.meta.orderNo === m.orderNo));
        if (target) {
          target.invoice = ref(invoice);
          for (const k of ['orderNo', 'sku', 'customer', 'payment']) if (!target.meta[k] && m[k]) target.meta[k] = m[k];
          if (!target.meta.products.length && m.products.length) {
            target.meta.products = m.products; target.meta.qty = m.qty;
          }
        } else {
          orders.push({ id: orders.length, label: null, invoice: ref(invoice), meta: { ...m } });
        }
      }
    }
  });
  return orders;
}

export function summarize(orders) {
  const count = (fn) => orders.reduce((acc, o) => { const k = fn(o); if (k) acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  return {
    labels: orders.filter(o => o.label).length,
    invoices: orders.filter(o => o.invoice).length,
    couriers: count(o => o.meta.courier || 'Unknown'),
    payments: count(o => o.meta.payment),
    multiQty: orders.filter(o => o.meta.qty > 1).length,
    imageOnly: orders.filter(o => !(o.label || o.invoice).page.items.length).length,
    skus: new Set(orders.flatMap(o => o.meta.products.map(p => p.sku))).size,
  };
}
