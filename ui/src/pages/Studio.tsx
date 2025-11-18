import { useParams } from 'react-router-dom';
import { useCallback } from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { StudioSidebar } from '@/components/studio/StudioSidebar';
import { StudioEditor } from '@/components/studio/StudioEditor';
import { CommandBar } from '@/components/studio/CommandBar';

export function Studio() {
  const { projectId } = useParams<{ projectId: string }>();
  const { 
    isSidebarOpen, 
    editorContent, 
    activeSceneId,
    updateContent, 
    setSelectedText, 
    setCursorPosition 
  } = useStudioStore();

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
    <div className="flex h-[calc(100vh-3.5rem)]"> {/* Visina minus ProjectNav */}
      {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <StudioEditor
            key={activeSceneId}
            content={editorContent}
            onContentChange={handleContentChange}
            onSelectionChange={handleSelectionChange}
          />
        </div>
        <CommandBar projectId={projectId!} />
      </div>
    </div>
  );
}
