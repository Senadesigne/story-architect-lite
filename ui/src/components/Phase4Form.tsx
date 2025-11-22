import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/serverComm';
import { Character } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { AIAssistantModal } from '@/components/planner/AIAssistantModal';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

interface CharacterFormData {
  name: string;
  role: string;
  motivation: string;
  goal: string;
  fear: string;
  backstory: string;
  arcStart: string;
  arcEnd: string;
}

const initialFormData: CharacterFormData = {
  name: '',
  role: '',
  motivation: '',
  goal: '',
  fear: '',
  backstory: '',
  arcStart: '',
  arcEnd: ''
};

export function Phase4Form() {
  const { projectId } = useParams<{ projectId: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState<CharacterFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);

  // Planner AI Store
  const {
    isOpen,
    closeModal,
    openModal,
    context,
    messages,
    isLoading: isAILoading,
    lastResponse,
  } = usePlannerAIStore();

  // Dohvaćanje likova
  const fetchCharacters = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const data = await api.getCharacters(projectId);
      setCharacters(data);
    } catch (error: unknown) {
      console.error('Error fetching characters:', error);
      setError('Greška pri dohvaćanju likova');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCharacters();
  }, [projectId, fetchCharacters]);

  // Otvaranje modala za dodavanje novog lika
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  // Otvaranje modala za uređivanje lika
  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      role: character.role || '',
      motivation: character.motivation || '',
      goal: character.goal || '',
      fear: character.fear || '',
      backstory: character.backstory || '',
      arcStart: character.arcStart || '',
      arcEnd: character.arcEnd || ''
    });
    setIsDialogOpen(true);
  };

  // Spremanje lika (novi ili ažuriranje)
  const handleSaveCharacter = async () => {
    if (!projectId || !formData.name.trim()) return;
    
    setIsSaving(true);
    
    try {
      if (editingCharacter) {
        // Ažuriranje postojećeg lika
        await api.updateCharacter(editingCharacter.id, formData);
      } else {
        // Kreiranje novog lika
        await api.createCharacter(projectId, formData);
      }
      
      setIsDialogOpen(false);
      await fetchCharacters(); // Osvježi listu
    } catch (error: unknown) {
      console.error('Error saving character:', error);
      setError('Greška pri spremanju lika');
    } finally {
      setIsSaving(false);
    }
  };

  // Brisanje lika
  const handleDeleteCharacter = async (character: Character) => {
    if (!confirm(`Jeste li sigurni da želite obrisati lika "${character.name}"?`)) {
      return;
    }
    
    try {
      await api.deleteCharacter(character.id);
      await fetchCharacters(); // Osvježi listu
    } catch (error: unknown) {
      console.error('Error deleting character:', error);
      setError('Greška pri brisanju lika');
    }
  };

  // Handler za otvaranje AI modala za generiranje lika
  const handleCharacterMagicClick = () => {
    if (!projectId) return;
    openModal('planner_character', 'character', projectId);
  };

  // Handler za Keep All akciju (parsira JSON i kreira novog lika)
  const handleKeepAll = async (value: string | object) => {
    if (!projectId) return;

    // Provjeri je li objekt (JSON parsiran) ili string
    if (typeof value === 'object' && value !== null) {
      // JSON objekt - parsiranje uspješno
      const characterData = value as { name?: string; role?: string; motivation?: string; description?: string };
      
      if (!characterData.name) {
        console.error('Character data missing name field');
        return;
      }

      try {
        // Kreiraj novog lika s podacima iz JSON-a
        await api.createCharacter(projectId, {
          name: characterData.name.trim(),
          role: characterData.role?.trim() || undefined,
          motivation: characterData.motivation?.trim() || undefined,
          backstory: characterData.description?.trim() || undefined, // description ide u backstory
        });
        await fetchCharacters(); // Osvježi listu
      } catch (error: unknown) {
        console.error('Error creating character from AI:', error);
        setError('Greška pri kreiranju lika iz AI odgovora');
      }
    } else {
      // String - fallback (ne bi se trebalo dogoditi za likove, ali za svaki slučaj)
      console.warn('Received string instead of object for character');
    }
  };

  // Dobivanje prikaznog imena konteksta
  const getContextDisplayName = (): string => {
    if (!context) return 'Lik';
    return context.replace('planner_', '').charAt(0).toUpperCase() + context.replace('planner_', '').slice(1);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Učitavam likove...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faza 4: Razvoj Likova</CardTitle>
          <CardDescription>
            Kreirajte i upravljajte likovima vaše priče. Definirajte njihove ciljeve, strahove i pozadinske priče.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Gumb za dodavanje novog lika */}
          <div className="mb-6 flex items-center gap-2">
            <MagicIcon
              onClick={handleCharacterMagicClick}
              tooltip="AI Asistent za Generiranje Lika"
              disabled={!projectId}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddCharacter} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj Lika
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCharacter ? 'Uredi Lika' : 'Dodaj Novog Lika'}
                  </DialogTitle>
                  <DialogDescription>
                    Unesite detalje o liku. Ime je obavezno polje.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Ime */}
                  <div>
                    <Label htmlFor="name">Ime *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ime lika"
                    />
                  </div>

                  {/* Uloga */}
                  <div>
                    <Label htmlFor="role">Uloga</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Protagonist, Antagonist, Sporedni lik..."
                    />
                  </div>

                  {/* Motivacija */}
                  <div>
                    <Label htmlFor="motivation">Motivacija</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                      placeholder="Što pokreće ovog lika?"
                      rows={3}
                    />
                  </div>

                  {/* Cilj */}
                  <div>
                    <Label htmlFor="goal">Cilj</Label>
                    <Textarea
                      id="goal"
                      value={formData.goal}
                      onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="Što lik želi postići?"
                      rows={3}
                    />
                  </div>

                  {/* Strah */}
                  <div>
                    <Label htmlFor="fear">Strah</Label>
                    <Textarea
                      id="fear"
                      value={formData.fear}
                      onChange={(e) => setFormData(prev => ({ ...prev, fear: e.target.value }))}
                      placeholder="Čega se lik boji?"
                      rows={3}
                    />
                  </div>

                  {/* Pozadinska priča */}
                  <div>
                    <Label htmlFor="backstory">Pozadinska Priča</Label>
                    <Textarea
                      id="backstory"
                      value={formData.backstory}
                      onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                      placeholder="Važni događaji iz prošlosti lika"
                      rows={4}
                    />
                  </div>

                  {/* Početak luka */}
                  <div>
                    <Label htmlFor="arcStart">Početak Luka</Label>
                    <Textarea
                      id="arcStart"
                      value={formData.arcStart}
                      onChange={(e) => setFormData(prev => ({ ...prev, arcStart: e.target.value }))}
                      placeholder="Kako lik počinje svoju priču?"
                      rows={3}
                    />
                  </div>

                  {/* Kraj luka */}
                  <div>
                    <Label htmlFor="arcEnd">Kraj Luka</Label>
                    <Textarea
                      id="arcEnd"
                      value={formData.arcEnd}
                      onChange={(e) => setFormData(prev => ({ ...prev, arcEnd: e.target.value }))}
                      placeholder="Kako se lik mijenja kroz priču?"
                      rows={3}
                    />
                  </div>

                  {/* Gumbovi */}
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSaving}
                    >
                      Odustani
                    </Button>
                    <Button 
                      onClick={handleSaveCharacter}
                      disabled={isSaving || !formData.name.trim()}
                    >
                      {isSaving ? 'Spremam...' : (editingCharacter ? 'Ažuriraj' : 'Dodaj')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista likova */}
          {characters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Nema dodanih likova.</p>
              <p className="text-sm text-muted-foreground">
                Kliknite "Dodaj Lika" za početak.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <Card key={character.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{character.name}</CardTitle>
                        {character.role && (
                          <CardDescription>{character.role}</CardDescription>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCharacter(character)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCharacter(character)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      {character.motivation && (
                        <div>
                          <span className="font-medium">Motivacija:</span>
                          <p className="text-muted-foreground mt-1 line-clamp-2">
                            {character.motivation}
                          </p>
                        </div>
                      )}
                      {character.goal && (
                        <div>
                          <span className="font-medium">Cilj:</span>
                          <p className="text-muted-foreground mt-1 line-clamp-2">
                            {character.goal}
                          </p>
                        </div>
                      )}
                      {character.fear && (
                        <div>
                          <span className="font-medium">Strah:</span>
                          <p className="text-muted-foreground mt-1 line-clamp-2">
                            {character.fear}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Assistant Modal */}
      {projectId && (
        <AIAssistantModal
          isOpen={isOpen}
          onClose={closeModal}
          context={getContextDisplayName()}
          onKeepAll={handleKeepAll}
          messages={messages}
          isLoading={isAILoading}
          lastResponse={lastResponse || undefined}
        />
      )}
    </div>
  );
}
