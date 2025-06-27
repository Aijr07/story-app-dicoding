// --- IMPORTS DAN KONSTANTA ---
import StoryAppDB from '/src/js/db.js';

const CACHE_NAME = 'STORY-APP-V2'; // Naikkan versi jika ada perubahan besar

// PERHATIAN: Service Worker tidak bisa mengakses localStorage.
// Untuk tujuan development, Anda HARUS menempelkan token yang valid di sini
// agar Service Worker bisa mengambil data API di latar belakang.
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLWd6Q0M2RTI0d25KYzNxZFQiLCJpYXQiOjE3NTA4MjE0NjV9.KkYsmKPCUBTf1yeLCKV_8TJ3XoPLoG0Yrk20i7wK7p8';

// Daftar file App Shell yang akan di-cache
const URLS_TO_CACHE = [
  // --- File Inti di Root ---
  '/',
  '/index.html',
  '/manifest.json',

  // --- File Utama di dalam src ---
  '/src/main.js',
  '/src/style.css',

  // --- Semua Modul JavaScript di dalam src ---
  '/src/js/db.js',
  '/src/js/idb.js', // Jika Anda menyimpannya secara lokal
  '/src/models/story-api-model.js',
  '/src/presenters/page-presenter.js',
  '/src/routes/router.js',
  '/src/utils/push-notification-helper.js',

  // --- Semua View/Halaman Anda ---
  '/src/views/home-view.js',
  '/src/views/login-view.js',
  '/src/views/register-view.js',
  '/src/views/add-story-view.js',
  '/src/views/not-found-view.js',

  // --- Aset Ikon (asumsi ada di folder public atau root) ---
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  
  // --- Library Eksternal (jika digunakan) ---
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
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
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// --- PENANGANAN PERMINTAAN JARINGAN ---

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const apiUrl = 'https://story-api.dicoding.dev/v1/stories';

  if (request.url.startsWith(apiUrl)) {
    event.respondWith(
      fetch(request, {
          headers: { 'Authorization': `Bearer ${TOKEN}` }
        })
        .then((networkResponse) => {
          const clonedResponse = networkResponse.clone();
          clonedResponse.json().then((data) => {
            if (data && data.listStory) {
              data.listStory.forEach(story => {
                // Sekarang kita bisa memanggil modul yang diimpor
                StoryAppDB.putStory(story);
              });
            }
          });
          return networkResponse;
        })
        // ... sisa logika fetch
    );
    return;
  }

  // Strategi untuk App Shell (Cache First)
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request);
      })
  );
});

// --- PUSH NOTIFICATION ---

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
