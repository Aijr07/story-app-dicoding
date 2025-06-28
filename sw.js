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

  // Service Worker TIDAK akan menyimpan data API ke IndexedDB lagi di sini.
  // Logika penyimpanan dan pengambilan dari IndexedDB akan dihandle di main.js.
  // Untuk API, kita akan menggunakan strategi Network First atau Cache First (jika sudah ada respons tersimpan).
  // Untuk kasus ini, karena main.js yang akan memutuskan antara online/offline,
  // SW cukup meneruskan permintaan API atau melayani dari cache jika memungkinkan.

  if (request.url.startsWith(apiUrl)) {
    // Strategi Network First untuk API
    event.respondWith(
      fetch(request).catch(() => {
        // Jika offline atau fetch gagal, kita tidak bisa langsung mengambil dari IndexedDB di SW
        // karena IndexedDB hanya diakses dari main thread.
        // Main thread akan menangani fallback ke IndexedDB-nya sendiri.
        // SW hanya akan gagal atau mencoba dari cache (jika ada respons sebelumnya yang di-cache).
        return caches.match(request); // Coba ambil dari cache jika gagal network
      })
    );
    return;
  }

  // Strategi untuk gambar (Cache First)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Jika ada di cache, langsung sajikan
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika tidak ada di cache, fetch dari network, lalu simpan ke cache dan sajikan
          return fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Jika network juga gagal, bisa return placeholder atau error response
            console.warn('SW: Gagal mengambil gambar dari cache atau network:', request.url);
            // Contoh: return new Response(null, { status: 404, statusText: 'Not Found' });
            return new Response('Image not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
          });
        });
      })
    );
    return;
  }

  // Strategi untuk App Shell (Cache First, fallback ke Network)
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request);
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