// Page content + SEO metadata for Flipkart Label Crop & Cutter.
import { icon, urlFor } from '../templates/layout.mjs';
import { LANDING_PAGES } from './landing.mjs';

export const SITE = {
  name: 'Flipkart Label Crop & Cutter',
  brandHtml: 'Flipkart Label <b>Crop</b>',
  url: 'https://iammannan.github.io/flipkart-label-crop',
  basePath: '/flipkart-label-crop',
  verification: [
    'vnPC8jsPF6fEVp71Q8wE5sq-Bo1aErFa_6OSzbbw8nI', // Google Search Console
    'LMS3AOoHfi0_sx1Yclv-TNRC5pz4a_rOPdqwuJNp_jQ',
  ],
  googleAdsId: 'AW-939306740',
  googleAdsConversionLabel: 'AW-939306740/Btw8CO_9wYkdEPTd8r8D',
  googleAdsPageViewLabel: 'AW-939306740/gh_wCO31vpMdEPTd8r8D',
  indexNowKey: '8753d396b94e584e98b10e029edd46ee', // Bing / Yandex / Seznam instant indexing (npm run indexnow)
  features: [
    'Crop Flipkart and Shopsy shipping labels for 4x6 thermal printers',
    'Automatic tax invoice separation and cutter',
    'A4 1-up, 2-up, 4-up, 6-up and Smart fit layouts',
    'Sort Flipkart orders by SKU, Ekart courier or payment mode',
    'Print SKU, quantity, date or custom text on labels',
    'SKU-wise picklist PDF and orders CSV export',
    'Runs 100% in the browser — no upload, 100% private',
    'Compatible with TSC, TVS, Zebra, Xprinter thermal printers',
  ],
};

// ---------------------------------------------------------------- reusable blocks
const steps = (title, items, kicker = 'How it works', id = 'how') => `
<section class="section" id="${id}">
  <div class="container">
    <p class="kicker">${kicker}</p>
    <h2 class="section-title">${title}</h2>
    <ol class="steps-grid">
      ${items.map(([h, p], i) => `<li class="step"><span class="step-n">0${i + 1}</span><h3>${h}</h3><p>${p}</p></li>`).join('')}
    </ol>
  </div>
</section>`;

const features = (title, lede, items) => `
<section class="section section-alt" id="features">
  <div class="container">
    <p class="kicker">Features</p>
    <h2 class="section-title">${title}</h2>
    <p class="section-lede">${lede}</p>
    <div class="feature-grid">
      ${items.map(([ic, h, p]) => `<article class="feature"><span class="feature-icon">${icon(ic)}</span><h3>${h}</h3><p>${p}</p></article>`).join('')}
    </div>
  </div>
</section>`;

const stats = `
<section class="stats-band" aria-label="Highlights">
  <div class="container stats">
    <div class="stat"><b>0 bytes</b><span>of your PDFs leave the device</span></div>
    <div class="stat"><b>4 &times; 6 in</b><span>instant thermal roll format</span></div>
    <div class="stat"><b>1-click</b><span>tax invoice cutter &amp; split</span></div>
    <div class="stat"><b>&#8377;0</b><span>free forever, no watermark</span></div>
  </div>
</section>`;

