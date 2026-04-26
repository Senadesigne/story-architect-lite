import { Separator } from '@/components/ui/separator';
import { UserProfileForm } from '@/components/UserProfileForm';
import { WritingSamplesManager } from '@/components/profile/WritingSamplesManager';

export function Settings() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Postavke</h1>
          <p className="text-muted-foreground">
            Upravljajte postavkama računa i preferencijama.
          </p>
        </div>

        <Separator />

        <UserProfileForm />

        <Separator />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Writing Style Profile</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Dodaj uzorke svog pisanja da AI asistent nauči tvoj glas i stil.
              Humanization Agent koristi ove uzorke pri generiranju teksta kad je
              humanizacija uključena u AI sidebaru.
            </p>
          </div>
          <WritingSamplesManager />
        </div>
      </div>
    </div>
  );
} 