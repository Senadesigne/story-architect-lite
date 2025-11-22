import { 
  Lightbulb, 
  Search,
  Globe,
  Users,
  BarChart3,
  CheckCircle
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export function ProjectSidebar() {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const isActive = (path: string) => location.pathname === `/project/${projectId}${path}`;

  const phases = [
    {
      path: "/ideation",
      label: "Faza 1: Ideja",
      icon: Lightbulb,
      description: "Ideja i Koncept"
    },
    {
      path: "/planning",
      label: "Faza 2: Planiranje",
      icon: Search,
      description: "Planiranje i Istraživanje"
    },
    {
      path: "/worldbuilding",
      label: "Faza 3: Svijet",
      icon: Globe,
      description: "Izgradnja Svijeta"
    },
    {
      path: "/characters",
      label: "Faza 4: Likovi",
      icon: Users,
      description: "Razvoj Likova"
    },
    {
      path: "/structure",
      label: "Faza 5: Struktura",
      icon: BarChart3,
      description: "Strukturiranje Radnje"
    },
    {
      path: "/finalization",
      label: "Faza 6: Završetak",
      icon: CheckCircle,
      description: "Završne Pripreme"
    }
  ];

  return (
    <div className="w-64 h-screen bg-sidebar-background/95 border-r border-border/50 sticky top-0 overflow-y-auto backdrop-blur-sm">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Faze Projekta</h3>
        <nav className="space-y-2">
          {phases.map((phase) => {
            const Icon = phase.icon;
            const active = isActive(phase.path);
            return (
              <Link
                key={phase.path}
                to={`/project/${projectId}${phase.path}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{phase.label}</span>
                  <span className="text-xs opacity-70 truncate">{phase.description}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
