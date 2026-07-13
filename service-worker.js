/**
 * SIAP WANAMSKA - SERVICE WORKER (OFFLINE ENGINE)
 * Versi: 1.0.0
 */

const CACHE_NAME = 'wanamska-majesty-v1';
const assets = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Tahap Install: Mengambil file dan menyimpannya di HP
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('System Offline SIAP WANAMSKA Disiapkan...');
      return cache.addAll(assets);
    })
  );
});

// Tahap Activate: Menghapus cache lama jika Bapak update kode
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
      );
    })
  );
});

// Tahap Fetch: Jika offline, ambil file dari memori HP
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
