import { useParams, useLocation } from "react-router-dom";
import { ProjectSidebar } from '@/components/ProjectSidebar';
import { ProjectNav } from '@/components/ProjectNav';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  
  return (
    <div className="flex flex-col w-full h-full">
      <ProjectNav projectId={projectId!} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!isStudio && <ProjectSidebar />}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
