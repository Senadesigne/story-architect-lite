import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { AIAssistantModal } from '@/components/planner/AIAssistantModal';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

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
  const { projectId } = useParams<{ projectId: string }>();
  
  // Planner AI Store
  const {
    isOpen,
    closeModal,
    openModal,
    context,
    targetField,
    messages,
    isLoading,
    lastResponse,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za Logline
  const handleLoglineMagicClick = () => {
    if (!projectId) return;
    openModal('planner_logline', 'logline', projectId);
  };

  // Handler za otvaranje modala za Premisa
  const handlePremiseMagicClick = () => {
    if (!projectId) return;
    openModal('planner_premise', 'premise', projectId);
  };

  // Handler za otvaranje modala za Tema
  const handleThemeMagicClick = () => {
    if (!projectId) return;
    openModal('planner_theme', 'theme', projectId);
  };

  // Handler za otvaranje modala za Ciljana Publika
  const handleAudienceMagicClick = () => {
    if (!projectId) return;
    openModal('planner_audience', 'audience', projectId);
  };

  // Handler za Keep All akciju (zamjenjuje sadržaj polja)
  const handleKeepAll = (value: string) => {
    if (!targetField) return;
    onFieldChange(targetField as ProjectField, value);
  };

  // Dobivanje trenutne vrijednosti polja za modal
  const getCurrentFieldValue = (): string => {
    if (!targetField) return '';
    return formData[targetField as keyof typeof formData] || '';
  };

  // Dobivanje prikaznog imena konteksta
  const getContextDisplayName = (): string => {
    if (!context) return '';
    // Ukloni "planner_" prefix i kapitaliziraj prvo slovo
    return context.replace('planner_', '').charAt(0).toUpperCase() + context.replace('planner_', '').slice(1);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Faza 1: Ideja i Koncept</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="logline">Logline</Label>
                <MagicIcon
                  onClick={handleLoglineMagicClick}
                  tooltip="AI Asistent za Logline"
                  disabled={!projectId}
                />
              </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="theme">Tema</Label>
              <MagicIcon
                onClick={handleThemeMagicClick}
                tooltip="AI ko-autor za Temu"
                disabled={!projectId}
              />
            </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="premise">Premisa</Label>
                <MagicIcon
                  onClick={handlePremiseMagicClick}
                  tooltip="AI Asistent za Premisu"
                  disabled={!projectId}
                />
              </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="audience">Ciljana Publika</Label>
              <MagicIcon
                onClick={handleAudienceMagicClick}
                tooltip="AI ko-autor za Ciljanu Publiku"
                disabled={!projectId}
              />
            </div>
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

      {/* AI Assistant Modal */}
      {projectId && (
        <AIAssistantModal
          isOpen={isOpen}
          onClose={closeModal}
          context={getContextDisplayName()}
          initialValue={getCurrentFieldValue()}
          onKeepAll={handleKeepAll}
          messages={messages}
          isLoading={isLoading}
          lastResponse={lastResponse || undefined}
        />
      )}
    </>
  );
}
