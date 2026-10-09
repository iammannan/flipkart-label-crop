// SEO landing pages: printer setups, seller workflows and how-to guides.
// Each page is a full tool page (drop zone included) with its own genuinely different content.
// Claims here are measured: bulk timings from scripts/_bulk.mjs, offline behaviour verified on the live site.
import { icon, googlePlayBadge, googlePlayIcon, GOOGLE_PLAY_URL } from '../templates/layout.mjs';

// ---------------------------------------------------------------- building blocks
const section = ({ kicker, title, lede = '', body = '', alt = false, id = '' }) => `
<section class="section${alt ? ' section-alt' : ''}"${id ? ` id="${id}"` : ''}>
  <div class="container">
    <p class="kicker">${kicker}</p>
    <h2 class="section-title">${title}</h2>
    ${lede ? `<p class="section-lede">${lede}</p>` : ''}
    ${body}
  </div>
</section>`;

const split = ({ kicker, title, lede, right, alt = false }) => `
<section class="section${alt ? ' section-alt' : ''}">
  <div class="container split">
    <div>
      <p class="kicker">${kicker}</p>
      <h2 class="section-title">${title}</h2>
      <p class="section-lede">${lede}</p>
    </div>
    ${right}
  </div>
</section>`;

const steps = (title, items, kicker = 'How it works') => `
<section class="section">
  <div class="container">
    <p class="kicker">${kicker}</p>
    <h2 class="section-title">${title}</h2>
    <ol class="steps-grid${items.length === 4 ? ' steps-4' : ''}">
      ${items.map(([h, p], i) => `<li class="step"><span class="step-n">0${i + 1}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}
    </ol>
  </div>
</section>`;

const checklist = items => `<ul class="checklist">${items.map(t => `<li>${icon('check', 'i i-sm')} <span>${t}</span></li>`).join('')}</ul>`;

const table = (head, rows) => `
<div class="table-wrap">
  <table class="table">
    <thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`;

const prose = html => `<div class="prose landing-prose">${html}</div>`;

const cta = (text, sub = 'Free, no signup. Your PDF is processed in your own browser and never uploaded.') => `
<section class="section">
  <div class="container">
    <div class="cta-band">
      <div><h2>${text}</h2><p>${sub}</p></div>
      <a class="btn btn-lime btn-lg" href="#tool">${icon('upload')} Choose PDF files</a>
    </div>
  </div>
