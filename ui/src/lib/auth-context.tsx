import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'

type AuthContextType = {
  user: User | null
  loading: boolean
  isReady: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isReady: false })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Postavi timeout za slučaj da Firebase Auth ne odgovori brzo
    const readyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Firebase Auth inicijalizacija traje duže od očekivanog');
        setLoading(false);
        setIsReady(true);
      }
    }, 5000); // 5 sekundi timeout

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔄 Auth state changed:', user ? `User: ${user.email}` : 'No user');
      
      // Provjeri da li je korisnik stvarno autentificiran s valjanim tokenom
      if (user) {
        user.getIdToken().then(() => {
          console.log('✅ Token uspješno dohvaćen, korisnik je autentificiran');
          setUser(user);
          setLoading(false);
          setIsReady(true);
          clearTimeout(readyTimeout);
        }).catch((error) => {
          console.error('❌ Greška pri dohvaćanju tokena:', error);
          setUser(null);
          setLoading(false);
          setIsReady(true);
          clearTimeout(readyTimeout);
        });
      } else {
        setUser(null);
        setLoading(false);
        setIsReady(true);
        clearTimeout(readyTimeout);
      }
    })

    return () => {
      unsubscribe();
      clearTimeout(readyTimeout);
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, isReady }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) 