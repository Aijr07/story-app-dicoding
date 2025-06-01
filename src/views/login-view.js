// src/views/login-view.js

const renderLogin = (container) => {
    container.innerHTML = `
      <div class="page-header" style="text-align: center;">
        <h1>Login ke Aplikasi Cerita</h1>
      </div>
      <div class="login-container" style="max-width: 400px; margin: 20px auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-radius: 8px;">
        <form id="login-form">
          <div class="form-group">
            <label for="login-email">Email:</label>
            <input type="email" id="login-email" name="email" required>
          </div>
          <div class="form-group">
            <label for="login-password">Password:</label>
            <input type="password" id="login-password" name="password" required autocomplete="current-password">
          </div>
          <div class="form-actions" style="text-align: center;">
            <button type="submit" id="login-button" class="button button--primary">Login</button>
            <div id="login-loading-indicator" style="display: none; margin-top:10px; font-style:italic;">Memproses login...</div>
            <div id="login-error-message" class="error-message-form" style="display: none; margin-top:10px;"></div>
          </div>
        </form>
        <p style="text-align:center; margin-top:15px;">Belum punya akun? <a href="#/register">Daftar di sini</a>.</p> 
        </div>
    `;
  };
  
  // ... (showLoginLoading, showLoginError tetap sama) ...
  const showLoginLoading = (isLoading) => { /* ... kode Anda ... */ };
  const showLoginError = (message) => { /* ... kode Anda ... */ };
  
  
  export { renderLogin, showLoginLoading, showLoginError };