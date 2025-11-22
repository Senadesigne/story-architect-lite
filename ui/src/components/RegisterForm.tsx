import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError(''); // Očisti grešku kad korisnik počne tipkati
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email adresa je obavezna');
      return false;
    }
    
    if (!formData.email.includes('@')) {
      setError('Unesite valjanu email adresu');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      // Ažuriraj Firebase profil s display name-om
      if (formData.displayName.trim()) {
        await updateProfile(user, { 
          displayName: formData.displayName.trim() 
        });
      }
      
      // Korisnik će biti automatski prijavljen i preusmjeren
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Prilagodi error poruke
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Email adresa se već koristi. Pokušajte se prijaviti.');
          break;
        case 'auth/invalid-email':
          setError('Neispravna email adresa');
          break;
        case 'auth/weak-password':
          setError('Lozinka je preslaba. Koristite najmanje 6 znakova.');
          break;
        case 'auth/network-request-failed':
          setError('Greška mreže. Provjerite internetsku vezu.');
          break;
        default:
          setError('Greška pri registraciji. Pokušajte ponovno.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <UserPlus className="h-5 w-5" />
          Registracija
        </CardTitle>
        <CardDescription>
          Stvorite novi račun za Story Architect
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email adresa *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              placeholder="vas.email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="displayName">Ime za prikaz</Label>
            <Input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange('displayName')}
              placeholder="Vaše ime (opcionalno)"
              maxLength={100}
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Lozinka *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Najmanje 6 znakova"
                required
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword">Potvrdite lozinku *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Ponovite lozinku"
                required
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert className="border-destructive/20 bg-destructive/10">
              <AlertDescription className="text-destructive">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Registracija u tijeku...' : 'Registriraj se'}
          </Button>

          {onSwitchToLogin && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Već imate račun?{' '}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal"
                  onClick={onSwitchToLogin}
                  disabled={isLoading}
                >
                  Prijavite se
                </Button>
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
