import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "taskflow-pro-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "taskflow-pro-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "taskflow-pro-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const storage = getStorage(app);

// Connect to emulators only when explicitly enabled
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  // Wait for DOM to be ready before connecting to emulators
  if (typeof window !== 'undefined') {
    try {
      // Auth emulator
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      console.log('Connected to Auth emulator');
    } catch {
      console.log('Auth emulator already connected or unavailable');
    }
    
    try {
      // Firestore emulator  
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      console.log('Connected to Firestore emulator');
    } catch {
      console.log('Firestore emulator already connected or unavailable');
    }
    
    try {
      // Functions emulator
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      console.log('Connected to Functions emulator');
    } catch {
      console.log('Functions emulator already connected or unavailable');
    }
    
    try {
      // Storage emulator
      connectStorageEmulator(storage, '127.0.0.1', 9199);
      console.log('Connected to Storage emulator');
    } catch {
      console.log('Storage emulator already connected or unavailable');
    }
  }
}

export default app;