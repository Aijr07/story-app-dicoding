// src/main.js

/**
 * File ini bertindak sebagai entry point dan controller utama untuk aplikasi.
 * Tugasnya mencakup inisialisasi, routing, pengambilan data,
 * rendering UI, dan menangani interaksi pengguna.
 */

// --- IMPORTS ---
import './routes/router.js'; // Mengelola routing halaman
import { requestPermissionAndSubscribe } from './utils/push-notification-helper.js'; // Mengelola notifikasi
import StoryAppDB from './js/db.js'; // Mengelola database IndexedDB
// Mengimpor fungsi untuk merender bagian-bagian UI dari view
import { renderHome, showError, showLoading } from './views/home-view.js';

// --- CONSTANTS ---
const AUTH_TOKEN_KEY = 'userToken';
const USER_NAME_KEY = 'userName';
const mainContainer = document.querySelector('#app-content');

// --- FUNGSI UTILITAS & AUTENTIKASI ---

/**
 * Mengambil token autentikasi dari localStorage.
 * @returns {string|null} Token pengguna atau null.
 */
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Memperbarui tampilan navigasi dan sidebar berdasarkan status login.
 * Fungsi ini aman dijalankan online maupun offline karena membaca dari localStorage.
 */
function updateNavigation() {
  const userInfoElement = document.getElementById('user-info');
  if (!userInfoElement) {
    console.error("Elemen #user-info untuk sidebar tidak ditemukan. Pastikan ada di index.html");
    return;
  }

  const token = getAuthToken();
  const userName = localStorage.getItem(USER_NAME_KEY);

  userInfoElement.innerHTML = '';
  if (token && userName) {
    // Tampilan sidebar saat pengguna sudah login
    userInfoElement.innerHTML = `
      <p style="font-weight: bold;">Halo, ${userName}!</p>
      <button id="subscribe-button" class="button button--primary">Aktifkan Notifikasi</button>
      <button id="logout-button" class="button button--secondary">Logout</button>
    `;
    document.getElementById('subscribe-button')?.addEventListener('click', requestPermissionAndSubscribe);
    document.getElementById('logout-button')?.addEventListener('click', handleLogout);
  } else {
    // Tampilan sidebar saat pengguna belum login
    userInfoElement.innerHTML = `<p><a href="#/login" class="auth-link">Login</a> atau <a href="#/register" class="auth-link">Register</a></p>`;
  }
}

/**
 * Menangani proses logout.
 */
function handleLogout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  updateNavigation(); // Perbarui sidebar setelah logout
  window.location.hash = '#/login';
}

// --- LOGIKA UTAMA PENGAMBILAN & PENAMPILAN DATA ---

/**
 * Fungsi cerdas untuk mengambil dan menampilkan cerita.
 * Akan mengambil dari API jika online, dan dari IndexedDB jika offline.
 */
async function fetchAndDisplayStories() {
  if (!mainContainer) {
    console.error("Elemen #app-container utama tidak ditemukan.");
    return;
  }
  showLoading(mainContainer);

  const token = getAuthToken();
  if (!token) {
    renderHome(mainContainer, []); // Tampilkan halaman utama kosong jika tidak login
    return;
  }

  const isOnline = navigator.onLine;

  if (isOnline) {
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
    console.log("Status: OFFLINE. Mengambil data dari IndexedDB.");
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

async function handleSaveStory(storyId) {
  if (!storyId || !navigator.onLine) {
    alert('Anda harus online untuk dapat menyimpan cerita pertama kali.');
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
    const response = await fetch(`https://story-api.dicoding.dev/v1/stories/${storyId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    await StoryAppDB.putStory(data.story);
  } catch (error) {
    console.error(`Gagal menyimpan cerita ${storyId}:`, error);
    alert('Gagal menyimpan cerita.');
  } finally {
    updateAllButtonStates();
  }
}

async function handleDeleteStoryFromOffline(storyId) {
  if (!storyId) return;
  if (confirm('Hapus cerita ini dari daftar offline?')) {
    await StoryAppDB.deleteStory(storyId);
    updateAllButtonStates();
  }
}

async function updateAllButtonStates() {
  const allStoryItems = document.querySelectorAll('.story-item');
  for (const item of allStoryItems) {
    const saveButton = item.querySelector('.button-save-offline');
    const deleteButton = item.querySelector('.button-delete-offline');
    if (!saveButton || !deleteButton) continue;

    const storyId = saveButton.dataset.id;
    const story = await StoryAppDB.getStory(storyId);
    
    if (story) {
      saveButton.style.display = 'none';
      deleteButton.style.display = 'inline-block';
    } else {
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
  updateNavigation(); // Panggil pertama kali untuk memastikan sidebar langsung ter-render
  registerServiceWorker();
  fetchAndDisplayStories();
  setupEventListeners();
}

window.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('hashchange', () => {
  // PERBAIKAN: Panggil updateNavigation setiap kali hash berubah
  // untuk memastikan sidebar selalu up-to-date dengan halaman saat ini.
  updateNavigation();
  if (window.location.hash === '' || window.location.hash === '#/') {
    fetchAndDisplayStories();
  }
});
