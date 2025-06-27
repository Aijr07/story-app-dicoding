// --- KONSTANTA ---

// NAIKKAN VERSI INI SETIAP KALI ANDA MENGUBAH DAFTAR URLS_TO_CACHE
const CACHE_NAME = 'STORY-APP-V7';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1';

// PERHATIAN: Token statis hanya untuk development dan akan kedaluwarsa.
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWd6Q0M2RTI0d25KYzNxZFQiLCJpYXQiOjE3NTA4MjE0NjV9.KkYsmKPCUBTf1yeLCKV_8TJ3XoPLoG0Yrk20i7wK7p8';

// PERHATIAN: Pastikan setiap path di bawah ini sudah 100% benar
// sesuai dengan struktur folder proyek Anda.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/src/style.css',
  '/src/db.js',
  '/src/idb.js',
  '/src/models/story-api-model.js',
  '/src/presenters/page-presenter.js',
  '/src/routes/router.js',
  '/src/utils/push-notification-helper.js',
  '/src/views/add-story-view.js',
  '/src/views/home-view.js',
  '/src/views/login-view.js',
  '/src/views/not-found-view.js',
  '/src/views/register-view.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
];


// --- SIKLUS HIDUP SERVICE WORKER ---

self.addEventListener('install', (event) => {
  console.log('SW: Menginstal...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SW: Precaching App Shell dan aset penting.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('SW: Gagal caching App Shell:', err)) // Error #1 akan muncul di sini jika ada path yang salah
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});


// --- PENANGANAN PERMINTAAN JARINGAN (FETCH) ---

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  const { url, method } = request;
  if (request.mode === 'navigate' && request.method === 'GET' && request.headers.get('upgrade') === 'websocket') {
    // Biarkan browser menanganinya secara normal, jangan dicegat.
    return;
  }

  // Strategi untuk permintaan API
  if (url.startsWith(API_BASE_URL)) {
    // --- PERBAIKAN UNTUK ERROR #2 ---
    // Jangan cache permintaan selain GET (seperti POST untuk tambah cerita)
    if (method !== 'GET') {
      // Untuk POST, dll., langsung teruskan ke jaringan tanpa caching.
      return event.respondWith(
          fetch(request.clone(), { headers: { 'Authorization': `Bearer ${TOKEN}` } })
      );
    }
    
    // Untuk GET, gunakan strategi Stale-While-Revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request, { headers: { 'Authorization': `Bearer ${TOKEN}` } })
            .then((networkResponse) => {
              // Simpan respons baru ke cache untuk waktu berikutnya
              cache.put(request, networkResponse.clone());
              return networkResponse;
            });

          // Kembalikan data dari cache jika ada (agar cepat), jika tidak, tunggu data dari jaringan.
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Strategi untuk aset lain (Cache First)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        return cachedResponse || fetch(request);
      })
  );
});


// --- PUSH NOTIFICATION & NOTIFICATION CLICK ---
// (Tidak ada perubahan, kode Anda sudah bagus)

self.addEventListener('push', (event) => {
  // ... kode notifikasi Anda ...
});

self.addEventListener('notificationclick', (event) => {
  // ... kode klik notifikasi Anda ...
});
