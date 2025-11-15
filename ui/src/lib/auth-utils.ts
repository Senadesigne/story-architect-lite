import { auth } from './firebase';

/**
 * Provjeri da li je Firebase Auth persistence ispravno postavljena
 * i da li se podaci spremaju u Local Storage
 */
export const checkAuthPersistence = () => {
  const persistenceInfo = {
    localStorageKeys: [] as string[],
    indexedDBStores: [] as string[],
    currentUser: auth.currentUser?.email || null,
    authReady: !!auth.currentUser
  };

  // Provjeri Local Storage za Firebase ključeve
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('firebase:')) {
      persistenceInfo.localStorageKeys.push(key);
    }
  }

  // Provjeri IndexedDB (ovo je asinkrono, ali možemo dati osnovnu info)
  if ('indexedDB' in window) {
    // Ovo je kompleksnije za provjeru, ali možemo provjeriti da li postoji
    persistenceInfo.indexedDBStores.push('IndexedDB dostupan');
  }

  return persistenceInfo;
};

/**
 * Debug funkcija za ispis stanja autentifikacije
 */
export const debugAuthState = () => {
  const info = checkAuthPersistence();
  
  console.group('🔍 Firebase Auth Debug Info');
  console.log('Current User:', info.currentUser);
  console.log('Auth Ready:', info.authReady);
  console.log('Local Storage Keys:', info.localStorageKeys);
  console.log('IndexedDB Info:', info.indexedDBStores);
  
  // Provjeri da li postoje Firebase ključevi u Local Storage
  if (info.localStorageKeys.length > 0) {
    console.log('✅ Firebase podaci pronađeni u Local Storage');
  } else {
    console.log('⚠️ Nema Firebase podataka u Local Storage');
  }
  
  console.groupEnd();
  
  return info;
};

/**
 * Funkcija za čišćenje svih Firebase podataka (za debugging)
 */
export const clearAllAuthData = () => {
  // Očisti Local Storage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('firebase:')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Očisti Session Storage
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith('firebase:')) {
      sessionKeysToRemove.push(key);
    }
  }
  
  sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  console.log('🧹 Očišćeni svi Firebase podaci iz Local/Session Storage');
  
  return {
    localStorageKeysRemoved: keysToRemove.length,
    sessionStorageKeysRemoved: sessionKeysToRemove.length
  };
};
