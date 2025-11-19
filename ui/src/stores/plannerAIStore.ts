import { create } from 'zustand';
import { api } from '@/lib/serverComm';
import type { ChatMessage } from '@/components/planner/AIAssistantModal';

interface PlannerAIState {
  // Modal stanje
  isOpen: boolean;
  context: string | null; // npr. "planner_logline"
  targetField: string | null; // npr. "logline" (ime polja u formi)
  projectId: string | null;
  
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
  messages: [],
  isLoading: false,
  lastResponse: null,

  /**
   * Otvara modal i resetira poruke
   * Ako je proslijeđen initialPrompt, odmah ga šalje
   */
  openModal: (context, targetField, projectId, initialPrompt) => {
    set({
      isOpen: true,
      context,
      targetField,
      projectId,
      messages: [],
      lastResponse: null,
      isLoading: false,
    });

    // Ako postoji initialPrompt, odmah ga pošalji
    if (initialPrompt) {
      // Koristimo setTimeout da osiguramo da je modal otvoren prije slanja poruke
      setTimeout(() => {
        get().sendMessage(initialPrompt);
      }, 100);
    }
  },

  /**
   * Zatvara modal i čisti stanje
   */
  closeModal: () => {
    set({
      isOpen: false,
      context: null,
      targetField: null,
      projectId: null,
      messages: [],
      isLoading: false,
      lastResponse: null,
    });
  },

  /**
   * Šalje poruku backendu i ažurira chat historiju
   */
  sendMessage: async (content: string) => {
    const state = get();
    
    if (!state.projectId || !state.context || state.isLoading) {
      return;
    }

    // Dodaj korisničku poruku u state
    const userMessage: ChatMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Spremi trenutne poruke prije dodavanja nove
    const currentMessages = state.messages;

    set((prevState) => ({
      messages: [...prevState.messages, userMessage],
      isLoading: true,
    }));

    try {
      // Pozovi API s plannerContext i messages (uključujući novu korisničku poruku)
      const finalState = await api.chat(state.projectId, {
        userInput: content.trim(),
        plannerContext: state.context,
        messages: [...currentMessages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      // Dodaj assistant poruku u state
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: finalState.finalOutput || 'Greška: Nema odgovora od AI-a.',
        timestamp: new Date(),
      };

      set((prevState) => ({
        messages: [...prevState.messages, assistantMessage],
        isLoading: false,
        lastResponse: finalState.finalOutput || null,
      }));

    } catch (error) {
      console.error('❌ Greška prilikom slanja poruke:', error);
      
      // Dodaj error poruku kao assistant poruku
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Greška: ${error instanceof Error ? error.message : 'Nepoznata greška prilikom komunikacije s AI asistentom.'}`,
        timestamp: new Date(),
      };

      set((prevState) => ({
        messages: [...prevState.messages, errorMessage],
        isLoading: false,
        lastResponse: null,
      }));
    }
  },

  /**
   * Briše sve poruke iz chat historije
   */
  clearMessages: () => {
    set({
      messages: [],
      lastResponse: null,
    });
  },

  /**
   * Potpuno resetira store na početno stanje
   */
  reset: () => {
    set({
      isOpen: false,
      context: null,
      targetField: null,
      projectId: null,
      messages: [],
      isLoading: false,
      lastResponse: null,
    });
  },
}));

