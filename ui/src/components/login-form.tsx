import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { auth, googleProvider } from "@/lib/firebase"
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth"
import { RegisterForm } from "./RegisterForm"

const GoogleIcon = () => (
  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showRegister, setShowRegister] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (showRegister) {
    return <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error('Login error:', firebaseError);
      
      switch (firebaseError.code) {
        case 'auth/user-not-found':
          setError("Korisnik s ovom email adresom ne postoji. Molimo registrirajte se.")
          break;
        case 'auth/wrong-password':
          setError("Pogrešna lozinka. Molimo pokušajte ponovno.")
          break;
        case 'auth/invalid-credential':
          // U Firebase v9+, ovo može značiti pogrešnu lozinku ili nepostojeći korisnik
          setError("Neispravni podaci za prijavu. Provjerite email i lozinku.")
          break;
        case 'auth/invalid-email':
          setError("Neispravna email adresa.")
          break;
        case 'auth/user-disabled':
          setError("Ovaj korisnički račun je onemogućen.")
          break;
        case 'auth/too-many-requests':
          setError("Previše neuspješnih pokušaja. Molimo pričekajte prije ponovnog pokušaja.")
          break;
        case 'auth/network-request-failed':
          setError("Greška mreže. Provjerite internetsku vezu.")
          break;
        default:
          setError("Greška pri prijavi. Molimo pokušajte ponovno.")
          console.error('Unhandled auth error:', firebaseError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setIsLoading(true)
    
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      setError("Greška pri prijavi s Google računom.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                id="email"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                id="password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Prijavljivanje..." : "Prijavi se"}
          </Button>
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ili nastavi s</span>
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            className="w-full bg-white hover:bg-gray-50 text-gray-900 hover:text-gray-900 dark:bg-white dark:hover:bg-gray-50 dark:text-gray-900 dark:hover:text-gray-900 flex gap-2 items-center justify-center"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <GoogleIcon />
            Prijavi se s Google
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Nemate račun?{' '}
              <Button 
                variant="link" 
                className="p-0 h-auto font-normal"
                onClick={() => setShowRegister(true)}
                disabled={isLoading}
              >
                Registrirajte se
              </Button>
            </p>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
} 