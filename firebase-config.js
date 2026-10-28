// =====================================================================
//  firebase-config.js
//  Ganti nilai di bawah dengan config dari Firebase Console:
//  Project settings → General → Your apps → (Web app) → SDK setup and configuration → Config
//
//  ⚠️ Yang diganti hanya isi di dalam { ... }. Baris "export const firebaseConfig ="
//  JANGAN dihapus. Jangan ikut menempel baris "import ..." dari Firebase Console.
//  ⚠️ Pastikan ada "databaseURL" (muncul setelah Realtime Database dibuat).
// =====================================================================

export const firebaseConfig = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://ISI_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "ISI_SENDER_ID",
  appId: "ISI_APP_ID"
};
