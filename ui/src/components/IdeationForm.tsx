import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { Sparkles, Check, X } from 'lucide-react';

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
    openModal,
    targetField,
    pendingApplication,
    setPendingApplication,
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

  // Handler za prihvaćanje AI prijedloga
  const handleAcceptAI = (field: ProjectField) => {
    if (pendingApplication) {
      onFieldChange(field, pendingApplication);
      setPendingApplication(null);
    }
  };

  // Handler za odbacivanje AI prijedloga
  const handleDiscardAI = () => {
    setPendingApplication(null);
  };

  // Helper za prikaz AI prijedloga
  const renderAIProposal = (field: ProjectField) => {
    if (targetField === field && pendingApplication) {
      return (
        <div className="mb-3 p-3 bg-primary/5 border border-primary/20 rounded-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> AI Prijedlog
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscardAI}
                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                title="Odbaci"
              >
                <X className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={() => handleAcceptAI(field)}
                className="h-6 px-2 text-xs gap-1"
                title="Prihvati"
              >
                <Check className="w-3 h-3" /> Prihvati
              </Button>
            </div>
          </div>
          <div className="text-sm text-muted-foreground italic bg-background/50 p-2 rounded border border-border/50 max-h-32 overflow-y-auto whitespace-pre-wrap">
            {pendingApplication}
          </div>
        </div>
      );
    }
    return null;
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
            {renderAIProposal('logline')}
            <Textarea
              id="logline"
              placeholder="Jedna rečenica koja opisuje protagonista, njegov cilj i prepreku."
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
                  tooltip="AI koautor za Temu"
                  disabled={!projectId}
                />
              </div>
              <div className="min-h-[1.5rem] flex items-center">
                {renderSaveIndicator('theme')}
              </div>
            </div>
            {renderAIProposal('theme')}
            <Textarea
              id="theme"
              placeholder="Koja je središnja poruka ili moralna dilema vaše priče?"
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
            {renderAIProposal('premise')}
            <Textarea
              id="premise"
              placeholder="Što ako? Opišite osnovnu ideju koja pokreće radnju."
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
              placeholder="Odredite žanr i podžanr vaše priče (npr. Znanstvena fantastika - Cyberpunk)."
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
                  tooltip="AI koautor za Ciljanu Publiku"
                  disabled={!projectId}
                />
              </div>
              <div className="min-h-[1.5rem] flex items-center">
                {renderSaveIndicator('audience')}
              </div>
            </div>
            {renderAIProposal('audience')}
            <Textarea
              id="audience"
              placeholder="Kome je namijenjena ova priča? Definirajte idealnog čitatelja/gledatelja."
              value={formData.audience}
              onChange={(e) => onFieldChange('audience' as ProjectField, e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
