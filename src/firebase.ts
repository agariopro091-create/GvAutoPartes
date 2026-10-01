import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAWr3jtWcOaAzKtIdvO5Ww1O1pddfH6k3Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gvautopartes-4889f.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gvautopartes-4889f",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gvautopartes-4889f.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "150608808279",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:150608808279:web:9051afe3cfb9772e141612"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
