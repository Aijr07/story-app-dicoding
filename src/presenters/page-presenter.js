// src/presenters/page-presenter.js

// Impor semua fungsi view yang dibutuhkan
import { renderHome, showLoading as showHomeLoading, showError as showHomeError } from '../views/home-view.js';
import { renderAddStory, showAddStoryLoading, showAddStoryError } from '../views/add-story-view.js';
import { renderLogin, showLoginLoading, showLoginError } from '../views/login-view.js';
import { renderRegister, showRegisterLoading, showRegisterError, showRegisterSuccess } from '../views/register-view.js';
import { renderNotFound } from '../views/not-found-view.js';

// Impor semua fungsi model yang dibutuhkan dalam satu statement
import { 
  getAllStories, 
  addNewStory, 
  loginUser,
  registerUser
} from '../models/story-api-model.js';

class PagePresenter {
  constructor(appContentElement) {
    this._appContentElement = appContentElement;
    // Bind 'this' untuk event handler agar merujuk ke instance PagePresenter
    this._handleAddNewStory = this._handleAddNewStory.bind(this);
    this._handleLogin = this._handleLogin.bind(this);
    this._handleRegister = this._handleRegister.bind(this);
  }

  /**
   * Membersihkan sumber daya dari view sebelumnya (kamera, peta).
   * @private
   */
  _cleanupPreviousResources() {
    if (typeof window.stopActiveCameraStreamGlobal === 'function') {
      console.log('PagePresenter: Cleaning up camera stream.');
      window.stopActiveCameraStreamGlobal();
    }
    if (typeof window.destroyActiveLocationPickerMapGlobal === 'function') {
      console.log('PagePresenter: Cleaning up location picker map.');
      window.destroyActiveLocationPickerMapGlobal();
    }
  }

  /**
   * Menampilkan halaman beranda dengan daftar cerita.
   */
  async showHomePage() {
    if (!this._appContentElement) {
      console.error("PagePresenter: Elemen konten aplikasi (#app-content) tidak ditemukan.");
      return;
    }
    this._cleanupPreviousResources(); // Panggil cleanup sebelum render halaman baru
    showHomeLoading(this._appContentElement);

    try {
      // Pengecekan token juga dilakukan oleh router sebelum memanggil method ini,
      // dan oleh fetchWithAuth saat melakukan call API.
      // Baris if di bawah ini adalah lapisan tambahan jika method ini dipanggil langsung.
      if (!localStorage.getItem('userToken')) {
          // Router seharusnya sudah mengarahkan, tapi ini safeguard
          console.warn('PagePresenter (showHomePage): No user token found, should be redirected by router.');
          window.location.hash = '#/login'; 
          return;
      }
      const stories = await getAllStories(); // Menggunakan parameter default dari model
      renderHome(this._appContentElement, stories);
    } catch (error) {
      // Jika error adalah karena redirect dari fetchWithAuth (misalnya token kedaluwarsa),
      // fetchWithAuth sudah mengurus redirect dan melempar error 'Unauthorized:'.
      // Kita hanya menangani error lain di sini.
      if (error && error.message && !error.message.startsWith('Unauthorized:')) {
        console.error('PagePresenter: Gagal menampilkan halaman beranda:', error);
        showHomeError(this._appContentElement, error.message || 'Gagal memuat cerita.');
      }
    }
  }

  /**
   * Menampilkan halaman untuk menambahkan cerita baru.
   */
  showAddStoryPage() {
    if (!this._appContentElement) {
      console.error("PagePresenter: Elemen konten aplikasi (#app-content) tidak ditemukan.");
      return;
    }
    if (!localStorage.getItem('userToken')) {
        console.warn('PagePresenter (showAddStoryPage): No user token found, should be redirected by router.');
        window.location.hash = '#/login';
        return;
    }
    this._cleanupPreviousResources();
    renderAddStory(this._appContentElement);

    const form = this._appContentElement.querySelector('#add-story-form');
    if (form) {
      form.removeEventListener('submit', this._handleAddNewStory); // Cegah duplikasi listener
      form.addEventListener('submit', this._handleAddNewStory);
    } else {
      console.error("PagePresenter: Form #add-story-form tidak ditemukan setelah render.");
    }
  }

