// src/main.js

// Impor router untuk mengaktifkan semua logika routing
import './routes/router.js';

// Impor fungsi untuk meminta izin dan subscribe push notification
import { requestPermissionAndSubscribe } from './utils/push-notification-helper.js';

/**
 * Menginisialisasi fungsionalitas untuk link "Skip to Content".
 * Link ini memungkinkan pengguna keyboard untuk melompat langsung ke konten utama.
 */
function initializeSkipLink() {
  const skipLink = document.querySelector('.skip-to-content-link');
  // Pastikan main content memiliki id="app-content" dan tabindex="-1" di index.html
  const mainContent = document.getElementById('app-content');

  if (skipLink && mainContent) {
    console.log('Main.js: Menginisialisasi skip link.');
    skipLink.addEventListener('click', (event) => {
      event.preventDefault(); // Mencegah perubahan hash URL
      mainContent.focus();    // Pindahkan fokus ke elemen konten utama
    });
  } else {
    if (!skipLink) console.warn('Main.js: Elemen .skip-to-content-link tidak ditemukan.');
    if (!mainContent) console.warn('Main.js: Elemen #app-content tidak ditemukan untuk skip link.');
  }
}

/**
 * Memperbarui elemen navigasi dan info pengguna berdasarkan status login.
 * Menampilkan nama pengguna, tombol Logout, dan tombol Subscribe jika login, 
 * atau link Login/Register jika belum.
 */
function updateNavigation() {
  const mainNavContainer = document.getElementById('main-navigation');
  const userInfoElement = document.getElementById('user-info');
  const userToken = localStorage.getItem('userToken');
  const userName = localStorage.getItem('userName');

  if (!userInfoElement) {
    console.warn('Main.js: Elemen #user-info tidak ditemukan. Navigasi dinamis tidak akan diperbarui.');
    return;
  }

  // Bersihkan konten user info sebelumnya
  userInfoElement.innerHTML = '';
  
  // Hapus link otentikasi lama dari navigasi utama (jika ada)
  if (mainNavContainer) {
      const existingAuthLinksInNav = mainNavContainer.querySelectorAll('.auth-nav-link');
      existingAuthLinksInNav.forEach(link => link.remove());
  }

  if (userToken) {
    // --- Pengguna Sudah Login ---
    if (userName) {
      const welcomeMessage = document.createElement('p');
      welcomeMessage.textContent = `Halo, ${userName}!`;
      welcomeMessage.style.margin = '0 0 10px 0';
      welcomeMessage.style.fontWeight = 'bold';
      userInfoElement.appendChild(welcomeMessage);
    }

    // Buat dan tambahkan tombol "Aktifkan Notifikasi"
    const subscribeButton = document.createElement('button');
    subscribeButton.id = 'subscribe-button';
    subscribeButton.textContent = 'Aktifkan Notifikasi';
    subscribeButton.classList.add('button', 'button--primary');
    subscribeButton.style.width = '100%';
    subscribeButton.style.marginBottom = '8px';
    subscribeButton.addEventListener('click', requestPermissionAndSubscribe);
    userInfoElement.appendChild(subscribeButton);

    // Buat dan tambahkan tombol Logout
    const logoutButton = document.createElement('button');
    logoutButton.id = 'logout-button';
    logoutButton.textContent = 'Logout';
    logoutButton.classList.add('button', 'button--secondary');
    logoutButton.style.width = '100%';
    logoutButton.addEventListener('click', () => {
      console.log('Main.js: Tombol Logout diklik.');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userName');
      updateNavigation(); // Perbarui UI navigasi segera
      window.location.hash = '#/login'; // Arahkan ke halaman login
    });
    userInfoElement.appendChild(logoutButton);

  } else {
    // --- Pengguna Belum Login ---
    const loginLink = document.createElement('a');
    loginLink.href = '#/login';
    loginLink.textContent = 'Login';
    loginLink.style.color = 'var(--warna-teks-terang, white)';
    loginLink.style.textDecoration = 'underline';
    loginLink.style.marginRight = '10px';
    loginLink.style.fontWeight = '500';

    const registerLink = document.createElement('a');
    registerLink.href = '#/register';
    registerLink.textContent = 'Register';
    registerLink.style.color = 'var(--warna-teks-terang, white)';
    registerLink.style.textDecoration = 'underline';
    registerLink.style.fontWeight = '500';

    const authParagraph = document.createElement('p');
    authParagraph.appendChild(loginLink);
    authParagraph.appendChild(document.createTextNode(' atau '));
    authParagraph.appendChild(registerLink);
    authParagraph.style.margin = '0';
    
    userInfoElement.appendChild(authParagraph);
  }
}

// --- PENDAFTARAN SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
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


// --- EVENT LISTENERS UTAMA APLIKASI ---

// Panggil fungsi-fungsi inisialisasi saat DOM sudah siap
window.addEventListener('DOMContentLoaded', () => {
  console.log('Main.js: DOMContentLoaded event fired.');
  initializeSkipLink();
  updateNavigation(); // Panggil pertama kali untuk setup navigasi awal
});

// Panggil updateNavigation setiap kali hash URL berubah (navigasi SPA)
window.addEventListener('hashchange', () => {
  console.log('Main.js: hashchange event fired. New hash:', window.location.hash);
  updateNavigation();
});

console.log('Aplikasi Cerita Dimulai! (main.js loaded)');