import { useEditor, EditorContent } from '@tiptap/react';
import { FloatingMenu } from '@tiptap/extension-floating-menu';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import { FloatingMenuUI } from './FloatingMenuUI';
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
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to, empty } = editor.state.selection;
      onSelectionChange({ from, to, empty, text: editor.state.doc.textBetween(from, to) });
    },
  });

  // Ažuriraj editor sadržaj kada se content prop promijeni
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  return (
    <>
      {editor && <FloatingMenuUI editor={editor} />}
      <EditorContent editor={editor} className="prose prose-lg max-w-none" />
    </>
  );
}
