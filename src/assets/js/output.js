// Builds the print-ready PDFs (labels / invoices / picklist) with pdf-lib.
// Pages are embedded as vectors, so barcodes stay razor sharp at any size.
import { loadPdfLib } from './libs.js';

export const PAPERS = {
  '4x6':      { name: '4 × 6 in',  note: 'Thermal 100×150 mm', w: 288, h: 432, cols: 1, rows: 1, margin: 5 },
  '4x4':      { name: '4 × 4 in',  note: 'Thermal 100×100 mm', w: 288, h: 288, cols: 1, rows: 1, margin: 5 },
  '3x5':      { name: '3 × 5 in',  note: 'Thermal 75×125 mm',  w: 216, h: 360, cols: 1, rows: 1, margin: 4 },
  'a4':       { name: 'A4 · 1 up', note: 'Laser / inkjet',     w: 595.28, h: 841.89, cols: 1, rows: 1, margin: 22, orient: 'auto' },
  'a4-2':     { name: 'A4 · 2 up', note: 'Half-sheet stickers', w: 595.28, h: 841.89, cols: 1, rows: 2, margin: 18, gap: 16, orient: 'auto' },
  'a4-4':     { name: 'A4 · 4 up', note: 'Saves 75% paper',     w: 595.28, h: 841.89, cols: 2, rows: 2, margin: 14, gap: 12, orient: 'auto' },
  'a4-6':     { name: 'A4 · 6 up', note: '6-division sticker sheets', w: 595.28, h: 841.89, cols: 2, rows: 3, margin: 13, gap: 10, orient: 'auto' },
  'a4-smart': { name: 'A4 · Smart fit', note: '6 up · 4 + 2 rotated', w: 595.28, h: 841.89, smartFit: true, margin: 10, gap: 6 },
  'a4-8':     { name: 'A4 · 8 up', note: 'Most labels per sheet', w: 595.28, h: 841.89, cols: 2, rows: 4, margin: 12, gap: 10, orient: 'auto' },
  'original': { name: 'Original',  note: 'Exact crop, no scaling', original: true },
};

export const SORTS = {
  original: 'Original order',
  sku: 'SKU (A → Z)',
  courier: 'Courier partner',
  payment: 'COD / Prepaid',
  qty: 'Multi-quantity first',
};

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL', '6XL', 'FREE'];
const sizeRank = s => {
  const i = SIZE_ORDER.indexOf(String(s).toUpperCase().replace(/\s+/g, ''));
  if (i >= 0) return i;
  const n = parseFloat(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};
const cmp = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });

export function sortOrders(orders, mode) {
  const bySku = (a, b) => cmp(a.meta.sku, b.meta.sku) || sizeRank(a.meta.products[0]?.size) - sizeRank(b.meta.products[0]?.size);
  const fns = {
    original: (a, b) => a.id - b.id,
    sku: (a, b) => bySku(a, b) || a.id - b.id,
    courier: (a, b) => cmp(a.meta.courier || '~', b.meta.courier || '~') || bySku(a, b) || a.id - b.id,
    payment: (a, b) => cmp(a.meta.payment || '~', b.meta.payment || '~') || bySku(a, b) || a.id - b.id,
    qty: (a, b) => b.meta.qty - a.meta.qty || bySku(a, b) || a.id - b.id,
  };
  return [...orders].sort(fns[mode] || fns.original);
}

