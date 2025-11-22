import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { ModeToggle } from "@/components/mode-toggle";

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-2 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center">
        <span className="font-semibold ml-3">My App</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        {user && (
          <span className="text-sm text-muted-foreground">
            Welcome, {user.displayName || user.email}
          </span>
        )}
        <ModeToggle />
        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut(auth)}
          >
            Sign Out
          </Button>
        )}
      </div>
    </header>
  );
} 