import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Project } from '@/lib/types';

// Type definition for project fields that can be edited
type ProjectField = 'logline' | 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research';

interface Phase2FormProps {
  project: Project;
  onFieldChange: (field: ProjectField, value: string) => void;
  renderSaveIndicator: (field: ProjectField) => React.ReactNode;
  formData: {
    brainstorming: string;
    research: string;
  };
}

export function Phase2Form({ project, onFieldChange, renderSaveIndicator, formData }: Phase2FormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Faza 2: Planiranje i Istraživanje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brainstorming */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="brainstorming">Brainstorming</Label>
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
          <div className="flex items-center">
            <Label htmlFor="research">Istraživanje</Label>
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
  );
}