const ascii = s => String(s ?? '').replace(/[–—]/g, '-').replace(/[^\x20-\x7E]/g, '?');
const today = () => new Date().toLocaleDateString('en-GB').replace(/\//g, '-');

function fitText(font, text, size, maxW) {
  let t = ascii(text);
  if (font.widthOfTextAtSize(t, size) <= maxW) return t;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…'.replace('…', '...'), size) > maxW) t = t.slice(0, -1);
  return t + '...';
}

/** Box in page (top-left pt) coordinates, honouring a user crop override for this kind. */
export function regionBox(ref, kind, crop, removeMargin = false) {
  const o = crop?.[kind];
  if (o) {
    const { width: W, height: H } = ref.page;
    return { x0: o.x0 * W, y0: o.y0 * H, x1: o.x1 * W, y1: o.y1 * H };
  }
  const b = ref.box;
  if (removeMargin && b) {
    const px = Math.min(4, (b.x1 - b.x0) * 0.04);
    const py = Math.min(4, (b.y1 - b.y0) * 0.04);
    return { x0: b.x0 + px, y0: b.y0 + py, x1: b.x1 - px, y1: b.y1 - py };
  }
  return b;
}

function toPdfBox(page, box) {
  const [ax, ay] = page.viewport.convertToPdfPoint(box.x0, box.y0);
  const [bx, by] = page.viewport.convertToPdfPoint(box.x1, box.y1);
  return { left: Math.min(ax, bx), right: Math.max(ax, bx), bottom: Math.min(ay, by), top: Math.max(ay, by) };
}

async function sourceDoc(file, PDFDocument) {
  if (!file.libDoc) {
    file.libDoc = await PDFDocument.load(file.bytes, { ignoreEncryption: true, updateMetadata: false });
  }
  return file.libDoc;
}

/** Encrypted PDFs can't be copied as vectors; render that region at 300 dpi instead. */
async function rasterRegion(file, ref, box, out) {
  const scale = 300 / 72;
  const page = await file.pdf.getPage(ref.pageIndex + 1);
  const vp = page.getViewport({ scale, offsetX: -box.x0 * scale, offsetY: -box.y0 * scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((box.x1 - box.x0) * scale);
  canvas.height = Math.ceil((box.y1 - box.y0) * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  canvas.width = canvas.height = 0;
  return out.embedPng(new Uint8Array(await blob.arrayBuffer()));
}

function collectItems(orders, output) {
  const items = [];
  for (const o of orders) {
    if (output !== 'invoices' && o.label) items.push({ order: o, kind: 'label', ref: o.label });
    if (output !== 'labels' && o.invoice) items.push({ order: o, kind: 'invoice', ref: o.invoice });
  }
  return items;
}

/** Offset so a (w × h) object rotated by theta° has its visual bottom-left at (bx, by). */
function place(w, h, theta, bx, by) {
  const t = (theta * Math.PI) / 180, c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t));
  const xs = [0, w * c, -h * s, w * c - h * s], ys = [0, w * s, h * c, w * s + h * c];
  return { x: bx - Math.min(...xs), y: by - Math.min(...ys) };
}

function footerLine(order, settings) {
  const parts = [];
  const m = order.meta;
  if (settings.footerSku && m.products.length) {
    parts.push(m.products.map(p => [p.sku, p.size, p.color].filter(Boolean).join(' / ') + ` x${p.qty}`).join(' + '));
  }
  if (settings.footerText) parts.push(settings.footerText);
  if (settings.footerDate) parts.push(today());
  return parts.join('  |  ');
}

/**
 * @param files   analysed files ({ bytes, pdf, pages })
 * @param orders  sorted orders
 * @param settings { output, paper, crop, autoRotate, cutGuides, footerSku, footerText, footerDate, highlightMulti }
 */
export async function buildPdf(files, orders, settings) {
  const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();
  const items = collectItems(orders, settings.output);
  if (!items.length) throw new Error('Nothing to print with the current settings.');

  const out = await PDFDocument.create();
  out.setTitle('Label Crop AI output');
  out.setCreator('Label Crop AI');
  out.setProducer('Label Crop AI (labelcrop)');
  const font = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);

  // Embed every region once (vector when possible)
  for (const it of items) {
    const file = files[it.ref.fileIndex];
    const box = regionBox(it.ref, it.kind, settings.crop, settings.removeMargin);
    const doc = await sourceDoc(file, PDFDocument);
    it.w = box.x1 - box.x0;
    it.h = box.y1 - box.y0;
    it.baseRot = -(it.ref.page.rotate || 0);
    if (doc.isEncrypted) {
      it.obj = await rasterRegion(file, it.ref, box, out);
      it.isImage = true;
      it.baseRot = 0;                                  // raster is already in visual orientation
    } else {
      const pdfBox = toPdfBox(it.ref.page, box);
      it.obj = await out.embedPage(doc.getPage(it.ref.pageIndex), pdfBox);
      it.w = pdfBox.right - pdfBox.left;
      it.h = pdfBox.top - pdfBox.bottom;
    }
    it.footer = it.kind === 'label' ? footerLine(it.order, settings) : '';
    it.multi = it.kind === 'label' && settings.highlightMulti && it.order.meta.qty > 1;
  }

  const paper = PAPERS[settings.paper] || PAPERS['4x6'];
  const wantsFooter = items.some(i => i.footer || i.multi);
  const FOOT = wantsFooter ? 14 : 0;
  const visual = it => (Math.abs(it.baseRot) % 180 ? { vw: it.h, vh: it.w } : { vw: it.w, vh: it.h });

  if (paper.original) {
    for (const it of items) {
      const { vw, vh } = visual(it);
      const page = out.addPage([vw, vh + (FOOT && it.kind === 'label' ? FOOT : 0)]);
      const footH = page.getHeight() - vh;
      drawItem(page, it, 0, footH, vw, vh, 1, it.baseRot);
      drawFooter(page, it, 4, 3, vw - 8);
    }
    return out.save();
  }

  // Smart fit layout: 4 labels stacked on left + 2 rotated 90° on right to maximize label size
  const isSmartFit = paper.smartFit || (settings.smartFit && (settings.paper === 'a4' || settings.paper === 'a4-6' || settings.paper === 'a4-smart'));

  if (isSmartFit) {
    const W = 595.28, H = 841.89;
    const m = settings.removeMargin ? 0 : (paper.margin ?? 10);
    const g = settings.removeMargin ? 0 : (paper.gap ?? 6);
    const W_avail = W - 2 * m - g;
    const H_avail = H - 2 * m;
    const ch_left = (H_avail - 3 * g) / 4;
    const ch_right = (H_avail - 1 * g) / 2;

    const it0 = items[0];
    const v0 = visual(it0);
    const flipOrient = v0.vw < v0.vh;
    const itemVisual = it => {
      const v = visual(it);
      return flipOrient ? { vw: v.vh, vh: v.vw, extraRot: -90 } : { vw: v.vw, vh: v.vh, extraRot: 0 };
    };

    const { vw, vh } = itemVisual(it0);
    const foot0 = (it0.footer || it0.multi) ? FOOT : 0;
    const eh = vh + foot0;

    const s_left_max = ch_left / eh;
    const cw_left_needed = vw * s_left_max;
    let cw_left, cw_right;
    if (cw_left_needed < W_avail * 0.72 && cw_left_needed > W_avail * 0.35) {
      cw_left = cw_left_needed;
      cw_right = W_avail - cw_left;
    } else {
      cw_left = W_avail * (vw / (vw + eh));
      cw_right = W_avail - cw_left;
    }

    const s_left = Math.min(cw_left / vw, ch_left / eh);
    const s_right = Math.min(cw_right / eh, ch_right / vw);

    const perPage = 6;
    let page;
    items.forEach((it, i) => {
      const slot = i % perPage;
      if (slot === 0) {
        page = out.addPage([W, H]);
        if (settings.cutGuides) drawSmartGuides(page, W, H, m, g, cw_left, ch_left, ch_right, rgb);
      }

      const { vw: ivw, vh: ivh, extraRot } = itemVisual(it);
      const isLeft = slot < 4;
      const foot = (it.footer || it.multi) ? FOOT : 0;

      if (isLeft) {
        const row = slot;
        const cx = m;
        const cyBottom = H - m - (row + 1) * ch_left - row * g;
        const theta = it.baseRot + extraRot;
        const scale = Math.min(s_left, 3);
        const dw = ivw * scale;
        const dh = ivh * scale;
        const bx = cx + (cw_left - dw) / 2;
        const by = settings.alignTop
          ? cyBottom + ch_left - dh
          : cyBottom + foot + (ch_left - foot - dh) / 2;
        drawItem(page, it, bx, by, dw, dh, scale, theta);
        drawFooter(page, it, cx + 2, cyBottom + 3, cw_left - 4);
      } else {
        const row = slot - 4;
        const cx = m + cw_left + g;
        const cyBottom = H - m - (row + 1) * ch_right - row * g;
        const theta = it.baseRot + extraRot - 90;
        const scale = Math.min(s_right, 3);
        const dw = ivh * scale;
        const dh = ivw * scale;
        const bx = cx + (cw_right - dw) / 2;
        const by = settings.alignTop
          ? cyBottom + ch_right - dh
          : cyBottom + foot + (ch_right - foot - dh) / 2;
        drawItem(page, it, bx, by, dw, dh, scale, theta);
        drawFooter(page, it, cx + 2, cyBottom + 3, cw_right - 4);
      }
    });

    return out.save();
  }

  // Grid layout; pick page orientation that gives the first item the biggest scale
  const grid = (portrait) => {
    const W = portrait ? paper.w : paper.h, H = portrait ? paper.h : paper.w;
    const cols = portrait ? paper.cols : paper.rows, rows = portrait ? paper.rows : paper.cols;
    const m = settings.removeMargin ? 0 : paper.margin, g = settings.removeMargin ? 0 : (paper.gap || 0);
    return { W, H, cols, rows, m, g, cw: (W - 2 * m - (cols - 1) * g) / cols, ch: (H - 2 * m - (rows - 1) * g) / rows };
  };
  const fitScale = (it, cw, ch, rot) => {
    const { vw, vh } = visual(it);
    const [a, b] = rot ? [vh, vw] : [vw, vh];
    return Math.min(cw / a, ch / b);
  };
  const bestFit = (it, g) => {
    const ch = g.ch - (it.footer || it.multi ? FOOT : 0);
    const s0 = fitScale(it, g.cw, ch, false);
    const s1 = settings.autoRotate ? fitScale(it, g.cw, ch, true) : 0;
    return s1 > s0 * 1.08 ? { s: s1, rot: true } : { s: s0, rot: false };
  };
  let g = grid(true);
  if (paper.orient === 'auto' && !settings.portrait) {
    const land = grid(false);
    if (bestFit(items[0], land).s > bestFit(items[0], g).s * 1.05) g = land;
  }

  const perPage = g.cols * g.rows;
  let page;
  items.forEach((it, i) => {
    const slot = i % perPage;
    if (slot === 0) {
      page = out.addPage([g.W, g.H]);
      if (settings.cutGuides && perPage > 1) drawGuides(page, g, rgb);
    }
    const col = slot % g.cols, row = Math.floor(slot / g.cols);
    const cx = g.m + col * (g.cw + g.g);
    const cyBottom = g.H - g.m - row * (g.ch + g.g) - g.ch;
    const foot = it.footer || it.multi ? FOOT : 0;
    const { s, rot } = bestFit(it, g);
    const scale = Math.min(s, 3);
    const theta = it.baseRot + (rot ? -90 : 0);
    const { vw, vh } = visual(it);
    const [dw, dh] = rot ? [vh * scale, vw * scale] : [vw * scale, vh * scale];
    const bx = cx + (g.cw - dw) / 2;
    const by = settings.alignTop
      ? cyBottom + g.ch - dh
      : cyBottom + foot + (g.ch - foot - dh) / 2;
    drawItem(page, it, bx, by, dw, dh, scale, theta);
    drawFooter(page, it, cx + 2, cyBottom + 3, g.cw - 4);
  });
  return out.save();

  function drawItem(pg, it, bx, by, dw, dh, scale, theta) {
    const w = it.w * scale, h = it.h * scale;
    const { x, y } = place(w, h, theta, bx, by);
    const opts = { x, y, width: w, height: h, rotate: degrees(theta) };
    if (it.isImage) pg.drawImage(it.obj, opts);
    else pg.drawPage(it.obj, opts);
  }

  function drawFooter(pg, it, x, y, maxW) {
    if (!it.footer && !it.multi) return;
    let cursor = x;
    if (it.multi) {
      const tag = ` QTY ${it.order.meta.qty} `;
      const tw = bold.widthOfTextAtSize(tag, 8);
      pg.drawRectangle({ x: cursor, y: y - 1.5, width: tw, height: 10.5, color: rgb(0, 0, 0) });
      pg.drawText(tag, { x: cursor, y: y + 0.5, size: 8, font: bold, color: rgb(1, 1, 1) });
      cursor += tw + 5;
    }
    if (it.footer) {
      pg.drawText(fitText(font, it.footer, 7.5, maxW - (cursor - x)), { x: cursor, y: y + 0.5, size: 7.5, font, color: rgb(0, 0, 0) });
    }
  }
}

function drawGuides(page, g, rgb) {
  const opts = { thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 4] };
  for (let c = 1; c < g.cols; c++) {
    const x = g.m + c * g.cw + (c - 0.5) * g.g;
    page.drawLine({ start: { x, y: 6 }, end: { x, y: g.H - 6 }, ...opts });
  }
  for (let r = 1; r < g.rows; r++) {
    const y = g.H - g.m - r * g.ch - (r - 0.5) * g.g;
    page.drawLine({ start: { x: 6, y }, end: { x: g.W - 6, y }, ...opts });
  }
}