</section>`;

// Standard driver settings every 4x6 thermal printer needs; brand pages add their own rows.
const PRINTER_BASE = [
  ['Paper / stock size', '4 &times; 6 in (100 &times; 150 mm)', 'Must match the label roll, otherwise the printer stretches or skips labels'],
  ['Scale', '100% / Actual size', '&ldquo;Fit to page&rdquo; shrinks the label and softens the barcode'],
  ['Margins', 'None / 0', 'The PDF from Label Crop AI already has the right margins'],
  ['Orientation', 'Portrait', 'Wide labels are already rotated to fit the roll when Auto-rotate is on'],
  ['Media type', 'Labels with gaps (die-cut)', 'Lets the sensor find the gap between stickers so each print starts on a new label'],
  ['Darkness', 'Start mid-range, raise one step at a time', 'Too light gives broken bars; too dark makes bars bleed together'],
  ['Print speed', 'A slower setting', 'Slower printing gives crisper barcodes on almost every thermal printer'],
];
const printerTable = (extra = []) => table(['Setting', 'Use', 'Why'], [...PRINTER_BASE, ...extra]);

// ---------------------------------------------------------------- shared FAQ answers (reworded per page where it matters)
const FAQ_PRIVATE = { q: 'Is my customer data safe?', a: 'Yes. The PDF is opened and cropped by code running in your own browser. The file, customer names, addresses and order numbers are never uploaded. The only thing the site records is an anonymous count of how many labels were cropped.' };
const FAQ_FREE = { q: 'Is it free, with no daily limit?', a: 'Yes. There is no signup, no watermark and no page or daily limit. Processing happens on your device, so there are no per-file server costs to pass on.' };
const FAQ_BARCODE = { q: 'Why is my printed barcode blurry or not scanning?', a: 'Almost always a driver setting: print at <b>100% / Actual size</b> (not &ldquo;Fit to page&rdquo;), set the paper to 4 &times; 6 in, slow the print speed down and raise darkness one step. Label Crop AI keeps the label as vector graphics, so the barcode itself is not degraded by cropping.' };

// ---------------------------------------------------------------- pages
const common = { tool: true, priority: 0.7, changefreq: 'monthly' };

export const LANDING_PAGES = [
  // ============================================================ PRINTERS
  {
    ...common, group: 'Printers', crumb: '4x6 thermal label converter',
    path: '/4x6-thermal-label-cropper', file: '4x6-thermal-label-cropper.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'A4 to 4x6 Label Converter – Free Thermal Label Cropper',
    description: 'Convert A4 shipping label PDFs into 4x6 inch thermal labels in seconds. Works with Meesho, Flipkart & Amazon. Free thermal label crop, no upload required.',
    h1: 'Turn A4 label PDFs into <span class="hl">4&times;6 thermal labels</span>',
    eyebrow: 'A4 &rarr; 4&times;6 converter &middot; runs on your device',
    lede: 'Marketplaces hand you A4 pages with a small shipping label and an invoice on each. Drop the PDF here: every label is cut to its border and sized for a 100 &times; 150 mm thermal roll, one label per sticker.',
    body: split({
      kicker: 'The problem',
      title: 'Why an A4 label PDF prints badly on a 4&times;6 roll',
      lede: 'Send an A4 page straight to a thermal printer and the driver shrinks the whole sheet &mdash; label, invoice and white space &mdash; onto one small sticker. The barcode ends up tiny and often will not scan. Converting first fixes that: only the label is kept and it fills the sticker.',
      right: checklist([
        'Label cut tight to its border on every page, even when address lengths vary',
        'Tax invoice separated &mdash; drop it, keep it after each label, or print it on A4',
        'Wide labels (Meesho) rotated automatically to use the full 4&times;6 height',
        'Vector output: barcodes and QR codes stay sharp at any size',
        'Also 4&times;4 in and 3&times;5 in rolls, if that is what your printer takes',
      ]),
    }) + steps('A4 to 4&times;6 in four steps', [
      ['Download the label PDF', 'Get the label file from your seller panel exactly as it comes &mdash; no editing needed.'],
      ['Drop it here', 'Smart Detect finds each label and invoice. The paper is already set to 4 &times; 6 in.'],
      ['Check the preview', 'Every page of the output is previewed before you print. Use Adjust crop if a layout is unusual.'],
      ['Print at actual size', 'Print at 100% on 4 &times; 6 in (100 &times; 150 mm) labels with no margins.'],
    ]) + section({
      kicker: 'Printer settings', title: 'Driver settings for any 4&times;6 thermal printer',
      lede: 'These work for TSC, Zebra, Xprinter, TVS, Gprinter and other 4-inch direct thermal printers.',
      body: printerTable(),
      alt: true,
    }),
    faqs: [
      { q: 'What size is a 4x6 label in millimetres?', a: '4 &times; 6 inches is about 100 &times; 150 mm (101.6 &times; 152.4 mm exactly). Most Indian label rolls are sold as 100 &times; 150 mm and work with the 4 &times; 6 in setting.' },
      { q: 'Will the label be rotated?', a: 'Only when it helps. Meesho labels are wider than they are tall, so Auto-rotate turns them 90&deg; to fill the roll. Flipkart and Amazon labels are already upright. Switch Auto-rotate off if you prefer no rotation.' },
      { q: 'Can I keep the invoice as well?', a: 'Yes. Choose <b>Label + invoice</b> to print each invoice right after its label on the same roll, or use <b>Invoices (A4)</b> to print all invoices separately on normal paper.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Convert your A4 labels to 4&times;6 now'),
  },
  {
    ...common, group: 'Printers', crumb: 'TSC printer label crop',
    path: '/tsc-thermal-printer-label-cropper', file: 'tsc-thermal-printer-label-cropper.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'TSC Printer Label Crop – Free 4x6 Tool for TTP-244 Pro',
    description: 'Crop Meesho, Flipkart and Amazon labels for TSC thermal printers like the TTP-244 Pro and TE244. Correct 4x6 settings and sensor calibration tips. Free.',
    h1: 'Label crop for <span class="hl">TSC thermal printers</span>',
    eyebrow: 'TSC TTP-244 Pro &middot; TE244 &middot; 4&times;6 ready',
    lede: 'TSC 4-inch printers are a favourite with Indian sellers. Crop your marketplace label PDF here into clean 4 &times; 6 in pages, then print with the settings below for scannable barcodes every time.',
    body: steps('Printing on a TSC printer', [
      ['Crop the PDF here', 'Drop your label PDF. Paper is preset to 4 &times; 6 in; download or print the result.'],
      ['Set the stock size', 'In the TSC driver&rsquo;s Printing Preferences, create or pick a 100 &times; 150 mm stock.'],
      ['Calibrate the sensor', 'Run the gap sensor calibration once after loading a new roll (see below).'],
      ['Print at 100%', 'Print with scale 100% / Actual size and no margins.'],
    ], 'TSC setup') + section({
      kicker: 'TSC driver settings', title: 'Recommended settings for TSC 4-inch printers',
      lede: 'Most TSC desktop models ship with a Windows driver built by Seagull Scientific. Setting names can differ slightly between driver versions.',
      body: printerTable([
        ['Stock name', 'A custom 100 &times; 150 mm stock', 'Saves the size so you do not re-enter it on every print'],
      ]),
      alt: true,
    }) + split({
      kicker: 'Troubleshooting',
      title: 'Labels skipping or printing across the gap?',
      lede: 'That is almost always the gap sensor, not the PDF. Re-calibrate after every new roll: use the calibrate option in TSC&rsquo;s Diagnostic Tool, or the feed-button calibration described in your model&rsquo;s manual.',
      right: checklist([
        '<b>Blank label between prints</b> &rarr; sensor not calibrated for this roll',
        '<b>Print starts mid-label</b> &rarr; wrong stock size or media set to continuous',
        '<b>Faint or broken barcode</b> &rarr; raise darkness a step, lower the speed',
        '<b>Label looks small</b> &rarr; the PDF was printed with &ldquo;Fit to page&rdquo;',
      ]),
    }),
    faqs: [
      { q: 'Does this work with the TSC TTP-244 Pro?', a: 'Yes. The output is a standard 4 &times; 6 in PDF, so it prints on the TTP-244 Pro, TE244 and any other 4-inch TSC model that takes 100 &times; 150 mm labels.' },
      { q: 'How do I calibrate a TSC printer for label gaps?', a: 'Use the sensor calibration in TSC&rsquo;s Diagnostic Tool, or the power-on feed-button method in your model&rsquo;s manual. Do it whenever you load a new roll or switch label sizes.' },
      { q: 'Which TSC stock size should I choose?', a: 'Create a stock of 100 &times; 150 mm (or 4 &times; 6 in) in the driver&rsquo;s Printing Preferences and select it before printing.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your TSC printer'),
  },
  {
    ...common, group: 'Printers', crumb: 'Xprinter label crop',
    path: '/xprinter-label-cropper-tool', file: 'xprinter-label-cropper-tool.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'Xprinter Label Crop Tool – Free 4x6 Shipping Labels',
    description: 'Crop Meesho, Flipkart and Amazon shipping labels for Xprinter 4-inch thermal printers like the XP-420B and XP-470B. Correct 4x6 driver settings. Free.',
    h1: 'Shipping label crop for <span class="hl">Xprinter</span> thermal printers',
    eyebrow: 'Xprinter XP-420B &middot; XP-470B &middot; 4&times;6',
    lede: 'Xprinter&rsquo;s 4-inch models are one of the most affordable ways to print shipping labels. Crop your marketplace PDF here first so each label fills a 4 &times; 6 in sticker instead of shrinking into a corner.',
    body: steps('From seller panel to Xprinter', [
      ['Crop here', 'Drop the label PDF from Meesho, Flipkart or Amazon. The paper is preset to 4 &times; 6 in.'],
      ['Add a 100 &times; 150 mm paper size', 'In the Xprinter driver&rsquo;s Printing Preferences, add a custom paper size of 100 &times; 150 mm.'],
      ['Let the printer learn the gap', 'After loading a roll, run the label-learning / calibration step for your model.'],
      ['Print at actual size', 'Choose 100% scale and no margins in the print dialog.'],
    ], 'Xprinter setup') + section({
      kicker: 'Xprinter driver settings', title: 'Settings for Xprinter 4-inch label printers',
      lede: 'Menus vary by driver version; look for these options under Printing Preferences.',
      body: printerTable([
        ['Paper size', 'Custom 100 &times; 150 mm', 'Xprinter drivers often default to a smaller size &mdash; always check before a batch'],
      ]),
      alt: true,
    }) + split({
      kicker: 'Common issues',
      title: 'Fixing the usual Xprinter problems',
      lede: 'On most Xprinter label models, holding the FEED button makes the printer re-learn the label length. Check your model&rsquo;s manual for the exact method, and repeat it for every new roll.',
      right: checklist([
        '<b>Prints over two labels</b> &rarr; paper size in the driver does not match the roll',
        '<b>Every other label blank</b> &rarr; re-run label learning / calibration',
        '<b>Light print</b> &rarr; increase density in the driver',
        '<b>Label off-centre</b> &rarr; set margins to zero and scale to 100%',
      ]),
    }),
    faqs: [
      { q: 'Does it work with the Xprinter XP-420B and XP-470B?', a: 'Yes. You get a standard 4 &times; 6 in PDF that prints on any 4-inch Xprinter label model using 100 &times; 150 mm labels.' },
      { q: 'Why does my Xprinter print two labels for one page?', a: 'The paper size in the driver does not match the roll, or the printer has not learned the label gap. Set the paper to 100 &times; 150 mm and run the calibration for your model.' },
      { q: 'Can I print from my phone to an Xprinter?', a: 'If your Xprinter has Bluetooth or Wi-Fi and a companion app, crop the labels on your phone here and tap <b>Share</b> to send the PDF to that app.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your Xprinter'),
  },
  {
    ...common, group: 'Printers', crumb: 'TVS LP 46 label crop',
    path: '/tvs-electronics-label-cropper', file: 'tvs-electronics-label-cropper.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'TVS LP 46 Label Crop – Free 4x6 Thermal Label Tool',
    description: 'Crop Meesho, Flipkart and Amazon labels for TVS Electronics LP 46 thermal printers. Print clean 4x6 labels with the right driver settings. Free, no upload.',
    h1: 'Label crop for <span class="hl">TVS LP 46</span> thermal printers',
    eyebrow: 'TVS Electronics LP 46 series &middot; 4&times;6',
    lede: 'The TVS Electronics LP 46 range is common in Indian dispatch rooms. Crop your label PDF here into 4 &times; 6 in pages and print them at full size &mdash; no manual trimming, no shrunken barcodes.',
    body: steps('Printing on a TVS LP 46', [
      ['Crop the PDF', 'Drop your Meesho, Flipkart or Amazon label file. Paper is preset to 4 &times; 6 in.'],
      ['Pick a 100 &times; 150 mm page', 'Set the TVS driver&rsquo;s paper size to 100 &times; 150 mm (4 &times; 6 in).'],
      ['Calibrate once per roll', 'Use the calibration method in your LP 46 manual so each print starts at the top of a label.'],
      ['Print at 100%', 'Actual size, no margins, portrait.'],
    ], 'TVS setup') + section({
      kicker: 'TVS driver settings', title: 'Settings for TVS Electronics label printers',
      lede: 'Install the driver from TVS Electronics&rsquo; support site for your exact model, then apply these settings.',
      body: printerTable(),
      alt: true,
    }) + split({
      kicker: 'Why crop first',
      title: 'Why not print the seller PDF directly?',
      lede: 'The PDF from your seller panel is an A4 page. Sent straight to a 4-inch printer, the driver scales the whole A4 sheet down, and the label comes out roughly half size with a hard-to-scan barcode.',
      right: checklist([
        'Only the label is kept, so it fills the whole sticker',
        'Invoices separated &mdash; print them later on A4 if you need them',
        'Sort by SKU or courier before printing to speed up packing',
        'Works for hundreds of orders in one go',
      ]),
    }),
    faqs: [
      { q: 'Does it work with the TVS LP 46 NEO?', a: 'Yes. The output is a standard 4 &times; 6 in PDF that any LP 46 model using 100 &times; 150 mm labels can print.' },
      { q: 'My TVS printer leaves a blank label after each print. Why?', a: 'The printer has not detected the label gap correctly. Run the calibration described in your model&rsquo;s manual and make sure the paper size in the driver is 100 &times; 150 mm.' },
      { q: 'Can I print invoices on the TVS printer too?', a: 'Yes. Choose <b>Label + invoice</b> and each invoice is scaled onto a 4 &times; 6 in label right after its shipping label.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your TVS printer'),
  },
  {
    ...common, group: 'Printers', crumb: 'Zebra label crop',
    path: '/zebra-label-pdf-cropper', file: 'zebra-label-pdf-cropper.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'Zebra Printer Label Crop – Free 4x6 PDF Label Tool',
    description: 'Crop Meesho, Flipkart and Amazon PDF labels for Zebra ZD220, ZD230 and GC420d printers. 4x6 output, ZDesigner settings and calibration tips. Free.',
    h1: 'PDF label crop for <span class="hl">Zebra</span> printers',
    eyebrow: 'Zebra ZD220 &middot; ZD230 &middot; GC420d &middot; 4&times;6',
    lede: 'Zebra desktop printers print PDFs through the ZDesigner driver. Crop your marketplace label file here into true 4 &times; 6 in pages so the driver prints each label at full size.',
    body: steps('Printing PDFs on a Zebra', [
      ['Crop the PDF', 'Drop the label file; paper is preset to 4 &times; 6 in.'],
      ['Set 4.00 &times; 6.00 in', 'In ZDesigner Printing Preferences, set the paper format to 4.00 &times; 6.00 in, portrait.'],
      ['Calibrate', 'Use Tools &rarr; Action &rarr; Calibrate in the ZDesigner driver, or your model&rsquo;s feed-button calibration.'],
      ['Print at 100%', 'Actual size, no scaling in the PDF viewer.'],
    ], 'Zebra setup') + section({
      kicker: 'ZDesigner settings', title: 'Recommended ZDesigner driver settings',
      lede: 'Use Zebra&rsquo;s ZDesigner driver for your model. Darkness and speed live on the Options tab.',
      body: printerTable([
        ['Media type', 'Label with gaps (non-continuous)', 'Matches die-cut 4&times;6 rolls'],
      ]),
      alt: true,
    }) + split({
      kicker: 'Troubleshooting',
      title: 'Zebra printing one label, skipping the next?',
      lede: 'After a roll change the printer may still hold the old label length. Calibrate from the driver&rsquo;s Tools tab, then print one test label before a full batch.',
      right: checklist([
        '<b>Skips labels</b> &rarr; calibrate for the new roll',
        '<b>Barcode grey or patchy</b> &rarr; raise darkness, slow the speed',
        '<b>Printout too small</b> &rarr; PDF printed with &ldquo;Fit&rdquo; instead of Actual size',
        '<b>Label cut off at the edge</b> &rarr; paper format not set to 4.00 &times; 6.00 in',
      ]),
    }),
    faqs: [
      { q: 'Which Zebra printers does this work with?', a: 'Any Zebra desktop printer that takes 4-inch labels and prints PDFs through a Windows or Mac driver, for example the ZD220, ZD230, GC420d and GK420d.' },
      { q: 'Do I need ZPL for Zebra printers?', a: 'No. Label Crop AI produces a normal PDF; the ZDesigner driver converts it for the printer. ZPL files are not needed.' },
      { q: 'How do I calibrate a Zebra label printer?', a: 'Open Printing Preferences &rarr; Tools &rarr; Action and choose Calibrate, or use the feed-button calibration from your model&rsquo;s manual.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your Zebra printer'),
  },
  {
    ...common, group: 'Printers', crumb: 'Gprinter label crop',
    path: '/gprinter-label-cropper', file: 'gprinter-label-cropper.html', platform: 'auto', preset: { paper: '4x6' },
    title: 'Gprinter Label Crop – Free 4x6 Shipping Label Tool',
    description: 'Crop Meesho, Flipkart and Amazon shipping labels for Gprinter 4-inch thermal printers. Print full-size 4x6 labels with the right settings. Free, no upload.',
    h1: 'Shipping label crop for <span class="hl">Gprinter</span>',
    eyebrow: 'Gprinter 4-inch label printers &middot; 4&times;6',
    lede: 'Gprinter&rsquo;s 4-inch thermal printers take the same 100 &times; 150 mm rolls as other brands. Crop your seller PDF here so every label prints at full size, one per sticker.',
    body: steps('Printing on a Gprinter', [
      ['Crop the label PDF', 'Drop the file from your seller panel. Paper is preset to 4 &times; 6 in.'],
      ['Set the paper size', 'Add a 100 &times; 150 mm paper size in the Gprinter driver.'],
      ['Calibrate the gap sensor', 'Run your model&rsquo;s label calibration after loading a new roll.'],
      ['Print at 100%', 'Actual size, zero margins.'],
    ], 'Gprinter setup') + section({
      kicker: 'Driver settings', title: 'Settings for Gprinter 4-inch printers',
      body: printerTable(),
      alt: true,
    }) + split({
      kicker: 'Batch printing',
      title: 'Print a whole day of orders in one go',
      lede: 'Drop several label PDFs at once &mdash; they are merged into one print job. Sort by SKU so packing goes in order, or by courier so each pickup pile is ready when the rider arrives.',
      right: checklist([
        'Merge files from Meesho, Flipkart and Amazon in one job',
        'Sort by SKU, courier, COD / prepaid or multi-quantity',
        'SKU picklist PDF and orders CSV with every batch',
        'Multi-quantity orders flagged with a black QTY tag',
      ]),
    }),
    faqs: [
      { q: 'Which Gprinter models work?', a: 'Any Gprinter that prints 4-inch (100 mm) labels from a computer or phone. The output is a standard 4 &times; 6 in PDF.' },
      { q: 'My Gprinter prints half on one label and half on the next. What is wrong?', a: 'The driver paper size does not match the roll or the gap has not been learned. Set 100 &times; 150 mm and run your model&rsquo;s calibration.' },
      { q: 'Does it work with 3-inch Gprinter models?', a: 'Choose the <b>3 &times; 5 in</b> paper option for 75 mm wide rolls. Labels are scaled to fit, so check barcodes scan on a test print.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your Gprinter'),
  },
  {
    ...common, group: 'Printers', crumb: 'A4 sticker sheet labels',
    path: '/a4-sticker-sheet-label-cropper', file: 'a4-sticker-sheet-label-cropper.html', platform: 'auto', preset: { paper: 'a4-4', cutGuides: true },
    title: 'A4 Sticker Sheet Labels – Print 2, 4, 6 or 8 per Page',
    description: 'No thermal printer? Crop labels onto A4 sticker sheets: 2, 4, 6 or 8 labels per page with cut guides. Meesho, Flipkart and Amazon. Free, no upload.',
    h1: 'Print shipping labels on <span class="hl">A4 sticker sheets</span>',
    eyebrow: '2-up &middot; 4-up &middot; 6-up &middot; 8-up &middot; any laser or inkjet',
    lede: 'No thermal printer yet? Print your labels on ordinary A4 sticker paper. Choose 2, 4, 6 or 8 labels per sheet and Label Crop AI lays them out with dashed cut guides.',
    body: section({
      kicker: 'Which layout', title: 'Match the layout to your sticker sheet',
      lede: 'Pre-cut A4 sheets come in 2, 4, 6 and 8 divisions. Each label is placed inside its section with a few millimetres to spare.',
      body: table(['Your sticker sheet', 'Choose', 'Labels per page'], [
        ['Plain A4 (full sheet)', 'A4 &middot; 4 up, then cut along the guides', '4'],
        ['2-division (210 &times; 148 mm)', 'A4 &middot; 2 up', '2'],
        ['4-division (105 &times; 148 mm)', 'A4 &middot; 4 up', '4'],
        ['6-division (105 &times; 99 mm)', 'A4 &middot; 6 up', '6'],
        ['8-division (105 &times; 74 mm)', 'A4 &middot; 8 up', '8'],
        ['One label per sheet', 'A4 &middot; 1 up', '1'],
      ]),
    }) + steps('Printing on sticker sheets', [
      ['Drop your label PDF', 'Meesho, Flipkart or Amazon &mdash; the layout is preset to 4 per sheet.'],
      ['Pick 2, 4, 6 or 8 up', 'Choose the layout that matches your sticker sheet.'],
      ['Print at 100%', 'In the print dialog pick A4, scale 100% / Actual size.'],
      ['Peel or cut', 'Use pre-cut sections, or cut plain sheets along the dashed guides.'],
    ]) + split({
      kicker: 'Paper savings',
      title: 'Up to 8 labels on a sheet that used to hold 1',
      lede: 'Printing the seller PDF directly uses a full A4 page per order. 4-up cuts that to a quarter, 6-up to a sixth and 8-up to an eighth. A batch of 66 Meesho labels fits on 9 sheets at 8-up.',
      right: checklist([
        'Dashed cut guides between labels (can be switched off)',
        'Labels auto-rotated to use each section fully',
        'Works on any laser or inkjet printer',
        'Barcodes stay sharp: labels are placed as vectors, not images',
      ]),
      alt: true,
    }),
    faqs: [
      { q: 'Which sticker paper should I buy?', a: 'A4 sheets with 4 divisions (105 &times; 148 mm each) are the best match for shipping labels. 8-division sheets work too but make each label smaller.' },
      { q: 'Will 8 labels per page still scan?', a: 'On a decent laser printer, yes. On a low-quality inkjet the barcode can get tight at 8-up; if a courier has trouble scanning, switch to 4-up.' },
      { q: 'Do the labels line up exactly with pre-cut sections?', a: 'Each label sits inside its section with a small margin to spare, so it lands on the sticker even if your printer is slightly off-centre. Print one test sheet on plain paper first.' },
      { q: 'Can I print the invoices on the same sheets?', a: 'Choose <b>Label + invoice</b> to print both in the grid, or use <b>Invoices (A4)</b> to print invoices on plain paper.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Print labels on A4 sticker sheets'),
  },
  {
    ...common, group: 'Printers', crumb: 'Flipkart label printer setup',
    path: '/flipkart-shipping-label-printer', file: 'flipkart-shipping-label-printer.html', platform: 'flipkart', preset: { paper: '4x6' },
    title: 'Flipkart Label Printer Setup – 4x6 Thermal Print Guide',
    description: 'How to set up and print Flipkart shipping labels on thermal printers (TVS, TSC, Zebra, Xprinter). Recommended 4x6 driver settings, scale & calibration.',
    h1: 'Flipkart shipping label <span class="hl">printer setup &amp; crop</span>',
    eyebrow: 'Flipkart thermal printer guide &middot; 4&times;6 ready',
    lede: 'Print Flipkart Seller Hub and Shopsy labels on thermal printers without squishing or blurry barcodes. Crop the PDF to 4&times;6 and apply the driver settings below.',
    body: steps('Printing Flipkart labels on a thermal printer', [
      ['Download from Seller Hub', 'Download your ready-to-dispatch shipping labels as a PDF from Flipkart Seller Hub.'],
      ['Crop the label PDF here', 'Drop the file above. Smart Detect removes the tax invoice and formats each label for 4 &times; 6 in thermal rolls.'],
      ['Configure driver settings', 'Set stock to 100 &times; 150 mm (4 &times; 6 in), scale to 100% / Actual size, and margins to None.'],
      ['Print at actual size', 'Run a test print to verify barcode sharpness, then print the entire batch in seconds.'],
    ], 'Flipkart printer setup') + section({
      kicker: 'Recommended printers', title: 'Best thermal printers for Flipkart sellers',
      lede: 'These 4-inch direct thermal barcode printers are widely used by high-volume Flipkart and Shopsy sellers across India.',
      body: table(['Printer Model', 'Resolution', 'Key Strength for Flipkart'], [
        ['TVS LP 46 Neo / Eco', '203 DPI', 'Robust build, popular in Indian hubs, handles Ekart barcodes cleanly'],
        ['TSC TTP-244 Pro / TE244', '203 DPI', 'Industry workhorse, fast printing speed, reliable gap calibration'],
        ['Xprinter XP-420B / XP-470B', '203 DPI', 'Budget-friendly, compact desktop size, USB and Bluetooth options'],
        ['Zebra ZD220 / ZD230', '203 DPI', 'Commercial durability, high-precision thermal printhead'],
        ['Gprinter GP-1324D', '203 DPI', 'High-speed motor for dispatching 500+ Flipkart orders daily'],
      ]),
      alt: true,
    }) + section({
      kicker: 'Driver configuration', title: 'Exact 4x6 driver settings for crisp barcodes',
      lede: 'Apply these settings in Windows Printing Preferences to prevent barcode scanning failures and skipped labels.',
      body: printerTable([
        ['Page size / Stock', '100 &times; 150 mm or 4 &times; 6 in', 'Must match thermal roll dimensions precisely'],
        ['Dithering / Halftone', 'None or Error Diffusion', 'Ensures barcodes have crisp solid black bars rather than dotted patterns'],
      ]),
    }) + split({
      kicker: 'Troubleshooting',
      title: 'Fixing common Flipkart thermal printing issues',
      lede: 'Most printing errors come from driver mismatches or uncropped A4 pages rather than physical hardware defects.',
      right: checklist([
        '<b>Faint barcode / scanning fails:</b> Set scale to 100% (never "Fit to page") and raise printer darkness by 1&ndash;2 points.',
        '<b>Printer skips a blank sticker:</b> Calibrate the label gap sensor by holding the feed button or via the diagnostic utility.',
        '<b>Label prints sideways or tiny:</b> The full A4 page was sent uncropped. Crop the PDF above so only the label is printed.',
        '<b>Tax invoice prints on thermal roll:</b> Select "Labels only" in Label Crop AI to strip out the tax invoice automatically.',
      ]),
      alt: true,
    }),
    howToSteps: [
      { name: 'Download shipping labels from Flipkart Seller Hub', text: 'Generate and download your order shipping labels as a PDF from Flipkart Seller Hub.' },
      { name: 'Crop to 4x6 in Label Crop AI', text: 'Drop the PDF into the tool above to isolate the shipping label from the tax invoice and size it for 4x6 rolls.' },
      { name: 'Configure printer preferences', text: 'Set your thermal printer driver stock size to 100x150 mm (4x6 in) and scale to 100% with zero margins.' },
      { name: 'Print and scan test label', text: 'Print the first label and verify barcode readability before running the full batch.' },
    ],
    faqs: [
      { q: 'Which is the best thermal printer for Flipkart shipping labels?', a: 'The TVS LP 46 Neo, TSC TTP-244 Pro, and Xprinter XP-420B are top choices for Flipkart sellers. All print 4x6 labels with 203 DPI resolution suitable for Ekart barcode scanning.' },
      { q: 'What size thermal label roll should I buy for Flipkart?', a: 'Buy standard <b>4 &times; 6 inch (100 &times; 150 mm)</b> direct thermal label rolls with gap perforation. This is the exact size required by Flipkart, Meesho, and Amazon.' },
      { q: 'Why does my Flipkart label print tiny in the corner of the sticker?', a: 'This happens when you print the raw A4 PDF without cropping. The printer driver shrinks the full A4 page onto the 4x6 sticker. Drop your PDF in the tool above to crop the shipping label so it fills the entire 4x6 sticker.' },
      { q: 'How do I avoid printing the Flipkart tax invoice on the thermal roll?', a: 'Choose <b>Labels</b> in the settings above. The tool automatically removes the tax invoice and only prints the shipping label. Click <b>Invoices (A4)</b> if you want invoices on plain A4 paper.' },
      FAQ_BARCODE, FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels for your Flipkart printer now'),
  },

  // ============================================================ WORKFLOWS
  {
    ...common, group: 'Workflows', crumb: 'Bulk label crop & merge',
    path: '/bulk-pdf-label-crop-merge', file: 'bulk-pdf-label-crop-merge.html', platform: 'auto',
    title: 'Bulk Label Crop & PDF Merger – Combine Shipping Labels',
    description: 'Merge & crop multiple shipping label PDFs at once. Combine Meesho, Flipkart & Amazon batches into one print file for 4x6 thermal or A4. Free label merger.',
    h1: 'Bulk crop &amp; merge <span class="hl">shipping label PDFs</span>',
    eyebrow: 'Multiple files &middot; one print job',
    lede: 'Select all of today&rsquo;s label PDFs at once &mdash; from one marketplace or several. They are cropped, merged and sorted into a single file ready for your printer.',
    body: split({
      kicker: 'Measured, not guessed',
      title: 'Hundreds of labels in one batch',
      lede: 'In our tests on a laptop, 198 labels from 3 PDFs were ready in about 10 seconds, and 528 labels from 8 PDFs in about 25 seconds. Everything runs in your browser, so speed depends on your device rather than an upload queue.',
      right: checklist([
        'Select or drop many PDFs at once &mdash; they merge into one job',
        'Mix marketplaces: Meesho, Flipkart and Amazon files together',
        'Sort the whole batch by SKU, courier, COD / prepaid or quantity',
        'One SKU picklist and one orders CSV for the entire batch',
      ]),
    }) + steps('Bulk crop in four steps', [
      ['Collect the PDFs', 'Download every label file for the day into one folder.'],
      ['Select them all', 'Drop them together, or pick several in the file dialog.'],
      ['Sort and review', 'Choose paper and sort order, then check the preview.'],
      ['Print once', 'Download or print one merged file instead of many.'],
    ]) + section({
      kicker: 'Tips for big batches', title: 'Getting the most out of large runs',
      body: prose(`
