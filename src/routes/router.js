// src/routes/router.js

import PagePresenter from '../presenters/page-presenter.js';

// Dapatkan elemen kontainer utama dari index.html
const appContentElement = document.getElementById('app-content');
if (!appContentElement) {
  console.error("Fatal Error: Elemen #app-content tidak ditemukan.");
  // ... (kode error handling Anda) ...
  throw new Error("Elemen #app-content tidak ditemukan.");
}

const pagePresenter = new PagePresenter(appContentElement);
let currentPageCleanup = null;

// Fungsi updateDOMAndPostRenderActions akan menjadi inti dari logika render
// yang dibungkus oleh View Transition
async function updateDOMAndPostRenderActions(routeHandlerFunction) {
  // 1. Jalankan cleanup dari halaman sebelumnya (jika ada)
  if (typeof currentPageCleanup === 'function') {
    currentPageCleanup();
    currentPageCleanup = null; // Reset setelah dijalankan
  }

  // 2. Jalankan handler rute untuk merender konten baru
  // Handler rute (misalnya routes['/']()) akan memanggil pagePresenter.showSomePage()
  // yang mana akan mengisi appContentElement.innerHTML dan mungkin melakukan setup internal (afterRender implisit)
  // Pastikan method presenter Anda (seperti showHomePage) adalah async jika ada operasi async di dalamnya sebelum render
  await routeHandlerFunction(); 

  // 3. Scroll ke atas halaman
  window.scrollTo({ top: 0, behavior: 'instant' });

  // 4. Setup/Update Navigasi (memanggil fungsi dari main.js)
  // Asumsikan updateNavigation ada di scope global atau diimpor jika main.js mengekspornya.
  // Untuk saat ini, kita panggil via window jika ada di main.js dan terekspos global.
  if (typeof window.updateNavigation === 'function') {
    window.updateNavigation();
  } else {
    console.warn('Fungsi window.updateNavigation tidak ditemukan. Navigasi mungkin tidak terupdate.');
  }
}

// Definisikan rute dan handler yang sesuai
const routes = {
  '/': async () => { // Jadikan async jika operasi di dalamnya (mis. presenter) adalah async
    if (!localStorage.getItem('userToken')) {
      window.location.hash = '#/login';
      return; // Hentikan eksekusi agar tidak menjalankan transisi untuk halaman ini
    }
    await pagePresenter.showHomePage(); // Ini bagian "page.render()" dan "page.afterRender()" implisit
    currentPageCleanup = null; // Tidak ada cleanup khusus untuk home page
  },
  '/add': async () => {
    if (!localStorage.getItem('userToken')) {
      window.location.hash = '#/login';
      return;
    }
    await pagePresenter.showAddStoryPage();
    currentPageCleanup = () => {
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
  // Handler 404 default, bisa dibuat eksplisit jika mau
  '/404': async () => { // Contoh jika Anda ingin rute 404 eksplisit
    await pagePresenter.showNotFoundPage();
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
async function navigate() {
  const path = window.location.hash.slice(1).toLowerCase() || '/';
  // Dapatkan handler rute. Jika tidak ada, gunakan handler untuk 404 (jika didefinisikan) atau default.
  const routeHandler = routes[path] || routes['/404'] || (async () => {
      console.warn(`Rute tidak ditemukan untuk path: ${path}. Menampilkan halaman 404 default.`);
      await pagePresenter.showNotFoundPage(); // Fallback jika routes['/404'] tidak ada
      currentPageCleanup = null;
  });

  try {
    if (document.startViewTransition) {
      document.startViewTransition(() => updateDOMAndPostRenderActions(routeHandler));
    } else {
      // Fallback jika View Transitions tidak didukung
      await updateDOMAndPostRenderActions(routeHandler);
    }
  } catch (error) {
    console.error(`Error saat navigasi ke path "${path}":`, error);
    if (appContentElement && (!error || !error.message || !error.message.startsWith('Unauthorized:'))) {
        // Hanya tampilkan error generik jika bukan error Unauthorized yang sudah redirect
        appContentElement.innerHTML = `
            <div class="page-header"><h1>Oops! Terjadi Kesalahan Navigasi</h1></div>
            <div class="error-message">
                <p>Terjadi masalah saat mencoba menampilkan halaman ini.</p>
                <p><small>Detail error: ${error.message || 'Error tidak diketahui'}</small></p>
            </div>
        `;
    }
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', () => {
  const currentPath = window.location.hash.slice(1).toLowerCase() || '/';
  const publicPaths = ['/login', '/register'];

  if (!localStorage.getItem('userToken') && !publicPaths.includes(`/${currentPath}`)) {
    window.location.hash = '#/login';
    // Event hashchange akan memicu navigate()
  } else if (localStorage.getItem('userToken') && publicPaths.includes(`/${currentPath}`)) {
    window.location.hash = '#/';
    // Event hashchange akan memicu navigate()
  } else {
    navigate(); // Panggil navigate untuk memuat halaman awal dengan benar
  }
});

// Tidak ada ekspor eksplisit yang dibutuhkan karena file ini mengatur dirinya sendiri
// saat diimpor di main.js