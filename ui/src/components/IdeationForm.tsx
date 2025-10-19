import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Type definition for project fields that can be edited
type ProjectField = 'logline' | 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research';

interface IdeationFormProps {
  onFieldChange: (field: ProjectField, value: string) => void;
  renderSaveIndicator: (field: ProjectField) => React.ReactNode;
  formData: {
    logline: string;
    premise: string;
    theme: string;
    genre: string;
    audience: string;
  };
}

export function IdeationForm({ onFieldChange, renderSaveIndicator, formData }: IdeationFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Faza 1: Ideja i Koncept</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logline */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="logline">Logline</Label>
            <div className="min-h-[1.5rem] flex items-center">
              {renderSaveIndicator('logline')}
            </div>
          </div>
          <Textarea
            id="logline"
            placeholder="Sažmite svoju priču u jednu uzbudljivu rečenicu..."
            value={formData.logline}
            onChange={(e) => onFieldChange('logline' as ProjectField, e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Tema */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="theme">Tema</Label>
            <div className="min-h-[1.5rem] flex items-center">
              {renderSaveIndicator('theme')}
            </div>
          </div>
          <Textarea
            id="theme"
            placeholder="Koja je glavna tema vaše priče?"
            value={formData.theme}
            onChange={(e) => onFieldChange('theme' as ProjectField, e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Premisa */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="premise">Premisa</Label>
            <div className="min-h-[1.5rem] flex items-center">
              {renderSaveIndicator('premise')}
            </div>
          </div>
          <Textarea
            id="premise"
            placeholder="Opišite osnovnu premisu vaše priče..."
            value={formData.premise}
            onChange={(e) => onFieldChange('premise' as ProjectField, e.target.value)}
            className="min-h-[120px]"
          />
        </div>

        {/* Žanr */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="genre">Žanr</Label>
            <div className="min-h-[1.5rem] flex items-center">
              {renderSaveIndicator('genre')}
            </div>
          </div>
          <Textarea
            id="genre"
            placeholder="Koji je žanr vaše priče? (npr. drama, komedija, triler...)"
            value={formData.genre}
            onChange={(e) => onFieldChange('genre' as ProjectField, e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        {/* Ciljana Publika */}
        <div className="space-y-2">
          <div className="flex items-center">
            <Label htmlFor="audience">Ciljana Publika</Label>
            <div className="min-h-[1.5rem] flex items-center">
              {renderSaveIndicator('audience')}
            </div>
          </div>
          <Textarea
            id="audience"
            placeholder="Tko je vaša ciljna publika? (npr. tinejdžeri, odrasli, obitelji...)"
            value={formData.audience}
            onChange={(e) => onFieldChange('audience' as ProjectField, e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
