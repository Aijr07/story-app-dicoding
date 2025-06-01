// src/main.js

// Impor router agar semua logika routing dan inisialisasi halaman berjalan
import './routes/router.js';

/**
 * Menginisialisasi fungsionalitas untuk link "Skip to Content".
 * Link ini memungkinkan pengguna keyboard untuk melompat langsung ke konten utama.
 */
function initializeSkipLink() {
  const skipLink = document.querySelector('.skip-to-content-link');
  const mainContent = document.getElementById('app-content'); // Pastikan main content memiliki id="app-content" dan tabindex="-1"

  if (skipLink && mainContent) {
    console.log('Main.js: Initializing skip link.');
    skipLink.addEventListener('click', (event) => {
      event.preventDefault(); // Mencegah perubahan hash URL yang tidak diinginkan
      mainContent.focus();    // Pindahkan fokus ke elemen konten utama
      // Opsional: scroll ke atas konten jika perlu
      // mainContent.scrollTop = 0;
    });
  } else {
    if (!skipLink) console.warn('Main.js: Skip link element (.skip-to-content-link) not found.');
    if (!mainContent) console.warn('Main.js: Main content element (#app-content) not found for skip link.');
  }
}

/**
 * Memperbarui elemen navigasi dan info pengguna berdasarkan status login.
 * Menampilkan nama pengguna dan tombol Logout jika login, atau link Login/Register jika belum.
 */
function updateNavigation() {
  const mainNavContainer = document.getElementById('main-navigation'); // Kontainer untuk link navigasi utama
  const userInfoElement = document.getElementById('user-info');      // Kontainer untuk info user & tombol logout/link login
  const userToken = localStorage.getItem('userToken');
  const userName = localStorage.getItem('userName');

  // Debugging:
  // console.log('Main.js: updateNavigation called. Token:', userToken, 'User:', userName);
  // console.log('Main.js: mainNavContainer:', mainNavContainer);
  // console.log('Main.js: userInfoElement:', userInfoElement);


  if (!userInfoElement) {
    console.warn('Main.js: User info element (#user-info) not found. Navigation will not be updated dynamically.');
    return;
  }

  // Bersihkan konten user info sebelumnya
  userInfoElement.innerHTML = '';
  
  // Hapus link login/register lama dari navigasi utama jika ada (jika Anda pernah menambahkannya di sana)
  const existingAuthLinksInNav = mainNavContainer ? mainNavContainer.querySelectorAll('.auth-nav-link') : [];
  existingAuthLinksInNav.forEach(link => link.remove());


  if (userToken) {
    // --- Pengguna Sudah Login ---
    if (userName) {
      const welcomeMessage = document.createElement('p');
      welcomeMessage.textContent = `Halo, ${userName}!`;
      welcomeMessage.style.margin = '0 0 10px 0'; // Sedikit styling
      welcomeMessage.style.fontWeight = 'bold';
      userInfoElement.appendChild(welcomeMessage);
    }

    const logoutButton = document.createElement('button');
    logoutButton.id = 'logout-button';
    logoutButton.textContent = 'Logout';
    logoutButton.classList.add('button', 'button--secondary', 'button--small'); // Gunakan kelas button yang sudah ada
    logoutButton.style.width = '100%'; // Agar mengisi lebar sidebar
    logoutButton.addEventListener('click', () => {
      console.log('Main.js: Logout button clicked.');
      localStorage.removeItem('userToken');
      localStorage.removeItem('userName');
      // Panggil updateNavigation lagi untuk merefleksikan perubahan UI segera
      updateNavigation(); 
      // Arahkan ke halaman login (router akan menangani redirect jika mencoba akses halaman terproteksi)
      window.location.hash = '#/login'; 
    });
    userInfoElement.appendChild(logoutButton);

  } else {
    // --- Pengguna Belum Login ---
    const loginLink = document.createElement('a');
    loginLink.href = '#/login';
    loginLink.textContent = 'Login';
    loginLink.classList.add('auth-nav-link'); // Kelas untuk styling jika perlu
    loginLink.style.color = 'var(--warna-teks-terang, white)'; // Sesuaikan dengan warna teks sidebar Anda
    loginLink.style.textDecoration = 'underline';
    loginLink.style.marginRight = '10px';


    const registerLink = document.createElement('a');
    registerLink.href = '#/register';
    registerLink.textContent = 'Register';
    registerLink.classList.add('auth-nav-link');
    registerLink.style.color = 'var(--warna-teks-terang, white)';
    registerLink.style.textDecoration = 'underline';

    const authParagraph = document.createElement('p');
    authParagraph.appendChild(loginLink);
    authParagraph.appendChild(document.createTextNode(' atau '));
    authParagraph.appendChild(registerLink);
    authParagraph.style.margin = '0';
    
    userInfoElement.appendChild(authParagraph);
  }
}


// Panggil fungsi-fungsi inisialisasi saat DOM sudah siap
window.addEventListener('DOMContentLoaded', () => {
  console.log('Main.js: DOMContentLoaded event fired.');
  initializeSkipLink();
  updateNavigation(); // Panggil pertama kali untuk setup navigasi awal
});

// Panggil updateNavigation setiap kali hash URL berubah (navigasi SPA)
// untuk memastikan UI navigasi tetap sinkron dengan status login
window.addEventListener('hashchange', () => {
  console.log('Main.js: hashchange event fired. New hash:', window.location.hash);
  updateNavigation();
});

console.log('Aplikasi Cerita Dimulai! (main.js loaded)');