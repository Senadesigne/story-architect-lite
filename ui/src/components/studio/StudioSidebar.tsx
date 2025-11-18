import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/serverComm';
import { Scene } from '@/lib/types';
import { useStudioStore } from '@/stores/studioStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileText, Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';

interface StudioSidebarProps {
  projectId: string;
}

export function StudioSidebar({ projectId }: StudioSidebarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State varijable za modalne dijaloge
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // State za API operacije
  const [isOperationLoading, setIsOperationLoading] = useState(false);
  
  // State za Context Menu kontrolu
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  const { 
    scenes, 
    activeSceneId, 
    isSidebarOpen, 
    setActiveScene, 
    addScene,
    deleteSceneFromStore,
    restoreSceneToStore,
    renameSceneInStore,
    initializeWithScenes 
  } = useStudioStore();

  // Dohvaćanje scena
  useEffect(() => {
    const fetchScenes = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const scenesData = await api.getScenes(projectId);
        initializeWithScenes(scenesData);
      } catch (err) {
        console.error('Error fetching scenes:', err);
        setError('Greška pri dohvaćanju scena');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenes();
  }, [projectId, initializeWithScenes]);

  // Event handleri za upravljanje scenama
  const handleRenameClick = (sceneId: string, currentTitle: string) => {
    setSelectedSceneId(sceneId);
    setRenameValue(currentTitle);
    setIsRenameDialogOpen(true);
  };

  const handleDeleteClick = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setIsDeleteDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!selectedSceneId || !renameValue.trim()) return;
    
    const newTitle = renameValue.trim();
    
    // Spremi staru scenu za rollback
    const oldScene = scenes.find(scene => scene.id === selectedSceneId);
    if (!oldScene) return;
    
    setIsOperationLoading(true);
    setError(null);
    
    try {
      // 1. Optimistic update - odmah ažuriraj UI
      renameSceneInStore(selectedSceneId, newTitle);
      
      // 2. Pozovi API
      await api.updateScene(selectedSceneId, { title: newTitle });
      
      // 3. Uspjeh - zatvori modal
      setIsRenameDialogOpen(false);
      setSelectedSceneId(null);
      setRenameValue('');
      
    } catch (err) {
      console.error('Error renaming scene:', err);
      
      // 4. Rollback - vrati stari naziv
      renameSceneInStore(selectedSceneId, oldScene.title);
      
      // 5. Prikaži grešku
      setError('Greška pri preimenovanju scene. Pokušajte ponovno.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedSceneId) return;
    
    // Spremi staru scenu i aktivnu scenu za rollback
    const oldScene = scenes.find(scene => scene.id === selectedSceneId);
    const wasActiveScene = activeSceneId === selectedSceneId;
    const oldActiveSceneId = activeSceneId;
    
    if (!oldScene) return;
    
    setIsOperationLoading(true);
    setError(null);
    
    try {
      // 1. Optimistic update - odmah ukloni iz UI
      deleteSceneFromStore(selectedSceneId);
      
      // 2. Pozovi API
      await api.deleteScene(selectedSceneId);
      
      // 3. Uspjeh - zatvori modal
      setIsDeleteDialogOpen(false);
      setSelectedSceneId(null);
      
    } catch (err) {
      console.error('Error deleting scene:', err);
      
      // 4. Rollback - vrati obrisanu scenu na popis
      restoreSceneToStore(oldScene, wasActiveScene);
      
      // 5. Prikaži grešku
      setError('Greška pri brisanju scene. Pokušajte ponovno.');
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleRenameCancel = () => {
    if (isOperationLoading) return;
    setIsRenameDialogOpen(false);
    setSelectedSceneId(null);
    setRenameValue('');
  };

  const handleDeleteCancel = () => {
    if (isOperationLoading) return;
    setIsDeleteDialogOpen(false);
    setSelectedSceneId(null);
  };

  // Funkcija za kreiranje nove scene
  const handleCreateScene = async () => {
    if (!projectId) return;
    
    try {
      const newSceneData = {
        title: `Scena ${scenes.length + 1}`,
        summary: '',
        order: scenes.length
      };
      
      const newScene = await api.createScene(projectId, newSceneData);
      addScene(newScene);
    } catch (err) {
      console.error('Error creating scene:', err);
      setError('Greška pri kreiranju scene');
    }
  };

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
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCreateScene}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-6 text-xs"
                onClick={() => setError(null)}
              >
                Zatvori
              </Button>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Učitavam scene...</p>
            </div>
          ) : scenes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Nema scena</p>
              <Button size="sm" variant="outline" onClick={handleCreateScene}>
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
                      <div 
                        className="relative group"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenDropdownId(scene.id);
                        }}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start text-left h-auto p-3 pr-10"
                          onClick={async () => {
                            try {
                              await setActiveScene(scene.id);
                            } catch (error) {
                              console.error('Greška pri prebacivanju scene:', error);
                            }
                          }}
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
                        
                        {/* Dropdown Menu */}
                        <div className="absolute top-2 right-2">
                          <DropdownMenu 
                            open={openDropdownId === scene.id}
                            onOpenChange={(open) => setOpenDropdownId(open ? scene.id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => {
                                  handleRenameClick(scene.id, scene.title);
                                  setOpenDropdownId(null);
                                }}
                                className="cursor-pointer"
                                disabled={isOperationLoading}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Preimenuj
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  handleDeleteClick(scene.id);
                                  setOpenDropdownId(null);
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                disabled={isOperationLoading}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Izbriši
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
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

      {/* Rename Dialog */}
      <Dialog 
        open={isRenameDialogOpen} 
        onOpenChange={(open) => {
          if (!isOperationLoading) {
            setIsRenameDialogOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preimenuj scenu</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Unesite novi naziv scene"
              onKeyDown={(e) => {
                if (isOperationLoading) return;
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                } else if (e.key === 'Escape') {
                  handleRenameCancel();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleRenameCancel}
              disabled={isOperationLoading}
            >
              Odustani
            </Button>
            <Button 
              onClick={handleRenameSubmit}
              disabled={!renameValue.trim() || isOperationLoading}
            >
              {isOperationLoading ? 'Spremam...' : 'Spremi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          if (!isOperationLoading) {
            setIsDeleteDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši scenu</AlertDialogTitle>
            <AlertDialogDescription>
              Jeste li sigurni da želite izbrisati ovu scenu? Ova akcija se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleDeleteCancel}
              disabled={isOperationLoading}
            >
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isOperationLoading}
            >
              {isOperationLoading ? 'Brišem...' : 'Izbriši'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
