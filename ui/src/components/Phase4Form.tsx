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
import { Plus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MagicIcon } from '@/components/planner/MagicIcon';

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
    openModal,
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
      setError('Error fetching characters');
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
      setError('Error saving character');
    } finally {
      setIsSaving(false);
    }
  };

  // Brisanje lika
  const handleDeleteCharacter = async (character: Character) => {
    if (!confirm(`Are you sure you want to delete character "${character.name}"?`)) {
      return;
    }

    try {
      await api.deleteCharacter(character.id);
      await fetchCharacters(); // Osvježi listu
    } catch (error: unknown) {
      console.error('Error deleting character:', error);
      setError('Error deleting character');
    }
  };

  // Handler za otvaranje AI modala za generiranje lika
  const handleCharacterMagicClick = () => {
    if (!projectId) return;
    openModal('planner_character', 'character', projectId);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading characters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 4: Character Development</CardTitle>
          <CardDescription>
            Create and manage your story characters. Define their goals, fears, and backstories.
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
              tooltip="AI Character Generator Assistant"
              disabled={!projectId}
            />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAddCharacter} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Character
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCharacter ? 'Edit Character' : 'Add New Character'}
                  </DialogTitle>
                  <DialogDescription>
                    Enter character details. Name is required.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Ime */}
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Character Name"
                    />
                  </div>

                  {/* Uloga */}
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      placeholder="Protagonist, Antagonist, Supporting..."
                    />
                  </div>

                  {/* Motivacija */}
                  <div>
                    <Label htmlFor="motivation">Motivation</Label>
                    <Textarea
                      id="motivation"
                      value={formData.motivation}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
                      placeholder="What drives this character internally?"
                      rows={3}
                    />
                  </div>

                  {/* Cilj */}
                  <div>
                    <Label htmlFor="goal">Goal</Label>
                    <Textarea
                      id="goal"
                      value={formData.goal}
                      onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                      placeholder="What is their external objective?"
                      rows={3}
                    />
                  </div>

                  {/* Strah */}
                  <div>
                    <Label htmlFor="fear">Fear</Label>
                    <Textarea
                      id="fear"
                      value={formData.fear}
                      onChange={(e) => setFormData(prev => ({ ...prev, fear: e.target.value }))}
                      placeholder="What are they most afraid of losing or facing?"
                      rows={3}
                    />
                  </div>

                  {/* Pozadinska priča */}
                  <div>
                    <Label htmlFor="backstory">Backstory</Label>
                    <Textarea
                      id="backstory"
                      value={formData.backstory}
                      onChange={(e) => setFormData(prev => ({ ...prev, backstory: e.target.value }))}
                      placeholder="Key past events that shaped who they are today."
                      rows={4}
                    />
                  </div>

                  {/* Početak luka */}
                  <div>
                    <Label htmlFor="arcStart">Arc Start</Label>
                    <Textarea
                      id="arcStart"
                      value={formData.arcStart}
                      onChange={(e) => setFormData(prev => ({ ...prev, arcStart: e.target.value }))}
                      placeholder="Who are they at the beginning?"
                      rows={3}
                    />
                  </div>

                  {/* Kraj luka */}
                  <div>
                    <Label htmlFor="arcEnd">Arc End</Label>
                    <Textarea
                      id="arcEnd"
                      value={formData.arcEnd}
                      onChange={(e) => setFormData(prev => ({ ...prev, arcEnd: e.target.value }))}
                      placeholder="Who do they become by the end?"
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
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveCharacter}
                      disabled={isSaving || !formData.name.trim()}
                    >
                      {isSaving ? 'Saving...' : (editingCharacter ? 'Update' : 'Add')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista likova */}
          {characters.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No characters added.</p>
              <p className="text-sm text-muted-foreground">
                Click "Add Character" to start.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {characters.map((character) => (
                <ContextMenu key={character.id}>
                  <ContextMenuTrigger>
                    <Card className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{character.name}</CardTitle>
                            {character.role && (
                              <CardDescription>{character.role}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          {character.motivation && (
                            <div>
                              <span className="font-medium">Motivation:</span>
                              <p className="text-muted-foreground mt-1 line-clamp-2">
                                {character.motivation}
                              </p>
                            </div>
                          )}
                          {character.goal && (
                            <div>
                              <span className="font-medium">Goal:</span>
                              <p className="text-muted-foreground mt-1 line-clamp-2">
                                {character.goal}
                              </p>
                            </div>
                          )}
                          {character.fear && (
                            <div>
                              <span className="font-medium">Fear:</span>
                              <p className="text-muted-foreground mt-1 line-clamp-2">
                                {character.fear}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleEditCharacter(character)}>
                      Edit
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDeleteCharacter(character)} className="text-destructive focus:text-destructive">
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
