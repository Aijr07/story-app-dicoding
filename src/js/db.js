// src/js/db.js

import { openDB } from 'idb';

const DATABASE_NAME = 'story-app-database';
const DATABASE_VERSION = 1; // Pastikan versi ini sesuai
const OBJECT_STORE_NAME = 'stories';

const StoryAppDB = {
  async openDB() {
    return openDB(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          database.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
        }
      },
    });
  },

  /** Mengambil SATU cerita berdasarkan ID */
  async getStory(id) {
    const db = await this.openDB();
    return db.get(OBJECT_STORE_NAME, id);
  },

  /** Mengambil SEMUA cerita yang tersimpan */
  async getAllStories() {
    const db = await this.openDB();
    return db.getAll(OBJECT_STORE_NAME);
  },

  /** Menyimpan atau memperbarui satu cerita */
  async putStory(story) {
    if (!story || !story.id) return;
    const db = await this.openDB();
    return db.put(OBJECT_STORE_NAME, story);
  },

  /** Menghapus satu cerita berdasarkan ID */
  async deleteStory(id) {
    const db = await this.openDB();
    return db.delete(OBJECT_STORE_NAME, id);
  },
};

export default StoryAppDB;