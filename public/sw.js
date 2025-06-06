// sw.js

// Nama cache
const CACHE_NAME = 'STORY-APP'; // Naikkan versi cache jika Anda mengubah URLS_TO_CACHE
const API_CACHE_NAME = 'story-api-cache-v1';

// Daftar aset yang akan di-cache (App Shell)
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/src/style.css',
    '/src/main.js',
    '/src/routes/router.js',
    '/src/presenters/page-presenter.js',
    '/src/views/home-view.js',
    '/src/views/add-story-view.js',
    '/src/views/login-view.js',
    '/src/views/register-view.js',
    '/src/views/not-found-view.js',
    '/src/models/story-api-model.js',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    // Pastikan semua file JS dan CSS penting ada di sini
];

// Event 'install': Cache App Shell
self.addEventListener('install', (event) => {
  console.log('Service Worker: Menginstal...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Membuka cache dan menambahkan App Shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        console.log('Service Worker: Semua aset App Shell berhasil di-cache.');
        return self.skipWaiting(); 
      })
      .catch(err => {
        console.error('Service Worker: Gagal caching App Shell saat instalasi', err);
      })
  );
});

// Event 'activate': Hapus cache lama
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Mengaktifkan...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => {
        console.log('Service Worker: Cache lama berhasil dibersihkan.');
        return self.clients.claim();
    })
  );
});

// Event 'fetch': Intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategi Network First untuk permintaan API
  if (url.origin === 'https://story-api.dicoding.dev') {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          // Selalu coba ambil dari jaringan terlebih dahulu
          const networkResponse = await fetch(request);
          // Jika berhasil, simpan salinannya di cache API dan kembalikan respons jaringan
          // Hanya cache permintaan GET yang berhasil (status 200)
          if (request.method === 'GET' && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Jika jaringan gagal (offline), coba ambil dari cache
          console.log(`Service Worker: Gagal mengambil dari jaringan untuk ${request.url}. Mencoba dari cache...`);
          const cachedResponse = await cache.match(request);
          if (cachedResponse) {
            console.log(`Service Worker: Berhasil menyajikan dari cache untuk ${request.url}`);
            return cachedResponse;
          }
          // Jika tidak ada di cache juga, kembalikan error (akan ditangani oleh aplikasi)
          console.warn(`Service Worker: Tidak ada cache yang tersedia untuk ${request.url}`);
          return Promise.reject(error);
        }
      })
    );
    return; // Hentikan eksekusi lebih lanjut untuk permintaan API
  }

  // Strategi Cache First untuk aset App Shell dan lainnya
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Jika ada di cache, langsung kembalikan dari cache
      if (cachedResponse) {
        // console.log(`Service Worker: Menyajikan dari cache: ${request.url}`);
        return cachedResponse;
      }
      
      // Jika tidak ada di cache, ambil dari jaringan
      // console.log(`Service Worker: Mengambil dari jaringan: ${request.url}`);
      return fetch(request);
    })
  );
});