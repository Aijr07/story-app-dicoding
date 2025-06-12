// src/js/db.js

// Menggunakan library 'idb' untuk mempermudah interaksi dengan IndexedDB
import { openDB } from 'idb';

const DB_NAME = 'story-app-database';
const DB_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

// Inisialisasi koneksi ke database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  // Fungsi upgrade ini hanya berjalan sekali saat DB dibuat atau saat versi dinaikkan
  upgrade(db) {
    // Membuat 'object store' (seperti tabel) untuk menyimpan cerita.
    // 'id' akan menjadi primary key yang unik.
    if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
    }
  },
});

const StoryAppDB = {
  /**
   * Mengambil semua cerita yang tersimpan di IndexedDB.
   * @returns {Promise<Array>} Array berisi objek cerita.
   */
  async getAllStories() {
    console.log('DB: Mengambil semua cerita dari IndexedDB...');
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },

  /**
   * Menyimpan atau memperbarui satu cerita di IndexedDB.
   * Metode 'put' akan menimpa data jika ID yang sama sudah ada.
   * @param {object} story - Objek cerita yang akan disimpan.
   */
  async putStory(story) {
    if (!story || !story.id) {
      console.error('DB: Data cerita atau ID tidak valid, tidak bisa disimpan.', story);
      return;
    }
    console.log('DB: Menyimpan cerita dengan ID:', story.id);
    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },
  
  /**
   * Menghapus satu cerita dari IndexedDB berdasarkan ID-nya.
   * @param {string} id - ID dari cerita yang akan dihapus.
   */
  async deleteStory(id) {
    if (!id) {
      console.error('DB: ID tidak valid, tidak bisa menghapus.');
      return;
    }
    console.log('DB: Menghapus cerita dengan ID:', id);
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },
};

export default StoryAppDB;