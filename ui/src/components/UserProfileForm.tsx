import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useUserStore } from '@/stores/userStore';
import { api } from '@/lib/serverComm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Save, User } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { clearTokenCache } from '@/lib/serverComm';

export function UserProfileForm() {
  const { user } = useAuth();
  const { profile, setProfile, updateProfile } = useUserStore();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Učitaj podatke korisnika pri mount-u
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userProfile = await api.getCurrentUser();
        setProfile(userProfile);
        setDisplayName(userProfile.displayName || '');
        setAvatarUrl(userProfile.avatarUrl || '');
      } catch (error) {
        console.error('Error loading user profile:', error);
        setMessage({ type: 'error', text: 'Greška pri učitavanju profila' });
      }
    };

    if (user) {
      loadUserProfile();
    }
  }, [user, setProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    
    try {
      const updatedUser = await api.updateUser({ 
        displayName: displayName.trim() || undefined, 
        avatarUrl: avatarUrl.trim() || undefined 
      });
      
      updateProfile(updatedUser);
      setMessage({ type: 'success', text: 'Profil je uspješno ažuriran!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Greška pri ažuriranju profila' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Jeste li sigurni da želite obrisati svoj račun? Ova akcija je nepovratna i obrisat će sve vaše projekte.')) {
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      await api.deleteUser();
      clearTokenCache();
      setProfile(null);
      await signOut(auth);
      // Korisnik će biti preusmjeren na login stranicu
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: 'Greška pri brisanju računa' });
      setIsDeleting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Korisnički profil
          </CardTitle>
          <CardDescription>
            Upravljajte svojim korisničkim podacima
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email adresa</Label>
              <Input 
                id="email" 
                value={user.email || ''} 
                disabled 
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Email adresa se ne može mijenjati
              </p>
            </div>
            
            <div>
              <Label htmlFor="displayName">Ime za prikaz</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Vaše ime"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Ime koje će se prikazivati u aplikaciji
              </p>
            </div>
            
            <div>
              <Label htmlFor="avatarUrl">URL avatara</Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Poveznica na vašu profilnu sliku
              </p>
            </div>

            {avatarUrl && (
              <div>
                <Label>Pregled avatara</Label>
                <div className="mt-2">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar pregled" 
                    className="w-16 h-16 rounded-full object-cover border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Spremanje...' : 'Spremi promjene'}
            </Button>
          </form>

          {message && (
            <Alert className={`mt-4 ${message.type === 'error' ? 'border-destructive/20 bg-destructive/10' : 'border-green-200 bg-green-50'}`}>
              <AlertDescription className={message.type === 'error' ? 'text-destructive' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Opasna zona</CardTitle>
          <CardDescription>
            Brisanje računa je nepovratno i obrisat će sve vaše projekte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="destructive" 
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Brisanje računa...' : 'Obriši račun'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
