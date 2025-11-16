import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Editor } from '@tiptap/core';
import { api } from '@/lib/serverComm';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wand2, Loader2 } from 'lucide-react';

interface FloatingMenuUIProps {
  editor: Editor;
}

interface AIAction {
  label: string;
  prompt: string;
}

const AI_ACTIONS: AIAction[] = [
  { label: "Prepravi", prompt: "Prepravi sljedeći tekst: " },
  { label: "Skrati", prompt: "Skrati sljedeći tekst zadržavajući ključne informacije: " },
  { label: "Proširi", prompt: "Proširi i obogati sljedeći tekst: " },
  { label: "Promijeni ton", prompt: "Promijeni ton sljedećeg teksta na formalniji: " },
];

export function FloatingMenuUI({ editor }: FloatingMenuUIProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: AIAction) => {
    if (!projectId || isLoading) return;

    setIsLoading(true);

    try {
      // Dohvati selektirani tekst iz editora
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);

      if (!selectedText.trim()) {
        console.warn('No text selected');
        return;
      }

      // Pozovi AI API
      const response = await api.chat(projectId, {
        userInput: `${action.prompt}"${selectedText}"`,
      });

      // Zamijeni selektirani tekst s AI odgovorom
      if (response.finalState?.finalOutput) {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(response.finalState.finalOutput)
          .run();
      }
    } catch (error) {
      console.error('Error processing AI action:', error);
      // TODO: Dodaj toast notifikaciju za greške
    } finally {
      setIsLoading(false);
    }
  };

  // Ne prikazuj menu ako nema selekcije
  if (editor.state.selection.empty) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          size="sm" 
          variant="secondary" 
          disabled={isLoading}
          className="shadow-lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          <span className="ml-2">AI Akcije</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {AI_ACTIONS.map((action) => (
          <DropdownMenuItem 
            key={action.label} 
            onClick={() => handleAction(action)}
            disabled={isLoading}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
