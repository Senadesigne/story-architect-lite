import React from 'react';
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

  // Planner AI Store
  const {
    openModal,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za Brainstorming
  const handleBrainstormingMagicClick = () => {
    if (!projectId) return;
    openModal('planner_brainstorming', 'brainstorming', projectId);
  };

  // Handler za otvaranje modala za Istraživanje
  const handleResearchMagicClick = () => {
    if (!projectId) return;
    openModal('planner_research', 'research', projectId);
  };



  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Faza 2: Planiranje i Istraživanje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Brainstorming */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="brainstorming">Brainstorming</Label>
                <MagicIcon
                  onClick={handleBrainstormingMagicClick}
                  tooltip="AI Asistent za Brainstorming"
                  disabled={!projectId}
                />
              </div>
              <div className="min-h-[1.5rem] flex items-center">
                {renderSaveIndicator('brainstorming')}
              </div>
            </div>
            <Textarea
              id="brainstorming"
              placeholder="Slobodno pišite, kreirajte mape uma, ideje za likove i zaplete..."
              value={formData.brainstorming}
              onChange={(e) => onFieldChange('brainstorming', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

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
            <Textarea
              id="research"
              placeholder="Bilješke o lokacijama, povijesnim događajima i drugim istraživačkim materijalima..."
              value={formData.research}
              onChange={(e) => onFieldChange('research', e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>


    </>
  );
}
