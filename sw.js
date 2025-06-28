// public/sw.js
// Ini adalah satu-satunya file sw.js yang perlu Anda edit.
// Versi ini adalah module mandiri yang tidak bergantung pada file lain dari `src`.

// --- DATABASE LOGIC (sebelumnya ada di db.js) ---
// Kita mengimpor library 'idb' langsung di sini. Vite akan menanganinya saat build.
import { openDB } from 'idb';

const DB_NAME = 'story-app-database';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
    }
  },
});

const StoryAppDB = {
  async getAllStories() {
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },
  async putStory(story) {
    if (!story || !story.id) return;
    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },
  // Anda mungkin perlu menambahkan fungsi ini jika tombol Hapus di main.js membutuhkannya
  async getStory(id) {
    if (!id) return;
    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },
  async deleteStory(id) {
    if (!id) return;
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },
};
// --- AKHIR DARI DATABASE LOGIC ---


// --- SERVICE WORKER CONSTANTS ---
const CACHE_NAME = 'STORY-APP-SHELL-V13'; // Naikkan versi untuk memicu update
const IMAGE_CACHE_NAME = 'STORY-APP-IMAGES-V1';
// Ganti dengan token yang valid untuk pengujian
const TOKEN = 'PASTE_YOUR_VALID_TOKEN_HERE';

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

  // Strategi untuk API (Network First, fallback to DB)
  if (request.url.startsWith(apiUrl)) {
    event.respondWith(
      fetch(request, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }).then((networkResponse) => {
        const clonedResponse = networkResponse.clone();
        event.waitUntil(
          clonedResponse.json().then((data) => {
            if (data && data.listStory) {
              data.listStory.forEach(story => StoryAppDB.putStory(story));
            }
          })
        );
        return networkResponse;
      }).catch(async () => {
        console.log('SW: Fetch API gagal, mengambil dari IndexedDB.');
        const storiesFromDb = await StoryAppDB.getAllStories();
        return new Response(JSON.stringify({ listStory: storiesFromDb }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Strategi untuk gambar (Cache First)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          return cachedResponse || fetch(request).then((networkResponse) => {
            cache.put(request, networkResponse.clone());
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
