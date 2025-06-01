// src/models/story-api-model.js

const BASE_URL = 'https://story-api.dicoding.dev/v1';
// HAPUS const BEARER_TOKEN = '...'; // Kita tidak hardcode token lagi

/**
 * Fungsi helper untuk melakukan fetch ke API.
 * Akan mengambil token dari localStorage jika ada.
 * Jika terjadi error 401/403, akan menghapus token dan redirect ke login.
 */
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('userToken'); // Ambil token dari localStorage
  const defaultHeaders = {};

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  const mergedOptions = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    }
  };

  try {
    const response = await fetch(url, mergedOptions);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token tidak valid atau kedaluwarsa
        console.error('Authentication error:', response.status);
        localStorage.removeItem('userToken'); // Hapus token yang tidak valid
        localStorage.removeItem('userName'); // Hapus info pengguna lain jika ada
        window.location.hash = '#/login'; // Arahkan ke halaman login
        // Buat error khusus agar tidak diproses lebih lanjut oleh pemanggil
        throw new Error(`Unauthorized: ${response.statusText}. Redirecting to login.`);
      }
      // Error lain
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Failed to fetch'}`);
    }
    
    if (response.status === 204) { // No Content
      return null;
    }
    return response.json();
  } catch (error) {
    // Jika error adalah karena redirect ke login, jangan tampilkan error umum
    if (error.message.startsWith('Unauthorized:')) {
        console.warn(error.message); // Log sebagai warning
        return Promise.reject(error); // Propagate error agar pemanggil bisa berhenti
    }
    console.error('Network/Fetch error in fetchWithAuth:', error);
    throw error; // Lempar error lain untuk ditangani pemanggil
  }
}

/**
 * Mendaftarkan pengguna baru.
 * @param {string} name - Nama pengguna.
 * @param {string} email - Email pengguna.
 * @param {string} password - Password pengguna.
 * @returns {Promise<object>} Respons dari API.
 */
async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (!response.ok || data.error) { // API Dicoding sering mengembalikan error:true di body meskipun status 200/201
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data; // Berisi { error: false, message: "User Created" }
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Melakukan login pengguna.
 * @param {string} email - Email pengguna.
 * @param {string} password - Password pengguna.
 * @returns {Promise<object>} Respons dari API yang berisi loginResult.
 */
async function loginUser(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    return data; // Berisi { error: false, message: "success", loginResult: { userId, name, token } }
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

// Fungsi getAllStories dan addNewStory tetap menggunakan fetchWithAuth
async function getAllStories(page = 1, size = 10, withLocation = false) {
  let url = `${BASE_URL}/stories?page=${page}&size=${size}`;
  if (withLocation) {
    url += '&location=1';
  }
  // fetchWithAuth akan otomatis menangani token dan error 401
  const data = await fetchWithAuth(url); 
  if (data && !data.error) {
    return data.listStory || [];
  } else {
    // Jika fetchWithAuth melempar error 'Unauthorized', data mungkin null atau error sudah dilempar
    // Jika data ada tapi data.error true, itu adalah error dari API yang bukan 401
    if (data) throw new Error(data.message || 'Failed to get stories');
    // Jika data null karena redirect dari fetchWithAuth, error sudah dilempar
    return []; // Kembalikan array kosong jika terjadi error yang tidak menyebabkan redirect
  }
}

async function addNewStory(description, photo, lat, lon) {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat !== undefined && lat !== null && lat !== '') formData.append('lat', parseFloat(lat));
  if (lon !== undefined && lon !== null && lon !== '') formData.append('lon', parseFloat(lon));

  // fetchWithAuth akan otomatis menangani token dan error 401
  const response = await fetchWithAuth(`${BASE_URL}/stories`, {
    method: 'POST',
    body: formData,
  });
  if (response && !response.error) {
    return response;
  } else {
    if (response) throw new Error(response.message || 'Gagal menambahkan cerita baru.');
    // Jika response null karena redirect, error sudah dilempar
    throw new Error('Gagal menambahkan cerita karena masalah otentikasi atau jaringan.');
  }
}

export { registerUser, loginUser, getAllStories, addNewStory };