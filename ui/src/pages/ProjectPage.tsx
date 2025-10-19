import { useParams, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api } from '@/lib/serverComm';
import { Project, ProjectUpdateData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { IdeationForm } from '@/components/IdeationForm';
import { Phase2Form } from '@/components/Phase2Form';
import { Phase3Form } from '@/components/Phase3Form';
import { Phase4Form } from '@/components/Phase4Form';

// Constants for timing
const AUTOSAVE_DELAY = 3000; // 3 seconds
const SAVE_INDICATOR_DISPLAY_TIME = 3000; // 3 seconds
const ERROR_INDICATOR_DISPLAY_TIME = 5000; // 5 seconds

// Type definition for project fields
type ProjectField = 'logline' | 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research' | 'rules_definition' | 'culture_and_history';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProjectUpdateData>({
    logline: '',
    premise: '',
    theme: '',
    genre: '',
    audience: '',
    brainstorming: '',
    research: '',
    rules_definition: '',
    culture_and_history: ''
  });
  const [saveStatus, setSaveStatus] = useState<{ [key in ProjectField]?: 'saving' | 'saved' | 'error' | null }>({});
  const saveTimeoutsRef = useRef<{ [key in ProjectField]?: NodeJS.Timeout }>({});
  const debounceTimeoutsRef = useRef<{ [key in ProjectField]?: NodeJS.Timeout }>({});

  // Helper function for clearing save timeouts
  const clearFieldTimeout = useCallback((field: ProjectField) => {
    const timeout = saveTimeoutsRef.current[field];
    if (timeout) {
      clearTimeout(timeout);
      delete saveTimeoutsRef.current[field];
    }
  }, []);

  // Helper function for clearing debounce timeouts
  const clearDebounceTimeout = useCallback((field: ProjectField) => {
    const timeout = debounceTimeoutsRef.current[field];
    if (timeout) {
      clearTimeout(timeout);
      delete debounceTimeoutsRef.current[field];
    }
  }, []);

  const handleSave = useCallback(async (field: ProjectField, value: string) => {
    if (!projectId) return;
    
    // Check if this field is already being saved
    if (saveStatus[field] === 'saving') return;
    
    // Clear existing timeout for this field before starting new save operation
    clearFieldTimeout(field);
    
    setSaveStatus(prev => ({ ...prev, [field]: 'saving' }));
    
    try {
      const updateData: ProjectUpdateData = { [field]: value };
      const updatedProject = await api.updateProject(projectId, updateData);
      setProject(updatedProject);
      setSaveStatus(prev => ({ ...prev, [field]: 'saved' }));
      
      // Hide "saved" indicator after timeout
      const timeout = setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [field]: null }));
        delete saveTimeoutsRef.current[field];
      }, SAVE_INDICATOR_DISPLAY_TIME);
      
      saveTimeoutsRef.current[field] = timeout;
    } catch (error: any) {
      console.error('Error saving project:', error);
      setSaveStatus(prev => ({ ...prev, [field]: 'error' }));
      
      // Hide error indicator after timeout
      const timeout = setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [field]: null }));
        delete saveTimeoutsRef.current[field];
      }, ERROR_INDICATOR_DISPLAY_TIME);
      
      saveTimeoutsRef.current[field] = timeout;
    }
  }, [projectId, saveStatus, clearFieldTimeout]);

  const retryFieldSave = useCallback((field: ProjectField) => {
    const currentValue = formData[field];
    handleSave(field, currentValue);
  }, [formData, handleSave]);

  const handleFieldChange = useCallback((field: ProjectField, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Debounce logic - field-specific
    clearDebounceTimeout(field);
    
    const timeout = setTimeout(() => {
      handleSave(field, value);
      delete debounceTimeoutsRef.current[field];
    }, AUTOSAVE_DELAY);
    
    debounceTimeoutsRef.current[field] = timeout;
  }, [clearDebounceTimeout, handleSave]);

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
      // Initialize form data
      setFormData({
        logline: data.logline || '',
        premise: data.premise || '',
        theme: data.theme || '',
        genre: data.genre || '',
        audience: data.audience || '',
        brainstorming: data.brainstorming || '',
        research: data.research || '',
        rules_definition: data.rules_definition || '',
        culture_and_history: data.culture_and_history || ''
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

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all save timeouts
      Object.values(saveTimeoutsRef.current).forEach(timeout => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      saveTimeoutsRef.current = {};
      
      // Clear all debounce timeouts
      Object.values(debounceTimeoutsRef.current).forEach(timeout => {
        if (timeout) {
          clearTimeout(timeout);
        }
      });
      debounceTimeoutsRef.current = {};
    };
  }, []);

  const renderSaveIndicator = useMemo(() => (field: ProjectField) => {
    const status = saveStatus[field];
    if (!status) return null;
    
    const baseClasses = "text-sm ml-2 inline-flex items-center";
    
    if (status === 'saving') {
      return (
        <span className={`${baseClasses} text-muted-foreground`}>
          Spremam...
        </span>
      );
    }
    
    if (status === 'saved') {
      return (
        <span className={`${baseClasses} text-gray-500`}>
          Spremljeno ✓
        </span>
      );
    }
    
    if (status === 'error') {
      return (
        <div className={`${baseClasses} text-red-600`}>
          <span className="text-sm">
            Greška pri spremanju ❌
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-6 px-2 text-xs"
            onClick={() => retryFieldSave(field)}
          >
            Pokušaj ponovno
          </Button>
        </div>
      );
    }
    
    return null;
  }, [saveStatus, retryFieldSave]);

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
        {/* Header section */}
        <div>
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground mt-2">
            Kreiran: {new Date(project.createdAt).toLocaleDateString('hr-HR')} | 
            Zadnje ažuriranje: {new Date(project.updatedAt).toLocaleDateString('hr-HR')}
          </p>
        </div>

        {/* Nested routes content */}
        <Routes>
          <Route index element={<Navigate to="ideation" replace />} />
          <Route 
            path="ideation" 
            element={
              <IdeationForm 
                project={project} 
                onFieldChange={handleFieldChange}
                renderSaveIndicator={renderSaveIndicator}
                formData={{
                  logline: formData.logline,
                  premise: formData.premise,
                  theme: formData.theme,
                  genre: formData.genre,
                  audience: formData.audience
                }}
              />
            } 
          />
          <Route 
            path="planning" 
            element={
              <Phase2Form 
                project={project} 
                onFieldChange={handleFieldChange}
                renderSaveIndicator={renderSaveIndicator}
                formData={{
                  brainstorming: formData.brainstorming,
                  research: formData.research
                }}
              />
            } 
          />
          <Route 
            path="worldbuilding" 
            element={
              <Phase3Form 
                project={project} 
                onFieldChange={handleFieldChange}
                renderSaveIndicator={renderSaveIndicator}
                formData={{
                  rules_definition: formData.rules_definition,
                  culture_and_history: formData.culture_and_history
                }}
              />
            } 
          />
          <Route path="characters" element={<Phase4Form />} />
          <Route path="structure" element={<div className="p-6 text-center text-muted-foreground">Faza 5: Strukturiranje Radnje - Uskoro</div>} />
          <Route path="finalization" element={<div className="p-6 text-center text-muted-foreground">Faza 6: Završne Pripreme - Uskoro</div>} />
        </Routes>
      </div>
    </div>
  );
}
