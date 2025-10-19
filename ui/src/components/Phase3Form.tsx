import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/serverComm';
import { Location } from '@/lib/types';

interface Phase3FormProps {
  project: any;
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
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDescription, setNewLocationDescription] = useState('');

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
    if (!confirm('Jeste li sigurni da želite obrisati ovu lokaciju?')) return;

    try {
      await api.deleteLocation(locationId);
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  // Uređivanje lokacije
  const handleEditLocation = async (location: Location) => {
    const newName = prompt('Unesite novi naziv lokacije:', location.name);
    if (newName === null) return; // Korisnik je otkazao
    
    const newDescription = prompt('Unesite novi opis lokacije:', location.description || '');
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faza 3: Izgradnja Svijeta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Definiranje Pravila */}
          <div className="space-y-2">
            <Label htmlFor="rules_definition" className="flex items-center">
              Definiranje Pravila
              {renderSaveIndicator('rules_definition')}
            </Label>
            <Textarea
              id="rules_definition"
              placeholder="Opišite pravila vašeg svijeta (fizika, magija, tehnologija, zakoni prirode...)..."
              value={formData.rules_definition}
              onChange={(e) => onFieldChange('rules_definition', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Kultura, Društvo i Povijest */}
          <div className="space-y-2">
            <Label htmlFor="culture_and_history" className="flex items-center">
              Kultura, Društvo i Povijest
              {renderSaveIndicator('culture_and_history')}
            </Label>
            <Textarea
              id="culture_and_history"
              placeholder="Opišite kulturu, društvene odnose, običaje, religiju i povijest vašeg svijeta..."
              value={formData.culture_and_history}
              onChange={(e) => onFieldChange('culture_and_history', e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          {/* Geografija i Lokacije */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Geografija i Lokacije</Label>
              <Button
                onClick={() => setShowAddForm(true)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Dodaj Lokaciju
              </Button>
            </div>

            {/* Forma za dodavanje nove lokacije */}
            {showAddForm && (
              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label htmlFor="new-location-name">Naziv lokacije</Label>
                    <Input
                      id="new-location-name"
                      type="text"
                      placeholder="Unesite naziv lokacije..."
                      value={newLocationName}
                      onChange={(e) => setNewLocationName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-location-description">Opis lokacije</Label>
                    <Textarea
                      id="new-location-description"
                      placeholder="Opišite lokaciju..."
                      value={newLocationDescription}
                      onChange={(e) => setNewLocationDescription(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddLocation} size="sm">
                      Spremi
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
                      Odustani
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista lokacija */}
            {isLoadingLocations ? (
              <p className="text-muted-foreground">Učitavam lokacije...</p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground">Nema dodanih lokacija.</p>
            ) : (
              <div className="space-y-2">
                {locations.map((location) => (
                  <Card key={location.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{location.name}</h4>
                        {location.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {location.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() => handleEditLocation(location)}
                          size="sm"
                          variant="ghost"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteLocation(location.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
