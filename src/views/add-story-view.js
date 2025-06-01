// src/views/add-story-view.js

let cameraStream = null; // Variabel untuk menyimpan stream kamera aktif
let capturedPhotoBlobForSubmit = null; // Variabel untuk menyimpan blob foto yang diambil dari kamera
let locationPickerMap = null; // Variabel untuk menyimpan instance peta Leaflet pemilih lokasi
let locationMarker = null;  // Variabel untuk menyimpan marker di peta pemilih lokasi

/**
 * Menghentikan stream kamera yang sedang aktif.
 */
const stopActiveCameraStream = () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    const videoElement = document.getElementById('camera-video');
    if (videoElement) {
      videoElement.srcObject = null;
    }
    console.log('View: Camera stream stopped.');
  }
};
// Ekpos ke global untuk bisa dipanggil dari router/presenter saat cleanup (bisa direfaktor)
window.stopActiveCameraStreamGlobal = stopActiveCameraStream;

/**
 * Menghancurkan/menghapus instance peta pemilih lokasi.
 */
const destroyLocationPickerMap = () => {
  if (locationPickerMap) {
    locationPickerMap.remove();
    locationPickerMap = null;
    locationMarker = null;
    console.log('View: Location picker map destroyed.');
  }
};
// Ekpos ke global untuk bisa dipanggil dari router/presenter saat cleanup (bisa direfaktor)
window.destroyActiveLocationPickerMapGlobal = destroyLocationPickerMap;

/**
 * Merender tampilan untuk halaman tambah cerita.
 * @param {HTMLElement} container - Elemen DOM tempat konten akan dirender.
 */