<p><b>Use a laptop or desktop for very large batches.</b> Phones handle everyday batches, but 500+ labels are quicker with more memory.</p>
<p><b>Sort before printing.</b> Sorting by SKU means you pack all units of one product together; sorting by courier means each pickup pile is ready when the rider arrives.</p>
<p><b>Print the picklist first.</b> The picklist PDF totals every SKU, size and colour so you can pull stock in one pass.</p>`),
      alt: true,
    }),
    faqs: [
      { q: 'How many PDFs can I merge at once?', a: 'There is no fixed limit. In our tests 8 files with 528 labels processed in about 25 seconds on a laptop. Very large batches depend on your device&rsquo;s memory.' },
      { q: 'Can I merge Meesho and Flipkart labels in one file?', a: 'Yes. Drop files from different marketplaces together and they are cropped and merged into one print job.' },
      { q: 'Will the merged file be sorted?', a: 'Choose a sort order &mdash; SKU, courier, COD / prepaid or multi-quantity first &mdash; and it applies to the whole merged batch.' },
      { q: 'Is there a daily or page limit?', a: 'No. The tool is free and unlimited because processing happens on your own device.' },
      FAQ_PRIVATE,
    ],
    after: cta('Crop today&rsquo;s batch in one go'),
  },
  {
    ...common, group: 'Workflows', crumb: 'Remove invoice from labels',
    path: '/remove-invoice-from-labels', file: 'remove-invoice-from-labels.html', platform: 'auto', preset: { output: 'labels' },
    title: 'Remove Invoice from Shipping Labels – Split PDF Labels Free',
    description: 'Remove tax invoice from Meesho, Flipkart and Amazon shipping labels. Split invoice from label PDF automatically for 4x6 thermal printers. Private & free.',
    h1: 'Remove the invoice, <span class="hl">keep the label</span>',
    eyebrow: 'Label and invoice separated automatically',
    lede: 'Marketplace label PDFs put the shipping label and the tax invoice on the same page. Drop yours here: labels and invoices are split apart, and you decide what to print.',
    body: section({
      kicker: 'Three ways to print', title: 'Pick what you need',
      body: table(['Option', 'What you get', 'Best for'], [
        ['Labels', 'Only shipping labels, invoices removed', 'Sticking on parcels; invoices handled digitally'],
        ['Label + invoice', 'Each invoice printed right after its label', 'Putting a printed invoice inside every parcel'],
        ['Invoices (A4)', 'All invoices on A4 pages, top-aligned', 'Keeping invoices on normal paper while labels go to the thermal printer'],
      ]),
    }) + split({
      kicker: 'How the split works',
      title: 'Finds the boundary on every page',
      lede: 'Meesho pages are split at the <em>Fold Here</em> line or at the invoice box border; Flipkart and Shopsy pages at the dashed cut line above the <em>Tax Invoice</em>. Each part is then trimmed to its own edges.',
      right: checklist([
        'Meesho <em>Tax Invoice</em> and <em>Bill of Supply</em> layouts',
        'Flipkart and Shopsy labels with the invoice below',
        'Amazon invoice pages paired with labels by order ID',
        'Scanned (image-only) PDFs split at the printed cut line',
      ]),
      alt: true,
    }) + steps('Separating labels and invoices', [
      ['Drop the label PDF', 'Straight from your seller panel.'],
      ['Choose what to print', 'Labels, Label + invoice, or Invoices (A4).'],
      ['Preview', 'Check the output pages before printing.'],
      ['Print or download', 'Or tap Share on your phone to send the PDF to a printer app.'],
    ]),
    faqs: [
      { q: 'How do I remove the invoice from a Meesho label?', a: 'Drop the Meesho PDF and keep <b>Labels</b> selected. The label is cut above the Fold Here line (or at the invoice border on bill-of-supply layouts) and the invoice is left out.' },
      { q: 'How do I print Flipkart labels without the invoice?', a: 'Drop the Flipkart label PDF and choose <b>Labels</b>. The label is separated from the Tax Invoice below it and printed on its own.' },
      { q: 'Can I still print the invoices later?', a: 'Yes. Click <b>Invoices (A4)</b> any time to download all invoices from the same batch as A4 pages.' },
      { q: 'Is it legal to ship without a printed invoice?', a: 'That depends on your marketplace&rsquo;s rules and your GST requirements, not on this tool. Check your seller policy; if an invoice must go in the parcel, use <b>Label + invoice</b>.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Separate labels from invoices now'),
  },
  {
    ...common, group: 'Workflows', crumb: 'SKU picklist generator',
    path: '/sku-picklist-generator', file: 'sku-picklist-generator.html', platform: 'auto', preset: { sort: 'sku' },
    title: 'SKU Picklist Generator & SKU Label Tool – Free Online',
    description: 'Generate packing picklists and SKU labels automatically from Meesho, Flipkart & Amazon label PDFs. Group by SKU, count quantities, export PDF & orders CSV.',
    h1: 'SKU picklist straight from your <span class="hl">label PDFs</span>',
    eyebrow: 'Picklist PDF &middot; orders CSV &middot; sorted labels',
    lede: 'Stop counting SKUs by hand. Drop the day&rsquo;s label PDFs and get a picklist that totals every SKU, size and colour &mdash; with labels sorted in the same order you pick.',
    body: split({
      kicker: 'What is on the picklist',
      title: 'Everything you need to pull stock in one pass',
      lede: 'The picklist is a printable A4 PDF. Labels are sorted by SKU by default on this page, so the picking order and the printing order match.',
      right: checklist([
        'SKU, size and colour, grouped and sorted A&ndash;Z',
        'Number of orders and total units for each variant',
        'A tick box on every line for your picker',
        'Courier handover summary with COD and prepaid counts',
        'Orders CSV with order no., AWB, courier, SKU, size and quantity',
      ]),
    }) + steps('Picklist in four steps', [
      ['Drop the label PDFs', 'One file or many, from any supported marketplace.'],
      ['Check the chips', 'See SKUs, couriers and multi-quantity orders at a glance.'],
      ['Download the picklist', 'Click Picklist PDF; add Orders CSV for your records.'],
      ['Print labels in SKU order', 'Pack each product&rsquo;s orders together as you go.'],
    ]) + section({
      kicker: 'Good to know', title: 'Where SKU data comes from',
      body: prose(`
