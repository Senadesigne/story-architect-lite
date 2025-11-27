import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { FloatingMenuUI } from './FloatingMenuUI';
import { useStudioStore } from '@/stores/studioStore';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { GhostTextExtension } from './GhostTextExtension';
import { useEffect } from 'react';

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
    shouldShow: ({ editor }) => {
      return !editor.state.selection.empty;
    },
  }),
  GhostTextExtension,
];

export function StudioEditor({
  content,
  onContentChange,
  onSelectionChange
}: StudioEditorProps) {
  const { setEditor } = useStudioStore();
  const {
    setEditorContent: setAIEditorContent,
    pendingGhostText,
    ghostTextAction,
    setGhostTextAction,
    setPendingGhostText
  } = usePlannerAIStore();

  const editor = useEditor({
    extensions,
    content,
    onCreate: ({ editor }) => {
      setEditor(editor);
      // Inicijalno postavi sadržaj u AI store
      setAIEditorContent(editor.getHTML());
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onContentChange(html);
      setAIEditorContent(html);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      onSelectionChange({ from, to, empty, text: editor.state.doc.textBetween(from, to) });
    },
    onDestroy: () => {
      setEditor(null);
    },
  });

  // Efekt za prikazivanje Ghost Teksta
  useEffect(() => {
    if (editor) {
      // @ts-ignore - Custom command
      editor.commands.setGhostText(pendingGhostText);
    }
  }, [editor, pendingGhostText]);

  // Efekt za prihvaćanje/odbijanje Ghost Teksta
  useEffect(() => {
    if (!editor || ghostTextAction === 'idle') return;

    if (ghostTextAction === 'accept' && pendingGhostText) {
      // Ubaci tekst na trenutnu poziciju
      editor.commands.insertContent(pendingGhostText);
      // Očisti ghost text
      setPendingGhostText(null);
    } else if (ghostTextAction === 'reject') {
      // Samo očisti ghost text
      setPendingGhostText(null);
    }

    // Resetiraj akciju
    setGhostTextAction('idle');
  }, [editor, ghostTextAction, pendingGhostText, setPendingGhostText, setGhostTextAction]);

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
