import React, { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from 'react';

import { usePlannerAIStore } from '@/stores/plannerAIStore';

// Type definition for project fields that can be edited
type ProjectField = 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research';

interface Phase2FormProps {
  onFieldChange: (field: ProjectField, value: string) => void;
  renderSaveIndicator: (field: ProjectField) => React.ReactNode;
  formData: {
    brainstorming: string;
    research: string;
  };
}

export function Phase2Form({ onFieldChange, renderSaveIndicator, formData }: Phase2FormProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [renamingSection, setRenamingSection] = useState<{ title: string, lineIndex: number } | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Planner AI Store
  const {
    openModal,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za Istraživanje
  const handleResearchMagicClick = () => {
    if (!projectId) return;
    openModal('planner_research', 'research', projectId);
  };

  // Parsiranje naslova za navigaciju
  const sections = useMemo(() => {
    if (!formData.research) return [];

    const lines = formData.research.split('\n');
    const headers: { title: string, index: number, lineIndex: number }[] = [];
    let currentIndex = 0;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      // Detektiraj naslove: === NASLOV ===
      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
        headers.push({
          title: trimmed.replace(/===/g, '').trim(),
          index: currentIndex,
          lineIndex: lineIdx
        });
      }
      currentIndex += line.length + 1; // +1 za newline
    });

    return headers;
  }, [formData.research]);

  const scrollToSection = (index: number) => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(index, index);
      // Hack za scrollanje: blur pa focus često scrolla na cursor
      textareaRef.current.blur();
      textareaRef.current.focus();

      // Alternativno: izračunati scroll position (kompliciranije s textarea)
      const lineHeight = 20; // Aproksimacija
      const linesBefore = formData.research.substring(0, index).split('\n').length;
      textareaRef.current.scrollTop = (linesBefore - 1) * lineHeight;
    }
  };

  const handleDeleteSection = (lineIndex: number) => {
    const lines = formData.research.split('\n');
    if (lineIndex >= 0 && lineIndex < lines.length) {
      lines.splice(lineIndex, 1);
      onFieldChange('research', lines.join('\n'));
    }
  };

  const openRenameDialog = (section: { title: string, lineIndex: number }) => {
    setRenamingSection(section);
    setNewSectionTitle(section.title);
  };

  const handleRenameSave = () => {
    if (!renamingSection) return;

    const lines = formData.research.split('\n');
    if (renamingSection.lineIndex >= 0 && renamingSection.lineIndex < lines.length) {
      lines[renamingSection.lineIndex] = `=== ${newSectionTitle} ===`;
      onFieldChange('research', lines.join('\n'));
    }
    setRenamingSection(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Phase 2: Planning & Research</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Istraživanje */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="research">Research</Label>
                <MagicIcon
                  onClick={handleResearchMagicClick}
                  tooltip="AI Research Assistant"
                  disabled={!projectId}
                />
              </div>
              <div className="min-h-[1.5rem] flex items-center">
                {renderSaveIndicator('research')}
              </div>
            </div>

            {/* Navigacija */}
            {sections.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/30 rounded-md">
                <span className="text-xs text-muted-foreground self-center mr-1">Quick Jump:</span>
                {sections.map((section, i) => (
                  <ContextMenu key={i}>
                    <ContextMenuTrigger>
                      <button
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer"
                        onClick={() => scrollToSection(section.index)}
                        type="button"
                      >
                        {section.title}
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => openRenameDialog(section)}>
                        Edit
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDeleteSection(section.lineIndex)} className="text-destructive focus:text-destructive">
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}

            <Textarea
              id="research"
              ref={textareaRef}
              placeholder="Links, facts, historical data, and notes to ground your story in reality."
              value={formData.research}
              onChange={(e) => onFieldChange('research', e.target.value)}
              className="min-h-[500px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!renamingSection} onOpenChange={(open) => !open && setRenamingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
            <DialogDescription>
              Enter new name for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="Section Name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSave();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingSection(null)}>Cancel</Button>
            <Button onClick={handleRenameSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
