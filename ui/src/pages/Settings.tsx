import { Separator } from '@/components/ui/separator';
import { UserProfileForm } from '@/components/UserProfileForm';

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
      </div>
    </div>
  );
} 