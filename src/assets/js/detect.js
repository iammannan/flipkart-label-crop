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
    items.push({
      str: it.str.trim(),
      x: t[4],
      y: t[5],
      top: t[5] - size,
      size,
      w: it.width,
      x0: t[4],
      x1: t[4] + it.width,
      y0: t[5] - size,
      y1: t[5] + 1,
    });
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
  const ops = await page.getOperatorList().catch(() => null);
  const qrCodes = detectQrCodes(lib, ops, vp, items, ink, W, H, regions);
  return {
    width: W, height: H, rotate: page.rotate, viewport: vp,
    items, lines, text, regions, qrCodes,
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

// ---------------------------------------------------------------- QR detection & enlargement

function detectQrCodes(lib, ops, vp, items, ink, W, H, regions = []) {
  const candidates = [];

  // 1. Image XObjects & Form XObjects from PDF operator list
  if (ops && lib?.OPS) {
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      if (fn === lib.OPS.save) {
        stack.push([...ctm]);
      } else if (fn === lib.OPS.restore) {
        if (stack.length) ctm = stack.pop();
      } else if (fn === lib.OPS.transform) {
        const [a1, b1, c1, d1, e1, f1] = ctm;
        const [a2, b2, c2, d2, e2, f2] = ops.argsArray[i];
        ctm = [
          a1 * a2 + c1 * b2, b1 * a2 + d1 * b2,
          a1 * c2 + c1 * d2, b1 * c2 + d1 * d2,
          a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1,
        ];
      } else if (fn === lib.OPS.paintImageXObject || fn === lib.OPS.paintInlineImageXObject || fn === lib.OPS.paintImageMaskXObject) {
        const pts = [
          [0, 0], [1, 0], [1, 1], [0, 1]
        ].map(([px, py]) => {
          const X = ctm[0] * px + ctm[2] * py + ctm[4];
          const Y = ctm[1] * px + ctm[3] * py + ctm[5];
          return vp.convertToViewportPoint(X, Y);
        });
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const vx0 = Math.min(...xs), vx1 = Math.max(...xs);
        const vy0 = Math.min(...ys), vy1 = Math.max(...ys);
        const w = vx1 - vx0, h = vy1 - vy0;
        const ar = w / h;
        if (ar >= 0.82 && ar <= 1.22 && w >= 32 && w <= 220) {
          candidates.push({ x0: vx0, y0: vy0, x1: vx1, y1: vy1, w, h });
        }
      } else if (fn === lib.OPS.paintFormXObjectBegin) {
        const bbox = ops.argsArray[i][1] || [0, 0, 1, 1];
        const pts = [
          [bbox[0], bbox[1]], [bbox[2], bbox[1]],
          [bbox[2], bbox[3]], [bbox[0], bbox[3]]
        ].map(([px, py]) => {
          const X = ctm[0] * px + ctm[2] * py + ctm[4];
          const Y = ctm[1] * px + ctm[3] * py + ctm[5];
          return vp.convertToViewportPoint(X, Y);
        });
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const vx0 = Math.min(...xs), vx1 = Math.max(...xs);
        const vy0 = Math.min(...ys), vy1 = Math.max(...ys);
        const w = vx1 - vx0, h = vy1 - vy0;
        const ar = w / h;
        if (ar >= 0.82 && ar <= 1.22 && w >= 32 && w <= 220) {
          candidates.push({ x0: vx0, y0: vy0, x1: vx1, y1: vy1, w, h });
        }
      }
    }
  }

  // 2. Visual finder pattern detector from ink map (only when operator list contains no candidates)
  if (!candidates.length && ink) {
    const visual = findVisualQrFromInk(ink, W, H);
    for (const v of visual) candidates.push(v);
  }

  const results = [];
  for (const box of candidates) {
    if (results.some(r => Math.hypot(r.box.x0 - box.x0, r.box.y0 - box.y0) < 15)) continue;
    const matchingRegion = regions.find(r =>
      box.x0 >= r.box.x0 - 5 && box.x1 <= r.box.x1 + 5 &&
      box.y0 >= r.box.y0 - 5 && box.y1 <= r.box.y1 + 5
    ) || regions.find(r => r.kind === 'label');
    const bounds = matchingRegion?.box || null;

    const enlarged = computeQrEnlargement(box, items, ink, W, H, bounds);
    results.push({
      box,
      enlargedBox: enlarged?.box || null,
      growthRatio: enlarged?.ratio || 1,
    });
  }
  return results;
}

