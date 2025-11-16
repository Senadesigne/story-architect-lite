import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { api } from '@/lib/serverComm';
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

  // Debounce editor content za auto-save (3 sekunde)
  const [debouncedContent] = useDebounce(editorContent, 3000);

  // Auto-save logika
  useEffect(() => {
    const saveContent = async () => {
      if (debouncedContent && activeSceneId) {
        try {
          await api.updateScene(activeSceneId, { summary: debouncedContent });
          console.log("Scena spremljena!");
        } catch (error) {
          console.error("Greška pri spremanju scene:", error);
        }
      }
    };

    saveContent();
  }, [debouncedContent, activeSceneId]);

  // Callback handleri za editor
  const handleContentChange = (content: string) => {
    updateContent(content);
  };

  const handleSelectionChange = (selection: { from: number; to: number; empty: boolean; text: string }) => {
    setSelectedText(selection.text);
    setCursorPosition(selection.to);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]"> {/* Visina minus ProjectNav */}
      {isSidebarOpen && <StudioSidebar projectId={projectId!} />}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <StudioEditor
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
