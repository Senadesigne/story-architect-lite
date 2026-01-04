import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useState, useEffect } from 'react';
import { api } from '@/lib/serverComm';
import { Location } from '@/lib/types';
import { MagicIcon } from '@/components/planner/MagicIcon';
import { SectionedEditor } from '@/components/planner/SectionedEditor';

import { usePlannerAIStore } from '@/stores/plannerAIStore';

interface Phase3FormProps {
  project: { id: string };
  onFieldChange: (field: string, value: string) => void;
  renderSaveIndicator: (field: string) => React.ReactNode;
  formData: {
    rules_definition: string;
    culture_and_history: string;
  };
}

export function Phase3Form({ project, onFieldChange, renderSaveIndicator, formData }: Phase3FormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDescription, setNewLocationDescription] = useState('');

  // Planner AI Store
  const {
    openModal,
  } = usePlannerAIStore();

  // Dohvaćanje lokacija
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const data = await api.getLocations(project.id);
        setLocations(data);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [project.id]);

  // Dodavanje nove lokacije
  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;

    try {
      const newLocation = await api.createLocation(project.id, {
        name: newLocationName.trim(),
        description: newLocationDescription.trim() || undefined
      });
      setLocations(prev => [...prev, newLocation]);
      setNewLocationName('');
      setNewLocationDescription('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating location:', error);
    }
  };

  // Brisanje lokacije
  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      await api.deleteLocation(locationId);
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  // Uređivanje lokacije
  const handleEditLocation = async (location: Location) => {
    const newName = prompt('Enter new location name:', location.name);
    if (newName === null) return; // Korisnik je otkazao

    const newDescription = prompt('Enter new location description:', location.description || '');
    if (newDescription === null) return; // Korisnik je otkazao

    try {
      const updatedLocation = await api.updateLocation(location.id, {
        name: newName.trim(),
        description: newDescription.trim() || undefined
      });
      setLocations(prev => prev.map(loc =>
        loc.id === location.id ? updatedLocation : loc
      ));
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // Handler za otvaranje AI modala za generiranje lokacije
  const handleLocationMagicClick = () => {
    openModal('planner_location', 'location', project.id);
  };

  // Handler za otvaranje AI modala za Definiranje Pravila
  const handleRulesMagicClick = () => {
    openModal('planner_rules', 'rules_definition', project.id);
  };

  // Handler za otvaranje AI modala za Kultura i Povijest
  const handleCultureMagicClick = () => {
    openModal('planner_culture', 'culture_and_history', project.id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 3: World Building</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Definiranje Pravila */}
          <SectionedEditor
            title="Rules Definition"
            value={formData.rules_definition}
            onChange={(value) => onFieldChange('rules_definition', value)}
            options={['Fizika', 'Magija', 'Tehnologija', 'Zakoni prirode']}
            onMagicClick={handleRulesMagicClick}
            magicTooltip="AI Rules Assistant"
            renderSaveIndicator={() => renderSaveIndicator('rules_definition')}
          />

          {/* Kultura, Društvo i Povijest */}
          <SectionedEditor
            title="Culture, Society & History"
            value={formData.culture_and_history}
            onChange={(value) => onFieldChange('culture_and_history', value)}
            options={['Magija', 'Kultura', 'Običaji', 'Povijest']}
            onMagicClick={handleCultureMagicClick}
            magicTooltip="AI Culture & History Assistant"
            renderSaveIndicator={() => renderSaveIndicator('culture_and_history')}
          />


          {/* Geografija i Lokacije */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Geography & Locations</Label>
              <div className="flex items-center gap-2">
                <MagicIcon
                  onClick={handleLocationMagicClick}
                  tooltip="AI Location Generator Assistant"
                />
                <Button
                  onClick={() => setShowAddForm(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Location
                </Button>
              </div>
            </div>

            {/* Forma za dodavanje nove lokacije */}
            {showAddForm && (
              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label htmlFor="new-location-name">Location Name</Label>
                    <Input
                      id="new-location-name"
                      type="text"
                      placeholder="Enter location name..."
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-location-description">Location Description</Label>
                    <Textarea
                      id="new-location-description"
                      placeholder="Describe the location..."
                      value={newLocationDescription}
                      onChange={(e) => setNewLocationDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddLocation} size="sm">
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewLocationName('');
                        setNewLocationDescription('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista lokacija */}
            {isLoadingLocations ? (
              <p className="text-muted-foreground">Loading locations...</p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground">No locations added.</p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <ContextMenu key={location.id}>
                    <ContextMenuTrigger>
                      <Card className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{location.name}</h4>
                            {location.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {location.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem onClick={() => handleEditLocation(location)}>
                        Edit
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleDeleteLocation(location.id)} className="text-destructive focus:text-destructive">
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
