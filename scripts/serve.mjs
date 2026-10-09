// Tiny static server that mimics Firebase Hosting (cleanUrls, headers, 404.html)
// so the site can be tested locally without the emulator. Usage: node scripts/serve.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let config = { public: 'public', cleanUrls: true, trailingSlash: false, redirects: [], headers: [] };
try {
  const fbPath = path.join(root, 'firebase.json');
  if (fs.existsSync(fbPath)) config = { ...config, ...JSON.parse(fs.readFileSync(fbPath, 'utf8')).hosting };
} catch {}
const pub = path.join(root, config.public);
const port = Number(process.argv[2] || process.env.PORT || 5000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf',
};

// Firebase glob subset: **, *, @(a|b)
function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++; if (glob[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else if (c === '@' && glob[i + 1] === '(') { const end = glob.indexOf(')', i); re += '(' + glob.slice(i + 2, end).split('|').map(escape).join('|') + ')'; i = end; }
    else re += escape(c);
  }
  return new RegExp('^' + (glob.startsWith('/') || glob.startsWith('**') ? '' : '/') + re + '$');
  function escape(s) { return s.replace(/[.+^${}()|[\]\\?]/g, '\\$&'); }
}
const headerRules = (config.headers || []).map(r => ({ re: globToRegex(r.source), headers: r.headers }));

function resolveFile(urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const abs = path.join(pub, safe);
  if (!abs.startsWith(pub)) return null;
  const candidates = [abs, abs + '.html', path.join(abs, 'index.html')];
  return candidates.find(p => fs.existsSync(p) && fs.statSync(p).isFile()) || null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = url.pathname;
  if (config.cleanUrls && p.endsWith('.html')) {
    res.writeHead(301, { Location: p.replace(/(index)?\.html$/, '') || '/' }); return res.end();
  }
  if (config.trailingSlash === false && p.length > 1 && p.endsWith('/')) {
    res.writeHead(301, { Location: p.slice(0, -1) }); return res.end();
  }
  const redirect = (config.redirects || []).find(r => r.source === p);
  if (redirect) { res.writeHead(redirect.type || 301, { Location: redirect.destination }); return res.end(); }
  let file = resolveFile(p);
  let status = 200;
  if (!file) { file = path.join(pub, '404.html'); status = 404; }
  const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
  for (const rule of headerRules) if (rule.re.test(p)) for (const h of rule.headers) headers[h.key] = h.value;
  res.writeHead(status, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Label Crop AI running at http://localhost:${port}`));
