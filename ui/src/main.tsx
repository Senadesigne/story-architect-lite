import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🧹 SERVICE WORKER & CACHE CLEANUP (Zombie Killer 🧟‍♂️🔫)
// Ovo osigurava da stari Service Workeri ili CacheStorage ne serviraju stari index.html
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    for (let registration of registrations) {
      console.log('🧹 [Cleanup] Unregistering Service Worker:', registration);
      registration.unregister();
    }
    if (registrations.length === 0) {
      console.log('✅ [Cleanup] No active Service Workers found.');
    }
  });
}

if ('caches' in window) {
  caches.keys().then(function (names) {
    for (let name of names) {
      console.log('🗑️ [Cleanup] Deleting cache:', name);
      caches.delete(name);
    }
    if (names.length === 0) {
      console.log('✅ [Cleanup] CacheStorage is empty.');
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
