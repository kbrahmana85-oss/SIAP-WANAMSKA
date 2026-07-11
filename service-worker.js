/**
 * SIAP WANAMSKA - SERVICE WORKER (OFFLINE ENGINE)
 */

const CACHE_NAME = 'wanamska-v1';
const assets = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Tahap Install: Menyimpan file ke memori HP
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Majesty Engine: Menyiapkan Mode Offline...');
      return cache.addAll(assets);
    })
  );
});

// Tahap Aktif: Menghapus cache lama jika ada update
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    })
  );
});

// Tahap Fetch: Mengambil data dari cache jika offline
self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(rec => {
      return rec || fetch(evt.request);
    })
  );
});
