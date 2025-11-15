import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth';
import firebaseConfig from './firebase-config.json';

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

// Connect to Firebase Auth emulator in development mode or when explicitly enabled
const isDevelopment = import.meta.env.DEV;
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' || 
                   (isDevelopment && firebaseConfig.projectId === 'demo-project');

if (useEmulator) {
  try {
    const firebaseAuthPort = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || '9099';
    const emulatorUrl = `http://localhost:${firebaseAuthPort}`;
    connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    console.log(`🧪 Connected to Firebase Auth emulator at ${emulatorUrl}`);
  } catch (error) {
    // Emulator already connected or not available
    console.debug('Firebase Auth emulator connection skipped:', error);
  }
} else {
  console.log(`🏭 Using production Firebase Auth (Project: ${firebaseConfig.projectId})`);
} 