import {
  Sparkles,
  Lightbulb,
  Search,
  Globe,
  Users,
  BarChart3,
  CheckCircle,
  ScrollText,
  X
} from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import React from 'react';
import { useChiefEditorStore } from "@/store/useChiefEditorStore";

export function ProjectSidebar() {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const isActive = (path: string) => location.pathname === `/project/${projectId}${path}`;

  const phases = [
    {
      path: "/story-idea",
      label: "Phase 0: Story Idea",
      icon: Sparkles,
      description: "Brain Dump"
    },
    {
      path: "/ideation",
      label: "Phase 1: Idea",
      icon: Lightbulb,
      description: "Idea & Concept"
    },
    {
      path: "/planning",
      label: "Phase 2: Planning",
      icon: Search,
      description: "Planning & Research"
    },
    {
      path: "/worldbuilding",
      label: "Phase 3: World",
      icon: Globe,
      description: "Worldbuilding"
    },
    {
      path: "/characters",
      label: "Phase 4: Characters",
      icon: Users,
      description: "Character Development"
    },
    {
      path: "/structure",
      label: "Phase 5: Structure",
      icon: BarChart3,
      description: "Plot Structure"
    },
    {
      path: "/finalization",
      label: "Phase 6: Completion",
      icon: CheckCircle,
      description: "Final Preparations"
    }
  ];

  const { history, fetchHistory, selectAnalysis, setIsOpen, deleteAnalysis } = useChiefEditorStore();

  React.useEffect(() => {
    // FIX: Check for token/auth before fetching to prevent 401 errors
    const token = localStorage.getItem('authToken');
    if (projectId && token) {
      fetchHistory(projectId);
    }
  }, [projectId]);

  const handleHistoryParams = (item: any) => {
    selectAnalysis(item);
    setIsOpen(true);
  };

  return (
    <div className="w-64 h-screen bg-sidebar-background/95 border-r border-border/50 sticky top-0 overflow-y-auto backdrop-blur-sm flex flex-col">
      <div className="p-4 flex-1">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4">Project Phases</h3>
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

      {/* Chief Editor History Section */}
      <div className="p-4 border-t border-border/50">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
          <span className="text-purple-500">◆</span> Analysis History
        </h3>
        <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-2">No analyses yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="group flex items-center gap-2 group">
                <button
                  onClick={() => handleHistoryParams(item)}
                  className="text-xs text-left w-full truncate p-2 rounded hover:bg-sidebar-accent text-sidebar-foreground transition-colors flex items-center gap-2"
                >
                  <ScrollText className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{item.prompt}</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteAnalysis(item.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

