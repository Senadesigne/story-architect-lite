import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/serverComm';
import { Project, ProjectUpdateData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProjectUpdateData>({
    logline: '',
    premise: '',
    theme: ''
  });
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: 'saving' | 'saved' | null }>({});
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = async (field: string, value: string) => {
    if (!projectId || isSaving) return;
    
    setIsSaving(true);
    setSaveStatus(prev => ({ ...prev, [field]: 'saving' }));
    
    try {
      const updateData: ProjectUpdateData = { [field]: value };
      const updatedProject = await api.updateProject(projectId, updateData);
      setProject(updatedProject);
      setSaveStatus(prev => ({ ...prev, [field]: 'saved' }));
      
      // Sakrij "saved" indikator nakon 3 sekunde
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [field]: null }));
      }, 3000);
    } catch (error: any) {
      console.error('Error saving project:', error);
      setSaveStatus(prev => ({ ...prev, [field]: null }));
      // Možemo dodati toast notifikaciju za grešku
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof ProjectUpdateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Debounce logika
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      handleSave(field, value);
    }, 1000);
  };

  const fetchProject = async () => {
    if (!projectId) {
      setError('Nevaljan ID projekta');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await api.getProject(projectId);
      setProject(data);
      // Inicijalizacija form podataka
      setFormData({
        logline: data.logline || '',
        premise: data.premise || '',
        theme: data.theme || ''
      });
    } catch (error: any) {
      if (error.status === 404) {
        setError('Projekt nije pronađen');
      } else if (error.status === 400) {
        setError('Nevaljan ID projekta');
      } else {
        setError('Greška pri dohvaćanju projekta');
      }
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Cleanup debounce na unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const renderSaveIndicator = (field: string) => {
    const status = saveStatus[field];
    if (!status) return null;
    
    if (status === 'saving') {
      return (
        <span className="text-sm text-muted-foreground ml-2">
          Spremam...
        </span>
      );
    }
    
    if (status === 'saved') {
      return (
        <span className="text-sm text-green-600 ml-2">
          Spremljeno ✓
        </span>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Učitavam projekt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchProject}
            className="mr-4"
          >
            Pokušaj ponovno
          </Button>
          <Button 
            variant="default" 
            onClick={() => window.history.back()}
          >
            Nazad
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Projekt nije pronađen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header sekcija */}
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground mt-2">
            Kreiran: {new Date(project.createdAt).toLocaleDateString('hr-HR')} | 
            Zadnje ažuriranje: {new Date(project.updatedAt).toLocaleDateString('hr-HR')}
          </p>
        </div>

        {/* Faza 1: Ideja i Koncept */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Faza 1: Ideja i Koncept</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logline */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="logline">Logline</Label>
                {renderSaveIndicator('logline')}
              </div>
              <Textarea
                id="logline"
                placeholder="Sažmite svoju priču u jednu uzbudljivu rečenicu..."
                value={formData.logline}
                onChange={(e) => handleFieldChange('logline', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Tema */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="theme">Tema</Label>
                {renderSaveIndicator('theme')}
              </div>
              <Textarea
                id="theme"
                placeholder="Koja je glavna tema vaše priče?"
                value={formData.theme}
                onChange={(e) => handleFieldChange('theme', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Premisa */}
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="premise">Premisa</Label>
                {renderSaveIndicator('premise')}
              </div>
              <Textarea
                id="premise"
                placeholder="Opišite osnovnu premisu vaše priče..."
                value={formData.premise}
                onChange={(e) => handleFieldChange('premise', e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
