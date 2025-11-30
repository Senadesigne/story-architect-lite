import { Link, useLocation } from "react-router-dom";
import { BookOpen, User, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { ModeToggle } from "@/components/mode-toggle";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { usePlannerAIStore } from "@/stores/plannerAIStore";

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const isStudio = location.pathname.includes('/studio');
  const { openModal, setMode } = usePlannerAIStore();

  const handleBrainstormingClick = () => {
    setMode('brainstorming');
    openModal('brainstorming', '', projectId); // bez konteksta i targetField-a
  };

  return (
    <header className="sticky top-0 z-50 flex items-center h-14 px-4 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
      {/* Logo section */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <span className="font-serif font-semibold text-foreground">Story Architect Lite</span>
      </div>

      {/* Navigation tabs - centered */}
      <div className="flex items-center justify-center flex-1 gap-2">
        <Link
          to={`/project/${projectId}/story-idea`}
          className={cn(
            "px-6 py-2 rounded-md transition-all duration-200 font-medium",
            !isStudio
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          Planner
        </Link>
        <Link
          to={`/project/${projectId}/studio`}
          className={cn(
            "px-6 py-2 rounded-md transition-all duration-200 font-medium",
            isStudio
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          Studio
        </Link>
      </div>

      {/* User section */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Brainstorming gumb */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleBrainstormingClick}
          className="gap-2"
        >
          <BrainCircuit className="h-4 w-4" />
          Brainstorming
        </Button>
        {user && (
          <span className="text-sm text-muted-foreground font-serif">
            Welcome, {user.displayName || user.email}
          </span>
        )}
        <ModeToggle />
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => signOut(auth)}
          >
            <User className="h-4 w-4" />
            <span className="sr-only">Sign Out</span>
          </Button>
        )}
      </div>
    </header>
  );
}