const renderAddStory = (container) => {
  // Pastikan stream kamera & peta pemilih lokasi dari render sebelumnya dihentikan/dihapus
  stopActiveCameraStream();
  destroyLocationPickerMap();
  capturedPhotoBlobForSubmit = null; // Reset blob setiap kali view dirender

  container.innerHTML = `
    <div class="page-header">
      <h1>Tambah Cerita Baru</h1>
      <p>Bagikan momen berharga Anda melalui cerita dan foto.</p>
    </div>
    <form id="add-story-form" class="add-story-form">
      <div class="form-group">
        <label for="story-description">Deskripsi Cerita:</label>
        <textarea id="story-description" name="description" rows="4" required></textarea>
      </div>

      <div class="form-group">
        <label>Foto Cerita:</label>
        <div id="camera-controls" style="margin-bottom: 10px;">
            <button type="button" id="use-camera-button" class="button button--secondary">Gunakan Kamera</button>
            <span style="margin: 0 10px;">atau</span>
            <label for="story-photo" class="button button--secondary" style="cursor:pointer; display:inline-block;">Pilih File</label>
            <input type="file" id="story-photo" name="photo" accept="image/*" style="display:none;">
        </div>

        <div id="camera-area" style="margin-bottom: 10px; display:none;">
          <video id="camera-video" playsinline autoplay style="width: 100%; max-width: 400px; border: 1px solid #ccc; border-radius: 4px; background-color: #000;"></video>
          <canvas id="camera-canvas" style="display:none;"></canvas> <div style="margin-top:10px;">
              <button type="button" id="capture-photo-button" class="button button--primary">Ambil Foto</button>
              <button type="button" id="close-camera-button" class="button button--danger" style="margin-left:5px;">Tutup Kamera</button>
          </div>
        </div>
        
        <img id="image-preview" src="#" alt="Pratinjau gambar yang akan diunggah atau diambil" style="display: none; max-width: 100%; margin-top: 10px; max-height: 300px; border: 1px solid #ccc; border-radius: 4px;"/>
        <input type="hidden" id="photo-source" name="photoSource" value="file"> </div>

      <div class="form-group">
        <p><strong>Pengambilan Lokasi (Opsional):</strong></p>
        <button type="button" id="toggle-map-picker" class="button button--secondary">Ambil Lokasi dari Peta</button>
        <div id="map-picker-container" style="height: 350px; border: 1px solid var(--warna-border, #ccc); margin-top:10px; margin-bottom:10px; display:none; border-radius: 4px; position: relative; background-color: #e9e9e9;">
          </div>
        <label for="story-latitude" style="margin-top:5px; display:block;">Latitude:</label>
        <input type="text" id="story-latitude" name="latitude" placeholder="Contoh: -6.200000" readonly >
        <label for="story-longitude" style="margin-top:5px; display:block;">Longitude:</label>
        <input type="text" id="story-longitude" name="longitude" placeholder="Contoh: 106.816666" readonly >
      </div>
      
      <div class="form-actions">
        <button type="submit" id="submit-story-button" class="button button--primary">Publikasikan Cerita</button>
        <div id="loading-indicator-add" style="display: none; margin-right:10px; font-style:italic;">Mengirim cerita...</div>
        <div id="error-message-add" class="error-message-form" style="display: none;"></div>
      </div>
    </form>
  `;

  // Seleksi Elemen DOM setelah render
  const storyPhotoInput = container.querySelector('#story-photo');
  const imagePreview = container.querySelector('#image-preview');
  const photoSourceInput = container.querySelector('#photo-source');

  const cameraControls = container.querySelector('#camera-controls');
  const cameraArea = container.querySelector('#camera-area');
  const videoElement = container.querySelector('#camera-video');
  const canvasElement = container.querySelector('#camera-canvas');
  const useCameraButton = container.querySelector('#use-camera-button');
  const capturePhotoButton = container.querySelector('#capture-photo-button');
  const closeCameraButton = container.querySelector('#close-camera-button');

  const toggleMapButton = container.querySelector('#toggle-map-picker');
  const mapPickerContainer = container.querySelector('#map-picker-container');
  const latitudeInput = container.querySelector('#story-latitude');
  const longitudeInput = container.querySelector('#story-longitude');

  // Fungsi untuk menampilkan pratinjau gambar
  const showImagePreview = (src) => {
    if (imagePreview) {
      imagePreview.src = src;
      imagePreview.style.display = 'block';
    }
  };

  // --- Event Listener untuk Input Foto (File) ---
  if (storyPhotoInput) {
    storyPhotoInput.addEventListener('change', () => {
      console.log('View: File input changed.');
      stopActiveCameraStream();
      if (cameraArea) cameraArea.style.display = 'none';
      if (cameraControls) cameraControls.style.display = 'block';

      const file = storyPhotoInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => showImagePreview(e.target.result);
        reader.readAsDataURL(file);
        if (photoSourceInput) photoSourceInput.value = 'file';
        capturedPhotoBlobForSubmit = null;
      } else {
        if (imagePreview) {
            imagePreview.src = '#';
            imagePreview.style.display = 'none';
        }
      }
    });
  }

  // --- Event Listener untuk Fitur Kamera ---
  if (useCameraButton && cameraArea && videoElement && cameraControls && photoSourceInput) {
    useCameraButton.addEventListener('click', async () => {
      console.log('View: "Gunakan Kamera" button clicked.');
      stopActiveCameraStream(); // Hentikan stream lama jika ada
      if (storyPhotoInput) storyPhotoInput.value = ''; // Kosongkan input file
      if (imagePreview) imagePreview.style.display = 'none';
      capturedPhotoBlobForSubmit = null;

      cameraArea.style.display = 'block';
      cameraControls.style.display = 'none';

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        videoElement.srcObject = cameraStream;
        photoSourceInput.value = 'camera';
        console.log('View: Camera stream started.');
      } catch (err) {
        console.error("View: Error mengakses kamera: ", err);
        alert("Tidak bisa mengakses kamera. Pastikan Anda memberikan izin dan kamera tersedia.\nError: " + err.message);
        cameraArea.style.display = 'none';
        cameraControls.style.display = 'block';
        photoSourceInput.value = 'file';
      }
    });
  }

  if (capturePhotoButton && videoElement && canvasElement && imagePreview && cameraControls && photoSourceInput) {
    capturePhotoButton.addEventListener('click', () => {
      console.log('View: "Ambil Foto" button clicked.');
      if (!cameraStream || !videoElement.srcObject) {
          alert('Kamera tidak aktif.');
          return;
      }
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const context = canvasElement.getContext('2d');
      context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      
      const dataUrl = canvasElement.toDataURL('image/jpeg', 0.9);
      showImagePreview(dataUrl);
      
      canvasElement.toBlob((blob) => {
        capturedPhotoBlobForSubmit = blob;
        console.log('View: Photo captured as blob.');
      }, 'image/jpeg', 0.9);

      stopActiveCameraStream();
      cameraArea.style.display = 'none';
      cameraControls.style.display = 'block';
    });
  }
  
  if (closeCameraButton && cameraArea && cameraControls && photoSourceInput && imagePreview) {
    closeCameraButton.addEventListener('click', () => {
        console.log('View: "Tutup Kamera" button clicked.');
        stopActiveCameraStream();
        cameraArea.style.display = 'none';
        cameraControls.style.display = 'block';
        if (photoSourceInput.value === 'camera' && !capturedPhotoBlobForSubmit) {
            photoSourceInput.value = 'file'; // Kembali ke mode file jika tidak ada foto diambil
            imagePreview.style.display = 'none';
        }
    });
  }
  
  // --- Logika untuk Peta Pemilih Lokasi ---
  const initLocationPickerMap = () => {
    if (locationPickerMap || !mapPickerContainer) return;
    console.log('View: Initializing location picker map.');

    const defaultLat = -6.2088; // Jakarta
    const defaultLng = 106.8456;
    const defaultZoom = 12;

    mapPickerContainer.innerHTML = ''; // Bersihkan kontainer
    try {
      locationPickerMap = L.map(mapPickerContainer).setView([defaultLat, defaultLng], defaultZoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(locationPickerMap);
      
      const infoDiv = L.DomUtil.create('div', 'map-info-overlay leaflet-control'); // Tambahkan kelas leaflet-control
      infoDiv.innerHTML = 'Klik pada peta untuk memilih lokasi.';
      infoDiv.style.cssText = 'background: white; padding: 6px 10px; margin:10px; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9em; box-shadow: 0 1px 5px rgba(0,0,0,0.4);';
      // Menambahkan overlay info ke kontrol peta agar posisinya benar
      const TopLeftControl = L.Control.extend({
          onAdd: function(map) { return infoDiv; },
          onRemove: function(map) { /* Nothing to do */ }
      });
      new TopLeftControl({ position: 'topleft' }).addTo(locationPickerMap);


      locationPickerMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        if (latitudeInput) latitudeInput.value = lat.toFixed(6);
        if (longitudeInput) longitudeInput.value = lng.toFixed(6);

        if (!locationMarker) {
          locationMarker = L.marker(e.latlng, { draggable: true }).addTo(locationPickerMap);
          locationMarker.on('dragend', (event) => {
            const markerLatLng = event.target.getLatLng();
            if (latitudeInput) latitudeInput.value = markerLatLng.lat.toFixed(6);
            if (longitudeInput) longitudeInput.value = markerLatLng.lng.toFixed(6);
          });
        } else {
          locationMarker.setLatLng(e.latlng);
        }
        locationPickerMap.panTo(e.latlng);
      });

      setTimeout(() => {
        if (locationPickerMap) locationPickerMap.invalidateSize();
      }, 100);
    } catch (e) {
        console.error("View: Error initializing Leaflet map:", e);
        mapPickerContainer.innerHTML = "<p style='text-align:center; padding-top:20px; color:red;'>Gagal memuat peta. Pastikan Leaflet termuat dengan benar.</p>";
    }
  };

  if (toggleMapButton && mapPickerContainer) {
    toggleMapButton.addEventListener('click', () => {
      console.log('View: "Toggle Map Picker" button clicked.');
      if (mapPickerContainer.style.display === 'none') {
        mapPickerContainer.style.display = 'block';
        toggleMapButton.textContent = 'Sembunyikan Peta Lokasi';
        initLocationPickerMap();
      } else {
        mapPickerContainer.style.display = 'none';
        toggleMapButton.textContent = 'Ambil Lokasi dari Peta';
        destroyLocationPickerMap();
        // Opsional: kosongkan input lat/lon saat peta disembunyikan
        // if (latitudeInput) latitudeInput.value = '';
        // if (longitudeInput) longitudeInput.value = '';
      }
    });
  }

  // Menyediakan metode untuk presenter mengambil data foto
  if(container) { // Pastikan container ada
    container.getCapturedPhotoBlob = () => capturedPhotoBlobForSubmit;
    container.getPhotoSource = () => photoSourceInput ? photoSourceInput.value : 'file';
  }
}; // Akhir dari renderAddStory


