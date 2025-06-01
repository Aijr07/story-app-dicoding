// src/views/not-found-view.js
const renderNotFound = (container) => {
    container.innerHTML = `
      <h1>404 - Halaman Tidak Ditemukan</h1>
      <p>Maaf, halaman yang Anda cari tidak tersedia.</p>
    `;
  };
  
  export { renderNotFound };