<p>SKU, size, colour and quantity are read from the text printed on each label &mdash; the <em>Product Details</em> table on Meesho labels and the <em>SKU ID | Description</em> table on Flipkart and Shopsy labels.</p>
<p>If a PDF is a scanned image with no text, the labels still crop perfectly, but there is no SKU text to read. The result screen tells you when that happens.</p>`),
      alt: true,
    }),
    faqs: [
      { q: 'What does the picklist include?', a: 'Each SKU with its size and colour, the number of orders, total quantity and a tick box, followed by a courier handover summary with COD and prepaid counts.' },
      { q: 'Can I export orders to Excel?', a: 'Yes. Click <b>Orders CSV</b>. The file opens in Excel or Google Sheets with order number, AWB, courier, payment, SKU, size, colour, quantity and customer name.' },
      { q: 'Why is my picklist empty?', a: 'The PDF is probably a scanned image with no text. Cropping still works, but SKUs cannot be read. Download a fresh copy from your seller panel.' },
      { q: 'Does it handle orders with more than one unit?', a: 'Yes. Quantities are added up per SKU, and multi-quantity orders are highlighted with a black QTY tag on the label.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Make today&rsquo;s picklist'),
  },
  {
    ...common, group: 'Workflows', crumb: 'Courier-wise label sorter',
    path: '/courier-wise-label-sorter', file: 'courier-wise-label-sorter.html', platform: 'auto', preset: { sort: 'courier' },
    title: 'Courier Wise Label Sorter – Valmo, Ekart & Delhivery',
    description: 'Sort shipping labels by courier: Valmo, Ekart, Delhivery, Shadowfax, Xpressbees & Ecom Express. Group labels for faster pickup handover. Free, no upload.',
    h1: 'Sort labels by <span class="hl">courier partner</span>',
    eyebrow: 'One pile per courier &middot; faster handover',
    lede: 'Different riders arrive for different couriers. Drop your label PDFs and they come out grouped by courier, so every pickup pile is ready before the rider reaches your door.',
    body: section({
      kicker: 'Couriers recognised', title: 'Detected from the text on each label',
      lede: 'The courier name printed on the label is read automatically. Labels are then grouped by courier, and by SKU within each courier.',
      body: `<div class="related-links">${['Valmo', 'Delhivery', 'Xpressbees', 'Shadowfax', 'Ecom Express', 'Ekart', 'DTDC', 'Blue Dart', 'India Post', 'Amazon Shipping', 'Smartr', 'Gati', 'Shiprocket'].map(c => `<span class="pill-link">${c}</span>`).join('')}</div>`,
    }) + split({
      kicker: 'At a glance',
      title: 'See the courier split before you print',
      lede: 'After dropping the files you see a count for each courier, plus COD and prepaid totals. The picklist PDF ends with a handover summary you can hand to each rider.',
      right: checklist([
        'Courier chips with counts on the result screen',
        'Labels grouped by courier, then by SKU',
        'Handover summary on the picklist: parcels, COD and prepaid per courier',
        'Or sort by COD / prepaid to keep cash orders together',
      ]),
      alt: true,
    }) + steps('Courier-wise dispatch', [
      ['Drop the label PDFs', 'Sorting is preset to courier partner on this page.'],
      ['Check the courier counts', 'The chips show how many parcels go to each courier.'],
      ['Print in courier order', 'Stick labels and stack parcels as they come off the printer.'],
      ['Hand over', 'Use the handover summary on the picklist to check each pickup.'],
    ]),
    faqs: [
      { q: 'Which couriers can it sort by?', a: 'Valmo, Delhivery, Xpressbees, Shadowfax, Ecom Express, Ekart, DTDC, Blue Dart, India Post, Amazon Shipping, Smartr, Gati and Shiprocket, read from the text on each label.' },
      { q: 'Why does it show no courier for my labels?', a: 'The PDF is probably a scanned image without text, so the courier name cannot be read. The labels still crop; download a fresh PDF from your seller panel for sorting.' },
      { q: 'Can I sort by courier and SKU together?', a: 'Yes. Courier sorting groups by courier first and by SKU within each courier.' },
      { q: 'Can I keep COD orders together instead?', a: 'Choose <b>COD / Prepaid</b> in Sort orders to group cash-on-delivery parcels together.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Sort today&rsquo;s labels by courier'),
  },
  {
    ...common, group: 'Workflows', crumb: 'Private label cropper',
    path: '/privacy-first-label-cropper', file: 'privacy-first-label-cropper.html', platform: 'auto',
    title: 'Private Label Cropper – PDFs Never Leave Your Device',
    description: 'Crop shipping labels without uploading customer data. The PDF is processed in your browser and works offline after first use. Free, no signup.',
    h1: 'A label cropper that <span class="hl">never uploads your PDF</span>',
    eyebrow: 'Processed on your device &middot; nothing uploaded',
    lede: 'Shipping labels are full of customer names, addresses and order numbers. Label Crop AI crops them inside your browser &mdash; the file itself is never sent to any server.',
    body: section({
      kicker: 'Exactly what leaves your device', title: 'Plain answers, no fine print',
      body: table(['Data', 'Leaves your device?'], [
        ['Your PDF file', 'No &mdash; read and cropped in the browser'],
        ['Customer names, addresses, phone details', 'No'],
        ['Order numbers, AWBs, SKUs', 'No'],
        ['The cropped PDF you download', 'No &mdash; created in the browser and saved by you'],
        ['Usage statistics or telemetry', 'No &mdash; zero telemetry or tracking data recorded'],
      ]),
    }) + split({
      kicker: 'How it works',
      title: 'Open-source PDF engines, running locally',
      lede: 'The site loads two well-known open-source libraries &mdash; Mozilla pdf.js to read the PDF and pdf-lib to build the new one &mdash; and runs them on your device. After your first use they are cached, so the tool keeps working even with no internet connection.',
      right: checklist([
        'No account, no login, no email required',
        'Works offline after your first use (tested on the live site)',
        'No advertising or tracking cookies',
        'Contact details are stored only if you choose to send a business enquiry',
      ]),
      alt: true,
    }) + steps('Private cropping in four steps', [
      ['Open the page', 'The first visit downloads the PDF engine once.'],
      ['Drop your PDF', 'It is read from your disk into the browser &mdash; not uploaded.'],
      ['Crop and sort', 'All detection and cropping happen locally.'],
      ['Save the result', 'The new PDF is created in the browser and saved by you.'],
    ]),
    faqs: [
      { q: 'Are my label PDFs uploaded anywhere?', a: 'No. The file is read and cropped by JavaScript in your browser. Zero files or tracking data are uploaded anywhere.' },
      { q: 'Does it work without internet?', a: 'After you have used it once, yes &mdash; the page and the PDF engine are cached and the tool works fully offline. On your very first visit it needs a connection to download the engine.' },
      { q: 'Which libraries process my PDF?', a: 'Mozilla pdf.js reads the PDF and pdf-lib creates the cropped file. Both are open source and run inside your browser.' },
      { q: 'Do you use cookies or ads?', a: 'No advertising or tracking cookies. Your tool preferences, such as paper size, are saved only in your own browser.' },
      FAQ_FREE,
    ],
    after: cta('Crop labels privately'),
  },

  // ============================================================ GUIDES
  {
    ...common, group: 'Guides', crumb: 'Print Meesho labels on a thermal printer',
    path: '/how-to-print-meesho-label-on-thermal-printer', file: 'how-to-print-meesho-label-on-thermal-printer.html', platform: 'meesho', preset: { paper: '4x6', autoRotate: true },
    title: 'How to Print Meesho Labels on a Thermal Printer (4x6 Guide)',
    description: 'Step-by-step guide to crop and print Meesho shipping labels on 4x6 thermal printers (TVS, TSC, Xprinter, Zebra). Fix blurry barcodes and paper skipping.',
    h1: 'How to print Meesho labels on a <span class="hl">thermal printer</span>',
    eyebrow: 'Guide &middot; free tool included',
    lede: 'Meesho gives you an A4 PDF with the label on top and the invoice below. Here is how to turn it into full-size 4 &times; 6 in thermal labels &mdash; and the tool to do it is right on this page.',
    body: steps('The short version', [
      ['Download the label PDF', 'In the Meesho Supplier Panel, download the labels for your ready-to-ship orders.'],
      ['Drop it in the tool above', 'Meesho is selected and the paper is set to 4 &times; 6 in with Auto-rotate on.'],
      ['Check the preview', 'Each label is cut above the Fold Here line and turned sideways to fill the roll.'],
      ['Print at 100%', 'Actual size, 4 &times; 6 in paper, no margins.'],
    ], 'Guide') + section({
      kicker: 'Step by step', title: 'The full walkthrough',
      body: prose(`
