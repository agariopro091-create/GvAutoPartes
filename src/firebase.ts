import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Reemplaza esta configuración con tus credenciales de Firebase
// Ve a Firebase Console > Project Settings > General > Your apps > Firebase SDK snippet
const firebaseConfig = {
  apiKey: "AIzaSyAWr3jtWcOaAzKtIdvO5Ww1O1pddfH6k3Y",
  authDomain: "gvautopartes-4889f.firebaseapp.com",
  projectId: "gvautopartes-4889f",
  storageBucket: "gvautopartes-4889f.firebasestorage.app",
  messagingSenderId: "150608808279",
  appId: "1:150608808279:web:9051afe3cfb9772e141612",
  measurementId: "G-7JCL73WS73"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar Firestore
export const db = getFirestore(app);
