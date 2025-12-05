import { create } from 'zustand';
import { Scene, Chapter } from '@/lib/types';
import type { Editor } from '@tiptap/core';
import { api } from '@/lib/serverComm';

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
  isCommandBarVisible: boolean;

  // AI Processing stanje - za sprječavanje race conditiona
  isAIProcessing: boolean;
  aiProcessingLock: Promise<void> | null;

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
  isCommandBarVisible: true,
  isAIProcessing: false,
  aiProcessingLock: null,

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
        editorContent: scene ? scene.summary || '' : ''
      };
    });
  },

  updateContent: (content: string) => {
    set({ editorContent: content });
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
      editorContent: scene.summary || ''
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
          editorContent: firstScene.summary || ''
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
          newEditorContent = firstScene.summary || '';
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
        newEditorContent = scene.summary || '';
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
      if (state.activeSceneId === sceneId && updates.summary !== undefined) {
        newEditorContent = updates.summary || '';
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

    if (!state.activeSceneId || !state.editorContent) {
      return; // Nema što spremiti
    }

    // Čekaj da se završi AI procesiranje prije spremanja
    if (state.isAIProcessing && state.aiProcessingLock) {
      console.log('⏸️ Čekam da se završi AI procesiranje prije spremanja...');
      await state.aiProcessingLock;
    }

    try {
      // Pozovi API za ažuriranje scene
      await api.updateScene(state.activeSceneId, {
        summary: state.editorContent
      });

      // Ažuriraj scenu u store-u s novim sadržajem
      get().updateSceneSummaryInStore(state.activeSceneId, state.editorContent);

      console.log('Scena uspješno spremljena!');
    } catch (error) {
      console.error('Greška pri spremanju scene:', error);
      throw error; // Re-throw da pozivatelj može handleati grešku
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
}));
