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
    <div className="flex flex-col w-full min-h-screen">
      <ProjectNav projectId={projectId!} />
      <div className="flex flex-1">
        {!isStudio && <ProjectSidebar />}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
