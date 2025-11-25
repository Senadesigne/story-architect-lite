import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth';
// Firebase konfiguracija preko environment varijabli
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Eksplicitno postavi persistence za trajno spremanje sesije
// Koristi browserLocalPersistence (Local Storage) kao primarni, 
// s fallback na indexedDBLocalPersistence
const initializePersistence = async () => {
  try {
    // Pokušaj s Local Storage persistence
    await setPersistence(auth, browserLocalPersistence);
    console.log('✅ Firebase Auth persistence postavljena na browserLocalPersistence (Local Storage)');
  } catch (error) {
    try {
      // Fallback na IndexedDB persistence
      await setPersistence(auth, indexedDBLocalPersistence);
      console.log('✅ Firebase Auth persistence postavljena na indexedDBLocalPersistence (IndexedDB)');
    } catch (fallbackError) {
      console.error('❌ Greška pri postavljanju Firebase Auth persistence:', fallbackError);
    }
  }
};

// Inicijaliziraj persistence
initializePersistence();

// OPCIJA A: Koristimo isključivo production Firebase Auth
// Emulator logika je onemogućena za stabilnost login funkcionalnosti
console.log(`🏭 Using production Firebase Auth (Project: ${firebaseConfig.projectId})`);
console.log(`🔐 Auth domain: ${firebaseConfig.authDomain}`);

// Provjeri da li je Firebase pravilno konfiguriran
if (!firebaseConfig.projectId || !firebaseConfig.authDomain) {
  console.error('❌ Firebase konfiguracija nije potpuna!');
  console.error('Missing:', {
    projectId: !firebaseConfig.projectId,
    authDomain: !firebaseConfig.authDomain
  });
} 