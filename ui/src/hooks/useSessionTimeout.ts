import { useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { clearTokenCache } from '@/lib/serverComm';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minuta
const WARNING_TIME = 5 * 60 * 1000; // 5 minuta prije isteka

export function useSessionTimeout() {
  const { user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    const handleLogout = async () => {
      try {
        clearTokenCache();
        await signOut(auth);
        // Možete dodati toast notifikaciju ovdje
        console.log('Session expired - user logged out');
      } catch (error) {
        console.error('Error during session timeout logout:', error);
      }
    };

    const showWarning = () => {
      // Možete implementirati modal ili toast upozorenje ovdje
      console.log('Session will expire in 5 minutes');
      
      // Možete dodati confirm dialog za produženje sessije
      const extendSession = window.confirm(
        'Vaša sesija će isteći za 5 minuta. Želite li je produžiti?'
      );
      
      if (extendSession) {
        resetTimeout();
      }
    };

    const resetTimeout = () => {
      lastActivityRef.current = Date.now();
      
      // Očisti postojeće timeout-ove
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      
      // Postavi novo upozorenje
      warningRef.current = setTimeout(showWarning, SESSION_TIMEOUT - WARNING_TIME);
      
      // Postavi novi logout timeout
      timeoutRef.current = setTimeout(handleLogout, SESSION_TIMEOUT);
    };

    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;
      
      // Resetiraj timeout samo ako je prošlo više od 1 minute od zadnje aktivnosti
      // Ovo sprječava previše čestih resetiranja
      if (timeSinceLastActivity > 60 * 1000) {
        resetTimeout();
      }
    };

    // Event listeners za korisničku aktivnost
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Postavi početni timeout
    resetTimeout();

    // Cleanup funkcija
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  // Funkcija za ručno produženje sessije
  const extendSession = () => {
    if (user && timeoutRef.current) {
      lastActivityRef.current = Date.now();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      
      // Postavi nove timeout-ove
      warningRef.current = setTimeout(() => {
        console.log('Session will expire in 5 minutes');
      }, SESSION_TIMEOUT - WARNING_TIME);
      
      timeoutRef.current = setTimeout(async () => {
        try {
          clearTokenCache();
          await signOut(auth);
        } catch (error) {
          console.error('Error during session timeout logout:', error);
        }
      }, SESSION_TIMEOUT);
    }
  };

  return { extendSession };
}
