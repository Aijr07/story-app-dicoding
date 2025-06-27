// --- KONSTANTA ---

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
        console.log('SW: Precaching App Shell.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        // Hapus semua cache LAMA, KECUALI cache gambar yang aktif
        cacheNames.filter(name => (name !== CACHE_NAME && name !== IMAGE_CACHE_NAME))
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// --- PENANGANAN PERMINTAAN JARINGAN (FETCH) ---

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // --- STRATEGI #1: PRIORITAS TERTINGGI UNTUK GAMBAR (Cache First) ---
  // Jika permintaan adalah untuk sebuah gambar, gunakan strategi ini.
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // Jika gambar ada di cache, langsung sajikan.
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika tidak ada, coba ambil dari jaringan.
          return fetch(request);
        })
    );
    return; // Hentikan eksekusi agar tidak lanjut ke strategi lain.
  }

  // --- STRATEGI #2: UNTUK PERMINTAAN API (Network First, fallback ke Cache) ---
  if (request.url.startsWith(API_BASE_URL)) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Jika online, selalu simpan respons terbaru ke cache utama.
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, networkResponse.clone()));
          return networkResponse;
        })
        .catch(() => {
          // Jika fetch gagal (offline), cari di cache utama.
          console.log(`SW: API offline, mencari ${request.url} di cache.`);
          return caches.match(request);
        })
    );
    return; // Hentikan eksekusi.
  }

  // --- STRATEGI #3: UNTUK ASET LAIN / APP SHELL (Cache First) ---
  // Ini adalah fallback untuk semua permintaan lain (CSS, JS, Font, dll).
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
  );
});
