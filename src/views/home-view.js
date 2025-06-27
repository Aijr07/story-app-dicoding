// src/views/home-view.js

const activeMaps = {}; // Objek untuk melacak instance peta Leaflet yang aktif

/**
 * Menampilkan peta Leaflet di kontainer yang ditentukan.
 * @param {string} containerId - ID elemen kontainer tempat peta akan dirender.
 * @param {number} lat - Latitude untuk pusat peta.
 * @param {number} lon - Longitude untuk pusat peta.
 * @param {string} storyName - Nama cerita untuk ditampilkan di popup marker.
 */
function displayMap(containerId, lat, lon, storyName) {
  // Hapus peta sebelumnya di kontainer yang sama jika ada untuk mencegah duplikasi
  if (activeMaps[containerId]) {
    activeMaps[containerId].remove();
    delete activeMaps[containerId];
  }

  const mapContainer = document.getElementById(containerId);
  if (!mapContainer) {
    console.error(`Elemen kontainer peta dengan ID ${containerId} tidak ditemukan.`);
    return;
  }

  // Pastikan kontainer terlihat dan memiliki tinggi sebelum inisialisasi peta
  mapContainer.style.display = 'block';
  mapContainer.style.height = '300px'; // Atur ketinggian spesifik untuk peta

  // Inisialisasi peta Leaflet
  const map = L.map(containerId).setView([lat, lon], 13); // Level zoom 13

  // Tambahkan tile layer dari OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Tambahkan marker di lokasi cerita
  const marker = L.marker([lat, lon]).addTo(map);

  // Tambahkan popup ke marker yang menampilkan nama cerita
  marker.bindPopup(`<b>${storyName}</b><br>Lokasi cerita ini.`).openPopup();

  activeMaps[containerId] = map; // Simpan referensi ke peta yang baru dibuat

  // Panggil invalidateSize setelah jeda singkat untuk memastikan peta dirender dengan benar,
  // terutama jika kontainer sebelumnya 'display: none' atau ukurannya berubah.
  setTimeout(() => {
    if (activeMaps[containerId]) { // Pastikan peta masih ada
        activeMaps[containerId].invalidateSize();
    }
  }, 100); // Penundaan 100ms
}

/**
 * Membuat template HTML untuk satu item cerita.
 * @param {object} story - Objek cerita dari API.
 * @returns {string} String HTML untuk satu item cerita.
 */
