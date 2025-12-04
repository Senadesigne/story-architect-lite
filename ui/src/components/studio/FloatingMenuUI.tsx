import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import { api } from '@/lib/serverComm';
import { Button } from '@/components/ui/button';
import { Wand2, Loader2, Check, RefreshCw, X } from 'lucide-react';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { useStudioStore } from '@/stores/studioStore';

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
  const [originalSelection, setOriginalSelection] = useState<{ from: number; to: number; text: string } | null>(null);
  // State for custom dropdown visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // We track selection state to force re-renders if needed, but BubbleMenu handles its own visibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setIsSelectionEmpty] = useState(editor.state.selection.empty);

  // Global state for Ghost Text (Writer mode)
  const { pendingGhostText, setPendingGhostText } = usePlannerAIStore();
  
  // Studio store za AI processing lock
  const { setAIProcessing } = useStudioStore();

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
    
    // Postavi AI processing lock da sprijećimo auto-save tijekom procesiranja
    setAIProcessing(true);
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);

    // Store selection AND text so we can restore it if discarded
    setOriginalSelection({ from, to, text: selectedText });

    // 1. Mark the selection so we can find it later even if the document changes
    editor.chain().focus().setMark('ghost', { class: 'pending-edit' }).run();

    try {
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

        // 2. Find the marked selection dynamically
        let targetFrom = Infinity;
        let targetTo = -Infinity;
        let foundMark = false;

        console.log("🔍 FloatingMenu: Searching for ghost mark...");
        editor.state.doc.descendants((node, pos) => {
          const hasGhost = node.marks.find(m => m.type.name === 'ghost' && m.attrs.class === 'pending-edit');
          if (hasGhost) {
            console.log(`   Found ghost node at ${pos}, size ${node.nodeSize}`);
            if (pos < targetFrom) targetFrom = pos;
            if (pos + node.nodeSize > targetTo) targetTo = pos + node.nodeSize;
            foundMark = true;
          }
        });

        console.log(`🎯 FloatingMenu: Target Range [${targetFrom}, ${targetTo}], Found: ${foundMark}`);

        // Fallback if mark is lost
        if (!foundMark) {
          console.warn("⚠️ Ghost mark lost, using original coordinates");
          targetFrom = from;
          targetTo = to;
        }
        
        // SIGURNOSNA PROVJERA: Provjeri da su koordinate valjane
        const docSize = editor.state.doc.content.size;
        if (targetFrom < 0 || targetTo > docSize || targetFrom > targetTo) {
          console.error(`❌ Nevaljane koordinate: from=${targetFrom}, to=${targetTo}, docSize=${docSize}`);
          setIsLoading(false);
          setAIProcessing(false);
          return;
        }

        // --- DEEP DIAGNOSTIC LOGGING ---
        console.group("🕵️ FloatingMenu: Deep Diagnostic");
        let finalFrom = targetFrom;
        let finalTo = targetTo;
        console.log("1. Initial Ranges:", { targetFrom, targetTo, finalFrom, finalTo });

        // Log document structure around the target
        try {
          const slice = editor.state.doc.slice(Math.max(0, finalFrom - 10), Math.min(editor.state.doc.content.size, finalTo + 10));
          console.log("2. Document Slice (JSON):", slice.toJSON());
          console.log("3. Parent Node:", editor.state.doc.resolve(finalFrom).parent.type.name);
        } catch (e) { console.error("Log failed", e); }

        // --- SMART BLOCK REPLACEMENT STRATEGY ---
        let replaceWithBlock = false;

        try {
          const $from = editor.state.doc.resolve(targetFrom);
          const $to = editor.state.doc.resolve(targetTo);

          if (!$from.sameParent($to)) {
            console.log("🧱 Cross-block selection detected.");
            replaceWithBlock = true;
            finalFrom = $from.before(1);
            finalTo = $to.after(1);
            console.log(`🧱 Adjusted to Block Range: [${finalFrom}, ${finalTo}]`);
          } else {
            console.log("📄 Inline selection detected (same parent).");
          }
        } catch (e) {
          console.error("Error calculating block expansion:", e);
        }

        console.log(`✂️ Replacing range [${finalFrom}, ${finalTo}]`);
        
        // KRITIČNO: Koristi jedinstvenu transakciju za sve operacije
        // Ovo sprječava race conditione između transakcija
        const success = editor.chain()
          .focus()
          .command(({ tr, dispatch, state }) => {
            if (!dispatch) return false;
            
            try {
              console.log("🧹 Započinje jedinstvena transakcija zamjene");
              
              // 1. Prvo ukloni ghost mark SAMO iz ciljanog raspona
              if (foundMark) {
                tr.removeMark(finalFrom, finalTo, state.schema.marks.ghost);
                console.log("✅ Ghost mark uklonjen iz raspona");
              }
              
              // 2. Obriši stari tekst
              tr.delete(finalFrom, finalTo);
              console.log(`🗑️ Obrisan tekst iz raspona [${finalFrom}, ${finalTo}]`);
              
              // 3. Umetni novi tekst (bez marka za sada)
              const contentNode = state.schema.text(newText);
              tr.insert(finalFrom, contentNode);
              console.log(`✅ Umetnut novi tekst: "${newText.substring(0, 50)}..."`);
              
              return true;
            } catch (e) {
              console.error("❌ Transakcija neuspješna:", e);
              return false;
            }
          })
          .run();
          
        if (!success) {
          console.error("❌ Zamjena teksta neuspješna");
          setIsLoading(false);
          setAIProcessing(false);
          return;
        }

        
        // Dodaj ghost mark na novi tekst nakon uspješne zamjene
        setTimeout(() => {
          const newFrom = finalFrom;
          const newTo = finalFrom + newText.length;
          
          editor.chain()
            .focus()
            .setTextSelection({ from: newFrom, to: newTo })
            .setMark('ghost', { class: 'pending-edit' })
            .run();
          
          console.log(`👻 Ghost mark dodan na novi tekst [${newFrom}, ${newTo}]`);
        }, 50);

        console.groupEnd();

        // Update the store so "Keep All" knows the new full text
        setTimeout(() => {
          setPendingGhostText(newText); // Samo novi tekst, ne cijeli dokument
        }, 50);
      }
    } catch (error) {
      console.error('Error processing AI action:', error);
    } finally {
      setIsLoading(false);
      // Oslobodi AI processing lock
      setAIProcessing(false);
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
      editor.commands.setTextSelection({ from: originalSelection.from, to: originalSelection.to });
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

    // RESTORE ORIGINAL TEXT if we have it
    if (originalSelection && originalSelection.text) {
      editor.chain()
        .focus()
        .insertContentAt(originalSelection.from, originalSelection.text)
        .setTextSelection({ from: originalSelection.from, to: originalSelection.to })
        .run();
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
