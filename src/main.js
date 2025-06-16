// src/main.js

// --- IMPORTS ---
import './routes/router.js';
import { requestPermissionAndSubscribe } from './utils/push-notification-helper.js';
// Mengimpor modul database kita
import StoryAppDB from './js/db.js';

// --- CONSTANTS ---
const AUTH_TOKEN_KEY = 'userToken';
const USER_NAME_KEY = 'userName';

// --- FUNGSI UTAMA & INTERAKSI DATA ---

/**
 * Mengambil token autentikasi dari localStorage.
 * @returns {string|null} Token pengguna atau null jika tidak ada.
 */
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Mengambil cerita dari API (online) atau dari IndexedDB (offline).
 */
async function fetchAndDisplayStories() {
  const token = getAuthToken();
  if (!token) {
    console.log('Main.js: Pengguna belum login.');
    renderStories([]);
    return;
  }

  try {
    // --- MODE ONLINE: Ambil dari API ---
    const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.status === 401) {
      handleLogout(); // Token tidak valid, paksa logout
      return;
    }
    const data = await response.json();
    if (data.error) {
      throw new Error(data.message);
    }

    console.log('Main.js: Data berhasil diambil dari API.');
    // 1. MENYIMPAN DATA: Simpan setiap cerita ke IndexedDB
    data.listStory.forEach(story => {
      StoryAppDB.putStory(story);
    });

    // Tampilkan data yang baru diambil
    renderStories(data.listStory);
    
  } catch (error) {
    // --- MODE OFFLINE: Ambil dari IndexedDB ---
    console.error('Main.js: Gagal fetch dari API, mencoba mengambil dari IndexedDB.', error);
    // 2. MENAMPILKAN DATA (OFFLINE)
    const storiesFromDb = await StoryAppDB.getAllStories();
    console.log('Main.js: Data dari IndexedDB akan ditampilkan.');
    renderStories(storiesFromDb);
  }
}

/**
 * Merender daftar cerita ke DOM, lengkap dengan tombol Hapus.
 * @param {Array} stories - Array berisi objek cerita.
 */
function renderStories(stories = []) {
  const storyContainer = document.getElementById('story-list-container');
  if (!storyContainer) {
    // Ini normal jika pengguna tidak sedang di halaman utama.
    return;
  }

  storyContainer.innerHTML = ''; // Selalu kosongkan kontainer sebelum merender
  if (stories.length === 0) {
    storyContainer.innerHTML = '<p>Belum ada cerita untuk ditampilkan.</p>';
    return;
  }

  stories.forEach(story => {
    const storyElement = document.createElement('div');
    storyElement.classList.add('card');
    storyElement.innerHTML = `
      <h3>${story.name}</h3>
      <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}" style="width:100%;">
      <p>${story.description}</p>
      <button class="button-delete" data-id="${story.id}">Hapus</button>
    `;
    storyContainer.appendChild(storyElement);
  });
}

/**
 * Menangani logika penghapusan cerita dari IndexedDB.
 */
async function handleDeleteStory(storyId) {
    if (!storyId) return;

    const confirmation = window.confirm('Apakah Anda yakin ingin menghapus cerita ini?');
    if (!confirmation) return;
    
    // 3. MENGHAPUS DATA
    await StoryAppDB.deleteStory(storyId);
    console.log(`Main.js: Cerita ${storyId} dihapus dari IndexedDB.`);

    // Muat ulang daftar cerita dari DB untuk memperbarui tampilan
    const storiesFromDb = await StoryAppDB.getAllStories();
    renderStories(storiesFromDb);
}

// --- FUNGSI UTILITAS UI & NAVIGASI ---

/**
 * Memperbarui elemen navigasi dan info pengguna berdasarkan status login.
 */
function updateNavigation() {
  const userInfoElement = document.getElementById('user-info');
  const token = getAuthToken();
  const userName = localStorage.getItem(USER_NAME_KEY);

  if (!userInfoElement) {
    console.error('Main.js: Kritis! Elemen #user-info tidak ditemukan.');
    return;
  }

  userInfoElement.innerHTML = '';

  if (token && userName) {
    // --- Pengguna Sudah Login ---
    userInfoElement.innerHTML = `
      <p style="margin: 0 0 10px 0; font-weight: bold;">Halo, ${userName}!</p>
      <button id="subscribe-button" class="button button--primary" style="width:100%; margin-bottom:8px;">Aktifkan Notifikasi</button>
      <button id="logout-button" class="button button--secondary" style="width:100%;">Logout</button>
    `;

    document.getElementById('subscribe-button').addEventListener('click', requestPermissionAndSubscribe);
    document.getElementById('logout-button').addEventListener('click', handleLogout);

  } else {
    // --- Pengguna Belum Login ---
    userInfoElement.innerHTML = `
      <p style="margin:0;">
        <a href="#/login" class="auth-link">Login</a> atau <a href="#/register" class="auth-link">Register</a>
      </p>
    `;
  }
}

/**
 * Menangani proses logout pengguna.
 */
function handleLogout() {
  console.log('Main.js: Pengguna logout.');
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_NAME_KEY);
  updateNavigation();
  window.location.hash = '#/login';
}

/**
 * Menginisialisasi fungsionalitas untuk link "Skip to Content".
 */
function initializeSkipLink() {
  const skipLink = document.querySelector('.skip-to-content-link');
  const mainContent = document.getElementById('app-content');

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      mainContent.focus();
    });
  }
}

/**
 * Mendaftarkan Service Worker dengan path yang benar untuk Vite.
 */
function registerServiceWorker() {
  // Path ke sw.js, ditempatkan di folder 'public' agar konsisten
  const swUrl = `/sw.js`; 
  
  // Jika menggunakan base path di vite.config.js, gunakan cara dinamis:
  // const swUrl = `${import.meta.env.BASE_URL}sw.js`;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('Service Worker berhasil didaftarkan dengan scope:', registration.scope);
        })
        .catch(error => {
          console.error('Pendaftaran Service Worker gagal:', error);
        });
    });
  } else {
    console.log('Browser ini tidak mendukung Service Worker.');
  }
}

/**
 * Menyiapkan event listener untuk seluruh aplikasi, termasuk tombol hapus.
 */
function setupEventListeners() {
    // Gunakan event delegation pada body untuk menangani klik pada tombol hapus
    document.body.addEventListener('click', (event) => {
        if (event.target && event.target.classList.contains('button-delete')) {
            const storyId = event.target.dataset.id;
            handleDeleteStory(storyId);
        }
    });
}

// --- INISIALISASI APLIKASI ---

/**
 * Fungsi utama yang berjalan saat aplikasi pertama kali dimuat.
 */
function initializeApp() {
  initializeSkipLink();
  updateNavigation();
  registerServiceWorker();
  fetchAndDisplayStories(); 
  setupEventListeners(); // Daftarkan event listener untuk tombol hapus
}

// Event listener utama aplikasi
window.addEventListener('DOMContentLoaded', initializeApp);

// Perbarui UI setiap kali URL hash berubah (navigasi SPA)
window.addEventListener('hashchange', () => {
  updateNavigation();
  // Muat cerita jika pengguna kembali ke halaman utama
  if (window.location.hash === '' || window.location.hash === '#/') {
    fetchAndDisplayStories();
  }
});
