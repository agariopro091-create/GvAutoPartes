import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase - GvAutoPartes
const firebaseConfig = {
  apiKey: "AIzaSyAWr3jtWcOaAzKtIdvO5Ww1O1pddfH6k3Y",
  authDomain: "gvautopartes-4889f.firebaseapp.com",
  projectId: "gvautopartes-4889f",
  storageBucket: "gvautopartes-4889f.firebasestorage.app",
  messagingSenderId: "150608808279",
  appId: "1:150608808279:web:9051afe3cfb9772e141612"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar Firestore
export const db = getFirestore(app);
