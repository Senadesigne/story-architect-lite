
import { create } from 'zustand';

interface Analysis {
    id: string;
    prompt: string;
    content: string;
    createdAt: string;
    model: string;
}

interface ChiefEditorState {
    isOpen: boolean;
    history: Analysis[];
    currentAnalysis: Analysis | null;
    isLoading: boolean;
    isHistoryLoading: boolean;

    // Actions
    setIsOpen: (isOpen: boolean) => void;
    fetchHistory: (projectId: string) => Promise<void>;
    runAnalysis: (projectId: string, userId: string, prompt: string) => Promise<void>;
    selectAnalysis: (analysis: Analysis) => void;
    deleteAnalysis: (id: string) => Promise<void>;
}

export const useChiefEditorStore = create<ChiefEditorState>((set, get) => ({
    isOpen: false,
    history: [],
    currentAnalysis: null,
    isLoading: false,
    isHistoryLoading: false,

    setIsOpen: (isOpen) => set({ isOpen }),

    fetchHistory: async (projectId) => {
        set({ isHistoryLoading: true });
        try {
            await (window as any).getAuthToken?.(); // Pretpostavljamo da postoji helper ili firebase auth
            // NAPOMENA: U stvarnosti treba koristiti pravi auth header iz nekog auth hooka ili servisa
            // Ovdje ćemo pojednostaviti i pretpostaviti da fetch ima interceptor ili da je token dostupan

            // FIX: Hardcoded fetch logic because axios might not be configured globally
            const response = await fetch(`/api/editor/history/${projectId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` // Pojednostavljeni auth
                }
            });
            const data = await response.json();
            if (data.success) {
                set({ history: data.history });
            }
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            set({ isHistoryLoading: false });
        }
    },

    runAnalysis: async (projectId, userId, prompt) => {
        set({ isLoading: true });
        try {
            const response = await fetch('/api/editor/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                },
                body: JSON.stringify({ projectId, userId, prompt })
            });

            const data = await response.json();

            if (data.success) {
                // Dodaj novi u povijest i postavi kao trenutni
                // Napomena: API response.content je samo text string (analysis result), 
                // a ne cijeli objekt iz baze. 
                // Ako želimo odmah prikazati kao objekt, morali bi vratiti cijeli record iz backend servisa.
                // VertexAIService vraća string. Ali runAnalysis ruta može vratiti što god.
                // Provjeri VertexAIService: ona vraća responseContent (string).
                // A ruta vraća { success: true, content: string }.
                // Dakle ovdje moramo "lažirati" objekt dok ne osvježimo povijest, ili osvježiti povijest.

                await get().fetchHistory(projectId); // Refresh history to get the real object

                // Postavi najnoviji kao trenutni
                const newest = get().history[0];
                if (newest) {
                    set({ currentAnalysis: newest });
                }
            }
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            set({ isLoading: false });
        }
    },

    selectAnalysis: (analysis) => set({ currentAnalysis: analysis }),

    deleteAnalysis: async (id) => {
        try {
            await fetch(`/api/editor/analysis/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
            // Remove from local state
            set((state) => ({
                history: state.history.filter(h => h.id !== id),
                currentAnalysis: state.currentAnalysis?.id === id ? null : state.currentAnalysis
            }));
        } catch (e) {
            console.error("Delete failed", e);
        }
    }
}));