function drawSmartGuides(page, W, H, m, g, cw_left, ch_left, ch_right, rgb) {
  const opts = { thickness: 0.5, color: rgb(0.6, 0.6, 0.6), dashArray: [4, 4] };
  const vx = m + cw_left + g / 2;
  page.drawLine({ start: { x: vx, y: Math.max(4, m) }, end: { x: vx, y: H - Math.max(4, m) }, ...opts });
  for (let r = 1; r < 4; r++) {
    const y = H - m - r * ch_left - (r - 0.5) * g;
    page.drawLine({ start: { x: Math.max(4, m), y }, end: { x: m + cw_left, y }, ...opts });
  }
  const ry = H - m - 1 * ch_right - 0.5 * g;
  page.drawLine({ start: { x: m + cw_left + g, y: ry }, end: { x: W - Math.max(4, m), y: ry }, ...opts });
}

// ---------------------------------------------------------------- picklist & CSV

export function picklistRows(orders) {
  const map = new Map();
  for (const o of orders) {
    const products = o.meta.products.length ? o.meta.products : [{ sku: o.meta.sku || '(unknown)', size: '', color: '', qty: o.meta.qty || 1 }];
    for (const p of products) {
      const key = [p.sku, p.size, p.color].join(' ');
      const row = map.get(key) || { sku: p.sku, size: p.size, color: p.color, qty: 0, orders: 0 };
      row.qty += p.qty; row.orders += 1;
      map.set(key, row);
    }
  }
  return [...map.values()].sort((a, b) => cmp(a.sku, b.sku) || sizeRank(a.size) - sizeRank(b.size) || cmp(a.color, b.color));
}

