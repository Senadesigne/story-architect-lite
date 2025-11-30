import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { api } from '@/lib/serverComm';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Check, RefreshCw, X } from 'lucide-react';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

interface FloatingMenuUIProps {
  editor: Editor;
}

interface AIAction {
  label: string;
  prompt: string;
}

const AI_ACTIONS: AIAction[] = [
  { label: "Prepravi", prompt: "Prepravi ovo da bude bolje." },
  { label: "Skrati", prompt: "Skrati ovo." },
  { label: "Proširi", prompt: "Proširi ovo." },
  { label: "Promijeni ton", prompt: "Promijeni ton u formalniji." },
];

export function FloatingMenuUI({ editor }: FloatingMenuUIProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AIAction | null>(null);
  const [originalSelection, setOriginalSelection] = useState<{ from: number; to: number } | null>(null);
  // State for custom dropdown visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // We track selection state to force re-renders if needed, but BubbleMenu handles its own visibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setIsSelectionEmpty] = useState(editor.state.selection.empty);

  // Global state for Ghost Text (Writer mode)
  const { pendingGhostText, setPendingGhostText } = usePlannerAIStore();

  const activeSuggestion = suggestion || pendingGhostText;

  // Handle selection updates to toggle UI and force re-render
  useEffect(() => {
    const handleSelectionUpdate = () => {
      setIsSelectionEmpty(editor.state.selection.empty);
      // Close menu on selection change
      setIsMenuOpen(false);
    };

    // Initial check
    setIsSelectionEmpty(editor.state.selection.empty);

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleSelectionUpdate);
    };
  }, [editor]);

  const handleAction = async (action: AIAction) => {
    if (!projectId || isLoading) return;

    setIsLoading(true);
    setLastAction(action);
    const { from, to } = editor.state.selection;
    setOriginalSelection({ from, to });

    try {
      const selectedText = editor.state.doc.textBetween(from, to);

      if (!selectedText.trim()) {
        setIsLoading(false);
        return;
      }

      console.log("🚀 FloatingMenu: Sending Contextual Edit request", { action: action.label, selectedText });

      const finalState = await api.chat(projectId, {
        userInput: action.prompt,
        mode: 'contextual-edit',
        editorContent: editor.getText(), // Send full text as context
        selection: selectedText
      });

      console.log("📦 FloatingMenu: Received response", finalState);

      if (finalState && finalState.finalOutput) {
        const newText = finalState.finalOutput;
        setSuggestion(newText);

        // IMMEDIATE UPDATE:
        // If we are editing Ghost Text, we update the editor immediately so the user sees the change.
        if (pendingGhostText) {
          editor
            .chain()
            .focus()
            .deleteSelection()
            .insertGhostText(newText) // Insert as ghost text
            .run();

          // Update the store so "Keep All" knows the new full text
          setPendingGhostText(editor.getText());
        }
      }
    } catch (error) {
      console.error('Error processing AI action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeep = () => {
    if (activeSuggestion) {
      // Just accept Ghost Text (remove mark from all ghost text)
      // @ts-ignore - custom command
      editor.commands.acceptGhostText();

      // Reset state
      setSuggestion(null);
      setPendingGhostText(null);
      setLastAction(null);
      setOriginalSelection(null);
    }
  };

  const handleRetry = () => {
    if (lastAction && originalSelection) {
      // Restore selection just in case (though we kept it in state)
      editor.commands.setTextSelection(originalSelection);
      handleAction(lastAction);
    }
  };

  const handleDiscard = () => {
    // If we are discarding Ghost Text (and not just a local suggestion), remove it entirely
    if (pendingGhostText) {
      // @ts-ignore - custom command
      editor.commands.rejectGhostText();
      setPendingGhostText(null);
    }

    setSuggestion(null);
    setLastAction(null);
    setOriginalSelection(null);
    editor.commands.focus();
  };

  // 1. If there is a selection, ALWAYS show the AI Actions Menu (Standard)
  // We use BubbleMenu to position it near the selection.
  // We render it unconditionally so it can track the selection state internally.
  const bubbleMenu = (
    <BubbleMenu
      editor={editor}
      // @ts-ignore - tippyOptions type mismatch
      tippyOptions={{
        duration: 100,
        zIndex: 99999,
        maxWidth: 'none',
        appendTo: document.body,
        placement: 'bottom-start',
        offset: [0, 10],
      }}
      shouldShow={({ editor }) => !editor.state.selection.empty}
      className="flex z-[99999]"
    >
      <div className="bg-background border rounded-md shadow-lg p-1 relative">
        <Button
          size="sm"
          variant="secondary"
          disabled={isLoading}
          className="shadow-sm gap-2 h-8"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          <span>AI Akcije</span>
        </Button>

        {/* Custom Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover text-popover-foreground border rounded-md shadow-md p-1 z-[100000] animate-in fade-in zoom-in-95 duration-100">
            {AI_ACTIONS.map((action) => (
              <div
                key={action.label}
                onClick={() => {
                  handleAction(action);
                  setIsMenuOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
              >
                {action.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );

  // 2. If no selection, but we have a suggestion (Review Mode), show the Review Bar
  // We position this fixed at the bottom center to be more prominent and less likely to be covered.
  const reviewBar = activeSuggestion ? (
    <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-2 bg-background border rounded-full shadow-2xl p-2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="text-sm max-w-[300px] truncate mr-2 border-r pr-2 text-muted-foreground italic">
        "{activeSuggestion}"
      </div>
      <Button size="sm" variant="ghost" onClick={handleDiscard} title="Odbaci" className="rounded-full h-8 w-8 p-0">
        <X className="h-4 w-4" />
      </Button>
      {/* Retry is only available for local actions (Contextual Edit) for now */}
      {lastAction && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={isLoading}
          title="Ponovo"
          className="cursor-pointer hover:bg-accent rounded-full h-8 w-8 p-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      )}
      <Button size="sm" onClick={handleKeep} title="Zadrži" className="rounded-full px-4">
        <Check className="h-4 w-4 mr-1" /> Zadrži sve
      </Button>
    </div>
  ) : null;

  return (
    <>
      {bubbleMenu}
      {reviewBar}
    </>
  );
}
