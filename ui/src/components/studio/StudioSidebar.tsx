import { useEffect, useState } from 'react';
import { api } from '@/lib/serverComm';
import { useStudioStore } from '@/stores/studioStore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
import {
  FileText,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';


interface StudioSidebarProps {
  projectId: string;
}

const PHASES = [
  { id: 'setup', label: 'Setup' },
  { id: 'inciting_incident', label: 'Inciting Incident' },
  { id: 'midpoint', label: 'Midpoint' },
  { id: 'climax', label: 'Climax' },
  { id: 'falling_action', label: 'Falling Action' },
];

export function StudioSidebar({ projectId }: StudioSidebarProps) {
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['setup']));
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Dialog States
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  const [selectedItem, setSelectedItem] = useState<{ type: 'chapter' | 'scene', id: string, title: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const {
    scenes,
    chapters,
    activeSceneId,
    isSidebarOpen,
    setActiveScene,
    addScene,
    deleteSceneFromStore,
    renameSceneInStore,
    initializeWithScenes,
    setChapters,
    addChapter,
    updateChapterInStore,
    deleteChapterFromStore
  } = useStudioStore();

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;


      setError(null);

      try {
        const [scenesData, chaptersData] = await Promise.all([
          api.getScenes(projectId),
          api.getChapters(projectId)
        ]);

        initializeWithScenes(scenesData);
        setChapters(chaptersData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Greška pri dohvaćanju podataka');
      }
    };

    fetchData();
  }, [projectId, initializeWithScenes, setChapters]);

  // Toggles
  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  // Actions
  const handleCreateChapter = async (phaseId: string) => {
    if (!projectId) return;

    try {
      const phaseChapters = chapters.filter(c => c.phase === phaseId);
      const newChapterData = {
        title: `Novo Poglavlje ${phaseChapters.length + 1}`,
        phase: phaseId,
        order: phaseChapters.length
      };

      const newChapter = await api.createChapter(projectId, newChapterData);
      addChapter(newChapter);

      // Auto-expand phase
      if (!expandedPhases.has(phaseId)) {
        togglePhase(phaseId);
      }
    } catch (err) {
      console.error('Error creating chapter:', err);
      setError('Greška pri kreiranju poglavlja');
    }
  };

  const handleCreateScene = async (chapterId: string) => {
    if (!projectId) return;

    try {
      const chapterScenes = scenes.filter(s => s.chapterId === chapterId);
      const newSceneData = {
        title: `Scena ${chapterScenes.length + 1}`,
        summary: '',
        order: chapterScenes.length,
        chapterId: chapterId
      };

      const newScene = await api.createScene(projectId, newSceneData);
      addScene(newScene);

      // Auto-expand chapter
      if (!expandedChapters.has(chapterId)) {
        toggleChapter(chapterId);
      }
    } catch (err) {
      console.error('Error creating scene:', err);
      setError('Greška pri kreiranju scene');
    }
  };

  const handleRenameSubmit = async () => {
    if (!selectedItem || !renameValue.trim()) return;

    setIsOperationLoading(true);
    try {
      if (selectedItem.type === 'chapter') {
        updateChapterInStore(selectedItem.id, { title: renameValue });
        await api.updateChapter(selectedItem.id, { title: renameValue });
      } else {
        renameSceneInStore(selectedItem.id, renameValue);
        await api.updateScene(selectedItem.id, { title: renameValue });
      }
      setIsRenameDialogOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error renaming:', err);
      setError('Greška pri preimenovanju');
      // Revert would go here
    } finally {
      setIsOperationLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    setIsOperationLoading(true);
    try {
      if (selectedItem.type === 'chapter') {
        deleteChapterFromStore(selectedItem.id);
        await api.deleteChapter(selectedItem.id);
      } else {
        deleteSceneFromStore(selectedItem.id);
        await api.deleteScene(selectedItem.id);
      }
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
    } catch (err) {
      console.error('Error deleting:', err);
      setError('Greška pri brisanju');
    } finally {
      setIsOperationLoading(false);
    }
  };



  if (!isSidebarOpen) return null;

  return (
    <div className="w-64 h-full bg-sidebar-background/95 backdrop-blur-sm border-r border-border/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Struktura</h3>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {error}
              <Button variant="ghost" size="sm" className="h-6 mt-2" onClick={() => setError(null)}>Zatvori</Button>
            </div>
          )}

          {PHASES.map(phase => {
            const phaseChapters = chapters
              .filter(c => c.phase === phase.id)
              .sort((a, b) => a.order - b.order);
            const isExpanded = expandedPhases.has(phase.id);

            return (
              <div key={phase.id} className="select-none">
                {/* Phase Header */}
                <div
                  className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer group"
                  onClick={() => togglePhase(phase.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-medium flex-1">{phase.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateChapter(phase.id);
                    }}
                    title="Dodaj Poglavlje"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Phase Content (Chapters) */}
                {isExpanded && (
                  <div className="ml-4 border-l border-border/50 pl-1">
                    {phaseChapters.map(chapter => {
                      const chapterScenes = scenes
                        .filter(s => s.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order);
                      const isChapterExpanded = expandedChapters.has(chapter.id);

                      return (
                        <div key={chapter.id}>
                          {/* Chapter Header */}
                          <div
                            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer group"
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setOpenDropdownId(chapter.id);
                            }}
                            onClick={() => toggleChapter(chapter.id)}
                          >
                            {isChapterExpanded ?
                              <FolderOpen className="h-4 w-4 text-blue-500/70" /> :
                              <Folder className="h-4 w-4 text-blue-500/70" />
                            }
                            <span className="text-sm flex-1 truncate">{chapter.title}</span>

                            {/* Chapter Actions */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 mr-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCreateScene(chapter.id);
                                }}
                                title="Dodaj Scenu"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <DropdownMenu
                                open={openDropdownId === chapter.id}
                                onOpenChange={(open) => setOpenDropdownId(open ? chapter.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedItem({ type: 'chapter', id: chapter.id, title: chapter.title });
                                    setRenameValue(chapter.title);
                                    setIsRenameDialogOpen(true);
                                    setOpenDropdownId(null);
                                  }}>
                                    <Edit className="h-4 w-4 mr-2" /> Preimenuj
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedItem({ type: 'chapter', id: chapter.id, title: chapter.title });
                                      setIsDeleteDialogOpen(true);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Izbriši
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Chapter Content (Scenes) */}
                          {isChapterExpanded && (
                            <div className="ml-4 border-l border-border/50 pl-1">
                              {chapterScenes.map(scene => (
                                <div
                                  key={scene.id}
                                  className={cn(
                                    "flex items-center gap-2 p-2 rounded-md cursor-pointer group text-sm",
                                    activeSceneId === scene.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-muted-foreground"
                                  )}
                                  onClick={() => setActiveScene(scene.id)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setOpenDropdownId(scene.id);
                                  }}
                                >
                                  <FileText className="h-3 w-3" />
                                  <span className="flex-1 truncate">{scene.title}</span>

                                  <DropdownMenu
                                    open={openDropdownId === scene.id}
                                    onOpenChange={(open) => setOpenDropdownId(open ? scene.id : null)}
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("h-6 w-6 p-0 opacity-0 group-hover:opacity-100", openDropdownId === scene.id && "opacity-100")}
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedItem({ type: 'scene', id: scene.id, title: scene.title });
                                        setRenameValue(scene.title);
                                        setIsRenameDialogOpen(true);
                                        setOpenDropdownId(null);
                                      }}>
                                        <Edit className="h-4 w-4 mr-2" /> Preimenuj
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem({ type: 'scene', id: scene.id, title: scene.title });
                                          setIsDeleteDialogOpen(true);
                                          setOpenDropdownId(null);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" /> Izbriši
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}
                              {chapterScenes.length === 0 && (
                                <div className="p-2 text-xs text-muted-foreground italic ml-2">
                                  Nema scena
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {phaseChapters.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground italic ml-2">
                        Nema poglavlja
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preimenuj {selectedItem?.type === 'chapter' ? 'poglavlje' : 'scenu'}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Odustani</Button>
            <Button onClick={handleRenameSubmit} disabled={isOperationLoading}>Spremi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Izbriši {selectedItem?.type === 'chapter' ? 'poglavlje' : 'scenu'}</AlertDialogTitle>
            <AlertDialogDescription>
              Jeste li sigurni? Ova radnja je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">Izbriši</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
