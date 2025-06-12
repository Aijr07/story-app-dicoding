// Impor router untuk mengaktifkan semua logika routing
import './routes/router.js';
// Impor fungsi untuk notifikasi
import { requestPermissionAndSubscribe } from './utils/push-notification-helper.js';

// --- CONSTANTS ---
// Mendefinisikan kunci localStorage sebagai konstanta untuk menghindari salah ketik
const AUTH_TOKEN_KEY = 'userToken';
const USER_NAME_KEY = 'userName';

// --- FUNGSI UTAMA ---

/**
 * Mengambil token autentikasi dari localStorage.
 * @returns {string|null} Token pengguna atau null jika tidak ada.
 */
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Mengambil semua cerita dari API menggunakan token yang tersimpan.
 * Jika berhasil, akan memanggil fungsi untuk merender cerita ke layar.
 */
async function fetchAndDisplayStories() {
  const token = getAuthToken();
  // Jika tidak ada token (pengguna belum login), kosongkan konten dan berhenti.
  if (!token) {
    console.log('Main.js: Pengguna belum login, tidak mengambil cerita.');
    renderStories([]); // Memastikan kontainer cerita kosong
    return;
  }

  try {
    const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      console.warn('Main.js: Token tidak valid atau kedaluwarsa. Logout paksa.');
      handleLogout(); // Paksa logout jika token tidak valid
      return;
    }

    const data = await response.json();

    if (data.error) {
      console.error('Main.js: Gagal mengambil cerita dari API:', data.message);
      return;
    }

    // Panggil fungsi untuk menampilkan cerita ke DOM
    renderStories(data.listStory);
    
  } catch (error) {
    console.error('Main.js: Terjadi kesalahan jaringan saat mengambil cerita:', error);
    // Di sini Anda bisa mencoba mengambil data dari IndexedDB sebagai fallback
    console.log('Main.js: Mencoba mengambil data dari IndexedDB...');
    // const storiesFromDb = await getAllData(); // Asumsi Anda punya fungsi ini dari db.js
    // renderStories(storiesFromDb);
  }
}

/**
 * Merender daftar cerita ke dalam kontainer di halaman.
 * @param {Array} stories - Array berisi objek cerita.
 */
function renderStories(stories = []) {
  // Pastikan ID ini ada di file HTML Anda, biasanya di dalam home-view.
  const storyContainer = document.getElementById('story-list-container'); 
  if (!storyContainer) {
    // Ini normal jika kita sedang tidak di halaman utama
    return;
  }

  storyContainer.innerHTML = ''; // Kosongkan kontainer

  if (stories.length === 0) {
    storyContainer.innerHTML = '<p>Belum ada cerita untuk ditampilkan atau Anda perlu login.</p>';
    return;
  }

  stories.forEach(story => {
    const storyElement = document.createElement('div');
    storyElement.classList.add('card'); // Asumsi Anda punya class .card di CSS
    storyElement.innerHTML = `
      <h3>${story.name}</h3>
      <img src="${story.photoUrl}" alt="Foto cerita dari ${story.name}" style="width:100%;">
      <p>${story.description}</p>
    `;
    storyContainer.appendChild(storyElement);
  });
}

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
  updateNavigation(); // Perbarui UI
  window.location.hash = '#/login'; // Arahkan ke halaman login
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
 * Mendaftarkan Service Worker.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('Service Worker berhasil didaftarkan dengan scope:', registration.scope))
        .catch(error => console.error('Pendaftaran Service Worker gagal:', error));
    });
  } else {
    console.log('Browser ini tidak mendukung Service Worker.');
  }
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
}

// Event listener utama aplikasi
window.addEventListener('DOMContentLoaded', initializeApp);

// Perbarui UI setiap kali URL hash berubah (navigasi SPA)
window.addEventListener('hashchange', () => {
  updateNavigation();
  // Karena router Anda memuat konten baru, kita perlu memanggil fetch lagi jika
  // pengguna navigasi ke halaman utama
  if(window.location.hash === '' || window.location.hash === '#/'){
    fetchAndDisplayStories();
  }
});