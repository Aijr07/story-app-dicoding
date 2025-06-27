// Nama cache untuk aset inti aplikasi (yang di-cache saat instalasi)
const PRECACHE = 'precache-v1';
// Nama cache untuk cerita yang disimpan pengguna
const DYNAMIC_CACHE = 'user-saved-stories-v1';

// Daftar aset inti yang di-cache saat instalasi
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js'
];

// Event 'install' untuk melakukan precaching aset inti
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
  );
});

// Event 'activate' untuk membersihkan cache lama
self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Event 'fetch' untuk menyajikan konten dari cache jika ada
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Jika request ada di cache, sajikan dari cache
      if (cachedResponse) {
        console.log('Menyajikan dari cache:', event.request.url);
        return cachedResponse;
      }
      
      // Jika tidak ada di cache, ambil dari jaringan
      console.log('Mengambil dari jaringan:', event.request.url);
      return fetch(event.request);
    })
  );
});