import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { api } from '@/lib/serverComm';
import { Project, Scene } from '@/lib/types';

interface Phase5FormProps {
  project: Project;
  onFieldChange: (field: 'synopsis' | 'outline_notes', value: string) => void;
  renderSaveIndicator: (field: 'synopsis' | 'outline_notes') => React.ReactNode;
  formData: {
    synopsis: string;
    outline_notes: string;
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

  // Dohvaćanje scena
  const fetchScenes = async () => {
    try {
      setIsLoading(true);
      const data = await api.getScenes(project.id);
      setScenes(data);
    } catch (error) {
      console.error('Error fetching scenes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScenes();
  }, [project.id]);

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
    if (!confirm('Jeste li sigurni da želite obrisati ovu scenu?')) return;
    
    try {
      await api.deleteScene(sceneId);
      setScenes(prev => prev.filter(scene => scene.id !== sceneId));
    } catch (error) {
      console.error('Error deleting scene:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faza 5: Strukturiranje Radnje</CardTitle>
          <CardDescription>
            Definirajte sinopsis, bilješke o strukturi i organizirajte scene vaše priče.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sinopsis */}
          <div className="space-y-2">
            <Label htmlFor="synopsis" className="flex items-center">
              Sinopsis
              {renderSaveIndicator('synopsis')}
            </Label>
            <Textarea
              id="synopsis"
              placeholder="Napišite kratki sinopsis vaše priče..."
              value={formData.synopsis}
              onChange={(e) => onFieldChange('synopsis', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Bilješke o strukturi */}
          <div className="space-y-2">
            <Label htmlFor="outline_notes" className="flex items-center">
              Izrada Okvira Radnje (Bilješke)
              {renderSaveIndicator('outline_notes')}
            </Label>
            <Textarea
              id="outline_notes"
              placeholder="Bilješke o strukturi (npr. Struktura tri čina, Metoda pahuljice)..."
              value={formData.outline_notes}
              onChange={(e) => onFieldChange('outline_notes', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Popis Scena */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Popis Scena</Label>
              <Button onClick={handleAddScene} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj Scenu
              </Button>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground">Učitavam scene...</p>
            ) : scenes.length === 0 ? (
              <p className="text-muted-foreground">Nema dodanih scena.</p>
            ) : (
              <div className="space-y-2">
                {scenes.map((scene) => (
                  <div key={scene.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{scene.title}</h4>
                      {scene.summary && (
                        <p className="text-sm text-muted-foreground mt-1">{scene.summary}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Redoslijed: {scene.order}</p>
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
            <Label className="text-base font-semibold">Vizualizacija Strukture Tri Čina</Label>
            <div className="border rounded-lg p-4 bg-muted/50">
              <img 
                src="/images/three-act-structure.png" 
                alt="Vizualizacija Strukture Tri Čina"
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
              {editingScene ? 'Uredi Scenu' : 'Dodaj Novu Scenu'}
            </DialogTitle>
            <DialogDescription>
              Unesite detalje o sceni.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scene-title">Naslov Scene</Label>
              <Input
                id="scene-title"
                value={sceneForm.title}
                onChange={(e) => setSceneForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Unesite naslov scene..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-summary">Sažetak</Label>
              <Textarea
                id="scene-summary"
                value={sceneForm.summary}
                onChange={(e) => setSceneForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Kratki sažetak scene..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scene-order">Redoslijed</Label>
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
              Odustani
            </Button>
            <Button onClick={handleSaveScene} disabled={!sceneForm.title.trim()}>
              {editingScene ? 'Ažuriraj' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