function computeQrEnlargement(qr, items, ink, W, H, bounds) {
  const SAFETY = 4;
  const qx0 = qr.x0, qy0 = qr.y0, qx1 = qr.x1, qy1 = qr.y1;
  const qw = qr.w, qh = qr.h;

  let maxLeft = bounds ? bounds.x0 : 0;
  let minRight = bounds ? bounds.x1 : W;
  let maxTop = bounds ? bounds.y0 : 0;
  let minBottom = bounds ? bounds.y1 : H;

  for (const it of items) {
    if (bounds) {
      if (it.y1 < bounds.y0 || it.y0 > bounds.y1 || it.x1 < bounds.x0 || it.x0 > bounds.x1) continue;
    }
    if (it.y1 >= qy0 - 2 && it.y0 <= qy1 + 2) {
      if (it.x1 <= qx0 + 1 && it.x1 > maxLeft) maxLeft = it.x1;
      if (it.x0 >= qx1 - 1 && it.x0 < minRight) minRight = it.x0;
    }
    if (it.x1 >= qx0 - 2 && it.x0 <= qx1 + 2) {
      if (it.y1 <= qy0 + 1 && it.y1 > maxTop) maxTop = it.y1;
      if (it.y0 >= qy1 - 1 && it.y0 < minBottom) minBottom = it.y0;
    }
  }

  if (ink) {
    const s = ink.scale;
    const py0 = Math.max(0, Math.floor(qy0 * s)), py1 = Math.min(ink.height - 1, Math.ceil(qy1 * s));
    const px0 = Math.max(0, Math.floor(qx0 * s)), px1 = Math.min(ink.width - 1, Math.ceil(qx1 * s));
    const maxScanPx = Math.round(60 * s);

    const limitLeft = Math.max(Math.floor(maxLeft * s), px0 - maxScanPx);
    for (let x = px0 - 3; x >= limitLeft; x--) {
      let dark = 0;
      for (let y = py0; y <= py1; y++) if (ink.mask[y * ink.width + x]) dark++;
      if (dark > 1) { const pt = (x + 1) / s; if (pt > maxLeft) maxLeft = pt; break; }
    }

    const limitRight = Math.min(Math.ceil(minRight * s), px1 + maxScanPx);
    for (let x = px1 + 3; x <= limitRight; x++) {
      let dark = 0;
      for (let y = py0; y <= py1; y++) if (ink.mask[y * ink.width + x]) dark++;
      if (dark > 1) { const pt = (x - 1) / s; if (pt < minRight) minRight = pt; break; }
    }

    const limitTop = Math.max(Math.floor(maxTop * s), py0 - maxScanPx);
    for (let y = py0 - 3; y >= limitTop; y--) {
      let dark = 0;
      for (let x = px0; x <= px1; x++) if (ink.mask[y * ink.width + x]) dark++;
      if (dark > 1) { const pt = (y + 1) / s; if (pt > maxTop) maxTop = pt; break; }
    }

    const limitBottom = Math.min(Math.ceil(minBottom * s), py1 + maxScanPx);
    for (let y = py1 + 3; y <= limitBottom; y++) {
      let dark = 0;
      for (let x = px0; x <= px1; x++) if (ink.mask[y * ink.width + x]) dark++;
      if (dark > 1) { const pt = (y - 1) / s; if (pt < minBottom) minBottom = pt; break; }
    }
  }

  const freeLeft = Math.max(0, (qx0 - maxLeft) - SAFETY);
  const freeRight = Math.max(0, (minRight - qx1) - SAFETY);
  const freeTop = Math.max(0, (qy0 - maxTop) - SAFETY);
  const freeBottom = Math.max(0, (minBottom - qy1) - SAFETY);

  const totalAvailW = qw + freeLeft + freeRight;
  const totalAvailH = qh + freeTop + freeBottom;
  const maxSize = Math.min(totalAvailW, totalAvailH);
  const targetSize = Math.min(qw * 1.30, maxSize);

  if (targetSize <= qw * 1.05) return null;

  const grow = targetSize - qw;

  let expandLeft = Math.min(freeLeft, grow / 2);
  let expandRight = grow - expandLeft;
  if (expandRight > freeRight) {
    expandRight = freeRight;
    expandLeft = Math.min(freeLeft, grow - expandRight);
  }

  let expandTop = Math.min(freeTop, grow / 2);
  let expandBottom = grow - expandTop;
  if (expandBottom > freeBottom) {
    expandBottom = freeBottom;
    expandTop = Math.min(freeTop, grow - expandBottom);
  }

  const newX0 = qx0 - expandLeft;
  const newY0 = qy0 - expandTop;

  return {
    box: {
      x0: newX0,
      y0: newY0,
      x1: newX0 + targetSize,
      y1: newY0 + targetSize,
      w: targetSize,
      h: targetSize,
    },
    ratio: targetSize / qw,
  };
}

