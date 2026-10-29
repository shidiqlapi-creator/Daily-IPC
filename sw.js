// Service Worker IPC QA. Naikkan VERSION setiap kali file aplikasi diperbarui.
const VERSION = 'ipc-qa-v1';
const SHELL = ['./', './manifest.json', './icon-192.png', './icon-512.png'];
const CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !CDN.includes(url.hostname)) return; // Firestore, Auth, Analytics: langsung ke jaringan
  const store = res => { if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return res; };
  if (req.mode === 'navigate' || (same && url.pathname.endsWith('.html'))) {
    // Halaman: jaringan dulu, cadangan dari cache saat offline
    e.respondWith(fetch(req).then(store).catch(() => caches.match(req).then(r => r || caches.match('./'))));
  } else {
    // Aset: cache dulu, perbarui di latar belakang
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(store).catch(() => hit);
      return hit || net;
    }));
  }
});
