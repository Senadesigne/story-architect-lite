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

  // Model Selector
  workerModel: string; // ID modela za Workera (npr. "claude-3-5-sonnet-20240620")

  isLoading: boolean;
  lastResponse: string | null; // Zadnji generirani odgovor za Keep All
  projectLastUpdated: number; // Timestamp zadnjeg ažuriranja projekta (za sinkronizaciju)

  // Session Management
  currentSessionId: string | null;
  sessions: ChatSession[];

  loadSessions: (projectId: string) => Promise<void>;
  createSession: (projectId: string, name: string, mode: 'planner' | 'studio') => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  resetSession: () => void; // Clears current session ID and messages

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
  setWorkerModel: (modelId: string) => void;
  setPendingApplication: (content: string | null) => void;
  setEditorContent: (content: string | null) => void;
  setPendingGhostText: (content: string | null) => void;
  setGhostTextAction: (action: 'idle' | 'accept' | 'reject') => void;
  sendMessage: (content: string, currentEditorContent?: string, selection?: string) => Promise<void>;
  saveToResearch: (content: string) => Promise<void>;
  clearMessages: () => void;
  reset: () => void;
}

export interface ChatSession {
  id: string;
  name: string;
  mode: 'planner' | 'studio';
  createdAt: string;
  updatedAt: string;
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
  workerModel: 'claude-3-5-sonnet-20240620', // Default model
  pendingApplication: null,
  editorContent: null,
  pendingGhostText: null,
  ghostTextAction: 'idle',

  // Session state
  currentSessionId: null,
  sessions: [],

  // Inicijalno prazni nizovi poruka
  plannerMessages: [],
  writerMessages: [],
  plannerBrainstormingMessages: [],
  studioBrainstormingMessages: [],

  isLoading: false,
  lastResponse: null,
  projectLastUpdated: 0,

  // --- Session Actions ---

  loadSessions: async (projectId: string) => {
    try {
      const sessions = await api.getSessions(projectId);
      set({ sessions });
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  },

  resetSession: () => {
    set({
      currentSessionId: null,
      plannerMessages: [],
      writerMessages: [],
      plannerBrainstormingMessages: [],
      studioBrainstormingMessages: [],
    });
  },

  createSession: async (projectId: string, name: string, mode: 'planner' | 'studio') => {
    try {
      const session = await api.createSession(projectId, name, mode);
      set((state) => ({
        sessions: [session, ...state.sessions],
        currentSessionId: session.id,
        // Reset messages for the new session
        plannerMessages: mode === 'planner' ? [] : state.plannerMessages,
        writerMessages: mode === 'planner' ? [] : state.writerMessages, // Assuming writer uses planner mode for now or separate?
        // Actually, let's just reset the relevant messages based on mode
        ...(mode === 'planner' ? { plannerMessages: [] } : {}),
        // If studio mode, we might want to reset studio messages?
        // For now, let's just set the session ID and add to list.
        // The backend handles the actual creation.
      }));
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      const sessionData = await api.getSession(sessionId);
      // sessionData should contain the session info and messages
      // We need to parse messages and populate the appropriate message arrays

      // Assuming sessionData structure: { session: ChatSession, messages: ChatMessage[] }
      // If the API returns just the session, we might need to fetch messages separately?
      // Let's assume getSession returns everything needed.

      const { session, messages } = sessionData;

      set((_) => {
        const updates: Partial<PlannerAIState> = {
          currentSessionId: session.id,
          mode: session.mode === 'studio' ? 'writer' : 'planner', // Map session mode to store mode?
          // This mapping might need adjustment based on how modes are defined.
          // Interface says mode: 'planner' | 'brainstorming' | 'writer'
          // Session says mode: 'planner' | 'studio'
        };

        // Populate messages
        // We need to map database messages to ChatMessage interface
        const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
        }));

        if (session.mode === 'planner') {
          updates.plannerMessages = chatMessages;
        } else {
          // Studio session -> Writer messages? or Studio Brainstorming?
          // Let's assume Studio -> Writer for now as per previous context
          updates.writerMessages = chatMessages;
        }

        return updates as PlannerAIState;
      });

    } catch (error) {
      console.error('Failed to load session:', error);
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await api.deleteSession(sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        // If the deleted session was active, reset the current session
        ...(state.currentSessionId === sessionId ? {
          currentSessionId: null,
          plannerMessages: [],
          writerMessages: [],
          plannerBrainstormingMessages: [],
          studioBrainstormingMessages: [],
        } : {})
      }));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  // --- Existing Actions ---

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

    // Load sessions when opening
    get().loadSessions(projectId);

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

  setWorkerModel: (modelId) => {
    set({ workerModel: modelId });
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

  sendMessage: async (content: string, currentEditorContent?: string, selection?: string) => {
    const state = get();

    if (!state.projectId || !state.context || state.isLoading) {
      return;
    }

    // Auto-create session if none exists
    if (!state.currentSessionId) {
      // Generate a name from the first few words
      const name = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      await state.createSession(state.projectId, name, state.activeView);
      // State is updated by createSession, so we need to get fresh state
    }

    // Re-get state after potential session creation
    const freshState = get();
    const sessionId = freshState.currentSessionId;

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Odredi koji niz poruka ažuriramo
    const currentMode = freshState.mode;
    let currentMessages: ChatMessage[] = [];

    if (currentMode === 'planner') currentMessages = freshState.plannerMessages;
    else if (currentMode === 'writer') currentMessages = freshState.writerMessages;
    else if (currentMode === 'brainstorming') {
      // Odaberi pravi brainstorming niz ovisno o view-u
      if (freshState.activeView === 'studio') {
        currentMessages = freshState.studioBrainstormingMessages;
      } else {
        currentMessages = freshState.plannerBrainstormingMessages;
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
        sessionId: sessionId || undefined, // Send sessionId
        plannerContext: freshState.context || undefined,
        mode: freshState.mode, // Šaljemo odabrani mod
        workerModel: freshState.workerModel, // Šaljemo odabrani model za Workera
        editorContent: currentEditorContent || freshState.editorContent || undefined, // Šaljemo sadržaj editora ako postoji
        selection: selection || undefined, // Šaljemo selekciju ako postoji
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
          pendingGhostText: freshState.mode === 'writer' ? (finalState.finalOutput || null) : null,
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

  saveToResearch: async (content: string) => {
    const state = get();
    if (!state.projectId) return;

    try {
      // 1. Fetch current project data
      const project = await api.getProject(state.projectId);

      // 2. Append content
      const currentResearch = project.research || '';
      const newResearch = currentResearch ? `${currentResearch}\n\n${content}` : content;

      // 3. Update project
      await api.updateProject(state.projectId, { research: newResearch });

      // 4. Signal update to listeners
      set({ projectLastUpdated: Date.now() });

      console.log('Saved to research successfully');
    } catch (error) {
      console.error('Failed to save to research:', error);
      throw error;
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
      currentSessionId: null,
      sessions: [],
    });
  },
}));
