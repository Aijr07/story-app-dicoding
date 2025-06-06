// src/utils/push-notification-helper.js

// Impor fungsi untuk mengirim subscription ke server (akan kita buat di model)
import { subscribeToNotifications } from '../models/story-api-model.js';

// VAPID key dari dokumentasi API Anda
const VAPID_PUBLIC_KEY = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

/**
 * Mengubah string URL-safe base64 menjadi Uint8Array.
 * Diperlukan oleh Push API.
 * @param {string} base64String 
 * @returns {Uint8Array}
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Meminta izin notifikasi dan melakukan subscribe.
 */
async function requestPermissionAndSubscribe() {
  if (!('PushManager' in window)) {
    console.error('Push Messaging tidak didukung oleh browser ini.');
    alert('Fitur notifikasi tidak didukung di browser ini.');
    return;
  }

  try {
    // 1. Minta izin dari pengguna
    const permissionResult = await Notification.requestPermission();
    if (permissionResult !== 'granted') {
      console.warn('Izin notifikasi tidak diberikan.');
      alert('Anda tidak akan menerima notifikasi cerita baru jika izin tidak diberikan.');
      return;
    }

    // 2. Dapatkan service worker registration yang aktif
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;

    // 3. Lakukan subscribe
    console.log('Melakukan subscribe ke Push Service...');
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true, // Wajib true
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    console.log('Berhasil subscribe:', subscription);

    // 4. Kirim subscription ke server API
    console.log('Mengirim subscription ke server...');
    await subscribeToNotifications(subscription);

    alert('Anda berhasil subscribe untuk notifikasi cerita baru!');
  } catch (error) {
    console.error('Gagal melakukan subscribe:', error);
    alert('Gagal subscribe untuk notifikasi. Silakan coba lagi.');
  }
}

export { requestPermissionAndSubscribe };