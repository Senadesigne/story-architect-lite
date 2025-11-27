import { create } from 'zustand';
import { api } from '@/lib/serverComm';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PlannerAIState {
  // Modal/Sidebar stanje
  isOpen: boolean;
  context: string | null; // npr. "planner_logline"
  targetField: string | null; // npr. "logline" (ime polja u formi)
  projectId: string | null;
  mode: 'planner' | 'brainstorming' | 'writer'; // Novi mod rada
  pendingApplication: string | null; // Sadržaj koji čeka na "Keep All"

  // Studio specifično stanje
  editorContent: string | null;
  pendingGhostText: string | null;
  ghostTextAction: 'idle' | 'accept' | 'reject';

  // Chat stanje - RAZDVOJENO PO MODOVIMA
  plannerMessages: ChatMessage[];
  writerMessages: ChatMessage[];
  plannerBrainstormingMessages: ChatMessage[]; // Brainstorming u Planneru
  studioBrainstormingMessages: ChatMessage[];  // Brainstorming u Studiju

  // UI Stanje
  activeView: 'planner' | 'studio'; // Prati gdje se korisnik nalazi

  isLoading: boolean;
  lastResponse: string | null; // Zadnji generirani odgovor za Keep All

  // Akcije
  openModal: (
    context: string,
    targetField: string,
    projectId: string,
    initialPrompt?: string
  ) => void;
  closeModal: () => void;
  setMode: (mode: 'planner' | 'brainstorming' | 'writer') => void;
  setActiveView: (view: 'planner' | 'studio') => void;
  setPendingApplication: (content: string | null) => void;
  setEditorContent: (content: string | null) => void;
  setPendingGhostText: (content: string | null) => void;
  setGhostTextAction: (action: 'idle' | 'accept' | 'reject') => void;
  sendMessage: (content: string, currentEditorContent?: string) => Promise<void>;
  clearMessages: () => void;
  reset: () => void;
}

/**
 * Zustand store za upravljanje AI asistentom u Planner modu
 * 
 * Upravlja stanjem modala, chat historijom i komunikacijom s backendom.
 */
