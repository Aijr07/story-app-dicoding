// src/main.js

/**
 * File ini bertindak sebagai entry point dan controller utama untuk aplikasi.
 * Tugasnya mencakup inisialisasi, routing, pengambilan data,
 * rendering UI, dan menangani interaksi pengguna.
 */

// --- IMPORTS ---
import './routes/router.js';
import { requestPermissionAndSubscribe } from './utils/push-notification-helper.js';
import StoryAppDB from './js/db.js';
// Mengimpor fungsi view untuk memisahkan logika dan tampilan
import { renderHome, showError, showLoading } from './views/home-view.js';

// --- CONSTANTS ---
const AUTH_TOKEN_KEY = 'userToken';
const USER_NAME_KEY = 'userName';
const IMAGE_CACHE_NAME = 'story-images-cache-v1'; // Cache khusus untuk gambar
const mainContainer = document.querySelector('#app-content');

// --- FUNGSI UTILITAS & AUTENTIKASI ---

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function updateNavigation() {
  const userInfoElement = document.getElementById('user-info');
  if (!userInfoElement) return;

  const token = getAuthToken();
  const userName = localStorage.getItem(USER_NAME_KEY);
  userInfoElement.innerHTML = '';
  if (token && userName) {
    userInfoElement.innerHTML = `
      <p style="font-weight: bold;">Halo, ${userName}!</p>
      <button id="subscribe-button" class="button button--primary">Aktifkan Notifikasi</button>
      <button id="logout-button" class="button button--secondary">Logout</button>
    `;
    document.getElementById('subscribe-button')?.addEventListener('click', requestPermissionAndSubscribe);
    document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  } else {
    userInfoElement.innerHTML = `<p><a href="#/login" class="auth-link">Login</a> atau <a href="#/register" class="auth-link">Register</a></p>`;
  }
}

function handleLogout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  updateNavigation();
  window.location.hash = '#/login';
}

// --- LOGIKA UTAMA PENGAMBILAN & PENAMPILAN DATA ---

async function fetchAndDisplayStories() {
  if (!mainContainer) return;
  showLoading(mainContainer);

  const token = getAuthToken();
  if (!token) {
    renderHome(mainContainer, []);
    return;
  }

  const isOnline = navigator.onLine;

  if (isOnline) {
    console.log("Status: ONLINE. Mengambil semua cerita dari API...");
    try {
      const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.status === 401) return handleLogout();
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.message);
      renderHome(mainContainer, data.listStory);
    } catch (error) {
      console.error('Gagal fetch dari API meski online, fallback ke DB.', error);
      const storiesFromDb = await StoryAppDB.getAllStories();
      renderHome(mainContainer, storiesFromDb);
    }
  } else {
    console.log("Status: OFFLINE. Mengambil cerita yang tersimpan dari IndexedDB.");
    const storiesFromDb = await StoryAppDB.getAllStories();
    if (storiesFromDb && storiesFromDb.length > 0) {
      renderHome(mainContainer, storiesFromDb);
    } else {
      showError(mainContainer, 'Anda sedang offline dan belum ada cerita yang tersimpan.');
    }
  }
  updateAllButtonStates();
}

// --- LOGIKA MANAJEMEN OFFLINE (SIMPAN/HAPUS) ---

/**
 * Menyimpan data cerita ke IndexedDB DAN file gambarnya ke Cache API.
 * @param {string} storyId - ID dari cerita yang akan disimpan.
 */
async function handleSaveStory(storyId) {
  if (!storyId || !navigator.onLine) {
    alert('Anda harus online untuk dapat menyimpan cerita.');
    return;
  }
  const token = getAuthToken();
  if (!token) {
    alert('Anda harus login untuk menyimpan cerita.');
    return;
  }

  const button = document.querySelector(`.button-save-offline[data-id="${storyId}"]`);
  if (button) {
    button.textContent = 'Menyimpan...';
    button.disabled = true;
  }

  try {
    // 1. Ambil detail cerita dari API
    const response = await fetch(`https://story-api.dicoding.dev/v1/stories/${storyId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    const storyData = data.story;

    // 2. Simpan DATA TEKS ke IndexedDB
    await StoryAppDB.putStory(storyData);
    console.log(`Data cerita ${storyId} berhasil disimpan ke IndexedDB.`);

    // 3. Simpan FILE GAMBAR ke Cache API
    if (storyData.photoUrl) {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      await cache.add(storyData.photoUrl);
      console.log(`Gambar untuk cerita ${storyId} berhasil disimpan ke cache.`);
    }
  } catch (error) {
    console.error(`Gagal menyimpan cerita ${storyId}:`, error);
    alert('Gagal menyimpan cerita. Proses dibatalkan.');
  } finally {
    updateAllButtonStates();
  }
}

/**
 * Menghapus cerita dari IndexedDB dan gambarnya dari Cache API.
 * @param {string} storyId - ID dari cerita yang akan dihapus.
 */
async function handleDeleteStoryFromOffline(storyId) {
  if (!storyId) return;
  if (confirm('Hapus cerita ini dari daftar offline?')) {
    try {
      // Ambil data cerita dulu untuk mendapatkan URL gambarnya
      const story = await StoryAppDB.getStory(storyId);

      // Hapus data dari IndexedDB
      await StoryAppDB.deleteStory(storyId);
      console.log(`Cerita ${storyId} dihapus dari IndexedDB.`);

      // Hapus gambar dari Cache API jika ada
      if (story && story.photoUrl) {
        const cache = await caches.open(IMAGE_CACHE_NAME);
        await cache.delete(story.photoUrl);
        console.log(`Gambar untuk cerita ${storyId} berhasil dihapus dari cache.`);
      }
    } catch (error) {
      console.error(`Gagal menghapus cerita ${storyId}:`, error);
      alert('Gagal menghapus cerita.');
    } finally {
      updateAllButtonStates();
    }
  }
}

/**
 * Memperbarui UI semua tombol (Simpan/Hapus) berdasarkan status di IndexedDB.
 */
async function updateAllButtonStates() {
  const allStoryItems = document.querySelectorAll('.story-item');
  for (const item of allStoryItems) {
    const saveButton = item.querySelector('.button-save-offline');
    const deleteButton = item.querySelector('.button-delete-offline');
    if (!saveButton || !deleteButton) continue;

    const storyId = saveButton.dataset.id;
    const story = await StoryAppDB.getStory(storyId);
    
    if (story) { // Jika cerita TERSIMPAN
      saveButton.style.display = 'none';
      deleteButton.style.display = 'inline-block';
    } else { // Jika cerita TIDAK tersimpan
      saveButton.style.display = 'inline-block';
      saveButton.textContent = 'Simpan Offline';
      saveButton.disabled = false;
      deleteButton.style.display = 'none';
    }
  }
}

// --- INISIALISASI DAN EVENT LISTENERS ---

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { type: 'module' }).then(
      (registration) => console.log('SW terdaftar:', registration.scope),
      (error) => console.error('Pendaftaran SW gagal:', error),
    );
  }
}

function setupEventListeners() {
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('.button-save-offline')) {
            handleSaveStory(target.dataset.id);
        } else if (target.matches('.button-delete-offline')) {
            handleDeleteStoryFromOffline(target.dataset.id);
        }
    });
}

function initializeApp() {
  updateNavigation();
  registerServiceWorker();
  fetchAndDisplayStories();
  setupEventListeners();
}

window.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('hashchange', () => {
  updateNavigation();
  if (window.location.hash === '' || window.location.hash === '#/') {
    fetchAndDisplayStories();
  }
});
