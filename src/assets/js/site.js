import './enquiry.js';
// Content pages only need the service worker (instant repeat visits, offline support).
export function registerSW() {
  if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.protocol === 'https:') {
    const swUrl = new URL('../../../sw.js', import.meta.url).pathname;
    addEventListener('load', () => navigator.serviceWorker.register(swUrl).catch(() => {}));
  }
}
registerSW();
