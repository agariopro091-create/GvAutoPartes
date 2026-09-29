import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

function readFirebaseEnv(prefixed?: string, plain?: string) {
  const value = prefixed || plain;
  return value?.trim().replace(/^['"]|['"],?$/g, '').trim();
}

const firebaseConfig = {
  apiKey: readFirebaseEnv(import.meta.env.VITE_FIREBASE_API_KEY, import.meta.env.apiKey),
  authDomain: readFirebaseEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, import.meta.env.authDomain),
  projectId: readFirebaseEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, import.meta.env.projectId),
  storageBucket: readFirebaseEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, import.meta.env.storageBucket),
  messagingSenderId: readFirebaseEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    import.meta.env.messagingSenderId,
  ),
  appId: readFirebaseEnv(import.meta.env.VITE_FIREBASE_APP_ID, import.meta.env.appId),
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId,
);

const firebaseApp = firebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
