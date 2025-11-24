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
  mode: 'planner' | 'brainstorming'; // Novi mod rada
  pendingApplication: string | null; // Sadržaj koji čeka na "Keep All"

  // Chat stanje
  messages: ChatMessage[];
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
  setMode: (mode: 'planner' | 'brainstorming') => void;
  setPendingApplication: (content: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
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
  pendingApplication: null,
  messages: [],
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
      // Ne resetiramo poruke ako je isti kontekst/projekt da sačuvamo historiju? 
      // Za sada resetiramo kao i prije, ali to možemo promijeniti za perzistentnost.
      // messages: [], // TODO: Razmisliti o perzistentnosti
      lastResponse: null,
      isLoading: false,
      pendingApplication: null,
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
      // Ne čistimo ostalo stanje da bi ostalo u sidebaru kad se ponovno otvori?
      // Za sada čistimo da bude kao modal, ali za sidebar možda želimo sačuvati stanje.
      // context: null,
      // targetField: null,
      // projectId: null,
      // messages: [],
      // isLoading: false,
      // lastResponse: null,
      pendingApplication: null,
    });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setPendingApplication: (content) => {
    set({ pendingApplication: content });
  },

  sendMessage: async (content: string) => {
    const state = get();

    if (!state.projectId || !state.context || state.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const currentMessages = state.messages;

    set((prevState) => ({
      messages: [...prevState.messages, userMessage],
      isLoading: true,
    }));

    try {
      // Pozovi API s plannerContext, messages i MODE parametrom
      const finalState = await api.chat(state.projectId, {
        userInput: content.trim(),
        plannerContext: state.context,
        mode: state.mode, // Šaljemo odabrani mod
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

      set((prevState) => ({
        messages: [...prevState.messages, assistantMessage],
        isLoading: false,
        lastResponse: finalState.finalOutput || null,
        // Automatski postavi pendingApplication ako je uspješan odgovor
        pendingApplication: finalState.finalOutput || null
      }));

    } catch (error) {
      console.error('❌ Greška prilikom slanja poruke:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Greška: ${error instanceof Error ? error.message : 'Nepoznata greška prilikom komunikacije s AI asistentom.'}`,
        timestamp: new Date(),
      };

      set((prevState) => ({
        messages: [...prevState.messages, errorMessage],
        isLoading: false,
        lastResponse: null,
        pendingApplication: null
      }));
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      lastResponse: null,
      pendingApplication: null,
    });
  },

  reset: () => {
    set({
      isOpen: false,
      context: null,
      targetField: null,
      projectId: null,
      mode: 'planner',
      pendingApplication: null,
      messages: [],
      isLoading: false,
      lastResponse: null,
    });
  },
}));
