// src/routes/router.js

import PagePresenter from '../presenters/page-presenter.js';

// Dapatkan elemen kontainer utama dari index.html
// Pastikan ID ini 'app-content' atau 'app-container' sesuai dengan yang ada di index.html Anda
const appContentElement = document.getElementById('app-content'); 
if (!appContentElement) {
  throw new Error("Fatal Error: Elemen #app-content tidak ditemukan.");
}

const pagePresenter = new PagePresenter(appContentElement);
let currentPageCleanup = null;

async function updateDOMAndPostRenderActions(routeHandlerFunction) {
  if (typeof currentPageCleanup === 'function') {
    currentPageCleanup();
    currentPageCleanup = null;
  }
  await routeHandlerFunction();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// Definisikan rute dan handler yang sesuai
const routes = {
  // --- PERBAIKAN UTAMA DI SINI ---
  // Handler untuk halaman utama sekarang dikosongkan.
  // Tugas untuk menampilkan daftar cerita SEPENUHNYA DITANGANI OLEH main.js
  // melalui event listener 'hashchange' dan 'DOMContentLoaded'.
  '/': () => {
    // Tidak melakukan apa-apa. Biarkan main.js yang bekerja.
    // Kita tetap perlu entry ini agar router tidak menampilkan halaman 404.
  },
  // Rute lain tetap menggunakan sistem Presenter seperti biasa
  '/add': async () => {
    if (!localStorage.getItem('userToken')) {
      window.location.hash = '#/login';
      return;
    }
    await pagePresenter.showAddStoryPage();
    currentPageCleanup = () => {
      // Fungsi cleanup Anda untuk halaman tambah cerita
      if (typeof window.stopActiveCameraStreamGlobal === 'function') window.stopActiveCameraStreamGlobal();
      if (typeof window.destroyActiveLocationPickerMapGlobal === 'function') window.destroyActiveLocationPickerMapGlobal();
    };
  },
  '/login': async () => {
    if (localStorage.getItem('userToken')) {
        window.location.hash = '#/';
        return;
    }
    await pagePresenter.showLoginPage();
    currentPageCleanup = null;
  },
  '/register': async () => {
    if (localStorage.getItem('userToken')) {
        window.location.hash = '#/';
        return;
    }
    await pagePresenter.showRegisterPage();
    currentPageCleanup = null;
  },
  '/404': async () => {
    await pagePresenter.showNotFoundPage();
    currentPageCleanup = null;
  }
};

/**
 * Fungsi navigate untuk menangani perubahan hash dan memuat konten yang sesuai.
 */
async function navigate() {
  // PERBAIKAN: Panggil updateNavigation dari main.js di sini agar sidebar selalu update
  if (typeof window.updateNavigation === 'function') {
    window.updateNavigation();
  }

  const path = window.location.hash.slice(1).toLowerCase() || '/';
  const routeHandler = routes[path] || routes['/404'];

  // Kita hanya menjalankan logika presenter untuk rute selain halaman utama
  if (path !== '/') {
    try {
      if (document.startViewTransition) {
        document.startViewTransition(() => updateDOMAndPostRenderActions(routeHandler));
      } else {
        await updateDOMAndPostRenderActions(routeHandler);
      }
    } catch (error) {
      console.error(`Error saat navigasi ke path "${path}":`, error);
      appContentElement.innerHTML = `<div class="error-message"><p>Gagal menampilkan halaman.</p></div>`;
    }
  }
}

// --- PERBAIKAN UTAMA: Sederhanakan Event Listeners ---

// Listener ini akan menangani navigasi untuk SEMUA halaman KECUALI halaman utama,
// yang mana logika tampilannya sudah dihandle oleh main.js
window.addEventListener('hashchange', navigate);

// Saat pertama kali load, jalankan navigate untuk setup halaman awal (misal, jika user langsung buka #/add)
window.addEventListener('load', navigate);