const paperTable = (note = '') => `
<section class="section">
  <div class="container split">
    <div>
      <p class="kicker">Print sizes</p>
      <h2 class="section-title">Pick the layout that matches your printer</h2>
      <p class="section-lede">Labels are placed as vector graphics, not screenshots, so barcodes and QR codes stay crisp at any size.${note}</p>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th scope="col">Layout</th><th scope="col">Best for</th><th scope="col">Per page</th></tr></thead>
        <tbody>
          <tr><td><b>4 &times; 6 in</b></td><td>TVS, Xprinter, Zebra, TSC thermal printers (100&times;150 mm rolls)</td><td>1 label</td></tr>
          <tr><td><b>4 &times; 4 in</b></td><td>Square 100&times;100 mm thermal stickers</td><td>1 label</td></tr>
          <tr><td><b>3 &times; 5 in</b></td><td>Compact 75&times;125 mm thermal rolls</td><td>1 label</td></tr>
          <tr><td><b>A4 &middot; 1 up</b></td><td>Invoices or large labels on laser / inkjet printers</td><td>1</td></tr>
          <tr><td><b>A4 &middot; 2 up</b></td><td>Half-sheet A4 sticker paper</td><td>2 labels</td></tr>
          <tr><td><b>A4 &middot; 4 up</b></td><td>Saving paper on normal printers &mdash; cut along the guides</td><td>4 labels</td></tr>
          <tr><td><b>A4 &middot; 6 up</b></td><td>6-division A4 sticker sheets (105 &times; 99 mm each)</td><td>6 labels</td></tr>
          <tr><td><b>A4 &middot; Smart fit</b></td><td>Space-saving 6-up (4 stacked + 2 rotated) &mdash; larger QR codes on plain A4</td><td>6 labels</td></tr>
          <tr><td><b>A4 &middot; 8 up</b></td><td>Squeezing the most labels out of one sheet &mdash; cut along the guides</td><td>8 labels</td></tr>
          <tr><td><b>Original</b></td><td>Exact tight crop at 100% scale, no resizing</td><td>1 label</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</section>`;

const platformCards = (except) => {
  const cards = [
    ['flipkart', '/', 'Flipkart label crop', 'Split Seller Hub labels from the tax invoice and print 4&times;6 or 4 per A4.'],
    ['meesho', '/meesho-label-crop', 'Meesho label crop', 'Crop above the Fold Here line, keep or drop the invoice, sort by SKU, courier or COD.'],
    ['amazon', '/amazon-label-crop', 'Amazon label crop', 'Trim Easy Ship &amp; Self Ship labels, pair invoices by order ID, print on thermal.'],
    ['snapdeal', '/snapdeal-label-crop', 'Snapdeal label crop', 'Split shipping labels &amp; tax invoices side-by-side, crop for 4&times;6 thermal or A4.'],
  ].filter(c => c[0] !== except);
  return `
<section class="section" id="platforms">
  <div class="container">
    <p class="kicker">${except ? 'More tools' : 'Marketplaces'}</p>
    <h2 class="section-title">${except ? 'Selling on more than one marketplace?' : 'One tool for every marketplace label'}</h2>
    <div class="platform-cards">
      ${cards.map(([id, href, h, p]) => `<a class="platform-card pc-${id}" href="${urlFor(href, SITE.basePath)}"><span class="pc-dot"></span><h3>${h}</h3><p>${p}</p><span class="more">Open tool ${icon('arrow', 'i i-sm')}</span></a>`).join('')}
    </div>
  </div>
</section>`;
};

const cta = (text = 'Crop your next batch of Flipkart labels in seconds') => `
<section class="section">
  <div class="container">
    <div class="cta-band">
      <div><h2>${text}</h2><p>No signup. No upload. Works in Chrome, Edge, Firefox and Safari &mdash; on desktop and mobile.</p></div>
      <a class="btn btn-lime btn-lg" href="#tool">${icon('upload')} Choose PDF files</a>
    </div>
  </div>
</section>`;

const commonFeatures = [
  ['spark', 'Smart Detect', 'Reads each page, finds the label and invoice blocks and trims them to the edge automatically &mdash; even when address lengths change the label height.'],
  ['lock', 'Private by design', 'Your PDFs are processed on your own device. Customer names and addresses never touch a server.'],
  ['barcode', 'Scanner-safe barcodes', 'Pages are cropped as vectors, not screenshots. AWB barcodes and QR codes print sharp on 203 dpi thermal printers.'],
  ['sort', 'Sort for faster packing', 'Group labels by SKU, courier partner, COD / prepaid or multi-quantity so packing and handover go quicker.'],
  ['list', 'Picklist &amp; CSV', 'Generate a SKU-wise picklist with totals and a courier handover summary, or export every order to CSV.'],
  ['printer', 'Any printer, any paper', '4&times;6, 4&times;4 and 3&times;5 thermal rolls or A4 with 1, 2, 4, 6 or 8 labels per sheet, with auto-rotate and cut guides.'],
];