<h3>1. Get the right PDF</h3>
<p>Download the label file for your orders from the Meesho Supplier Panel. Do not print it from the browser preview &mdash; save the PDF to your computer or phone.</p>
<h3>2. Crop it</h3>
<p>Drop the PDF into the tool at the top of this page. Smart Detect finds each label above the <em>Fold Here</em> line (or above the invoice box on bill-of-supply labels), reads the SKU, courier and COD status, and removes the invoice.</p>
<h3>3. Why the label is rotated</h3>
<p>Meesho labels are wider than they are tall. Rotating them 90&deg; lets the label fill a 4 &times; 6 in sticker at a much larger size, which makes the barcode easier to scan. Turn off <em>Auto-rotate</em> if you prefer the label upright &mdash; it will print smaller.</p>
<h3>4. Print with the right settings</h3>
<p>Set the printer&rsquo;s paper size to 4 &times; 6 in (100 &times; 150 mm), print at 100% / Actual size and set margins to none. Print one label first and scan its barcode with your phone before printing the whole batch.</p>`),
      alt: true,
    }) + section({
      kicker: 'Printer settings', title: 'Settings that work on most thermal printers',
      body: printerTable(),
    }),
    howToSteps: [
      { name: 'Download label PDF from Meesho', text: 'Download shipping labels from the Meesho Supplier Panel for your ready-to-ship orders.' },
      { name: 'Crop to 4x6 in Label Crop AI', text: 'Drop the PDF into the tool. It cuts above the fold line, removes the invoice, and auto-rotates the label to fill 4x6.' },
      { name: 'Configure thermal printer settings', text: 'Select 100x150 mm (4x6 in) paper size, portrait orientation, 100% actual size scale, and zero margins.' },
      { name: 'Print and test barcode scan', text: 'Print a test label on your thermal printer and verify the barcode scans crisply with a barcode scanner.' },
    ],
    faqs: [
      { q: 'Why does my Meesho label print so small on the thermal printer?', a: 'You are printing the full A4 page, so the driver shrinks the whole sheet onto one sticker. Crop the PDF first so only the label is printed, at full size.' },
      { q: 'Should I print the Meesho invoice?', a: 'Follow your marketplace and GST requirements. If you need it, choose <b>Label + invoice</b> to print each invoice after its label, or <b>Invoices (A4)</b> for plain paper.' },
      { q: 'Can I print Meesho labels 4 per A4 sheet instead?', a: 'Yes. Choose <b>A4 &middot; 4 up</b> (or 6 or 8 up) and print on A4 sticker paper with any laser or inkjet printer.' },
      { q: 'My Meesho PDF has no Fold Here line. Will it work?', a: 'Yes. Newer Meesho bill-of-supply labels without a Fold Here line are split at the invoice box border instead.' },
      FAQ_BARCODE, FAQ_PRIVATE,
    ],
    after: cta('Print your Meesho labels now'),
  },
  {
    ...common, group: 'Guides', crumb: 'Print Flipkart labels without invoice',
    path: '/how-to-print-flipkart-labels-without-invoice', file: 'how-to-print-flipkart-labels-without-invoice.html', platform: 'flipkart', preset: { output: 'labels' },
    title: 'How to Print Flipkart Labels Without Invoice (Thermal 4x6)',
    description: 'How to remove tax invoices from Flipkart shipping labels and print on 4x6 thermal rolls. Separate invoice from label in 1 click. Easy step-by-step guide.',
    h1: 'How to print Flipkart labels <span class="hl">without the invoice</span>',
    eyebrow: 'Guide &middot; Flipkart &amp; Shopsy',
    lede: 'Every Flipkart label page carries a tax invoice underneath. Here is how to print just the shipping label &mdash; and keep the invoices for later if you need them.',
    body: steps('The short version', [
      ['Download the labels', 'Download the shipping label PDF for your packed orders from Flipkart Seller Hub.'],
      ['Drop it in the tool above', 'Flipkart is selected and the output is set to Labels only.'],
      ['Check the preview', 'Each label is cut at the dashed line above the Tax Invoice and trimmed to its border.'],
      ['Print', 'Print on 4 &times; 6 in labels at 100%, or 4 / 8 per A4 sheet.'],
    ], 'Guide') + section({
      kicker: 'Step by step', title: 'Details that save a reprint',
      body: prose(`
