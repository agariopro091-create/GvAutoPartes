// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAWr3jtWcOaAzKtIdvO5Ww1O1pddfH6k3Y",
  authDomain: "gvautopartes-4889f.firebaseapp.com",
  projectId: "gvautopartes-4889f",
  storageBucket: "gvautopartes-4889f.firebasestorage.app",
  messagingSenderId: "150608808279",
  appId: "1:150608808279:web:9051afe3cfb9772e141612",
  measurementId: "G-7JCL73WS73"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
