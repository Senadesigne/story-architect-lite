import { create } from 'zustand';
import { Scene } from '@/lib/types';

interface StudioState {
  // Editor stanje
  activeSceneId: string | null;
  editorContent: string;
  cursorPosition: number;
  selectedText: string | null;
  
  // Scene stanje
  scenes: Scene[];
  
  // UI stanje
  isSidebarOpen: boolean;
  isCommandBarVisible: boolean;
  
  // Akcije
  setActiveScene: (sceneId: string) => void;
  updateContent: (content: string) => void;
  setCursorPosition: (position: number) => void;
  setSelectedText: (text: string | null) => void;
  setScenes: (scenes: Scene[]) => void;
  toggleSidebar: () => void;
  insertTextAtCursor: (text: string) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  // Početno stanje
  activeSceneId: null,
  editorContent: '',
  cursorPosition: 0,
  selectedText: null,
  scenes: [],
  isSidebarOpen: true,
  isCommandBarVisible: true,
  
  // Implementacija akcija
  setActiveScene: (sceneId: string) => {
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
  
  setScenes: (scenes: Scene[]) => {
    set({ scenes });
  },
  
  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },
  
  insertTextAtCursor: (text: string) => {
    const { editorContent, cursorPosition } = get();
    const beforeCursor = editorContent.slice(0, cursorPosition);
    const afterCursor = editorContent.slice(cursorPosition);
    const newContent = beforeCursor + text + afterCursor;
    const newCursorPosition = cursorPosition + text.length;
    
    set({ 
      editorContent: newContent,
      cursorPosition: newCursorPosition 
    });
  },
}));
