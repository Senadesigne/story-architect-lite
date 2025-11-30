import React, { useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';

import { usePlannerAIStore } from '@/stores/plannerAIStore';

// Type definition for project fields that can be edited
type ProjectField = 'logline' | 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research';

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
    const headers: { title: string, index: number }[] = [];
    let currentIndex = 0;

    lines.forEach((line) => {
      const trimmed = line.trim();
      // Detektiraj naslove: === NASLOV ===
      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
        headers.push({
          title: trimmed.replace(/===/g, '').trim(),
          index: currentIndex
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Faza 2: Planiranje i Istraživanje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Istraživanje */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="research">Istraživanje</Label>
                <MagicIcon
                  onClick={handleResearchMagicClick}
                  tooltip="AI Asistent za Istraživanje"
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
                <span className="text-xs text-muted-foreground self-center mr-1">Brzi skok:</span>
                {sections.map((section, i) => (
                  <button
                    key={i}
                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer"
                    onClick={() => scrollToSection(section.index)}
                    type="button"
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            )}

            <Textarea
              id="research"
              ref={textareaRef}
              placeholder="Linkovi, činjenice, povijesni podaci i sve što je potrebno za uvjerljivost priče."
              value={formData.research}
              onChange={(e) => onFieldChange('research', e.target.value)}
              className="min-h-[500px] font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
