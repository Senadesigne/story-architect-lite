import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/serverComm';
import { Scene } from '@/lib/types';
import { useStudioStore } from '@/stores/studioStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, Plus } from 'lucide-react';

interface StudioSidebarProps {
  projectId: string;
}

export function StudioSidebar({ projectId }: StudioSidebarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    scenes, 
    activeSceneId, 
    isSidebarOpen, 
    setActiveScene, 
    setScenes 
  } = useStudioStore();

  // Dohvaćanje scena
  useEffect(() => {
    const fetchScenes = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const scenesData = await api.getScenes(projectId);
        setScenes(scenesData);
        
        // Automatski aktiviraj prvu scenu ako nema aktivne scene
        if (!activeSceneId && scenesData.length > 0) {
          setActiveScene(scenesData[0].id);
        }
      } catch (err) {
        console.error('Error fetching scenes:', err);
        setError('Greška pri dohvaćanju scena');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenes();
  }, [projectId, activeSceneId, setActiveScene]);

  // Ne prikazuj sidebar ako je zatvoren
  if (!isSidebarOpen) {
    return null;
  }

  return (
    <div className="w-64 h-full bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">Scene</h3>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Učitavam scene...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : scenes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Nema scena</p>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj scenu
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {scenes
                .sort((a, b) => a.order - b.order)
                .map((scene, index) => {
                  const isActive = scene.id === activeSceneId;
                  return (
                    <div key={scene.id}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start text-left h-auto p-3"
                        onClick={() => setActiveScene(scene.id)}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {index + 1}.
                              </span>
                              <span className="font-medium text-sm truncate">
                                {scene.title}
                              </span>
                            </div>
                            {scene.summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {scene.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </Button>
                      {index < scenes.length - 1 && (
                        <Separator className="my-1" />
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