const commonFaqs = [
  { q: 'Is Flipkart Label Crop free?', a: 'Yes. Every feature is free with no signup, no watermark and no page limit. Because processing happens in your browser, there are no server costs to pass on to you.' },
  { q: 'Are my label PDFs uploaded anywhere?', a: 'No. The PDF is opened and cropped by JavaScript running entirely on your own device &mdash; your files never leave your browser, and after your first use the tool keeps working even without an internet connection. 100% private with zero data uploaded anywhere.' },
  { q: 'Will the barcode still scan after cropping?', a: 'Yes. Flipkart Label Crop copies the original vector content of the page instead of taking a screenshot, so barcodes, QR codes and text keep their full resolution at any print size.' },
];

// ---------------------------------------------------------------- pages
export const PAGES = [
  {
    path: '/', file: 'index.html', platform: 'flipkart', preset: { paper: '4x6' }, tool: true, priority: 1.0, changefreq: 'weekly',
    appName: 'Flipkart Label Crop & Cutter',
    title: 'Flipkart Label Crop & Cutter – Free Quick Label Crop Tool',
    ogTitle: 'Flipkart Label Crop & Cutter – Free Quick Label Crop Tool',
    description: 'Free Flipkart label crop & cutter. Crop Flipkart shipping labels for 4x6 thermal printers in 1 click. Quick label crop, remove tax invoices & sort by SKU.',
    h1: 'Flipkart Label Crop &amp; Cutter &mdash; <span class="hl">Quick Label Crop Tool</span>',
    lede: 'Crop Flipkart Seller Hub &amp; Shopsy shipping labels to 4&times;6 thermal stickers or A4 paper in seconds. Smart Detect automatically splits tax invoices, crops margins, sorts by SKU and Ekart courier &mdash; 100% free, private &amp; on-device.',
    eyebrow: '#1 Flipkart Label Crop &amp; Cutter &middot; 4&times;6 Thermal Ready',
    howToSteps: [
      { name: 'Download PDF from Flipkart Seller Hub', text: 'In Flipkart Seller Hub or Shopsy, download your shipping label PDF from Orders > Dispatch After Packing. Each page contains a shipping label and tax invoice.' },
      { name: 'Drop PDF in Flipkart Label Crop Tool', text: 'Smart Detect automatically separates the shipping label from the tax invoice, crops borders tight, and extracts SKU, Ekart courier, order ID and payment mode.' },
      { name: 'Print on 4x6 Thermal or A4', text: 'Choose 4x6 thermal roll or A4 Smart fit / 4-up, batch-sort by SKU or courier, and click Download PDF or print directly.' },
    ],
    body: stats + steps('How to crop Flipkart shipping labels in 3 easy steps', [
      ['Download from Flipkart Seller Hub', 'In Flipkart Seller Hub or Shopsy, download your shipping label PDF from <b>Orders &rarr; Dispatch After Packing</b>. Each page contains a shipping label and a tax invoice.'],
      ['Drop it in Flipkart Label Crop', 'Smart Detect automatically separates the shipping label from the tax invoice, crops borders tight, and extracts SKU, Ekart courier, order ID and payment mode.'],
      ['Print on 4x6 thermal or A4', 'Choose 4&times;6 thermal roll or A4 Smart fit / 4-up, batch-sort by SKU or courier, and click <b>Download PDF</b> or print directly.'],
    ], 'Flipkart guide') + `
<section class="section section-alt" id="cutter">
  <div class="container split">
    <div>
      <p class="kicker">Flipkart label cutter</p>
      <h2 class="section-title">Automatic tax invoice &amp; shipping label cutter</h2>
      <p class="section-lede">Flipkart label PDFs put a small 4&times;6 shipping label on top of a full A4 tax invoice. Printing the raw A4 PDF on thermal printers squeezes both into an unreadable sticker. Our Flipkart label cutter cleanly separates them in 1 click.</p>
    </div>
    <ul class="checklist">
      <li>${icon('check', 'i i-sm')} Instant tax invoice cutter &mdash; keep labels only, or save invoices to a separate A4 PDF</li>
      <li>${icon('check', 'i i-sm')} Precision border crop &mdash; removes white margins while preserving every millimeter of address</li>
      <li>${icon('check', 'i i-sm')} Ekart &amp; courier sorting &mdash; group Ekart, Delhivery, Shadowfax &amp; Xpressbees orders</li>
      <li>${icon('check', 'i i-sm')} SKU picklist PDF &amp; order CSV &mdash; speed up warehouse picking and order packing</li>
      <li>${icon('check', 'i i-sm')} Shopsy label crop support &mdash; fully compatible with Shopsy marketplace PDFs</li>
      <li>${icon('check', 'i i-sm')} Smart fit &amp; A4 multi-up &mdash; print 4 or 6 labels per A4 sheet with cut guides</li>
    </ul>
  </div>
</section>` + features('Why Flipkart sellers choose our quick label crop tool', 'Built specifically for high-volume Flipkart and Shopsy sellers who ship dozens or hundreds of orders every day.', [
      ['spark', 'Smart Flipkart detection', 'Detects Flipkart Seller Hub &amp; Shopsy formats automatically. Accurately finds the dividing line between the shipping label and the tax invoice.'],
      ['lock', '100% private &amp; on-device', 'Your customer addresses, phone numbers and order details never leave your computer or phone. Zero server uploads.'],
      ['barcode', 'Crisp 203 DPI barcodes', 'Vector-based cropping ensures barcodes and QR codes print razor-sharp on TVS, TSC, Zebra and Xprinter thermal printers.'],
      ['sort', 'Sort by SKU &amp; courier', 'Group labels by product SKU, single vs multi-item orders, or courier partner (Ekart, Delhivery, Shadowfax) for lightning packing.'],
      ['list', 'Warehouse picklist &amp; CSV', 'Generate a clean SKU summary picklist with quantities, handover sheets, or export all order details to an Excel-friendly CSV.'],
      ['printer', '4x6 thermal &amp; A4 smart fit', 'Sized for 100&times;150 mm (4&times;6 in) thermal rolls or A4 paper with 1, 2, 4, 6 (Smart fit) or 8 labels per page.'],
    ]) + paperTable(' For Flipkart labels, 4&times;6 thermal gives the standard 100&times;150 mm sticker size required by Ekart.') + platformCards('flipkart'),
    faqs: [
      { q: 'How does the Flipkart label crop tool work?', a: 'Download your shipping label PDF from Flipkart Seller Hub or Shopsy, then drop it into this tool. Smart Detect scans each page, cuts the shipping label from the tax invoice, trims all excess white space, and reformats the label into a print-ready 4x6 thermal PDF or A4 layout in under a second.' },
      { q: 'How do I crop Flipkart labels for a 4x6 thermal printer?', a: 'Drop your Flipkart PDF file, choose <b>Labels</b> and <b>4 &times; 6 in</b> paper size, and click <b>Download PDF</b>. The label is separated from the tax invoice and scaled to perfectly fill a 4x6 inch (100x150 mm) thermal roll sticker.' },
      { q: 'How do I remove or separate the tax invoice from Flipkart labels?', a: 'By default, selecting <b>Labels</b> removes the tax invoice completely so you only print sticky shipping labels. If you need invoices for accounting or parcel packaging, choose <b>Label + invoice</b> to print them together, or click <b>Invoices (A4)</b> to download all tax invoices in a separate A4 document.' },
      { q: 'Is this Flipkart label cutter completely free?', a: 'Yes! Flipkart Label Crop is 100% free with no sign-up, no watermark, no page limit, and no subscription. All PDF processing happens locally in your browser using JavaScript, meaning zero server costs for us and zero fees for you.' },
      { q: 'Does this quick label crop tool support Shopsy orders?', a: 'Yes. Both standard Flipkart Seller Hub labels and Shopsy marketplace shipping labels are fully recognized and cropped automatically.' },
      { q: 'Can I print multiple Flipkart labels on a single A4 page?', a: 'Yes! If you use a regular laser or inkjet printer, choose <b>A4 &middot; 4 up</b> (4 labels per page) or <b>A4 &middot; Smart fit</b> (6 labels per page with 2 rotated). Both layouts include dashed cut guides to save up to 75% paper.' },
      { q: 'Can I sort Flipkart orders by SKU or Ekart courier before printing?', a: 'Yes. In the settings panel, you can sort labels by SKU (to pack all identical items in batches) or by courier partner (Ekart Logistics, Delhivery, Shadowfax, Xpressbees). You can also download a SKU-wise picklist summary.' },
      { q: 'Is there an Android mobile app for Flipkart label crop?', a: 'Yes! You can download our official <a href="https://play.google.com/store/apps/details?id=ecom.label.crop.tool&hl=en" target="_blank" rel="noopener">Label Crop Tool for e-Commerce app on Google Play</a> to crop Flipkart labels on your Android phone and print directly to Bluetooth thermal printers.' },
      { q: 'Are my customer addresses and order details safe?', a: 'Absolutely. Your PDF files never leave your browser. All cropping and text parsing take place on your local device. No customer names, phone numbers, or addresses are ever uploaded to any server.' },
      ...commonFaqs,
    ],
    after: cta('Crop your Flipkart labels now'),
  },
  {
    path: '/meesho-label-crop', file: 'meesho-label-crop.html', platform: 'meesho', tool: true, nav: 'Meesho', crumb: 'Meesho label crop', priority: 0.9,
    appName: 'Meesho Label Crop – Label Crop AI',
    title: 'Meesho Label Crop & Meesho Crop PDF Tool | Label Crop AI',
    ogTitle: 'Meesho Crop PDF & Shipping Label Cutter – Label Crop AI',
    description: 'Meesho crop PDF & shipping label cutter. Crop Meesho labels for 4x6 thermal or A4 in 1 click, split tax invoices, sort by SKU and courier. Free & private.',
    h1: 'Meesho label crop, <span class="hl">done in one click</span>',
    lede: 'Drop the label PDF from your Meesho Supplier Panel. Smart Detect cuts each label right above the <em>Fold Here</em> line, separates the tax invoice below it and lays everything out for your thermal or A4 printer.',
    eyebrow: 'Meesho crop PDF &middot; Smart Detect &middot; 4&times;6 ready',
    body: stats + steps('How to crop Meesho labels', [
      ['Download from Meesho', 'In the Meesho Supplier Panel, open <b>Orders &rarr; Ready to Ship</b> and download the label PDF. Each A4 page holds one label and its tax invoice.'],
      ['Drop it here', 'Smart Detect finds the label above the Fold Here line on every page and reads the SKU, size, qty, colour, courier and COD / prepaid status.'],
      ['Print', 'Choose 4&times;6 thermal, 4&times;4 or A4 4-up, sort by SKU or courier, then download or print directly.'],
    ], 'Meesho guide') + `
<section class="section section-alt">
  <div class="container split">
    <div>
      <p class="kicker">What Smart Detect reads</p>
      <h2 class="section-title">Every Meesho label, understood</h2>
      <p class="section-lede">Meesho label heights change with the length of the customer address. Instead of a fixed crop box, Smart Detect measures each page, so long addresses are never cut off and short ones don't waste sticker space.</p>
    </div>
    <ul class="checklist">
      <li>${icon('check', 'i i-sm')} Label cropped tight, above the <em>Fold Here</em> line</li>
      <li>${icon('check', 'i i-sm')} Tax invoice separated &mdash; keep, drop or print it on A4</li>
      <li>${icon('check', 'i i-sm')} SKU, size, quantity, colour and order number from <em>Product Details</em></li>
      <li>${icon('check', 'i i-sm')} Courier: Valmo, Delhivery, Shadowfax, Xpress Bees, Ecom Express</li>
      <li>${icon('check', 'i i-sm')} COD vs prepaid, so you can batch cash orders together</li>
      <li>${icon('check', 'i i-sm')} Multi-quantity orders flagged with a black QTY tag</li>
    </ul>
  </div>
</section>` + paperTable(' For Meesho, 4&times;6 with auto-rotate prints the wide label at the largest size.') + platformCards('meesho'),
    faqs: [
      { q: 'How does the Meesho crop PDF tool work?', a: 'Simply drop your Meesho shipping label PDF. Smart Detect automatically cuts each page above the Fold Here line, trims side margins, isolates the shipping label, and generates a print-ready 4x6 thermal PDF.' },
      { q: 'How do I crop Meesho labels for a thermal printer?', a: 'Drop your Meesho label PDF above, choose <b>Labels</b> and <b>4 &times; 6 in</b>, keep <b>Auto-rotate</b> on and click <b>Download PDF</b>. Every label is cropped above the Fold Here line and scaled to fill a 4&times;6 sticker.' },
      { q: 'Can I keep the Meesho invoice?', a: 'Yes. Choose <b>Label + invoice</b> to print each invoice right after its label, or click <b>Invoices (A4)</b> to download all invoices as a separate A4 file.' },
      { q: 'Which Meesho couriers are supported for sorting?', a: 'Smart Detect recognizes all Meesho courier partners: Valmo, Delhivery, Shadowfax, Xpressbees, and Ecom Express. You can batch and sort orders by courier in one click before generating the picklist.' },
      { q: 'Why is the Meesho label rotated on 4&times;6?', a: 'Meesho labels are wider than they are tall. Rotating them 90&deg; lets the label fill a 4&times;6 sticker at a much larger size, which makes the barcode easier to scan. Turn off <b>Auto-rotate</b> if you prefer it upright.' },
      { q: 'Can I merge several Meesho label files?', a: 'Yes. Select or drop multiple PDFs at once &mdash; they are merged into a single, sorted print file.' },
      ...commonFaqs,
    ],
    after: cta('Crop today\'s Meesho labels now'),
  },
  {
    path: '/amazon-label-crop', file: 'amazon-label-crop.html', platform: 'amazon', tool: true, nav: 'Amazon', crumb: 'Amazon label crop', priority: 0.9,
    appName: 'Amazon Label Crop – Label Crop AI',
    title: 'Amazon Label Cropper – Free Crop Label Tool | Label Crop AI',
    ogTitle: 'Amazon Label Cropper & Easy Ship Label Tool – Label Crop AI',
    description: 'Free Amazon label cropper for Easy Ship & Self Ship. Crop label PDFs for 4x6 thermal printers, separate invoice pages, sort by SKU. Private & instant.',
    h1: 'Amazon label crop for <span class="hl">thermal printers</span>',
    lede: 'Amazon shipping label PDFs waste most of every A4 page. Drop yours and Smart Detect trims each label to its edge, matches invoices to labels by order ID and sizes everything for 4&times;6 or A4.',
    eyebrow: 'Amazon label cropper &middot; Easy Ship &amp; Self Ship',
    body: stats + steps('How to crop Amazon labels', [
      ['Download from Seller Central', 'From <b>Manage Orders</b>, print or download the shipping labels (and invoices) for your orders as a PDF.'],
      ['Drop it here', 'Smart Detect separates label pages from invoice pages, trims each label and reads the order ID and SKU.'],
      ['Print', 'Pick 4&times;6 thermal or A4 4-up, choose whether to include invoices, then download or print.'],
    ], 'Amazon guide') + `
<section class="section section-alt">
  <div class="container split">
    <div>
      <p class="kicker">Built for Amazon India sellers</p>
      <h2 class="section-title">Labels and invoices, finally in order</h2>
      <p class="section-lede">Smart Detect recognises invoice pages (Tax Invoice / Bill of Supply) and pairs each one with its label using the Amazon order ID, so sorted output never mixes up parcels.</p>
    </div>
    <ul class="checklist">
      <li>${icon('check', 'i i-sm')} Trims white space around every shipping label</li>
      <li>${icon('check', 'i i-sm')} Detects invoice pages and pairs them by order ID</li>
      <li>${icon('check', 'i i-sm')} Print labels only, labels + invoices, or invoices only</li>
      <li>${icon('check', 'i i-sm')} 4&times;6, 4&times;4, 3&times;5 thermal and A4 1/2/4-up</li>
      <li>${icon('check', 'i i-sm')} Orders CSV with order ID, SKU and page numbers</li>
      <li>${icon('check', 'i i-sm')} <em>Adjust crop</em> for custom or self-ship formats</li>
    </ul>
  </div>
</section>` + paperTable() + platformCards('amazon'),
    faqs: [
      { q: 'How does the Amazon label cropper separate labels and invoices?', a: 'Smart Detect recognizes label pages and invoice pages (Bill of Supply / Tax Invoice), trims each shipping label to 4x6, and pairs invoices with orders by matching the Amazon Order ID.' },
      { q: 'How do I crop Amazon shipping labels for a 4&times;6 printer?', a: 'Drop the Amazon label PDF, choose <b>Labels</b> and <b>4 &times; 6 in</b>, and click <b>Download PDF</b>. Each label is trimmed to its edge and scaled to fill the sticker.' },
      { q: 'Does it remove the Amazon invoice pages?', a: 'With <b>Labels</b> selected, invoice pages are left out. Choose <b>Label + invoice</b> to keep each invoice after its label, or <b>Invoices (A4)</b> to download them separately.' },
      { q: 'Does it work with Amazon Easy Ship and Self Ship labels?', a: 'Smart Detect works from what is printed on the page, so it handles the common Amazon India label layouts. If a format is unusual, use <b>Adjust crop</b> once and apply it to all pages.' },
      ...commonFaqs,
    ],
    after: cta('Crop your Amazon labels now'),
  },
  {
    path: '/snapdeal-label-crop', file: 'snapdeal-label-crop.html', platform: 'snapdeal', tool: true, nav: 'Snapdeal', crumb: 'Snapdeal label crop', priority: 0.9,
    appName: 'Snapdeal Label Crop – Label Crop AI',
    title: 'Snapdeal Label Crop & Cutter – 4x6 Thermal | Label Crop AI',
    ogTitle: 'Snapdeal Label Crop & Shipping Label Cutter – 4x6 Thermal',
    description: 'Snapdeal label crop tool. Split shipping labels & tax invoices side-by-side, crop for 4x6 thermal printers or A4 sheets. Free, fast & 100% on-device.',
    h1: 'Snapdeal label crop for <span class="hl">4&times;6 thermal &amp; A4</span>',
    lede: 'Snapdeal orders print the shipping label on the left and tax invoice on the right side of the same A4 page. Smart Detect cleanly slices them down the middle and lays them out for 4&times;6 thermal or A4.',
    eyebrow: 'Snapdeal shipping label cutter &middot; 4&times;6 thermal',
    body: stats + steps('How to crop Snapdeal labels', [
      ['Download from Snapdeal Seller Panel', 'In Snapdeal Seller Panel, download your manifest or shipping label PDF. Each A4 page contains a label on the left and tax invoice on the right.'],
      ['Drop it here', 'Smart Detect automatically splits the left-hand shipping label from the right-hand invoice and extracts the courier, SKU and order ID.'],
      ['Print', 'Choose 4&times;6 thermal rolls or A4 multi-up, batch-sort by courier or SKU, then download or print directly.'],
    ], 'Snapdeal guide') + `
<section class="section section-alt">
  <div class="container split">
    <div>
      <p class="kicker">Side-by-side split</p>
      <h2 class="section-title">Clean vertical split for Snapdeal A4 sheets</h2>
      <p class="section-lede">Snapdeal uses a side-by-side layout: shipping label on the left, tax invoice on the right. Smart Detect slices them down the middle so your thermal printer gets clean, full-size stickers.</p>
    </div>
    <ul class="checklist">
      <li>${icon('check', 'i i-sm')} Slices left shipping label and right tax invoice cleanly</li>
      <li>${icon('check', 'i i-sm')} Separate invoices to A4 or print consecutively after labels</li>
      <li>${icon('check', 'i i-sm')} Sort by SKU, courier or COD for rapid dispatching</li>
      <li>${icon('check', 'i i-sm')} SKU-wise picklist PDF and orders CSV export</li>
      <li>${icon('check', 'i i-sm')} Vector quality: barcodes and QR codes scan instantly</li>
      <li>${icon('check', 'i i-sm')} <em>Adjust crop</em> editor for non-standard manifest pages</li>
    </ul>
  </div>
</section>` + paperTable() + platformCards('snapdeal'),
    faqs: [
      { q: 'How does the Snapdeal label crop tool split the PDF?', a: 'Snapdeal puts the shipping label on the left half of the page and the tax invoice on the right half. Smart Detect splits each page vertically down the middle, crops away white margins, and sizes the label for 4x6 thermal printers or A4 sheets.' },
      { q: 'How do I crop Snapdeal labels for a 4&times;6 thermal printer?', a: 'Drop your Snapdeal label PDF, select <b>Labels</b> and <b>4 &times; 6 in</b>, then click <b>Download PDF</b>. Only the left shipping label is kept and scaled to fill a 4&times;6 inch sticker.' },
      { q: 'Can I keep the Snapdeal invoice?', a: 'Yes. Select <b>Label + invoice</b> to print each invoice right after its label, or click <b>Invoices (A4)</b> to download all tax invoices in a separate A4 document.' },
      { q: 'Can I print Snapdeal labels on normal A4 paper?', a: 'Yes. Choose <b>A4 &middot; 4 up</b> (4 labels per page) or <b>A4 &middot; Smart fit</b> (6 labels per page) with cut guides to save paper and toner.' },
      ...commonFaqs,
    ],
    after: cta('Crop your Snapdeal labels now'),
  },

  ...LANDING_PAGES,

  // ============================================================ ABOUT & LEGAL
  {
    path: '/about', file: 'about.html', crumb: 'About', priority: 0.4,
    title: 'About Flipkart Label Crop – Free Tool for Sellers',
    description: 'Flipkart Label Crop & Cutter was built to save Indian sellers time and paper at dispatch. 100% free, runs entirely in the browser with no file uploads.',
    h1: 'About Flipkart Label Crop',
    lede: 'A fast, private label crop tool built for Indian e-commerce sellers.',
    body: `
<h2>Why this tool exists</h2>
<p>Marketplace seller panels &mdash; Flipkart, Meesho, Amazon and Snapdeal &mdash; export shipping labels on standard A4 pages. Most of each page is empty white space or an invoice you may not want to print on an expensive sticker. Sending those A4 pages straight to a 4&times;6 thermal printer shrinks the label until the barcode is unreadable.</p>
<p>Flipkart Label Crop fixes that in one step: it finds the shipping label on every page, separates the tax invoice, crops away the margins and lays out clean, vector-sharp pages sized exactly for your printer.</p>
<h2>Private by design</h2>
<p>All of this happens in your browser using open-source PDF libraries (Mozilla pdf.js and pdf-lib). Your files are never uploaded, which keeps customer addresses safe and makes the tool fast even on slow connections.</p>
<h2>Independent tool</h2>
<p>Flipkart Label Crop is not affiliated with Flipkart, Meesho, Amazon or Snapdeal. Marketplace names are used only to describe which label formats the tool supports.</p>`,
  },
  {
    path: '/privacy', file: 'privacy.html', crumb: 'Privacy', priority: 0.3,
    title: 'Privacy Policy – Flipkart Label Crop',
    description: 'Flipkart Label Crop processes shipping label PDFs entirely in your browser. No files, addresses or order data are uploaded, stored or shared.',
    h1: 'Privacy policy',
    lede: 'Short version: your PDFs never leave your device.',
    body: `
<h2>Files you open</h2>
<p>PDF files you select or drop into Flipkart Label Crop are read and processed locally by JavaScript in your web browser. They are not uploaded to our servers or to any third party, and they are discarded when you close or reload the page.</p>
<h2>Zero server uploads</h2>
<p>Flipkart Label Crop processes everything locally on your device. We do not track, collect, or upload any file contents, order numbers, customer names, or usage counters.</p>

<h2>If you send a business enquiry</h2>
<p>When you use the <em>I want software for my business</em> form, your details are used only to respond to your specific enquiry. They are never published on the site, sold or shared with anyone else.</p>

<h2>Third-party services</h2>
<p>The open-source PDF libraries are delivered by the jsDelivr CDN. The CDN does not receive your PDF files.</p>
<h2>Cookies</h2>
<p>Flipkart Label Crop does not set advertising or tracking cookies.</p>
<h2>Changes</h2>
<p>If this policy changes, the updated version will be published on this page.</p>`,
  },
  {
    path: '/404', file: '404.html', crumb: 'Error 404', noindex: true,
    title: 'Page not found – Flipkart Label Crop',
    description: 'The page you were looking for does not exist.',
    h1: 'This page got cropped out',
    lede: 'The link may be broken or the page may have moved.',
    body: `<p><a class="btn btn-dark" href="${urlFor('/', SITE.basePath)}">Go to the Flipkart label crop tool</a></p>
<p>Or jump straight to the <a href="${urlFor('/meesho-label-crop', SITE.basePath)}">Meesho</a>, <a href="${urlFor('/amazon-label-crop', SITE.basePath)}">Amazon</a> or <a href="${urlFor('/snapdeal-label-crop', SITE.basePath)}">Snapdeal</a> label crop tool.</p>`,
  },
];
