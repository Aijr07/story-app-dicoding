// src/views/register-view.js

const renderRegister = (container) => {
    container.innerHTML = `
      <div class="page-header" style="text-align: center;">
        <h1>Buat Akun Baru</h1>
        <p>Daftarkan diri Anda untuk mulai berbagi cerita.</p>
      </div>
      <div class="register-container" style="max-width: 400px; margin: 20px auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
        <form id="register-form">
          <div class="form-group">
            <label for="register-name">Nama Lengkap:</label>
            <input type="text" id="register-name" name="name" required>
          </div>
          <div class="form-group">
            <label for="register-email">Email:</label>
            <input type="email" id="register-email" name="email" required>
          </div>
          <div class="form-group">
            <label for="register-password">Password:</label>
            <input type="password" id="register-password" name="password" minlength="8" required>
            <small>Minimal 8 karakter.</small>
          </div>
          <div class="form-actions" style="text-align: center;">
            <button type="submit" id="register-button" class="button button--primary">Daftar</button>
            <div id="register-loading-indicator" style="display: none; margin-top:10px; font-style:italic;">Memproses pendaftaran...</div>
            <div id="register-error-message" class="error-message-form" style="display: none; margin-top:10px;"></div>
            <div id="register-success-message" style="display: none; margin-top:10px; color: green;"></div>
          </div>
        </form>
        <p style="text-align:center; margin-top:15px;">Sudah punya akun? <a href="#/login">Login di sini</a>.</p>
      </div>
    `;
    // Event listener untuk form submit akan ditambahkan di presenter
  };
  
  const showRegisterLoading = (isLoading) => {
    const loadingIndicator = document.getElementById('register-loading-indicator');
    const registerButton = document.getElementById('register-button');
    if (loadingIndicator && registerButton) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
      registerButton.disabled = isLoading;
    }
  };
  
  const showRegisterError = (message) => {
    const errorMessageElement = document.getElementById('register-error-message');
    const successMessageElement = document.getElementById('register-success-message');
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
      errorMessageElement.style.display = message ? 'block' : 'none';
    }
    if (successMessageElement) { // Sembunyikan pesan sukses jika ada error
        successMessageElement.style.display = 'none';
    }
  };
  
  const showRegisterSuccess = (message) => {
    const successMessageElement = document.getElementById('register-success-message');
    const errorMessageElement = document.getElementById('register-error-message');
    if (successMessageElement) {
      successMessageElement.textContent = message;
      successMessageElement.style.display = message ? 'block' : 'none';
    }
    if (errorMessageElement) { // Sembunyikan pesan error jika sukses
        errorMessageElement.style.display = 'none';
    }
  };
  
  export { renderRegister, showRegisterLoading, showRegisterError, showRegisterSuccess };