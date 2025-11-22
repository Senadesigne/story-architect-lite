import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import { FloatingMenuUI } from './FloatingMenuUI';
import { useEffect } from 'react';
import { useStudioStore } from '@/stores/studioStore';

interface StudioEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSelectionChange: (selection: { from: number; to: number; empty: boolean; text: string }) => void;
}

const extensions = [
  StarterKit,
  Placeholder.configure({
    placeholder: 'Započnite pisati svoju priču...',
  }),
  FloatingMenu.configure({
    tippyOptions: {
      duration: 100,
    },
    shouldShow: ({ editor }) => {
      // Pokaži floating menu samo kada je tekst selektiran
      return !editor.state.selection.empty;
    },
  }),
];

export function StudioEditor({ 
  content, 
  onContentChange,
  onSelectionChange 
}: StudioEditorProps) {
  const { setEditor } = useStudioStore();
  
  const editor = useEditor({
    extensions,
    content,
    onCreate: ({ editor }) => {
      // Dijeli editor instancu sa store-om kada se kreira
      setEditor(editor);
    },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      onSelectionChange({ from, to, empty, text: editor.state.doc.textBetween(from, to) });
    },
    onDestroy: () => {
      // Očisti editor instancu kada se komponenta uništi
      setEditor(null);
    },
  });


  return (
    <div className="h-full flex flex-col">
      {editor && <FloatingMenuUI editor={editor} />}
      {/* Outer wrapper - scroll container s pozadinom */}
      <div className="flex-1 overflow-y-auto bg-muted/50 py-8 px-4 md:px-8">
        {/* Paper container - centriran "papir" s vizualnim identitetom */}
        <div className="mx-auto w-full max-w-3xl min-h-[calc(100%-4rem)] bg-background rounded-lg shadow-card border border-border/50">
          {/* Content area - editor s prose stilovima */}
          <div className="p-12 md:p-16">
            <EditorContent 
              editor={editor} 
              className="prose prose-lg prose-slate dark:prose-invert max-w-none focus:outline-none" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
