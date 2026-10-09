// Label Crop AI — tool controller (upload → Smart Detect → settings → preview → download/print)
import './site.js';
import { loadPdfjs, preloadLibs } from './libs.js';
import { analyzeFile, buildOrders, extractMeta, summarize, PLATFORM_NAMES } from './detect.js';
import { PAPERS, SORTS, sortOrders, buildPdf, buildPicklist, ordersCsv, regionBox } from './output.js';
const GOOGLE_ADS_CONVERSION_SEND_TO = 'AW-939306740/Btw8CO_9wYkdEPTd8r8D';
function recordConversion() {
  if (typeof window.gtag === 'function') {
    try {
      const transactionId = crypto.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
      window.gtag('event', 'conversion', { send_to: GOOGLE_ADS_CONVERSION_SEND_TO, transaction_id: transactionId });
    } catch {}
  }
}

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const tool = $('.tool');
if (tool) init();

function init() {
  const DEFAULTS = {
    output: 'labels', paper: '4x6', sort: 'original', footerSku: false, highlightMulti: true,
    footerDate: false, footerText: '', autoRotate: true, cutGuides: true,
    smartFit: false, removeMargin: false,
  };
  const STORE_KEY = 'lcai:settings:v1';
  const store = {
    load() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; } catch { return { ...DEFAULTS }; } },
    save(s) { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private mode */ } },
  };

  // Landing pages can preset paper, sort or output (e.g. the courier sorter opens sorted by courier)
  function pagePreset() {
    try { return JSON.parse(tool.dataset.preset || '{}'); } catch { return {}; }
  }

  const state = {
    platform: tool.dataset.platform || 'auto',
    detected: null,
    files: [],
    orders: [],
    summary: null,
    settings: { ...store.load(), ...pagePreset() },
    crop: null,
    output: null,          // { bytes, pages }
    building: null,        // promise of the current build
    token: 0,
  };

  const els = {
    input: $('#file-input'), drop: $('#drop'), error: $('#tool-error'),
    steps: $('#steps'), bar: $('#progress-bar'), progress: $('.progress'), count: $('#scan-count'), scanTitle: $('#scan-title'),
    kicker: $('#result-kicker'), title: $('#result-title'), chips: $('#chips'),
    form: $('#settings'), papers: $('#papers'), sort: $('#sort'),
    thumbs: $('#thumbs'), previewMeta: $('#preview-meta'), toast: $('#toast'),
  };

  // ------------------------------------------------------------ stage + feedback
  function setStage(name) {
    tool.dataset.state = name;
    for (const s of $$('.stage', tool)) s.hidden = s.dataset.stage !== name;
  }
  function showError(msg) {
    els.error.textContent = msg;
    els.error.hidden = !msg;
  }
  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('is-on'), 2600);
  }
  function setStep(step) {
    const order = ['read', 'detect', 'extract', 'build'];
    const idx = order.indexOf(step);
    for (const li of $$('li', els.steps)) {
      const i = order.indexOf(li.dataset.step);
      li.classList.toggle('is-done', i < idx || step === 'done');
      li.classList.toggle('is-active', i === idx);
    }
  }
  function setProgress(fraction, label) {
    const pct = Math.round(Math.min(1, fraction) * 100);
    els.bar.style.width = pct + '%';
    els.progress.setAttribute('aria-valuenow', String(pct));
    if (label) els.count.textContent = label;
  }

  // ------------------------------------------------------------ platform tabs
  for (const tab of $$('.tab', tool)) {
    tab.addEventListener('click', () => {
      state.platform = tab.dataset.platform;
      tool.dataset.platform = state.platform;
      for (const t of $$('.tab', tool)) t.setAttribute('aria-selected', String(t === tab));
      if (state.files.length) {
        // re-read order details with the chosen marketplace rules
        const platform = effectivePlatform();
        for (const f of state.files) for (const p of f.pages) p.meta = extractMeta(p, platform);
        state.orders = buildOrders(state.files);
        state.summary = summarize(state.orders);
        renderResult();
        scheduleBuild();
      }
    });
  }
  const effectivePlatform = () => (state.platform === 'auto' ? state.detected || 'other' : state.platform);
  const platformName = () => PLATFORM_NAMES[effectivePlatform()] || 'Labels';

  // ------------------------------------------------------------ file intake
  const warm = () => preloadLibs();
  for (const ev of ['pointerenter', 'focusin', 'touchstart']) els.drop.addEventListener(ev, warm, { once: true, passive: true });

  els.input.addEventListener('change', () => {
    if (els.input.files?.length) handleFiles([...els.input.files]);
  });

  let dragDepth = 0;
  addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return;
    dragDepth++;
    warm();
    if (tool.dataset.state === 'idle') els.drop.classList.add('is-drag');
  });
  addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; els.drop.classList.remove('is-drag'); } });
  addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  addEventListener('drop', (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    dragDepth = 0;
    els.drop.classList.remove('is-drag');
    if (tool.dataset.state === 'processing') return;
    handleFiles([...e.dataTransfer.files]);
    tool.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  async function handleFiles(list) {
    const pdfs = list.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
    showError('');
    if (!pdfs.length) { showError('Please choose PDF files. Label files usually come from your seller panel as .pdf downloads.'); return; }

    resetData();
    setStage('processing');
    setStep('read');
    setProgress(0, 'Loading the PDF engine…');
    els.scanTitle.textContent = 'Smart Detect is reading your PDFs…';

    try {
      await loadPdfjs();
    } catch {
      setStage('idle');
      showError('Could not load the PDF engine. Please check your internet connection and try again.');
      return;
    }

    try {
      const files = [];
      for (let i = 0; i < pdfs.length; i++) {
        const file = pdfs[i];
        const analysed = await analyzeFile(file, i, {
          platform: state.platform,
          onPage: (n, total) => {
            if (n === 1) setStep('detect');
            setProgress((i + n / total) / pdfs.length, `${pdfs.length > 1 ? `File ${i + 1}/${pdfs.length} · ` : ''}page ${n} of ${total}`);
          },
        });
        files.push({ name: file.name, ...analysed });
      }
      setStep('extract');
      state.files = files;
      state.detected = files.find(f => f.platform !== 'other')?.platform || 'other';
      state.orders = buildOrders(files);
      state.summary = summarize(state.orders);
      if (!state.orders.length) throw Object.assign(new Error('empty'), { friendly: 'No labels were found in this PDF. Is it a shipping label file from your seller panel?' });

      setStep('build');
      els.scanTitle.textContent = `Found ${state.summary.labels || state.orders.length} labels — building your PDF…`;
      renderResult();
      await rebuild();
      setStep('done');
      setStage('ready');
      if (state.summary.labels === 0) toast('No labels found — showing invoices');
    } catch (err) {
      console.error(err);
      setStage('idle');
      const msg = err?.friendly
        || (err?.name === 'PasswordException' ? 'This PDF is password protected. Download an unlocked copy from your seller panel and try again.'
        : err?.name === 'InvalidPDFException' ? 'This file doesn\'t look like a valid PDF. Try downloading it again.'
        : 'Something went wrong while reading this PDF. Please try again or use a different file.');
      showError(msg);
      resetData();
    } finally {
      els.input.value = '';
    }
  }

  function resetData() {
    for (const f of state.files) f.pdf?.destroy?.();
    state.files = []; state.orders = []; state.summary = null; state.output = null; state.crop = null;
    state.token++;
    els.thumbs.replaceChildren();
  }

  // ------------------------------------------------------------ settings form
  function renderSettingsControls() {
    els.papers.replaceChildren(...Object.entries(PAPERS).map(([id, p]) => {
      const label = document.createElement('label');
      label.className = 'paper';
      const shape = p.original ? { w: 18, h: 13, dashed: true }
        : p.smartFit ? { w: 17, h: 24, smart: true }
        : p.cols > 1 || p.rows > 1 ? { w: 17, h: 24 } : { w: Math.round(24 * Math.min(1, p.w / p.h)), h: Math.round(24 * Math.min(1, p.h / p.w)) };
      label.innerHTML = `<input type="radio" name="paper" value="${id}"><span class="paper-card"><span class="paper-shape"><i class="${shape.smart ? 'paper-smart' : ''}" style="width:${shape.w}px;height:${shape.h}px${shape.dashed ? ';border-style:dashed' : ''}"></i></span><span class="paper-text"><b>${p.name}</b><small>${p.note}</small></span></span>`;
      return label;
    }));
    els.sort.replaceChildren(...Object.entries(SORTS).map(([id, name]) => new Option(name, id)));
    writeForm();
  }

  function writeForm() {
    const s = state.settings;
    for (const el of els.form.elements) {
      if (!el.name || !(el.name in s)) continue;
      if (el.type === 'radio') el.checked = el.value === s[el.name];
      else if (el.type === 'checkbox') el.checked = !!s[el.name];
      else el.value = s[el.name];
    }
  }

  function readForm() {
    const fd = new FormData(els.form);
    const s = { ...state.settings };
    for (const key of ['output', 'paper', 'sort']) s[key] = fd.get(key) || s[key];
    for (const key of ['footerSku', 'highlightMulti', 'footerDate', 'autoRotate', 'cutGuides', 'smartFit', 'removeMargin']) s[key] = fd.has(key);
    s.footerText = String(fd.get('footerText') || '').slice(0, 60);
    return s;
  }

  let textTimer;
  els.form.addEventListener('change', onSettings);
  els.form.addEventListener('input', (e) => {
    if (e.target.name !== 'footerText') return;
    clearTimeout(textTimer);
    textTimer = setTimeout(onSettings, 450);
  });
  els.form.addEventListener('submit', e => e.preventDefault());
  function onSettings(e) {
    const prev = state.settings;
    state.settings = readForm();

    if (e?.target?.name === 'paper') {
      if (state.settings.paper === 'a4-smart') {
        state.settings.smartFit = true;
      } else if (prev.paper === 'a4-smart' && state.settings.paper !== 'a4-smart') {
        state.settings.smartFit = false;
      }
      writeForm();
    } else if (e?.target?.name === 'smartFit') {
      if (state.settings.smartFit) {
        state.settings.paper = 'a4-smart';
      } else if (state.settings.paper === 'a4-smart') {
        state.settings.paper = 'a4-6';
      }
      writeForm();
    }

    store.save(state.settings);
    scheduleBuild();
  }

  // ------------------------------------------------------------ results + preview
  function renderResult() {
    const s = state.summary;
    const pages = state.files.reduce((n, f) => n + f.pages.length, 0);
    const detectedNote = state.platform === 'auto' && state.detected !== 'other' ? ' (auto-detected)' : '';
    els.kicker.textContent = `${platformName()}${detectedNote} · ${state.files.length} file${state.files.length > 1 ? 's' : ''} · ${pages} pages`;
    els.title.textContent = s.labels
      ? `${s.labels} label${s.labels === 1 ? '' : 's'} ready${s.invoices ? ` · ${s.invoices} invoice${s.invoices === 1 ? '' : 's'}` : ''}`
      : `${s.invoices} invoice${s.invoices === 1 ? '' : 's'} found`;

    const chip = (html, cls = '') => { const c = document.createElement('span'); c.className = `chip ${cls}`; c.innerHTML = html; return c; };
    const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    const chips = [];
    if (s.imageOnly) {
      const c = chip(`Image-only PDF <b>${s.imageOnly}</b>`, 'chip-warn');
      c.title = 'These pages are pictures with no text, so SKU, courier and payment details cannot be read. Cropping still works.';
      chips.push(c);
    }
    for (const [c, n] of Object.entries(s.couriers).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      if (c !== 'Unknown') chips.push(chip(`${esc(c)} <b>${n}</b>`));
    }
    if (s.payments.COD) chips.push(chip(`COD <b>${s.payments.COD}</b>`));
    if (s.payments.Prepaid) chips.push(chip(`Prepaid <b>${s.payments.Prepaid}</b>`));
    if (s.skus) chips.push(chip(`SKUs <b>${s.skus}</b>`));
    if (s.multiQty) chips.push(chip(`Multi-qty <b>${s.multiQty}</b>`, 'chip-warn'));
    els.chips.replaceChildren(...chips);

    // output options that make sense for this file
    const outInputs = $$('input[name="output"]', els.form);
    for (const input of outInputs) {
      const disabled = (input.value !== 'labels' && !s.invoices) || (input.value !== 'invoices' && !s.labels);
      input.disabled = disabled;
      input.parentElement.style.opacity = disabled ? '.45' : '';
    }
    if (outInputs.find(i => i.checked)?.disabled) {
      const fallback = outInputs.find(i => !i.disabled);
      if (fallback) { fallback.checked = true; state.settings = readForm(); }
    }
    $('#btn-invoices').hidden = !s.invoices;
  }

  let buildTimer;
  function scheduleBuild() {
    if (!state.orders.length) return;
    clearTimeout(buildTimer);
    state.dirty = true;
    els.thumbs.classList.add('is-busy');
    buildTimer = setTimeout(() => rebuild().catch(err => { console.error(err); showError(err.message || 'Could not build the PDF.'); }), 180);
  }

  async function rebuild() {
    clearTimeout(buildTimer);
    state.dirty = false;
    const token = ++state.token;
    els.thumbs.classList.add('is-busy');
    els.previewMeta.textContent = 'Building preview…';
    showError('');
    const sorted = sortOrders(state.orders, state.settings.sort);
    const promise = buildPdf(state.files, sorted, { ...state.settings, crop: state.crop });
    state.building = promise;
    const bytes = await promise;
    if (token !== state.token) return;
    state.output = { bytes };
    await renderThumbs(bytes, token);
  }

  async function renderThumbs(bytes, token) {
    const { lib, docOptions } = await loadPdfjs();
    const doc = await lib.getDocument({ data: bytes.slice(), ...docOptions }).promise;
    if (token !== state.token) { doc.destroy(); return; }
    const max = Math.min(doc.numPages, 12);
    const figs = [];
    for (let n = 1; n <= max; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: Math.min(3, 280 / base.width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      if (token !== state.token) { doc.destroy(); return; }
      const fig = document.createElement('figure');
      fig.className = 'thumb';
      const cap = document.createElement('figcaption');
      cap.textContent = `Page ${n}`;
      fig.append(canvas, cap);
      figs.push(fig);
    }
    if (doc.numPages > max) {
      const more = document.createElement('div');
      more.className = 'thumbs-more';
      more.textContent = `+ ${doc.numPages - max} more page${doc.numPages - max > 1 ? 's' : ''}`;
      figs.push(more);
    }
    const paper = PAPERS[state.settings.paper];
    els.thumbs.replaceChildren(...figs);
    if (!state.dirty) els.thumbs.classList.remove('is-busy');
    els.previewMeta.textContent = `${doc.numPages} page${doc.numPages > 1 ? 's' : ''} · ${paper.name} · ${Math.max(1, Math.round(bytes.length / 1024))} KB`;
    state.output.pages = doc.numPages;
    doc.destroy();
  }

  // ------------------------------------------------------------ downloads & print
  const stamp = () => new Date().toISOString().slice(0, 10);
  const slug = () => effectivePlatform() === 'other' ? 'labels' : effectivePlatform();
  function download(data, name, type) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  // Always hand out the PDF for the *current* settings, even if a rebuild is still pending
  async function currentBytes() {
    if (state.dirty || !state.output) await rebuild();
    else await state.building;
    if (state.dirty) return currentBytes();
    return state.output.bytes;
  }
  async function busy(btn, fn) {
    btn.disabled = true;
    try { await fn(); } catch (err) { console.error(err); showError(err.message || 'Something went wrong.'); } finally { btn.disabled = false; }
  }

  $('#btn-download').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const kind = { labels: 'labels', both: 'labels-invoices', invoices: 'invoices' }[state.settings.output];
    recordConversion();
    download(await currentBytes(), `FlipkartLabelCrop_${slug()}_${kind}_${state.settings.paper}_${stamp()}.pdf`, 'application/pdf');
    toast('PDF downloaded');
  }));

  $('#btn-print').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const url = URL.createObjectURL(new Blob([await currentBytes()], { type: 'application/pdf' }));
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    frame.src = url;
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { window.open(url, '_blank', 'noopener'); }
    };
    document.body.append(frame);
    setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 120_000);
  }));

  // Share sheet (phones): hand the PDF straight to a printer app, WhatsApp, Drive...
  const shareBtn = $('#btn-share');
  const canShareFiles = () => {
    try {
      const probe = new File([new Uint8Array([37, 80, 68, 70])], 'probe.pdf', { type: 'application/pdf' });
      return !!navigator.canShare?.({ files: [probe] });
    } catch { return false; }
  };
  if (shareBtn && canShareFiles()) {
    shareBtn.hidden = false;
    shareBtn.closest('.actions')?.classList.add('has-share');
    shareBtn.addEventListener('click', (e) => busy(e.currentTarget, async () => {
      const kind = { labels: 'labels', both: 'labels-invoices', invoices: 'invoices' }[state.settings.output];
      const name = `FlipkartLabelCrop_${slug()}_${kind}_${state.settings.paper}_${stamp()}.pdf`;
      const file = new File([await currentBytes()], name, { type: 'application/pdf' });
      if (!navigator.canShare({ files: [file] })) { toast('This browser cannot share PDF files'); return; }
      try {
        await navigator.share({ files: [file], title: 'Shipping labels', text: 'Cropped with Flipkart Label Crop' });
      } catch (err) {
        if (err?.name !== 'AbortError') showError('Could not open the share sheet. Download the PDF instead.');
      }
    }));
  }
  $('#btn-invoices').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const sorted = sortOrders(state.orders, state.settings.sort);
    const bytes = await buildPdf(state.files, sorted, { ...state.settings, output: 'invoices', paper: 'a4', portrait: true, autoRotate: false, alignTop: true, footerSku: false, footerDate: false, footerText: '', highlightMulti: false, crop: state.crop });
    download(bytes, `LabelCropAI_${slug()}_invoices_A4_${stamp()}.pdf`, 'application/pdf');
    toast('Invoices downloaded');
  }));

  $('#btn-picklist').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    const bytes = await buildPicklist(sortOrders(state.orders, 'sku'), platformName());
    download(bytes, `LabelCropAI_${slug()}_picklist_${stamp()}.pdf`, 'application/pdf');
    toast('Picklist downloaded');
  }));

  $('#btn-csv').addEventListener('click', () => {
    download(ordersCsv(sortOrders(state.orders, state.settings.sort), state.files), `LabelCropAI_${slug()}_orders_${stamp()}.csv`, 'text/csv;charset=utf-8');
    toast('Orders CSV downloaded');
  });

  $('#btn-reset').addEventListener('click', () => {
    resetData();
    showError('');
    setStage('idle');
    els.input.click();
  });

  // ------------------------------------------------------------ adjust crop dialog
  const dlg = $('#crop-dialog');
  const stage = $('#crop-stage');
  const cropCanvas = $('#crop-canvas');
  const boxEl = $('#crop-box');
  const crop = { kind: 'label', rects: {}, touched: new Set() };

  const sampleRef = kind => state.orders.find(o => o[kind])?.[kind];
  const normalized = (ref, kind) => {
    const b = regionBox(ref, kind, state.crop);
    return { x0: b.x0 / ref.page.width, y0: b.y0 / ref.page.height, x1: b.x1 / ref.page.width, y1: b.y1 / ref.page.height };
  };

  $('#btn-adjust').addEventListener('click', async () => {
    if (!state.orders.length) return;
    crop.rects = {}; crop.touched = new Set();
    for (const kind of ['label', 'invoice']) {
      const ref = sampleRef(kind);
      const radio = $(`input[name="cropKind"][value="${kind}"]`, dlg);
      radio.disabled = !ref;
      radio.parentElement.style.opacity = ref ? '' : '.45';
      if (ref) crop.rects[kind] = normalized(ref, kind);
    }
    crop.kind = crop.rects.label ? 'label' : 'invoice';
    $(`input[name="cropKind"][value="${crop.kind}"]`, dlg).checked = true;
    dlg.showModal();
    await drawCropPage();
  });

  $$('input[name="cropKind"]', dlg).forEach(r => r.addEventListener('change', async () => {
    crop.kind = r.value;
    await drawCropPage();
  }));

  async function drawCropPage() {
    const ref = sampleRef(crop.kind);
    if (!ref) return;
    const page = await state.files[ref.fileIndex].pdf.getPage(ref.pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const maxW = Math.min(860, innerWidth * 0.94 - 36), maxH = innerHeight * 0.62;
    const cssScale = Math.min(maxW / base.width, maxH / base.height);
    const dpr = Math.min(2, devicePixelRatio || 1);
    const vp = page.getViewport({ scale: cssScale * dpr });
    cropCanvas.width = Math.ceil(vp.width); cropCanvas.height = Math.ceil(vp.height);
    cropCanvas.style.width = `${base.width * cssScale}px`;
    cropCanvas.style.height = `${base.height * cssScale}px`;
    await page.render({ canvasContext: cropCanvas.getContext('2d'), viewport: vp }).promise;
    placeBox();
  }

  function placeBox() {
    const r = crop.rects[crop.kind];
    if (!r) return;
    Object.assign(boxEl.style, {
      left: `${r.x0 * 100}%`, top: `${r.y0 * 100}%`, width: `${(r.x1 - r.x0) * 100}%`, height: `${(r.y1 - r.y0) * 100}%`,
    });
  }

  let drag = null;
  boxEl.addEventListener('pointerdown', (e) => {
    const rect = stage.getBoundingClientRect();
    drag = { mode: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, start: { ...crop.rects[crop.kind] }, w: rect.width, h: rect.height };
    boxEl.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  boxEl.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.sx) / drag.w, dy = (e.clientY - drag.sy) / drag.h;
    const s = drag.start, MIN = 0.04;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    let r = { ...s };
    if (drag.mode === 'move') {
      const w = s.x1 - s.x0, h = s.y1 - s.y0;
      r.x0 = clamp(s.x0 + dx, 0, 1 - w); r.y0 = clamp(s.y0 + dy, 0, 1 - h);
      r.x1 = r.x0 + w; r.y1 = r.y0 + h;
    } else {
      if (drag.mode.includes('w')) r.x0 = clamp(s.x0 + dx, 0, s.x1 - MIN);
      if (drag.mode.includes('e')) r.x1 = clamp(s.x1 + dx, s.x0 + MIN, 1);
      if (drag.mode.includes('n')) r.y0 = clamp(s.y0 + dy, 0, s.y1 - MIN);
      if (drag.mode.includes('s')) r.y1 = clamp(s.y1 + dy, s.y0 + MIN, 1);
    }
    crop.rects[crop.kind] = r;
    crop.touched.add(crop.kind);
    placeBox();
  });
  const endDrag = () => { drag = null; };
  boxEl.addEventListener('pointerup', endDrag);
  boxEl.addEventListener('pointercancel', endDrag);

  dlg.addEventListener('click', (e) => {
    const action = e.target.closest('[data-crop]')?.dataset.crop;
    if (e.target === dlg || action === 'close') dlg.close();
    if (action === 'reset') {
      state.crop = null;
      dlg.close();
      scheduleBuild();
      toast('Back to Smart Detect crop');
    }
    if (action === 'apply') {
      const next = { ...(state.crop || {}) };
      for (const kind of crop.touched) next[kind] = crop.rects[kind];
      state.crop = Object.keys(next).length ? next : null;
      dlg.close();
      scheduleBuild();
      if (crop.touched.size) toast('Custom crop applied to all pages');
    }
  });

  // ------------------------------------------------------------ boot
  renderSettingsControls();
  setStage('idle');
}
