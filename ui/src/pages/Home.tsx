import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/serverComm';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/lib/types';
import { Link } from 'react-router-dom';
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
import { RenameProjectDialog } from '@/components/RenameProjectDialog';
import { DeleteProjectDialog } from '@/components/DeleteProjectDialog';
import { debugAuthState } from '@/lib/auth-utils';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Home() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState('');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

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
      setProjectsError('Error fetching projects');
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [user]);

  // Učitavanje projekata kada se komponenta učita
  useEffect(() => {
    fetchProjects();

    // Debug: Provjeri auth stanje kada se Home učita
    if (user) {
      console.log('🏠 Home komponenta učitana za korisnika:', user.email);
      debugAuthState();
    }
  }, [user, fetchProjects]);

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleProjectCreated = async (project: Project) => {
    setCreateProjectResult({ success: true, project });
    await fetchProjects();
  };

  const handleRenameClick = (e: React.MouseEvent, project: Project) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    setProjectToEdit(project);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();
    setProjectToEdit(project);
    setIsDeleteDialogOpen(true);
  };

  const handleActionSuccess = async () => {
    await fetchProjects();
    setProjectToEdit(null);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header sekcija */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">My Projects</h1>
            <p className="text-muted-foreground mt-2">
              Manage your stories and projects in one place.
            </p>
          </div>
          <Button
            onClick={handleOpenCreateDialog}
            disabled={!user}
            size="lg"
          >
            + New Project
          </Button>
        </div>

        {/* Prikaz rezultata kreiranja projekta */}
        {createProjectResult && createProjectResult.success && (
          <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
            <p className="font-medium">✅ Project "{createProjectResult.project?.title}" successfully created!</p>
          </div>
        )}

        {/* Glavni sadržaj - lista projekata */}
        <div className="mt-8">
          {/* Loading state */}
          {isLoadingProjects && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading projects...</p>
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
                Try again
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingProjects && !projectsError && projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                You haven't created any projects yet.
              </p>
              <p className="text-muted-foreground">
                Get started by clicking 'New Project'.
              </p>
            </div>
          )}

          {/* Projects grid */}
          {!isLoadingProjects && !projectsError && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group relative h-full"
                >
                  <Link
                    to={`/project/${project.id}/ideation`}
                    className="block h-full hover:shadow-md transition-shadow"
                  >
                    <Card className="h-full">
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl pr-8 line-clamp-1" title={project.title}>
                          {project.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>
                            <strong>Created:</strong>{' '}
                            {new Date(project.createdAt).toLocaleDateString('en-US')}
                          </p>

                          {project.premise && (
                            <p className="line-clamp-3">
                              <strong>Premise:</strong> {project.premise}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  {/* Dropdown Menu - Outside Link */}
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100 bg-background/50 hover:bg-background"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleRenameClick(e, project)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteClick(e, project)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProjectCreated}
      />

      <RenameProjectDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        project={projectToEdit}
        onSuccess={handleActionSuccess}
      />

      <DeleteProjectDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        project={projectToEdit}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
} 