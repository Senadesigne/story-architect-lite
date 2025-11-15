import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/serverComm';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/lib/types';
import { Link } from 'react-router-dom';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';

export function Home() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createProjectResult, setCreateProjectResult] = useState<{ success: boolean; project?: Project; error?: string } | null>(null);

  // Funkcija za dohvaćanje projekata
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingProjects(true);
    setProjectsError('');
    
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      setProjectsError('Greška pri dohvaćanju projekata');
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // Učitavanje projekata kada se komponenta učita
  useEffect(() => {
    fetchProjects();
  }, [user, fetchProjects]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleProjectCreated = async (project: Project) => {
    setCreateProjectResult({ success: true, project });
    // Automatski osvježi listu projekata nakon kreiranja
    await fetchProjects();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header sekcija */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Moji Projekti</h1>
            <p className="text-muted-foreground mt-2">
              Upravljajte svojim pričama i projektima na jednom mjestu.
            </p>
          </div>
          <Button 
            onClick={handleOpenDialog} 
            disabled={!user}
            size="lg"
          >
            + Novi Projekt
          </Button>
        </div>

        {/* Prikaz rezultata kreiranja projekta */}
        {createProjectResult && createProjectResult.success && (
          <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
            <p className="font-medium">✅ Projekt "{createProjectResult.project?.title}" uspješno stvoren!</p>
          </div>
        )}

        {/* Glavni sadržaj - lista projekata */}
        <div className="mt-8">
          {/* Loading state */}
          {isLoadingProjects && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Učitavam projekte...</p>
            </div>
          )}

          {/* Error state */}
          {projectsError && (
            <div className="text-center py-8">
              <p className="text-red-500">{projectsError}</p>
              <Button 
                variant="outline" 
                onClick={fetchProjects}
                className="mt-4"
              >
                Pokušaj ponovno
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingProjects && !projectsError && projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                Još niste kreirali nijedan projekt.
              </p>
              <p className="text-muted-foreground">
                Započnite klikom na 'Novi Projekt'.
              </p>
            </div>
          )}

          {/* Projects grid */}
          {!isLoadingProjects && !projectsError && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link 
                  key={project.id} 
                  to={`/project/${project.id}/ideation`}
                  className="block hover:shadow-md transition-shadow"
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-xl">{project.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                          <strong>Kreiran:</strong>{' '}
                          {new Date(project.createdAt).toLocaleDateString('hr-HR')}
                        </p>
                        {project.logline && (
                          <p>
                            <strong>Logline:</strong> {project.logline}
                          </p>
                        )}
                        {project.premise && (
                          <p>
                            <strong>Premisa:</strong> {project.premise.substring(0, 100)}
                            {project.premise.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
} 