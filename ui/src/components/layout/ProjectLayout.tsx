import React from 'react';
import { useParams, useLocation } from "react-router-dom";
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { ProjectNav } from '@/components/ProjectNav';
import { AIChatSidebar } from "@/components/planner/AIChatSidebar";
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { cn } from '@/lib/utils';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  const { isOpen } = usePlannerAIStore();

  return (
    <div className="flex flex-col w-full h-full bg-transparent relative">
      <ProjectNav projectId={projectId!} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isStudio && <ProjectSidebar />}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-hidden bg-transparent relative transition-all duration-300 ease-in-out",
            isOpen ? "mr-96" : ""
          )}
        >
          {children}
        </div>
      </div>
      {/* AIChatSidebar je fixed position, pa ga možemo staviti ovdje */}
      <AIChatSidebar />
    </div>
  );
}