export const usePlannerAIStore = create<PlannerAIState>((set, get) => ({
  // Početno stanje
  isOpen: false,
  context: null,
  targetField: null,
  projectId: null,
  mode: 'planner', // Default mode
  activeView: 'planner',
  pendingApplication: null,
  editorContent: null,
  pendingGhostText: null,
  ghostTextAction: 'idle',

  // Inicijalno prazni nizovi poruka
  plannerMessages: [],
  writerMessages: [],
  plannerBrainstormingMessages: [],
  studioBrainstormingMessages: [],

  isLoading: false,
  lastResponse: null,

  /**
   * Otvara sidebar (bivši modal) i postavlja kontekst
   */
  openModal: (context, targetField, projectId, initialPrompt) => {
    set({
      isOpen: true,
      context,
      targetField,
      projectId,
      // Ne resetiramo poruke da sačuvamo historiju
      lastResponse: null,
      isLoading: false,
      pendingApplication: null,
      pendingGhostText: null,
      ghostTextAction: 'idle',
    });

    // Ako postoji initialPrompt, odmah ga pošalji
    if (initialPrompt) {
      setTimeout(() => {
        get().sendMessage(initialPrompt);
      }, 100);
    }
  },

  closeModal: () => {
    set({
      isOpen: false,
      pendingApplication: null,
      pendingGhostText: null,
      ghostTextAction: 'idle',
    });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setActiveView: (view) => {
    set({ activeView: view });
  },

  setPendingApplication: (content) => {
    set({ pendingApplication: content });
  },

  setEditorContent: (content) => {
    set({ editorContent: content });
  },

  setPendingGhostText: (content) => {
    set({ pendingGhostText: content, ghostTextAction: 'idle' });
  },

  setGhostTextAction: (action) => {
    set({ ghostTextAction: action });
  },

  sendMessage: async (content: string, currentEditorContent?: string) => {
    const state = get();

    if (!state.projectId || !state.context || state.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Odredi koji niz poruka ažuriramo
    const currentMode = state.mode;
    let currentMessages: ChatMessage[] = [];

    if (currentMode === 'planner') currentMessages = state.plannerMessages;
    else if (currentMode === 'writer') currentMessages = state.writerMessages;
    else if (currentMode === 'brainstorming') {
      // Odaberi pravi brainstorming niz ovisno o view-u
      if (state.activeView === 'studio') {
        currentMessages = state.studioBrainstormingMessages;
      } else {
        currentMessages = state.plannerBrainstormingMessages;
      }
    }

    // Optimistično ažuriranje UI-a
    set((prevState) => {
      const updates: Partial<PlannerAIState> = { isLoading: true };

      if (currentMode === 'planner') updates.plannerMessages = [...prevState.plannerMessages, userMessage];
      else if (currentMode === 'writer') updates.writerMessages = [...prevState.writerMessages, userMessage];
      else if (currentMode === 'brainstorming') {
        if (prevState.activeView === 'studio') {
          updates.studioBrainstormingMessages = [...prevState.studioBrainstormingMessages, userMessage];
        } else {
          updates.plannerBrainstormingMessages = [...prevState.plannerBrainstormingMessages, userMessage];
        }
      }

      return updates as PlannerAIState;
    });

    try {
      // Pozovi API s plannerContext, messages i MODE parametrom
      const finalState = await api.chat(state.projectId, {
        userInput: content.trim(),
        plannerContext: state.context,
        mode: state.mode, // Šaljemo odabrani mod
        editorContent: currentEditorContent || state.editorContent || undefined, // Šaljemo sadržaj editora ako postoji
        messages: [...currentMessages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: finalState.finalOutput || 'Greška: Nema odgovora od AI-a.',
        timestamp: new Date(),
      };

      set((prevState) => {
        const updates: Partial<PlannerAIState> = {
          isLoading: false,
          lastResponse: finalState.finalOutput || null,
          pendingApplication: finalState.finalOutput || null,
          pendingGhostText: state.mode === 'writer' ? (finalState.finalOutput || null) : null,
          ghostTextAction: 'idle'
        };

        if (currentMode === 'planner') updates.plannerMessages = [...prevState.plannerMessages, assistantMessage];
        else if (currentMode === 'writer') updates.writerMessages = [...prevState.writerMessages, assistantMessage];
        else if (currentMode === 'brainstorming') {
          if (prevState.activeView === 'studio') {
            updates.studioBrainstormingMessages = [...prevState.studioBrainstormingMessages, assistantMessage];
          } else {
            updates.plannerBrainstormingMessages = [...prevState.plannerBrainstormingMessages, assistantMessage];
          }
        }

        return updates as PlannerAIState;
      });

    } catch (error) {
      console.error('❌ Greška prilikom slanja poruke:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Greška: ${error instanceof Error ? error.message : 'Nepoznata greška prilikom komunikacije s AI asistentom.'}`,
        timestamp: new Date(),
      };

      set((prevState) => {
        const updates: Partial<PlannerAIState> = {
          isLoading: false,
          lastResponse: null,
          pendingApplication: null,
          pendingGhostText: null,
          ghostTextAction: 'idle'
        };

        if (currentMode === 'planner') updates.plannerMessages = [...prevState.plannerMessages, errorMessage];
        else if (currentMode === 'writer') updates.writerMessages = [...prevState.writerMessages, errorMessage];
        else if (currentMode === 'brainstorming') {
          if (prevState.activeView === 'studio') {
            updates.studioBrainstormingMessages = [...prevState.studioBrainstormingMessages, errorMessage];
          } else {
            updates.plannerBrainstormingMessages = [...prevState.plannerBrainstormingMessages, errorMessage];
          }
        }

        return updates as PlannerAIState;
      });
    }
  },

  clearMessages: () => {
    const state = get();
    const currentMode = state.mode;

    set((prevState) => {
      const updates: Partial<PlannerAIState> = {
        lastResponse: null,
        pendingApplication: null,
        pendingGhostText: null,
        ghostTextAction: 'idle',
      };

      if (currentMode === 'planner') updates.plannerMessages = [];
      else if (currentMode === 'writer') updates.writerMessages = [];
      else if (currentMode === 'brainstorming') {
        if (prevState.activeView === 'studio') {
          updates.studioBrainstormingMessages = [];
        } else {
          updates.plannerBrainstormingMessages = [];
        }
      }

      return updates as PlannerAIState;
    });
  },

  reset: () => {
    set({
      isOpen: false,
      context: null,
      targetField: null,
      projectId: null,
      mode: 'planner',
      activeView: 'planner',
      pendingApplication: null,
      editorContent: null,
      pendingGhostText: null,
      ghostTextAction: 'idle',
      plannerMessages: [],
      writerMessages: [],
      plannerBrainstormingMessages: [],
      studioBrainstormingMessages: [],
      isLoading: false,
      lastResponse: null,
    });
  },
}));
