import { ProjectSidebar } from '@/components/ProjectSidebar';

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
  return (
    <div className="flex w-full min-h-screen">
      <ProjectSidebar />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
