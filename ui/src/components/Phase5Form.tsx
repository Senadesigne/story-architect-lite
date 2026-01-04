import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Sparkles } from 'lucide-react';
import { api } from '@/lib/serverComm';
import { Project, Scene } from '@/lib/types';
import { MagicIcon } from '@/components/planner/MagicIcon';

import { usePlannerAIStore } from '@/stores/plannerAIStore';

interface Phase5FormProps {
  project: Project;
  onFieldChange: (field: 'synopsis' | 'outline_notes' | 'beat_sheet_setup' | 'beat_sheet_inciting_incident' | 'beat_sheet_midpoint' | 'beat_sheet_climax' | 'beat_sheet_falling_action', value: string) => void;
  renderSaveIndicator: (field: 'synopsis' | 'outline_notes' | 'beat_sheet_setup' | 'beat_sheet_inciting_incident' | 'beat_sheet_midpoint' | 'beat_sheet_climax' | 'beat_sheet_falling_action') => React.ReactNode;
  formData: {
    synopsis: string;
    outline_notes: string;
    beat_sheet_setup: string;
    beat_sheet_inciting_incident: string;
    beat_sheet_midpoint: string;
    beat_sheet_climax: string;
    beat_sheet_falling_action: string;
  };
}

export function Phase5Form({ project, onFieldChange, renderSaveIndicator, formData }: Phase5FormProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [sceneForm, setSceneForm] = useState({
    title: '',
    summary: '',
    order: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Planner AI Store
  const {
    openModal,
  } = usePlannerAIStore();

  // Handler za otvaranje modala za Sinopsis
  const handleSynopsisMagicClick = () => {
    openModal('planner_synopsis', 'synopsis', project.id);
  };

  // Handler za otvaranje modala za Outline Notes
  const handleOutlineMagicClick = () => {
    openModal('planner_outline', 'outline_notes', project.id);
  };

  const handleBeatSheetMagicClick = (field: 'beat_sheet_setup' | 'beat_sheet_inciting_incident' | 'beat_sheet_midpoint' | 'beat_sheet_climax' | 'beat_sheet_falling_action') => {
    openModal('planner_beat_sheet', field, project.id);
  };



  // Dohvaćanje scena
  const fetchScenes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getScenes(project.id);
      setScenes(data);
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchScenes();
  }, [project.id, fetchScenes]);

  // Otvaranje dijaloga za dodavanje
  const handleAddScene = () => {
    setEditingScene(null);
    setSceneForm({
      title: '',
      summary: '',
      order: scenes.length
    });
    setIsDialogOpen(true);
  };

  // Otvaranje dijaloga za uređivanje
  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setSceneForm({
      title: scene.title,
      summary: scene.summary || '',
      order: scene.order
    });
    setIsDialogOpen(true);
  };

  // Spremanje scene
  const handleSaveScene = async () => {
    try {
      if (editingScene) {
        // Ažuriranje postojeće scene
        const updatedScene = await api.updateScene(editingScene.id, sceneForm);
        setScenes(prev => prev.map(scene =>
          scene.id === editingScene.id ? updatedScene : scene
        ));
      } else {
        // Kreiranje nove scene
        const newScene = await api.createScene(project.id, sceneForm);
        setScenes(prev => [...prev, newScene]);
      }
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving scene:', error);
    }
  };

  // Brisanje scene
  const handleDeleteScene = async (sceneId: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) return;

    try {
      await api.deleteScene(sceneId);
      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    } catch (error) {
      console.error('Error deleting scene:', error);
    }
  };

  // Generiranje sažetka scene pomoću AI-ja
  const handleGenerateSynopsis = async () => {
    if (!editingScene) return;

    setIsGenerating(true);
    try {
      const response = await api.generateSceneSynopsis(project.id, editingScene.id);
      if (response.status === 'success' && response.synopsis) {
        setSceneForm(prev => ({ ...prev, summary: response.synopsis }));
      } else {
        throw new Error('Neočekivani odgovor od AI servisa');
      }
    } catch (error) {
      console.error('Error generating synopsis:', error);
      alert('Error generating synopsis. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 5: Plot Structuring</CardTitle>
          <CardDescription>
            Define synopsis, structural notes, and organize scenes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sinopsis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="synopsis">Synopsis</Label>
                <MagicIcon
                  onClick={handleSynopsisMagicClick}
                  tooltip="AI Synopsis Assistant"
                />
              </div>
              {renderSaveIndicator('synopsis')}
            </div>
            <Textarea
              id="synopsis"
              placeholder="A detailed overview of the entire plot from start to finish."
              value={formData.synopsis}
              onChange={(e) => onFieldChange('synopsis', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Bilješke o strukturi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="outline_notes">Plot Outline (Notes)</Label>
                <MagicIcon
                  onClick={handleOutlineMagicClick}
                  tooltip="AI Plot Outline Assistant"
                />
              </div>
              {renderSaveIndicator('outline_notes')}
            </div>
            <Textarea
              id="outline_notes"
              placeholder="Key turning points, scene ideas, and structural notes."
              value={formData.outline_notes}
              onChange={(e) => onFieldChange('outline_notes', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Beat Sheet Struktura */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Beat Sheet Structure</h3>

            {/* SETUP (1-10%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="beat_sheet_setup">SETUP (1-10%)</Label>
                  <MagicIcon
                    onClick={() => handleBeatSheetMagicClick('beat_sheet_setup')}
                    tooltip="AI Setup Assistant"
                  />
                </div>
                {renderSaveIndicator('beat_sheet_setup')}
              </div>
              <Textarea
                id="beat_sheet_setup"
                placeholder="Introduction to the world, characters, and status quo."
                value={formData.beat_sheet_setup}
                onChange={(e) => onFieldChange('beat_sheet_setup', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* INCITING INCIDENT (10%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="beat_sheet_inciting_incident">INCITING INCIDENT (10%)</Label>
                  <MagicIcon
                    onClick={() => handleBeatSheetMagicClick('beat_sheet_inciting_incident')}
                    tooltip="AI Inciting Incident Assistant"
                  />
                </div>
                {renderSaveIndicator('beat_sheet_inciting_incident')}
              </div>
              <Textarea
                id="beat_sheet_inciting_incident"
                placeholder="The event that sets the story in motion."
                value={formData.beat_sheet_inciting_incident}
                onChange={(e) => onFieldChange('beat_sheet_inciting_incident', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* MIDPOINT (10-80%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="beat_sheet_midpoint">MIDPOINT (10-80%)</Label>
                  <MagicIcon
                    onClick={() => handleBeatSheetMagicClick('beat_sheet_midpoint')}
                    tooltip="AI Midpoint Assistant"
                  />
                </div>
                {renderSaveIndicator('beat_sheet_midpoint')}
              </div>
              <Textarea
                id="beat_sheet_midpoint"
                placeholder="Point of no return, major revelation, or shift in dynamic."
                value={formData.beat_sheet_midpoint}
                onChange={(e) => onFieldChange('beat_sheet_midpoint', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* CLIMAX (80-95%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="beat_sheet_climax">CLIMAX (80-95%)</Label>
                  <MagicIcon
                    onClick={() => handleBeatSheetMagicClick('beat_sheet_climax')}
                    tooltip="AI Climax Assistant"
                  />
                </div>
                {renderSaveIndicator('beat_sheet_climax')}
              </div>
              <Textarea
                id="beat_sheet_climax"
                placeholder="The height of conflict and final confrontation."
                value={formData.beat_sheet_climax}
                onChange={(e) => onFieldChange('beat_sheet_climax', e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            {/* FALLING ACTION (95-100%) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="beat_sheet_falling_action">FALLING ACTION (95-100%)</Label>
                  <MagicIcon
                    onClick={() => handleBeatSheetMagicClick('beat_sheet_falling_action')}
                    tooltip="AI Falling Action Assistant"
                  />
                </div>
                {renderSaveIndicator('beat_sheet_falling_action')}
              </div>
              <Textarea
                id="beat_sheet_falling_action"
                placeholder="Resolution, aftermath, and the new status quo."
                value={formData.beat_sheet_falling_action}
                onChange={(e) => onFieldChange('beat_sheet_falling_action', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Popis Scena */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Scene List</Label>
              <Button onClick={handleAddScene} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Scene
              </Button>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Loading scenes...</p>
            ) : scenes.length === 0 ? (
              <p className="text-muted-foreground">No scenes added.</p>
            ) : (
              <div className="space-y-2">
                {scenes.map((scene) => (
                  <div key={scene.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{scene.title}</h4>
                      {scene.summary && (
                        <p className="text-sm text-muted-foreground mt-1">{scene.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Order: {scene.order}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditScene(scene)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteScene(scene.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vizualizacija Strukture */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Three Act Structure Visualization</Label>
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src="/images/three-act-structure.png"
                alt="Three Act Structure Visualization"
                className="w-full max-w-2xl mx-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden text-center text-muted-foreground">
                <p>Slika strukture tri čina će biti prikazana ovdje.</p>
                <p className="text-sm mt-2">Molimo dodajte sliku u /public/images/three-act-structure.png</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog za dodavanje/uređivanje scene */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingScene ? 'Edit Scene' : 'Add New Scene'}
            </DialogTitle>
            <DialogDescription>
              Enter scene details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scene-title">Scene Title</Label>
              <Input
                id="scene-title"
                value={sceneForm.title}
                onChange={(e) => setSceneForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter scene title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-summary">Summary</Label>
              <Textarea
                id="scene-summary"
                value={sceneForm.summary}
                onChange={(e) => setSceneForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Short scene summary..."
                className="min-h-[80px]"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={isGenerating || !editingScene}
                onClick={handleGenerateSynopsis}
                className="w-fit"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : '✨ Generate Summary'}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-order">Order</Label>
              <Input
                id="scene-order"
                type="number"
                value={sceneForm.order}
                onChange={(e) => setSceneForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScene} disabled={!sceneForm.title.trim()}>
              {editingScene ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