<h3>Where the split happens</h3>
<p>Flipkart prints a dashed cut line across the page between the label and the <em>Tax Invoice</em>. Label Crop AI cuts there and then trims the label to its own border, so the cut line and side white space are left out and the label fills your sticker.</p>
<h3>Shopsy labels</h3>
<p>Shopsy orders use the same layout as Flipkart, so they are handled the same way on this page.</p>
<h3>Keeping the invoices</h3>
<p>After printing the labels, click <em>Invoices (A4)</em> to download every invoice from the same batch as A4 pages &mdash; handy for your records or for parcels that need one inside.</p>
<h3>Scanned PDFs</h3>
<p>If your PDF is a scanned image, labels still crop at the printed cut line, but SKU and courier sorting are not available because there is no text to read.</p>`),
      alt: true,
    }) + section({
      kicker: 'Printer settings', title: 'Print settings for Flipkart labels',
      body: printerTable(),
    }),
    howToSteps: [
      { name: 'Download shipping labels from Flipkart Seller Hub', text: 'Download the label PDF for your packed orders from Flipkart Seller Hub.' },
      { name: 'Drop PDF into Label Crop AI', text: 'Select Flipkart format and Labels only. The tool cuts at the dashed line above the Tax Invoice and trims margins.' },
      { name: 'Set thermal printer to 4x6 in', text: 'Set your printer driver paper size to 100x150 mm (4x6 inches) and print scale to 100% / Actual size.' },
      { name: 'Print shipping labels', text: 'Print clean 4x6 shipping labels directly to your thermal printer with no invoice waste.' },
    ],
    faqs: [
      { q: 'How do I remove the invoice from a Flipkart label PDF?', a: 'Drop the PDF on this page with <b>Labels</b> selected. The label is separated from the Tax Invoice and printed on its own.' },
      { q: 'Can I get the invoices back later?', a: 'Yes. Click <b>Invoices (A4)</b> to download all invoices from the same batch.' },
      { q: 'Why is there white space around my Flipkart label?', a: 'That happens when the dashed cut line is included in the crop. Label Crop AI trims it off so the label fills the page; make sure you are printing at 100%.' },
      { q: 'Do Shopsy labels work too?', a: 'Yes. Shopsy uses the Flipkart label layout and is processed the same way.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Print Flipkart labels without the invoice'),
  },
  {
    ...common, group: 'Guides', crumb: 'Crop labels on mobile',
    path: '/mobile-shipping-label-cropper', file: 'mobile-shipping-label-cropper.html', platform: 'auto',
    title: 'Crop Shipping Labels on Mobile – Android App & Free Web Tool',
    description: 'Crop Meesho, Flipkart & Amazon shipping labels on mobile. Get Label Crop Tool for Android on Google Play or crop directly in your browser. Free & private.',
    h1: 'Crop shipping labels <span class="hl">on mobile &amp; Android</span>',
    eyebrow: 'Official Android App on Google Play &middot; Free In-Browser Web Tool',
    lede: 'Your orders arrive on your phone, so crop the labels there too. Install our dedicated Android app from Google Play or use this browser tool to print to Bluetooth thermal printers in 1 tap.',
    body: `<div class="container" style="margin-top: 24px;">
      <div class="app-hero-card">
        <div class="app-hero-body">
          <span class="badge badge-android">${googlePlayIcon('play-logo-sm')} Recommended for Android Sellers</span>
          <h2>Label Crop Tool for e-Commerce</h2>
          <p>Install our official Android app for 1-tap label cropping, background processing, and direct printing to Bluetooth and USB thermal printers (TSC, TVS, Xprinter, Zebra).</p>
        </div>
        <div class="app-hero-action">
          ${googlePlayBadge('play-badge-large')}
          <span class="app-rating">&#9733; 4.2+ &middot; Free on Play Store</span>
        </div>
      </div>
    </div>` + steps('Cropping on a phone or tablet', [
      ['Download the label PDF', 'From your Meesho, Flipkart or Amazon seller panel, save the label PDF to your phone.'],
      ['Tap &ldquo;browse files&rdquo;', 'Pick the PDF from Downloads or Files. Several files can be selected together.'],
      ['Check the preview', 'Scroll the pages, change paper size or sort order if needed.'],
      ['Share or download', 'Tap <b>Share</b> to send the PDF directly to a Bluetooth printer companion app, WhatsApp or Drive, or tap Download.'],
    ], 'On mobile') + split({
      kicker: 'Share to print',
      title: 'Send the PDF straight to your printer&rsquo;s app',
      lede: 'On Android and iPhone, the Share button opens your phone&rsquo;s share sheet. Pick the app for your Bluetooth or Wi-Fi label printer, or send the file to a computer on WhatsApp or Google Drive.',
      right: checklist([
        'Share button appears on phones that can share files',
        'Same file name as the download, so apps recognise it as a PDF',
        'Works with printer apps that accept PDF files',
        'Direct printing via Bluetooth companion app on Android',
      ]),
      alt: true,
    }) + section({
      kicker: 'Tips', title: 'Getting the best results on a phone',
      body: prose(`
