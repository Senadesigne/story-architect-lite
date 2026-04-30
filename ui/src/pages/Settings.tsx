import { Separator } from '@/components/ui/separator';
import { UserProfileForm } from '@/components/UserProfileForm';
import { WritingSamplesManager } from '@/components/profile/WritingSamplesManager';

export function Settings() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        <Separator />

        <UserProfileForm />

        <Separator />

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Writing Style Profile</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Add writing samples so the AI assistant can learn your voice and style.
              The Humanization Agent uses these samples when generating text with
              humanization enabled in the AI sidebar.
            </p>
          </div>
          <WritingSamplesManager />
        </div>
      </div>
    </div>
  );
} 