/**
 * Menampilkan atau menyembunyikan indikator loading untuk form tambah cerita.
 * @param {boolean} isLoading - True jika loading, false jika tidak.
 */
const showAddStoryLoading = (isLoading) => {
  const loadingIndicator = document.getElementById('loading-indicator-add');
  const submitButton = document.getElementById('submit-story-button');
  if (loadingIndicator && submitButton) {
    loadingIndicator.style.display = isLoading ? 'inline-block' : 'none';
    submitButton.disabled = isLoading;
  } else {
    // console.warn('View: Elemen loading atau submit button tidak ditemukan untuk add story.');
  }
};

/**
 * Menampilkan pesan error pada form tambah cerita.
 * @param {string} message - Pesan error yang akan ditampilkan. Kosongkan untuk menyembunyikan.
 */
const showAddStoryError = (message) => {
  const errorMessageElement = document.getElementById('error-message-add');
  if (errorMessageElement) {
    errorMessageElement.textContent = message;
    errorMessageElement.style.display = message ? 'block' : 'none';
  } else {
    // console.warn('View: Elemen error message tidak ditemukan untuk add story.');
  }
};

export { 
  renderAddStory, 
  showAddStoryLoading, 
  showAddStoryError, 
  stopActiveCameraStream, // Ekspor untuk dipanggil dari cleanup global
  destroyLocationPickerMap // Ekspor untuk dipanggil dari cleanup global
};