const createStoryItemTemplate = (story) => {
  const imageUrl = story.photoUrl || 'https://via.placeholder.com/300x200?text=No+Image';
  const storyName = story.name || 'Judul Tidak Tersedia';
  const storyDescription = story.description || 'Deskripsi tidak tersedia.';
  const storyDate = story.createdAt
    ? new Date(story.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'Tanggal tidak tersedia';
  const altText = `Gambar cerita dari ${storyName}`;

  // Asumsikan API memberikan 'id' yang unik untuk setiap cerita.
  // Jika tidak, Anda perlu strategi lain untuk ID unik (misalnya, menggunakan indeks).
  const storyId = story.id || `story-item-${Math.random().toString(36).substring(2, 9)}`;
  

  let locationSection = '';
  if (story.lat !== undefined && story.lon !== undefined && story.lat !== null && story.lon !== null) {
    const mapContainerId = `map-container-${storyId}`;
    locationSection = `
      <div class="story-item__location-controls">
        <button class="button button--secondary view-map-button" 
                data-lat="${story.lat}" 
                data-lon="${story.lon}" 
                data-story-name="${storyName}" 
                data-map-target="${mapContainerId}">
          Lihat Lokasi di Peta
        </button>
        <div id="${mapContainerId}" class="story-item__map-container" style="display: none; height: 0px; margin-top: 10px;">
          </div>
      </div>
    `;
  }

  return `
    <article class="story-item" id="story-${storyId}">
      <img src="${story.photoUrl}" alt="..." class="story-item__image">
      <div class="story-item__content">
        <h3 class="story-item__title">${story.name}</h3>
        <p class="story-item__description">${story.description}</p>
        <p class="story-item__date">...</p>
        ${locationSection}

        <div class="story-item__actions">
          <button class="button button-save-offline" data-id="${story.id}" data-status="unsaved">
            Simpan Offline
          </button>
          <button class="button button-delete-offline" data-id="${story.id}" style="display: none;">
            Hapus dari Offline
          </button>
        </div>

      </div>
    </article>
  `;
};

/**
 * Merender halaman beranda dengan daftar cerita.
 * @param {HTMLElement} container - Elemen DOM utama tempat konten akan dirender.
 * @param {Array<object>} stories - Array objek cerita.
 */
const renderHome = (container, stories = []) => {
  if (!container) {
    console.error('Elemen kontainer tidak disediakan untuk renderHome');
    return;
  }

  container.innerHTML = `
    <div class="page-header">
      <h1>Daftar Cerita</h1>  
      <p>Berikut adalah cerita-cerita yang telah dibagikan.</p>
    </div>
    <div id="story-list-container" class="story-list"> 
      ${stories.length > 0
        ? stories.map(createStoryItemTemplate).join('')
        : '<p class="no-stories">Belum ada cerita untuk ditampilkan...</p>'
      }
    </div>
  `;

  // Setelah konten dirender, pasang event listener ke tombol peta
  attachMapButtonListeners();
};

/**
 * Memasang event listener ke semua tombol "Lihat Lokasi di Peta".
 */
function attachMapButtonListeners() {
  const viewMapButtons = document.querySelectorAll('.view-map-button');
  viewMapButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const targetButton = event.currentTarget;
      const lat = parseFloat(targetButton.dataset.lat);
      const lon = parseFloat(targetButton.dataset.lon);
      const storyName = targetButton.dataset.storyName;
      const mapContainerId = targetButton.dataset.mapTarget;
      const mapContainerElement = document.getElementById(mapContainerId);

      if (mapContainerElement) {
        // Logika untuk toggle peta: tampilkan jika tersembunyi, sembunyikan jika tampil.
        // Juga, sembunyikan peta lain yang mungkin sedang terbuka.
        const isCurrentlyHidden = mapContainerElement.style.display === 'none' || mapContainerElement.style.height === '0px';

        // Sembunyikan semua kontainer peta lain terlebih dahulu
        document.querySelectorAll('.story-item__map-container').forEach(otherMapContainer => {
          if (otherMapContainer.id !== mapContainerId) {
            otherMapContainer.style.display = 'none';
            otherMapContainer.style.height = '0px';
            if (activeMaps[otherMapContainer.id]) {
              activeMaps[otherMapContainer.id].remove();
              delete activeMaps[otherMapContainer.id];
            }
            // Reset teks tombol lain jika ada
            const otherButton = document.querySelector(`.view-map-button[data-map-target="${otherMapContainer.id}"]`);
            if (otherButton) {
                otherButton.textContent = 'Lihat Lokasi di Peta';
            }
          }
        });

        if (isCurrentlyHidden) {
          displayMap(mapContainerId, lat, lon, storyName);
          targetButton.textContent = 'Sembunyikan Peta';
        } else {
          mapContainerElement.style.display = 'none';
          mapContainerElement.style.height = '0px';
          if (activeMaps[mapContainerId]) {
            activeMaps[mapContainerId].remove();
            delete activeMaps[mapContainerId];
          }
          targetButton.textContent = 'Lihat Lokasi di Peta';
        }
      }
    });
  });
}

/**
 * Menampilkan indikator loading di kontainer.
 * @param {HTMLElement} container - Elemen DOM tempat indikator loading akan ditampilkan.
 */
const showLoading = (container) => {
  if (!container) {
    console.error('Elemen kontainer tidak disediakan untuk showLoading');
    return;
  }
  container.innerHTML = `
    <div class="page-header">
      <h1>Daftar Cerita</h1>
    </div>
    <div class="loading-indicator">
      <p>Memuat cerita, mohon tunggu...</p>
      <div class="spinner" aria-hidden="true"></div>
    </div>
  `;
};

/**
 * Menampilkan pesan error di kontainer.
 * @param {HTMLElement} container - Elemen DOM tempat pesan error akan ditampilkan.
 * @param {string} message - Pesan error yang akan ditampilkan.
 */
const showError = (container, message) => {
  if (!container) {
    console.error('Elemen kontainer tidak disediakan untuk showError');
    return;
  }
  container.innerHTML = `
    <div class="page-header">
      <h1>Daftar Cerita</h1>
    </div>
    <div class="error-message">
      <h2>Oops! Terjadi Kesalahan</h2>
      <p>${message || 'Gagal memuat data. Periksa koneksi internet Anda atau coba lagi nanti.'}</p>
      <button id="retry-load-stories" class="button button--primary">Coba Lagi</button>
    </div>
  `;

  const retryButton = container.querySelector('#retry-load-stories');
  if (retryButton) {
    retryButton.addEventListener('click', (event) => {
      event.preventDefault(); // Mencegah perilaku default, misalnya jika di dalam form
      // Memicu navigasi ulang untuk memuat ulang data dengan mengirim event hashchange.
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }
};

export { renderHome, showLoading, showError, createStoryItemTemplate };