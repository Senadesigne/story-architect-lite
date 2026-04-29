import { create } from 'zustand';
import { Scene, Chapter } from '@/lib/types';
import type { Editor } from '@tiptap/core';
import { api } from '@/lib/serverComm';

// Helper funkcija za retry s exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Ne retry-aj ako je 4xx error (client error)
      if ((error as any).status >= 400 && (error as any).status < 500) {
        throw error;
      }

      // Ako je zadnji pokušaj, throw error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry ${attempt + 1}/${maxRetries} za ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

interface StudioState {
  // Editor stanje
  activeSceneId: string | null;
  editorContent: string;
  cursorPosition: number;
  selectedText: string | null;
  editor: Editor | null;

  // Scene stanje
  scenes: Scene[];
  chapters: Chapter[];

  // UI stanje
  isSidebarOpen: boolean;

  // AI Processing stanje - za sprječavanje race conditiona
  isAIProcessing: boolean;
  aiProcessingLock: Promise<void> | null;

  // NOVO: Save Status stanje
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveError: string | null;
  lastSaveTime: Date | null;
  hasUnsavedChanges: boolean;
  isOnline: boolean;

  // Akcije
  setActiveScene: (sceneId: string) => Promise<void>;
  updateContent: (content: string) => void;
  setCursorPosition: (position: number) => void;
  setSelectedText: (text: string | null) => void;
  setEditor: (editor: Editor | null) => void;
  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Scene) => void;
  deleteSceneFromStore: (sceneId: string) => void;
  restoreSceneToStore: (scene: Scene, wasActive: boolean) => void;
  renameSceneInStore: (sceneId: string, newTitle: string) => void;
  updateSceneInStore: (sceneId: string, updates: Partial<Scene>) => void;
  updateSceneSummaryInStore: (sceneId: string, summary: string) => void;
  saveActiveScene: () => Promise<void>;
  toggleSidebar: () => void;
  insertTextAtCursor: (text: string) => void;
  initializeWithScenes: (scenes: Scene[]) => void;
  setAIProcessing: (processing: boolean) => void;
  waitForAIProcessing: () => Promise<void>;
  setChapters: (chapters: Chapter[]) => void;
  addChapter: (chapter: Chapter) => void;
  updateChapterInStore: (chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapterFromStore: (chapterId: string) => void;

  // NOVO: Save Status akcije
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setLastSaveError: (error: string | null) => void;
  setLastSaveTime: (time: Date | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsOnline: (online: boolean) => void;
  forceSave: () => Promise<void>;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  // Početno stanje
  activeSceneId: null,
  editorContent: '',
  cursorPosition: 0,
  selectedText: null,
  editor: null,
  scenes: [],
  chapters: [],
  isSidebarOpen: true,
  isAIProcessing: false,
  aiProcessingLock: null,

  // NOVO: Save Status početna stanja
  saveStatus: 'idle',
  lastSaveError: null,
  lastSaveTime: null,
  hasUnsavedChanges: false,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,


  // Implementacija akcija
  setActiveScene: async (sceneId: string) => {
    const state = get();

    // Spremi trenutnu aktivnu scenu prije prebacivanja
    if (state.activeSceneId && state.editorContent) {
      try {
        await get().saveActiveScene();
      } catch (error) {
        console.error('Greška pri spremanju trenutne scene:', error);
      }
    }

    // Prebaci na novu scenu
    set((state) => {
      const scene = state.scenes.find(s => s.id === sceneId);
      return {
        activeSceneId: sceneId,
        editorContent: scene ? scene.content || scene.summary || '' : ''
      };
    });
  },

  updateContent: (content: string) => {
    const state = get();
    // Spriječi nepotrebna ažuriranja ako je sadržaj isti
    if (state.editorContent === content) return;

    const updates: Partial<StudioState> = {
      editorContent: content,
      hasUnsavedChanges: true,
    };

    // Resetiraj status samo ako je 'saved' ili 'error'
    // Ako je 'saving', ostavi ga da se vrti dok se trenutno spremanje ne završi
    if (state.saveStatus === 'saved' || state.saveStatus === 'error') {
      updates.saveStatus = 'idle';
    }

    set(updates);
  },

  setCursorPosition: (position: number) => {
    set({ cursorPosition: position });
  },

  setSelectedText: (text: string | null) => {
    set({ selectedText: text });
  },

  setEditor: (editor: Editor | null) => {
    set({ editor });
  },

  setScenes: (scenes: Scene[]) => {
    set({ scenes });
  },

  addScene: (scene: Scene) => {
    set((state) => ({
      scenes: [...state.scenes, scene],
      activeSceneId: scene.id,
      editorContent: scene.content || scene.summary || ''
    }));
  },

  initializeWithScenes: (scenes: Scene[]) => {
    set((state) => {
      // Ako već imamo aktivnu scenu, ne mijenjaj ništa
      if (state.activeSceneId && scenes.find(s => s.id === state.activeSceneId)) {
        return { scenes };
      }

      // Inače, postavi prvu scenu kao aktivnu
      if (scenes.length > 0) {
        const firstScene = scenes[0];
        return {
          scenes,
          activeSceneId: firstScene.id,
          editorContent: firstScene.content || firstScene.summary || ''
        };
      }

      // Ako nema scena, samo postavi scene
      return { scenes };
    });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },

  deleteSceneFromStore: (sceneId: string) => {
    set((state) => {
      const updatedScenes = state.scenes.filter(scene => scene.id !== sceneId);

      // Ako je obrisana scena bila aktivna, postavi novu aktivnu scenu
      let newActiveSceneId = state.activeSceneId;
      let newEditorContent = state.editorContent;

      if (state.activeSceneId === sceneId) {
        if (updatedScenes.length > 0) {
          // Postavi prvu dostupnu scenu kao aktivnu
          const firstScene = updatedScenes[0];
          newActiveSceneId = firstScene.id;
          newEditorContent = firstScene.content || firstScene.summary || '';
        } else {
          // Nema više scena
          newActiveSceneId = null;
          newEditorContent = '';
        }
      }

      return {
        scenes: updatedScenes,
        activeSceneId: newActiveSceneId,
        editorContent: newEditorContent
      };
    });
  },

  restoreSceneToStore: (scene: Scene, wasActive: boolean) => {
    set((state) => {
      // Dodaj scenu natrag na popis (sortirano po order)
      const updatedScenes = [...state.scenes, scene].sort((a, b) => a.order - b.order);

      // Ako je scena bila aktivna, postavi je ponovno kao aktivnu
      let newActiveSceneId = state.activeSceneId;
      let newEditorContent = state.editorContent;

      if (wasActive) {
        newActiveSceneId = scene.id;
        newEditorContent = scene.content || scene.summary || '';
      }

      return {
        scenes: updatedScenes,
        activeSceneId: newActiveSceneId,
        editorContent: newEditorContent
      };
    });
  },

  renameSceneInStore: (sceneId: string, newTitle: string) => {
    set((state) => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? { ...scene, title: newTitle }
          : scene
      )
    }));
  },

  updateSceneInStore: (sceneId: string, updates: Partial<Scene>) => {
    set((state) => {
      const updatedScenes = state.scenes.map(scene =>
        scene.id === sceneId
          ? { ...scene, ...updates }
          : scene
      );

      // Ako je ažurirana scena trenutno aktivna, ažuriraj i editorContent
      let newEditorContent = state.editorContent;
      if (state.activeSceneId === sceneId && (updates.content !== undefined || updates.summary !== undefined)) {
        newEditorContent = updates.content ?? updates.summary ?? '';
      }

      return {
        scenes: updatedScenes,
        editorContent: newEditorContent
      };
    });
  },

  updateSceneSummaryInStore: (sceneId: string, summary: string) => {
    set((state) => ({
      scenes: state.scenes.map(scene =>
        scene.id === sceneId
          ? { ...scene, summary }
          : scene
      )
    }));
  },

  saveActiveScene: async () => {
    const state = get();

    if (!state.activeSceneId) {
      return; // Nema se što spremiti ako nema aktivne scene
    }
    // UKLONJENO: !state.editorContent check - sada dopuštamo spremanje praznog sadržaja (brisanje)

    // Spremi sadržaj koji trenutno šaljemo
    const contentBeingSaved = state.editorContent || '';

    // Postavi status na 'saving'
    set({
      saveStatus: 'saving',
      lastSaveError: null
    });

    // Čekaj da se završi AI procesiranje prije spremanja (s timeoutom)
    if (state.isAIProcessing && state.aiProcessingLock) {
      console.log('⏸️ Čekam da se završi AI procesiranje prije spremanja...');
      // Timeout za AI lock kako ne bismo čekali zauvijek
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ AI procesiranje traje predugo, nastavljam sa spremanjem...');
          resolve();
        }, 5000); // 5 sekundi timeout
      });

      await Promise.race([state.aiProcessingLock, timeoutPromise]);
    }

    // Zabilježi vrijeme početka spremanja
    const startTime = Date.now();

    try {
      // NOVO: Koristi retry logiku s exponential backoff
      await retryWithBackoff(async () => {
        // Osiguraj da šaljemo string, makar i prazan
        const contentToSave = state.editorContent || '';
        return await api.updateScene(state.activeSceneId!, {
          content: contentToSave
        });
      }, 3, 2000); // 3 pokušaja, početni delay 2s

      // Ažuriraj scenu u store-u s novim content sadržajem
      set((state) => ({
        scenes: state.scenes.map(s =>
          s.id === state.activeSceneId ? { ...s, content: contentBeingSaved } : s
        )
      }));

      // FORCE MINIMUM SPINNER DURATION: 2000ms
      const elapsed = Date.now() - startTime;
      const minDuration = 2000;
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }

      // Provjeri je li se sadržaj promijenio dok smo spremali (user je tipkao)
      const currentContent = get().editorContent;
      const hasNewChanges = currentContent !== contentBeingSaved;

      // Postavi status na 'saved'
      set({
        saveStatus: 'saved',
        lastSaveTime: new Date(),
        lastSaveError: null,
        hasUnsavedChanges: hasNewChanges // Ako je korisnik tipkao, i dalje imamo nespremljene promjene
      });

      console.log('✅ Scena uspješno spremljena!');

      // TRANSIENT STATUS: Vrati na 'idle' nakon 2 sekunde
      setTimeout(() => {
        // Provjeri jesmo li još uvijek u 'saved' statusu (da ne pregazimo novi 'saving' ili 'error')
        if (get().saveStatus === 'saved') {
          set({ saveStatus: 'idle' });
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Greška pri spremanju scene:', error);

      const errorMessage = (error as any).message || 'Nepoznata greška';

      // Postavi status na 'error'
      set({
        saveStatus: 'error',
        lastSaveError: errorMessage,
        hasUnsavedChanges: true
      });

      // NE throw-aj grešku - ostavi podatke u store-u i localStorage-u
    }
  },

  insertTextAtCursor: (text: string) => {
    const { editor } = get();

    if (editor) {
      // Koristi TipTap editor instancu za umetanje teksta
      editor.chain().focus().insertContent(text).run();
    } else {
      // Fallback: ažuriraj samo stanje (za slučaj da editor još nije inicijaliziran)
      console.warn('Editor instance not available, falling back to state update');
    }
  },

  setAIProcessing: (processing: boolean) => {
    if (processing) {
      // Stvori novi Promise koji će se riješiti kada AI završi
      const lockPromise = new Promise<void>((resolve) => {
        // Sačuvaj resolve funkciju za kasnije
        (window as any).__aiProcessingResolve = resolve;
      });
      set({ isAIProcessing: true, aiProcessingLock: lockPromise });
    } else {
      // Riješi Promise i očisti stanje
      if ((window as any).__aiProcessingResolve) {
        (window as any).__aiProcessingResolve();
        delete (window as any).__aiProcessingResolve;
      }
      set({ isAIProcessing: false, aiProcessingLock: null });
    }
  },

  waitForAIProcessing: async () => {
    const state = get();
    if (state.isAIProcessing && state.aiProcessingLock) {
      await state.aiProcessingLock;
    }
  },

  setChapters: (chapters: Chapter[]) => {
    set({ chapters });
  },

  addChapter: (chapter: Chapter) => {
    set((state) => ({
      chapters: [...state.chapters, chapter].sort((a, b) => a.order - b.order)
    }));
  },

  updateChapterInStore: (chapterId: string, updates: Partial<Chapter>) => {
    set((state) => ({
      chapters: state.chapters.map(chapter =>
        chapter.id === chapterId
          ? { ...chapter, ...updates }
          : chapter
      )
    }));
  },

  deleteChapterFromStore: (chapterId: string) => {
    set((state) => ({
      chapters: state.chapters.filter(chapter => chapter.id !== chapterId)
    }));
  },

  // NOVO: Save Status akcije
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => {
    set({ saveStatus: status });
  },

  setLastSaveError: (error: string | null) => {
    set({ lastSaveError: error });
  },

  setLastSaveTime: (time: Date | null) => {
    set({ lastSaveTime: time });
  },

  setHasUnsavedChanges: (hasChanges: boolean) => {
    set({ hasUnsavedChanges: hasChanges });
  },

  setIsOnline: (online: boolean) => {
    set({ isOnline: online });

    if (online) {
      console.log('🌐 Veza uspostavljena - pokušavam sync...');
      // Pokušaj spremiti ako ima nespremljenih promjena
      const state = get();
      if (state.hasUnsavedChanges && state.activeSceneId) {
        state.saveActiveScene();
      }
    } else {
      console.log('📴 Veza izgubljena - rad se sprema lokalno');
    }
  },

  forceSave: async () => {
    const state = get();

    // Forsiraj spremanje čak i ako nema promjena
    if (state.activeSceneId && state.editorContent) {
      await state.saveActiveScene();
    }
  },
}));
