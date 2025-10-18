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
    <div className="w-64 h-screen bg-background border-r border-border sticky top-0 overflow-y-auto">
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
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="font-medium">{phase.label}</span>
                  <span className="text-xs opacity-70">{phase.description}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
