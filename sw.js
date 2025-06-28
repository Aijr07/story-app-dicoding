// --- KONSTANTA ---
import StoryAppDB from '/src/js/db.js';

// NAIKKAN VERSI INI SETIAP KALI ANDA MENGUBAH FILE INI
const CACHE_NAME = 'story-app-v9';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1';
const IMAGE_CACHE_NAME = 'story-images-cache-v1';

// Daftar file App Shell yang akan di-cache saat instalasi.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/src/style.css',
  '/src/db.js',
  '/src/idb.js',
  '/src/routes/router.js',
  '/src/views/home-view.js',
  // Pastikan semua file view dan utils lain yang penting ada di sini
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// --- FUNGSI HELPERS ---

/**
 * Fungsi untuk mengambil dari jaringan, dengan opsi untuk menyimpan ke cache.
 * @param {Request} request - Permintaan yang akan di-fetch.
 * @param {string} cacheName - Nama cache untuk menyimpan respons.
 * @returns {Promise<Response>}
 */
const fetchAndCache = (request, cacheName) => {
  return fetch(request).then((networkResponse) => {
    // Jika berhasil, simpan salinan respons ke cache yang ditentukan
    caches.open(cacheName).then((cache) => {
      cache.put(request, networkResponse.clone());
    });
    return networkResponse;
  });
};

// --- SIKLUS HIDUP SERVICE WORKER ---

self.addEventListener('install', (event) => {
  console.log('SW: Menginstal...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Menambahkan App Shell ke cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW: Gagal caching App Shell:', err))
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Hapus semua cache KECUALI yang sedang digunakan
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME && name !== IMAGE_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// --- PENANGANAN PERMINTAAN JARINGAN (FETCH) ---

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const apiUrl = 'https://story-api.dicoding.dev/v1/stories';

  // Strategi untuk permintaan API (Network First)
  if (request.url.startsWith(apiUrl)) {
    // ... (Logika fetch API Anda tetap sama)
    return;
  }

  // ==> STRATEGI BARU UNTUK GAMBAR (Cache First) <==
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Jika gambar ada di cache, langsung kembalikan
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika tidak, ambil dari jaringan
          return fetch(request).then((networkResponse) => {
            // Simpan salinan gambar ke cache untuk penggunaan di masa depan
            cache.put(request, networkResponse.clone());
            // Kembalikan gambar asli ke halaman
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // Strategi untuk App Shell (Cache First)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
    })
  );
});