export async function buildPicklist(orders, platformName) {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.create();
  doc.setTitle('Picklist - Label Crop AI');
  doc.setCreator('Label Crop AI');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const rows = picklistRows(orders);
  const W = 595.28, H = 841.89, M = 36;
  const cols = [
    { k: 'i', t: '#', w: 28 }, { k: 'sku', t: 'SKU', w: 215 }, { k: 'size', t: 'Size', w: 60 },
    { k: 'color', t: 'Color', w: 90 }, { k: 'orders', t: 'Orders', w: 55 }, { k: 'qty', t: 'Qty', w: 75 },
  ];
  const ink = rgb(0.07, 0.08, 0.13), muted = rgb(0.42, 0.45, 0.52), zebra = rgb(0.96, 0.96, 0.98);
  let page, y;

  const newPage = (first) => {
    page = doc.addPage([W, H]);
    y = H - M;
    if (first) {
      page.drawText(ascii(`Picklist - ${platformName}`), { x: M, y: y - 16, size: 18, font: bold, color: ink });
      const units = rows.reduce((s, r) => s + r.qty, 0);
      page.drawText(ascii(`${orders.length} orders  |  ${units} units  |  ${rows.length} SKU variants  |  ${today()}`), { x: M, y: y - 34, size: 10, font, color: muted });
      y -= 56;
    }
    page.drawRectangle({ x: M, y: y - 18, width: W - 2 * M, height: 20, color: ink });
    let x = M + 6;
    for (const c of cols) { page.drawText(c.t, { x, y: y - 12, size: 9, font: bold, color: rgb(1, 1, 1) }); x += c.w; }
    y -= 22;
  };

  newPage(true);
  rows.forEach((r, i) => {
    if (y < M + 40) newPage(false);
    if (i % 2) page.drawRectangle({ x: M, y: y - 14, width: W - 2 * M, height: 18, color: zebra });
    let x = M + 6;
    const vals = { ...r, i: String(i + 1) };
    for (const c of cols) {
      const f = c.k === 'qty' || c.k === 'sku' ? bold : font;
      page.drawText(fitText(f, String(vals[c.k] ?? ''), 10, c.w - 8), { x, y: y - 9, size: 10, font: f, color: ink });
      x += c.w;
    }
    // tick box for pickers
    page.drawRectangle({ x: W - M - 18, y: y - 11, width: 11, height: 11, borderColor: muted, borderWidth: 0.8 });
    y -= 18;
  });

  // courier summary
  const couriers = {};
  for (const o of orders) {
    const c = couriers[o.meta.courier || 'Unknown'] ||= { n: 0, cod: 0, pre: 0 };
    c.n++; if (o.meta.payment === 'COD') c.cod++; if (o.meta.payment === 'Prepaid') c.pre++;
  }
  if (y < M + 60 + Object.keys(couriers).length * 16) newPage(false);
  y -= 20;
  page.drawText('Courier handover summary', { x: M, y, size: 12, font: bold, color: ink });
  y -= 18;
  for (const [name, c] of Object.entries(couriers).sort((a, b) => b[1].n - a[1].n)) {
    page.drawText(ascii(`${name}: ${c.n} parcels  (COD ${c.cod}, Prepaid ${c.pre})`), { x: M, y, size: 10, font, color: ink });
    y -= 16;
  }
  return doc.save();
}

export function ordersCsv(orders, files) {
  const head = ['#', 'Platform', 'Order No', 'AWB', 'Courier', 'Payment', 'SKU', 'Size', 'Color', 'Qty', 'Customer', 'File', 'Page'];
  const esc = v => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s;             // avoid spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [head.join(',')];
  orders.forEach((o, i) => {
    const m = o.meta, ref = o.label || o.invoice;
    const p = m.products;
    lines.push([i + 1, m.platform, m.orderNo, m.awb, m.courier, m.payment,
      p.map(x => x.sku).join(' + ') || m.sku, p.map(x => x.size).join(' + '), p.map(x => x.color).join(' + '),
      m.qty, m.customer, files[ref.fileIndex]?.name, ref.pageIndex + 1].map(esc).join(','));
  });
  return '﻿' + lines.join('\r\n');
}
