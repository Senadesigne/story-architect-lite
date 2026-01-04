import { useParams, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api } from '@/lib/serverComm';
import { Project, ProjectUpdateData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Phase0Form } from '@/components/Phase0Form';
import { IdeationForm } from '@/components/IdeationForm';
import { Phase2Form } from '@/components/Phase2Form';
import { Phase3Form } from '@/components/Phase3Form';
import { Phase4Form } from '@/components/Phase4Form';
import { Phase5Form } from '@/components/Phase5Form';
import { Phase6Form } from '@/components/Phase6Form';
import { Studio } from './Studio';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

// Constants for timing
const AUTOSAVE_DELAY = 3000; // 3 seconds
const SAVE_INDICATOR_DISPLAY_TIME = 3000; // 3 seconds
const ERROR_INDICATOR_DISPLAY_TIME = 5000; // 5 seconds

// Type definition for project fields
type ProjectField = 'story_idea' | 'premise' | 'theme' | 'genre' | 'audience' | 'brainstorming' | 'research' | 'rules_definition' | 'culture_and_history' | 'synopsis' | 'outline_notes' | 'beat_sheet_setup' | 'beat_sheet_inciting_incident' | 'beat_sheet_midpoint' | 'beat_sheet_climax' | 'beat_sheet_falling_action' | 'point_of_view';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const isStudio = location.pathname.includes('/studio');
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ProjectUpdateData>({
    story_idea: '',
    premise: '',
    theme: '',
    genre: '',
    audience: '',
    brainstorming: '',
    research: '',
    rules_definition: '',
    culture_and_history: '',
    synopsis: '',
    outline_notes: '',
    beat_sheet_setup: '',
    beat_sheet_inciting_incident: '',
    beat_sheet_midpoint: '',
    beat_sheet_climax: '',
    beat_sheet_falling_action: '',
    point_of_view: ''
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
      const updateData = { [field]: value } as Record<string, string>;
      const updatedProject = await api.updateProject(projectId, updateData);
      setProject(updatedProject);
      setSaveStatus(prev => ({ ...prev, [field]: 'saved' }));

      // Hide "saved" indicator after timeout
      const timeout = setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [field]: null }));
        delete saveTimeoutsRef.current[field];
      }, SAVE_INDICATOR_DISPLAY_TIME);

      saveTimeoutsRef.current[field] = timeout;
    } catch (error: unknown) {
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
    const currentValue = formData[field] ?? '';
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


  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setError('Invalid Project ID');
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
        story_idea: data.story_idea || '',

        premise: data.premise || '',
        theme: data.theme || '',
        genre: data.genre || '',
        audience: data.audience || '',
        brainstorming: data.brainstorming || '',
        research: data.research || '',
        rules_definition: data.rules_definition || '',
        culture_and_history: data.culture_and_history || '',
        synopsis: data.synopsis || '',
        outline_notes: data.outline_notes || '',
        beat_sheet_setup: data.beat_sheet_setup || '',
        beat_sheet_inciting_incident: data.beat_sheet_inciting_incident || '',
        beat_sheet_midpoint: data.beat_sheet_midpoint || '',
        beat_sheet_climax: data.beat_sheet_climax || '',
        beat_sheet_falling_action: data.beat_sheet_falling_action || '',
        point_of_view: data.point_of_view || ''
      });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number };
        if (apiError.status === 404) {
          setError('Project not found');
        } else if (apiError.status === 400) {
          setError('Invalid Project ID');
        } else {
          setError('Error fetching project');
        }
      } else {
        setError('Error fetching project');
      }
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [projectId, fetchProject]);

  // Listen for external updates (e.g. from AI Sidebar)
  const projectLastUpdated = usePlannerAIStore(state => state.projectLastUpdated);

  useEffect(() => {
    if (projectLastUpdated > 0) {
      fetchProject();
    }
  }, [projectLastUpdated, fetchProject]);

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
          Saving...
        </span>
      );
    }

    if (status === 'saved') {
      return (
        <span className={`${baseClasses} text-muted-foreground`}>
          Saved ✓
        </span>
      );
    }

    if (status === 'error') {
      return (
        <div className={`${baseClasses} text-red-600`}>
          <span className="text-sm">
            Error saving ❌
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
      <div className="container mx-auto p-6 bg-transparent">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 bg-transparent">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={fetchProject}
            className="mr-4"
          >
            Try again
          </Button>
          <Button
            variant="default"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 bg-transparent">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isStudio ? (
        <div className="h-full overflow-hidden">
          <Routes>
            <Route path="studio" element={<Studio />} />
          </Routes>
        </div>
      ) : (
        <div className="h-full overflow-y-auto bg-muted/50">
          <div className="container mx-auto py-8 px-4 md:px-8 bg-transparent">
            <div className="space-y-6 pb-40">
              {/* Header section */}
              <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold font-serif">{project.title}</h1>
                <p className="text-muted-foreground mt-2">
                  Created: {new Date(project.createdAt).toLocaleDateString('en-US')} |
                  Last updated: {new Date(project.updatedAt).toLocaleDateString('en-US')}
                </p>
              </div>

              {/* Nested routes content */}
              <Routes>
                <Route index element={<Navigate to="story-idea" replace />} />
                <Route
                  path="story-idea"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <Phase0Form
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          story_idea: formData.story_idea ?? ''
                        }}
                      />
                    </div>
                  }
                />
                <Route
                  path="ideation"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <IdeationForm
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          premise: formData.premise ?? '',
                          theme: formData.theme ?? '',
                          genre: formData.genre ?? '',
                          audience: formData.audience ?? ''
                        }}
                      />
                    </div>
                  }
                />
                <Route
                  path="planning"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <Phase2Form
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          brainstorming: formData.brainstorming ?? '',
                          research: formData.research ?? ''
                        }}
                      />
                    </div>
                  }
                />
                <Route
                  path="worldbuilding"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <Phase3Form
                        project={project}
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          rules_definition: formData.rules_definition ?? '',
                          culture_and_history: formData.culture_and_history ?? ''
                        }}
                      />
                    </div>
                  }
                />
                <Route path="characters" element={<div className="max-w-3xl mx-auto"><Phase4Form /></div>} />
                <Route
                  path="structure"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <Phase5Form
                        project={project}
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          synopsis: formData.synopsis ?? '',
                          outline_notes: formData.outline_notes ?? '',
                          beat_sheet_setup: formData.beat_sheet_setup ?? '',
                          beat_sheet_inciting_incident: formData.beat_sheet_inciting_incident ?? '',
                          beat_sheet_midpoint: formData.beat_sheet_midpoint ?? '',
                          beat_sheet_climax: formData.beat_sheet_climax ?? '',
                          beat_sheet_falling_action: formData.beat_sheet_falling_action ?? ''
                        }}
                      />
                    </div>
                  }
                />
                <Route
                  path="finalization"
                  element={
                    <div className="max-w-3xl mx-auto">
                      <Phase6Form
                        onFieldChange={(field, value) => handleFieldChange(field as ProjectField, value)}
                        renderSaveIndicator={(field) => renderSaveIndicator(field as ProjectField)}
                        formData={{
                          point_of_view: formData.point_of_view ?? ''
                        }}
                      />
                    </div>
                  }
                />
              </Routes>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
