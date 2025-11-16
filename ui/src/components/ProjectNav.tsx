import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  
  return (
    <div className="border-b">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link 
          to={`/project/${projectId}/ideation`}
          className={cn(
            "px-4 py-2 rounded-md transition-colors",
            !isStudio && "bg-accent"
          )}
        >
          Planer
        </Link>
        <Link 
          to={`/project/${projectId}/studio`}
          className={cn(
            "px-4 py-2 rounded-md transition-colors",
            isStudio && "bg-accent"
          )}
        >
          Studio
        </Link>
      </div>
    </div>
  );
}
