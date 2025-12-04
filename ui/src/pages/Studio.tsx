import { useParams } from 'react-router-dom';
import { useCallback, useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { StudioSidebar } from '@/components/studio/StudioSidebar';
import { StudioEditor } from '@/components/studio/StudioEditor';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

export function Studio() {
  const { projectId } = useParams<{ projectId: string }>();
  const {
    isSidebarOpen,
    editorContent,
    activeSceneId,
    updateContent,
    setSelectedText,
    setCursorPosition,
    saveActiveScene,
    isAIProcessing
  } = useStudioStore();

  const { openModal, setMode, isOpen } = usePlannerAIStore();

  // Auto-save effect - ali ne tijekom AI procesiranja
  useEffect(() => {
    // Ne pokreni auto-save ako je AI u tijeku
    if (isAIProcessing) {
      console.log('⏸️ Auto-save pauziran tijekom AI procesiranja');
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (activeSceneId && editorContent && !isAIProcessing) {
        saveActiveScene();
      }
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timeoutId);
  }, [editorContent, activeSceneId, saveActiveScene, isAIProcessing]);

  // Auto-open AI sidebar u brainstorming modu kad se uđe u Studio
  useEffect(() => {
    if (!isOpen && projectId) {
      setMode('brainstorming');
      openModal('studio_brainstorming', '', projectId); // Studio kontekst, bez targetField-a
    }
  }, []); // Prazan dependency array - izvršava se samo pri mountu

  // Callback handleri za editor - memoizirani s useCallback kako bi se spriječili nepotrebni re-renderi
  // content je HTML string koji dolazi iz editor.getHTML()
  const handleContentChange = useCallback((content: string) => {
    updateContent(content);
  }, [updateContent]);

  const handleSelectionChange = useCallback((selection: { from: number; to: number; empty: boolean; text: string }) => {
    setSelectedText(selection.text);
    setCursorPosition(selection.to);
  }, [setSelectedText, setCursorPosition]);


  return (
    <div className="flex h-full overflow-hidden">
      {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <StudioEditor
            key={activeSceneId}
            content={editorContent}
            onContentChange={handleContentChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      </div>
    </div>
  );
}