  /**
   * Menangani event submit dari formulir tambah cerita.
   * @private
   */
  async _handleAddNewStory(event) {
    event.preventDefault();
    showAddStoryLoading(true);
    showAddStoryError('');

    const form = event.target;
    const descriptionInput = form.elements.description;
    const photoFileInput = form.elements.photo;
    
    const photoSource = this._appContentElement.getPhotoSource ? this._appContentElement.getPhotoSource() : 'file';
    const capturedBlob = this._appContentElement.getCapturedPhotoBlob ? this._appContentElement.getCapturedPhotoBlob() : null;
    
    const latitudeInput = form.elements.latitude;
    const longitudeInput = form.elements.longitude;

    if (!descriptionInput) {
        showAddStoryError("Kesalahan formulir: field deskripsi tidak ditemukan.");
        showAddStoryLoading(false);
        return;
    }

    const description = descriptionInput.value.trim();
    const lat = latitudeInput ? latitudeInput.value.trim() : ''; // Kirim string kosong jika tidak diisi
    const lon = longitudeInput ? longitudeInput.value.trim() : ''; // Kirim string kosong jika tidak diisi
    let photoToSubmit = null;

    if (photoSource === 'camera' && capturedBlob) {
      const photoName = `camera-shot-${Date.now()}.jpg`;
      photoToSubmit = new File([capturedBlob], photoName, { type: capturedBlob.type || 'image/jpeg' });
    } else if (photoFileInput && photoFileInput.files && photoFileInput.files[0]) {
      photoToSubmit = photoFileInput.files[0];
    }

    if (!description || !photoToSubmit) {
      showAddStoryError('Deskripsi dan foto wajib diisi.');
      showAddStoryLoading(false);
      return;
    }

    try {
      const response = await addNewStory(description, photoToSubmit, lat || undefined, lon || undefined); // Kirim undefined jika string kosong
      showAddStoryLoading(false);
      alert(`Cerita berhasil ditambahkan! Pesan: ${response.message}`);
      
      form.reset(); // Reset semua field
      const imagePreview = form.querySelector('#image-preview');
      if (imagePreview) {
          imagePreview.style.display = 'none';
          imagePreview.src = '#';
      }
      if (document.getElementById('story-latitude')) document.getElementById('story-latitude').value = '';
      if (document.getElementById('story-longitude')) document.getElementById('story-longitude').value = '';
      
      // Reset UI Kamera dan Peta
      const cameraArea = form.querySelector('#camera-area');
      if (cameraArea) cameraArea.style.display = 'none';
      const cameraControls = form.querySelector('#camera-controls');
      if (cameraControls) cameraControls.style.display = 'block';
      const mapPickerContainer = form.querySelector('#map-picker-container');
      if (mapPickerContainer) mapPickerContainer.style.display = 'none';
      const toggleMapButton = form.querySelector('#toggle-map-picker');
      if (toggleMapButton) toggleMapButton.textContent = 'Ambil Lokasi dari Peta';

      this._cleanupPreviousResources(); // Bersihkan resource aktif setelah sukses
      window.location.hash = '#/';
    } catch (error) {
      showAddStoryLoading(false);
      if (error && error.message && !error.message.startsWith('Unauthorized:')) {
        showAddStoryError(error.message || 'Gagal menambahkan cerita.');
      }
    }
  }

  /**
   * Menampilkan halaman login.
   */
  showLoginPage() {
    if (!this._appContentElement) {
      console.error("PagePresenter: Elemen konten aplikasi (#app-content) tidak ditemukan.");
      return;
    }
    this._cleanupPreviousResources();
    renderLogin(this._appContentElement);

    const form = this._appContentElement.querySelector('#login-form');
    if (form) {
      form.removeEventListener('submit', this._handleLogin);
      form.addEventListener('submit', this._handleLogin);
    } else {
      console.error("PagePresenter: Form #login-form tidak ditemukan setelah render.");
    }
  }

  /**
   * Menangani event submit dari formulir login.
   * @private
   */
  async _handleLogin(event) {
    event.preventDefault();
    showLoginLoading(true);
    showLoginError('');

    const form = event.target;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!email || !password) {
      showLoginError('Email dan password wajib diisi.');
      showLoginLoading(false);
      return;
    }

    try {
      const response = await loginUser(email, password);
      showLoginLoading(false);
      if (!response.error && response.loginResult && response.loginResult.token) {
        localStorage.setItem('userToken', response.loginResult.token);
        localStorage.setItem('userName', response.loginResult.name);
        alert('Login berhasil!');
        window.location.hash = '#/';
        // updateNavigation() akan dipanggil oleh event hashchange di main.js
      } else {
        showLoginError(response.message || 'Login gagal. Periksa kredensial Anda.');
      }
    } catch (error) {
      showLoginLoading(false);
      showLoginError(error.message || 'Terjadi kesalahan saat login.');
    }
  }

  /**
   * Menampilkan halaman registrasi.
   */
  showRegisterPage() {
    if (!this._appContentElement) {
      console.error("PagePresenter: Elemen konten aplikasi (#app-content) tidak ditemukan.");
      return;
    }
    this._cleanupPreviousResources();
    renderRegister(this._appContentElement);

    const form = this._appContentElement.querySelector('#register-form');
    if (form) {
      form.removeEventListener('submit', this._handleRegister);
      form.addEventListener('submit', this._handleRegister);
    } else {
      console.error("PagePresenter: Form #register-form tidak ditemukan setelah render.");
    }
  }

  /**
   * Menangani event submit dari formulir registrasi.
   * @private
   */
  async _handleRegister(event) {
    event.preventDefault();
    showRegisterLoading(true);
    showRegisterError('');
    showRegisterSuccess('');

    const form = event.target;
    const name = form.elements.name.value.trim();
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;

    if (!name || !email || !password) {
      showRegisterError('Semua field wajib diisi.');
      showRegisterLoading(false);
      return;
    }
    if (password.length < 8) {
      showRegisterError('Password minimal 8 karakter.');
      showRegisterLoading(false);
      return;
    }

    try {
      const response = await registerUser(name, email, password);
      showRegisterLoading(false);
      if (!response.error) {
        showRegisterSuccess(response.message + " Silakan login.");
        form.reset();
        setTimeout(() => {
            if(window.location.hash === '#/register' && !localStorage.getItem('userToken')) {
                 window.location.hash = '#/login';
            }
        }, 2500);
      } else {
        showRegisterError(response.message || 'Pendaftaran gagal.');
      }
    } catch (error) {
      showRegisterLoading(false);
      showRegisterError(error.message || 'Terjadi kesalahan saat pendaftaran.');
    }
  }

  /**
   * Menampilkan halaman 404 Not Found.
   */
  showNotFoundPage() {
    if (!this._appContentElement) {
      console.error("PagePresenter: Elemen konten aplikasi (#app-content) tidak ditemukan.");
      return;
    }
    this._cleanupPreviousResources();
    renderNotFound(this._appContentElement);
  }
}

export default PagePresenter;