<p><b>Prefer the Android App for frequent dispatches.</b> If you dispatch orders daily, install <a href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener"><b>Label Crop Tool for e-Commerce</b></a> from Google Play for faster batch cropping and direct Bluetooth connectivity.</p>
<p><b>Use Chrome on Android or Safari on iPhone.</b> Both support the share sheet and handle large PDFs well.</p>
<p><b>Keep very large batches for a laptop.</b> Phones handle a normal day of orders comfortably; hundreds of labels at once are faster on a computer.</p>
<p><b>Add to home screen.</b> In your browser menu choose <em>Add to Home screen</em> to open Label Crop AI like an app.</p>`),
    }),
    faqs: [
      { q: 'Is there an Android app for Label Crop?', a: `Yes! You can download our official <a href="${GOOGLE_PLAY_URL}" target="_blank" rel="noopener"><b>Label Crop Tool for e-Commerce app on Google Play</b></a>. It provides 1-tap cropping, 100% offline privacy, and works directly with Bluetooth thermal printers.` },
      { q: 'Do I need to install an app to use this web tool?', a: 'No. You can crop right in your phone’s browser (Chrome or Safari) without installing anything. The Android app is available as a convenient option if you prefer a dedicated app.' },
      { q: 'Why can&rsquo;t I see the Share button?', a: 'The Share button only appears on browsers that can share files, such as Chrome on Android and Safari on iPhone. Elsewhere, use Download.' },
      { q: 'Can I print directly from my phone?', a: 'Yes, through your printer&rsquo;s app: tap <b>Share</b> and pick the app. You can also use <b>Print</b> if your phone supports printing to your printer.' },
      { q: 'Does it work with WhatsApp-forwarded label PDFs?', a: 'Yes, as long as the PDF is the original label file. Save it to your phone first, then pick it here.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels on your phone'),
  },
  {
    ...common, group: 'Guides', crumb: 'Label cropping software for Windows',
    path: '/free-label-cropping-software-for-windows', file: 'free-label-cropping-software-for-windows.html', platform: 'auto',
    title: 'Free Label Cropping Software for Windows – No Install',
    description: 'A free web alternative to desktop label cropping software for Windows. Crop Meesho, Flipkart and Amazon labels in Chrome or Edge and install it as an app.',
    h1: 'Label cropping software for Windows, <span class="hl">without the install</span>',
    eyebrow: 'Runs in Chrome or Edge &middot; installable as an app',
    lede: 'Desktop label croppers need downloads, updates and sometimes licence keys. Label Crop AI runs in your Windows browser and does the same job: crop, sort and print marketplace labels.',
    body: section({
      kicker: 'Web app vs desktop software', title: 'What you gain by skipping the installer',
      body: table(['', 'Label Crop AI (web app)', 'Typical desktop software'], [
        ['Installation', 'None &mdash; open the page, or install as an app from the browser', 'Download and run an installer'],
        ['Updates', 'Automatic when you open the page', 'Manual downloads'],
        ['Where your PDF is processed', 'On your PC, in the browser', 'On your PC'],
        ['Price', 'Free, no signup', 'Varies'],
        ['Works on phone too', 'Yes, same site', 'Usually no'],
      ]),
    }) + split({
      kicker: 'Install as an app',
      title: 'Put it on your taskbar like a desktop program',
      lede: 'In Chrome or Edge, open the site and choose <em>Install Label Crop AI</em> from the address bar or the browser menu. It opens in its own window, and after the first use it works without an internet connection.',
      right: checklist([
        'Own window and taskbar icon',
        'Works offline after the first use',
        'Prints through your normal Windows printer drivers',
        'Drag and drop PDFs straight from File Explorer',
      ]),
      alt: true,
    }) + steps('Using it on Windows', [
      ['Open in Chrome or Edge', 'Optionally install it as an app from the browser menu.'],
      ['Drag in your PDFs', 'Drop label files straight from File Explorer or your Downloads folder.'],
      ['Choose paper and sorting', '4 &times; 6 in thermal, A4 sticker sheets, SKU or courier order.'],
      ['Print', 'Print through your usual Windows printer driver at 100% scale.'],
    ]),
    faqs: [
      { q: 'Is there a Windows download?', a: 'No download is needed. Use it in Chrome or Edge, and install it as an app from the browser menu if you want it on your taskbar.' },
      { q: 'Does it work offline on Windows?', a: 'After you have used it once, yes. The page and the PDF engine are cached by the browser.' },
      { q: 'Which Windows printers does it support?', a: 'Any printer with a Windows driver: TSC, Zebra, Xprinter, TVS, Gprinter and other thermal printers, plus normal laser and inkjet printers for A4 sheets.' },
      { q: 'Does it work on Windows 7?', a: 'It needs a modern browser. On older systems use the latest Chrome or Edge version your system supports.' },
      FAQ_PRIVATE, FAQ_FREE,
    ],
    after: cta('Crop labels on your Windows PC'),
  },
];
