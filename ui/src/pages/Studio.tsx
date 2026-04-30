import { useParams } from 'react-router-dom';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { StudioSidebar } from '@/components/studio/StudioSidebar';
import { StudioEditor } from '@/components/studio/StudioEditor';
import { RestoreBackupDialog } from '@/components/studio/RestoreBackupDialog';
import { useLocalBackup } from '@/hooks/useLocalBackup';

export function Studio() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    isSidebarOpen,
    editorContent,
    activeSceneId,
    scenes,
    updateContent,
    setSelectedText,
    setCursorPosition,
    saveActiveScene,
    forceSave,
    isAIProcessing,
    saveStatus,
    hasUnsavedChanges,
    setIsOnline
  } = useStudioStore();

  // const { openModal, setMode, isOpen } = usePlannerAIStore();

  // NOVO: useLocalBackup hook
  const {
    startBackup,
    stopBackup,
    getBackup,
    clearBackup,
    isBackupNewer
  } = useLocalBackup();

  // NOVO: State za restore dialog
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<any>(null);

  // Auto-save effect - AŽURIRANO: smanjeno na 1s
  useEffect(() => {
    // Ne pokreni auto-save ako je AI u tijeku
    if (isAIProcessing) {
      console.log('⏸️ Auto-save pauziran tijekom AI procesiranja');
      return;
    }

    const timeoutId = setTimeout(() => {
      if (activeSceneId && !isAIProcessing) {
        saveActiveScene();
      }
    }, 1000); // IZMIJENJENO: sa 2000 na 1000 (1 sekunda)

    return () => clearTimeout(timeoutId);
  }, [editorContent, activeSceneId, saveActiveScene, isAIProcessing]);

  // NOVO: localStorage backup effect
  useEffect(() => {
    if (activeSceneId) {
      startBackup(activeSceneId, editorContent);
    }
    return () => stopBackup();
  }, [activeSceneId, editorContent, startBackup, stopBackup]);

  // NOVO: Očisti backup nakon uspješnog spremanja
  useEffect(() => {
    if (saveStatus === 'saved' && activeSceneId) {
      clearBackup(activeSceneId);
    }
  }, [saveStatus, activeSceneId, clearBackup]);

  // NOVO: Ref da pratimo jesmo li već provjerili backup za trenutnu scenu
  const lastCheckedSceneId = useRef<string | null>(null);

  // NOVO: Provjeri backup pri učitavanju scene
  useEffect(() => {
    // Provjeri samo ako imamo aktivnu scenu, ako imamo sadržaj i ako NISMO već provjerili ovu scenu
    if (activeSceneId && editorContent && activeSceneId !== lastCheckedSceneId.current) {
      const backup = getBackup(activeSceneId);
      const scene = scenes.find(s => s.id === activeSceneId);

      // Ako scena još nije učitana (nema je u scenes arrayu), pričekaj
      if (!scene) return;

      // Označi da smo provjerili ovu scenu kako se ne bi ponavljalo pri svakom auto-saveu
      lastCheckedSceneId.current = activeSceneId;

      if (backup && isBackupNewer(
        activeSceneId,
        scene.content || scene.summary || '',
        Date.now() - 60000 // Usporedi s prije 1 minutu
      )) {
        setShowRestoreDialog(true);
        setBackupToRestore(backup);
      }
    }
  }, [activeSceneId, scenes, getBackup, isBackupNewer, editorContent]);

  // NOVO: beforeunload handler - sprječava zatvaranje s nespremljenim promjenama
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, saveStatus]);

  // NOVO: Ctrl+S keyboard shortcut za manual save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S ili Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Spriječi browser default (Save Page)

        // Forsiraj spremanje
        forceSave();

        console.log('💾 Manual save triggered (Ctrl+S)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [forceSave]);

  // NOVO: Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // DISABLED: Auto-open AI sidebar u brainstorming modu kad se uđe u Studio
  // useEffect(() => {
  //   if (!isOpen && projectId) {
  //     setMode('brainstorming');
  //     openModal('studio_brainstorming', '', projectId);
  //   }
  // }, []); // Prazan dependency array - izvršava se samo pri mountu

  // Callback handleri za editor
  const handleContentChange = useCallback((content: string) => {
    updateContent(content);
  }, [updateContent]);

  const handleSelectionChange = useCallback((selection: { from: number; to: number; empty: boolean; text: string }) => {
    setSelectedText(selection.text);
    setCursorPosition(selection.to);
  }, [setSelectedText, setCursorPosition]);

  // NOVO: Handler za restore backup-a
  const handleRestoreBackup = useCallback(() => {
    if (backupToRestore && activeSceneId) {
      updateContent(backupToRestore.content);
      setShowRestoreDialog(false);
      setBackupToRestore(null);
      console.log('✅ Backup vraćen za scenu', activeSceneId);
    }
  }, [backupToRestore, activeSceneId, updateContent]);

  // NOVO: Handler za zadržavanje server verzije
  const handleKeepServer = useCallback(() => {
    if (activeSceneId) {
      clearBackup(activeSceneId);
      setShowRestoreDialog(false);
      setBackupToRestore(null);
      console.log('🗑️ Backup odbačen, zadržana server verzija');
    }
  }, [activeSceneId, clearBackup]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* NOVO: Restore Backup Dialog */}
      <RestoreBackupDialog
        open={showRestoreDialog}
        backup={backupToRestore}
        serverTimestamp={Date.now() - 60000} // Trenutno vrijeme - 1 minuta
        onRestore={handleRestoreBackup}
        onKeepServer={handleKeepServer}
      />

      {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeSceneId ? (
            <StudioEditor
              key={activeSceneId}
              content={editorContent}
              onContentChange={handleContentChange}
              onSelectionChange={handleSelectionChange}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <p className="text-lg font-medium mb-2">No scene selected</p>
              <p>Select a scene or chapter from the panel on the left to start writing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
