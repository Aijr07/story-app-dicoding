// src/routes/router.js

import PagePresenter from '../presenters/page-presenter.js';

// Dapatkan elemen kontainer utama dari index.html
const appContentElement = document.getElementById('app-content');

// Pemeriksaan kritis: Pastikan elemen #app-content ada di HTML
if (!appContentElement) {
  console.error("Fatal Error: Elemen #app-content tidak ditemukan pada HTML.");
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif; color: #333;">
        <h1>Error Kritis Aplikasi</h1>
        <p>Struktur dasar aplikasi tidak dapat dimuat dengan benar.</p>
        <p>Elemen dengan ID 'app-content' tidak ditemukan dalam HTML.</p>
        <p>Mohon periksa file index.html Anda.</p>
    </div>
  `;
  throw new Error("Elemen krusial #app-content tidak ditemukan. Aplikasi tidak dapat dilanjutkan.");
}

// Inisialisasi PagePresenter dengan elemen kontainer
const pagePresenter = new PagePresenter(appContentElement);

// Variabel untuk menyimpan fungsi cleanup dari halaman/view saat ini
let currentPageCleanup = null;

// Definisikan rute dan handler yang sesuai
const routes = {
  '/': () => {
    if (!localStorage.getItem('userToken')) {
      window.location.hash = '#/login';
      return;
    }
    if (typeof currentPageCleanup === 'function') { /* ... */ }
    pagePresenter.showHomePage();
  },
  '/add': () => {
    if (!localStorage.getItem('userToken')) {
      window.location.hash = '#/login';
      return;
    }
    if (typeof currentPageCleanup === 'function') { /* ... */ }
    pagePresenter.showAddStoryPage();
    currentPageCleanup = () => { /* ... (cleanup kamera & peta) ... */ };
  },
  '/login': () => {
    if (localStorage.getItem('userToken')) { // Jika sudah login, redirect ke home
        window.location.hash = '#/';
        return;
    }
    if (typeof currentPageCleanup === 'function') { /* ... */ }
    pagePresenter.showLoginPage();
    currentPageCleanup = null;
  },
  '/register': () => { // RUTE BARU UNTUK REGISTER
    if (localStorage.getItem('userToken')) { // Jika sudah login, redirect ke home
        window.location.hash = '#/';
        return;
    }
    if (typeof currentPageCleanup === 'function') { /* ... */ }
    pagePresenter.showRegisterPage(); // Panggil method baru di presenter
    currentPageCleanup = null;
  }
};

// ... (fungsi navigate() tetap sama) ...

window.addEventListener('load', () => {
  const currentPath = window.location.hash.slice(1).toLowerCase() || '/';
  const publicPaths = ['/login', '/register']; // Path yang boleh diakses tanpa token

  if (!localStorage.getItem('userToken') && !publicPaths.includes(`/${currentPath}`)) {
    window.location.hash = '#/login';
  } else if (localStorage.getItem('userToken') && publicPaths.includes(`/${currentPath}`)) {
    // Jika sudah login dan mencoba akses login/register, redirect ke home
    window.location.hash = '#/';
  }
  else {
    navigate();
  }
});

/**
 * Fungsi navigate untuk menangani perubahan hash dan memuat konten yang sesuai.
 */
function navigate() {
  const path = window.location.hash.slice(1).toLowerCase() || '/';
  const handler = routes[path] || (() => {
    // Handler untuk halaman tidak ditemukan (404)
    if (typeof currentPageCleanup === 'function') {
      currentPageCleanup();
      currentPageCleanup = null;
    }
    pagePresenter.showNotFoundPage();
  });

  // Jalankan handler yang telah ditentukan (yang akan memanggil cleanup jika perlu)
  try {
    handler();
  } catch (error) {
    console.error(`Error saat menavigasi atau merender path "${path}":`, error);
    if (appContentElement) {
        appContentElement.innerHTML = `
            <div class="page-header"><h1>Oops! Terjadi Kesalahan</h1></div>
            <div class="error-message">
                <p>Terjadi masalah saat mencoba menampilkan halaman ini.</p>
                <p><small>Detail error: ${error.message}</small></p>
            </div>
        `;
    }
  }
}

// Tambahkan event listener untuk event 'hashchange' pada window.
window.addEventListener('hashchange', navigate);

// Tambahkan event listener untuk event 'load' pada window.
window.addEventListener('load', () => {
  if (!window.location.hash || window.location.hash === '#') {
    // Jika tidak ada hash atau hanya '#', arahkan ke beranda
    window.location.hash = '#/';
  } else {
    // Jika sudah ada hash yang valid, panggil navigate untuk memuat halaman yang benar
    // dan menjalankan logika cleanup/setup awal jika perlu
    navigate();
  }
});

// Tidak ada ekspor eksplisit yang dibutuhkan karena file ini mengatur dirinya sendiri
// saat diimpor di main.js