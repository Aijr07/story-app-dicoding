// src/views/home-view.js

/**
 * File ini bertanggung jawab HANYA untuk tampilan (View).
 * Ia menerima data dan mengubahnya menjadi HTML, tanpa tahu dari mana data berasal.
 */

// Objek untuk melacak peta Leaflet yang aktif agar tidak ada duplikasi
const activeMaps = {};

/**
 * Menampilkan peta Leaflet pada kontainer yang ditentukan.
 * @param {string} containerId - ID elemen kontainer peta.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @param {string} storyName - Nama cerita untuk popup.
 */
function displayMap(containerId, lat, lon, storyName) {
  if (activeMaps[containerId]) {
    activeMaps[containerId].remove();
    delete activeMaps[containerId];
  }

  const mapContainer = document.getElementById(containerId);
  if (!mapContainer) return;

  mapContainer.style.display = 'block';
  mapContainer.style.height = '300px';

  const map = L.map(containerId).setView([lat, lon], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(`<b>${storyName}</b>`).openPopup();
  activeMaps[containerId] = map;

  setTimeout(() => {
    if (activeMaps[containerId]) {
      activeMaps[containerId].invalidateSize();
    }
  }, 100);
}

/**
 * Membuat template HTML untuk SATU kartu cerita.
 * @param {object} story - Objek cerita.
 * @returns {string} String HTML untuk kartu cerita.
 */
const createStoryItemTemplate = (story) => {
  const storyId = story.id;
  const storyName = story.name || 'Judul Tidak Tersedia';
  const storyDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Bagian untuk menampilkan peta (jika ada lat/lon)
  let locationSection = '';
  if (story.lat && story.lon) {
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
        <div id="${mapContainerId}" class="story-item__map-container" style="display: none;"></div>
      </div>
    `;
  }

  return `
    <article class="story-item" id="story-${storyId}">
      <img src="${story.photoUrl}" alt="Gambar dari ${storyName}" class="story-item__image" loading="lazy">
      <div class="story-item__content">
        <h3 class="story-item__title">${storyName}</h3>
        <p class="story-item__description">${story.description}</p>
        <p class="story-item__date">Dibuat pada: ${storyDate}</p>
        ${locationSection}
        <div class="story-item__actions">
          <button class="button button-save-offline" data-id="${storyId}">Simpan Offline</button>
          <button class="button button-delete-offline" data-id="${storyId}" style="display: none;">Hapus dari Offline</button>
        </div>
      </div>
    </article>
  `;
};

/**
 * Memasang event listener ke semua tombol "Lihat Lokasi di Peta".
 * Fungsi ini harus dipanggil setelah HTML dirender.
 */
function attachMapButtonListeners() {
  document.querySelectorAll('.view-map-button').forEach(button => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget;
      // Sembunyikan semua peta lain terlebih dahulu
      document.querySelectorAll('.story-item__map-container').forEach(container => {
        if (container.id !== target.dataset.mapTarget) {
          container.style.display = 'none';
          if (activeMaps[container.id]) activeMaps[container.id].remove();
        }
      });
      // Toggle peta yang diklik
      displayMap(target.dataset.mapTarget, parseFloat(target.dataset.lat), parseFloat(target.dataset.lon), target.dataset.storyName);
    });
  });
}

// --- FUNGSI-FUNGSI YANG AKAN DI-EXPORT UNTUK DIGUNAKAN main.js ---

/**
 * Merender seluruh halaman beranda, termasuk daftar cerita.
 * @param {HTMLElement} container - Elemen DOM utama (misal, #app-content).
 * @param {Array<object>} stories - Array objek cerita.
 */
const renderHome = (container, stories) => {
  if (!container) return;
  container.innerHTML = `
    <div class="page-header">
      <h1>Daftar Cerita</h1>
      <p>Berikut adalah cerita-cerita yang telah dibagikan.</p>
    </div>
    <div id="story-list-container" class="story-list">
      ${stories && stories.length > 0
        ? stories.map(createStoryItemTemplate).join('')
        : '<p class="no-stories">Belum ada cerita untuk ditampilkan.</p>'
      }
    </div>
  `;
  // Pasang listener untuk peta setelah semua kartu cerita dibuat
  attachMapButtonListeners();
};

/**
 * Menampilkan indikator loading.
 */
const showLoading = (container) => {
  if (!container) return;
  container.innerHTML = `<div class="loading-indicator"><p>Memuat cerita...</p></div>`;
};

/**
 * Menampilkan pesan error.
 */
const showError = (container, message) => {
  if (!container) return;
  container.innerHTML = `
    <div class="error-message">
      <h2>Oops! Terjadi Kesalahan</h2>
      <p>${message || 'Gagal memuat data.'}</p>
    </div>
  `;
};

// Ekspor hanya fungsi-fungsi yang perlu dipanggil oleh controller (main.js)
export { renderHome, showLoading, showError };
