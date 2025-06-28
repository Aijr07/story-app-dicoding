// public/sw.js
// Ini adalah satu-satunya file sw.js yang perlu Anda edit.
// Versi ini adalah module mandiri yang tidak bergantung pada file lain dari `src`.

// --- SERVICE WORKER CONSTANTS ---
const CACHE_NAME = 'STORY-APP-SHELL-V13'; // Naikkan versi untuk memicu update
const IMAGE_CACHE_NAME = 'STORY-APP-IMAGES-V1';

// Daftar URL yang akan di-cache.
// Kita hanya perlu mendaftarkan file statis dari `public` dan root.
// Vite akan menangani caching file JS dan CSS dari `src` secara otomatis.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// --- SIKLUS HIDUP SERVICE WORKER ---

self.addEventListener('install', (event) => {
  console.log('SW: Menginstal...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('SW: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== IMAGE_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// --- PENANGANAN PERMINTAAN JARINGAN ---

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const apiUrl = 'https://story-api.dicoding.dev/v1/stories';

  // --- Tambahan ini di awal fetch handler (untuk mengabaikan skema non-HTTP) ---
  if (!request.url.startsWith('http') && !request.url.startsWith('https')) {
    return; // Abaikan permintaan yang bukan HTTP/HTTPS (misal: chrome-extension://, file://)
  }
  // --- Akhir penambahan ---

  // Strategi untuk API (Network First, fallback ke cache jika ada)
  if (request.url.startsWith(apiUrl)) {
    event.respondWith(
      fetch(request).catch(() => {
        // Jika network gagal, coba ambil dari Cache API (jika ada respons sebelumnya yang di-cache)
        return caches.match(request); // Ini harus mengembalikan Response atau undefined/Promise<undefined>
      })
    );
    return;
  }

  // Strategi untuk gambar (Cache First)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Ini bisa menjadi penyebab error jika mengembalikan sesuatu yang bukan Response
            console.warn('SW: Gagal mengambil gambar dari cache atau network:', request.url);
            // KEMBALIKAN RESPON 404 KOSONG, BUKAN STRING BIASA
            return new Response(null, { status: 404, statusText: 'Image Not Found' });
          });
        });
      })
    );
    return;
  }

  // Strategi untuk App Shell (Cache First, fallback ke Network)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).catch(() => {
        // Jika fetch app shell gagal dan tidak ada di cache, mungkin ada offline fallback page
        // Untuk saat ini, bisa mengembalikan Response kosong jika tidak ada fallback
        return new Response('Offline: App shell not cached and network failed.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// --- PUSH NOTIFICATION & NOTIFICATION CLICK ---
self.addEventListener('push', (event) => {
  console.log('SW: Push event diterima.');
  let title = 'Notifikasi Cerita Baru';
  let options = {
    body: 'Ada cerita baru yang ditambahkan!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/#/' }
  };

  if (event.data) {
    try {
      const dataJson = event.data.json();
      title = dataJson.title || title;
      options.body = dataJson.options.body || options.body;
      options.data = dataJson.options.data || options.data; // Pastikan data URL juga ditangani
    } catch (e) {
      options.body = event.data.text();
    }
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(clients.openWindow(urlToOpen));
});