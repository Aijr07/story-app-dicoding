/* === File: js/db.js === */

// Kode untuk membuka koneksi ke DB (menggunakan library idb)
const dbPromise = idb.openDB('database-aplikasi-saya', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('data-favorit')) {
      db.createObjectStore('data-favorit', { keyPath: 'id' });
    }
  },
});

// Fungsi untuk menyimpan data
async function simpanData(data) {
  const db = await dbPromise;
  const tx = db.transaction('data-favorit', 'readwrite');
  await tx.objectStore('data-favorit').put(data);
  return tx.done;
}

// Fungsi untuk mengambil semua data
async function getAllData() {
  const db = await dbPromise;
  return db.transaction('data-favorit', 'readonly').objectStore('data-favorit').getAll();
}

// Fungsi untuk menghapus data berdasarkan key
async function hapusData(key) {
  const db = await dbPromise;
  const tx = db.transaction('data-favorit', 'readwrite');
  await tx.objectStore('data-favorit').delete(key);
  return tx.done;
}