function checkFinderVertical(mask, w, h, midX, midY, total) {
  if (midX < 0 || midX >= w || midY < 0 || midY >= h) return false;
  const mod = total / 7;
  const tol = mod * 0.75;
  let y = midY;
  while (y >= 0 && mask[y * w + midX]) y--;
  const topCenter = y + 1;
  y = midY;
  while (y < h && mask[y * w + midX]) y++;
  const bottomCenter = y - 1;
  const centerLen = bottomCenter - topCenter + 1;
  if (Math.abs(centerLen - 3 * mod) > 3 * tol) return false;

  y = topCenter - 1;
  while (y >= 0 && !mask[y * w + midX]) y--;
  const whiteTop = topCenter - 1 - y;
  if (Math.abs(whiteTop - mod) > tol) return false;

  const darkTopStart = y;
  while (y >= 0 && mask[y * w + midX]) y--;
  const darkTop = darkTopStart - y;
  if (Math.abs(darkTop - mod) > tol) return false;

  y = bottomCenter + 1;
  while (y < h && !mask[y * w + midX]) y++;
  const whiteBottom = y - (bottomCenter + 1);
  if (Math.abs(whiteBottom - mod) > tol) return false;

  const darkBottomStart = y;
  while (y < h && mask[y * w + midX]) y++;
  const darkBottom = y - darkBottomStart;
  if (Math.abs(darkBottom - mod) > tol) return false;

  const totalV = centerLen + whiteTop + darkTop + whiteBottom + darkBottom;
  return Math.abs(totalV - total) < total * 0.35;
}

function findVisualQrFromInk(ink, W, H) {
  const { mask, width: w, height: h, scale: s } = ink;
  const finders = [];
  for (let y = 6; y < h - 6; y += 3) {
    const row = y * w;
    let counts = [0, 0, 0, 0, 0];
    let state = 0;
    for (let x = 0; x < w; x++) {
      const dark = mask[row + x] === 1;
      if (dark) {
        if ((state & 1) === 1) state++;
        counts[state]++;
      } else {
        if ((state & 1) === 0) {
          if (state === 4) {
            const total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4];
            const mod = total / 7;
            const tol = mod * 0.65;
            if (
              Math.abs(counts[0] - mod) < tol &&
              Math.abs(counts[1] - mod) < tol &&
              Math.abs(counts[2] - 3 * mod) < 3 * tol &&
              Math.abs(counts[3] - mod) < tol &&
              Math.abs(counts[4] - mod) < tol &&
              total >= 14 && total <= 180
            ) {
              const cx = (x - counts[4] - counts[3] - counts[2] / 2) / s;
              const cy = y / s;
              if (checkFinderVertical(mask, w, h, Math.round(cx * s), y, total)) {
                finders.push({ x: cx, y: cy, size: total / s });
              }
            }
            counts[0] = counts[2]; counts[1] = counts[3]; counts[2] = counts[4];
            counts[3] = 1; counts[4] = 0;
            state = 3;
          } else {
            state++;
            counts[state]++;
          }
        } else {
          counts[state]++;
        }
      }
    }
  }

  const qrs = [];
  for (let i = 0; i < finders.length; i++) {
    for (let j = i + 1; j < finders.length; j++) {
      const f1 = finders[i], f2 = finders[j];
      const d12 = Math.hypot(f1.x - f2.x, f1.y - f2.y);
      if (d12 < 25 || d12 > 180) continue;
      if (Math.abs(f1.size - f2.size) > Math.min(f1.size, f2.size) * 0.45) continue;
      for (let k = j + 1; k < finders.length; k++) {
        const f3 = finders[k];
        const d13 = Math.hypot(f1.x - f3.x, f1.y - f3.y);
        const d23 = Math.hypot(f2.x - f3.x, f2.y - f3.y);
        const dists = [
          { p1: f1, p2: f2, p3: f3, hyp: d12, d1: d13, d2: d23 },
          { p1: f1, p2: f3, p3: f2, hyp: d13, d1: d12, d2: d23 },
          { p1: f2, p2: f3, p3: f1, hyp: d23, d1: d12, d2: d13 },
        ];
        for (const { p1, p2, p3, hyp, d1, d2 } of dists) {
          if (Math.abs(d1 - d2) < d1 * 0.25 && Math.abs(hyp - Math.SQRT2 * d1) < hyp * 0.28) {
            const minX = Math.min(f1.x, f2.x, f3.x) - p3.size / 2;
            const maxX = Math.max(f1.x, f2.x, f3.x) + p3.size / 2;
            const minY = Math.min(f1.y, f2.y, f3.y) - p3.size / 2;
            const maxY = Math.max(f1.y, f2.y, f3.y) + p3.size / 2;
            const w = maxX - minX, h = maxY - minY;
            if (w >= 30 && w <= 220 && Math.abs(w - h) < w * 0.25) {
              qrs.push({ x0: minX, y0: minY, x1: maxX, y1: maxY, w, h });
            }
            break;
          }
        }
      }
    }
  }
  return qrs;
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
