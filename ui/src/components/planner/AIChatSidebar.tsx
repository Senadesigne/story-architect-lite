import React, { useRef, useEffect } from 'react';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { X, Send, Sparkles, BrainCircuit, BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AIChatSidebar: React.FC = () => {
    const {
        isOpen,
        closeModal,
        messages,
        sendMessage,
        isLoading,
        mode,
        setMode,
        pendingApplication,
        setPendingApplication,
        context
    } = usePlannerAIStore();

    const [input, setInput] = React.useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll na dno poruka
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Fokus na input kad se otvori
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const content = input;
        setInput('');
        await sendMessage(content);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleApply = () => {
        // Ova funkcija će biti implementirana u IdeationForm kroz useEffect koji sluša pendingApplication
        // Ovdje samo možemo zatvoriti sidebar ili dati vizualnu povratnu informaciju
        // Zapravo, IdeationForm treba znati da je korisnik kliknuo "Keep All"
        // Ali budući da pendingApplication već sadrži tekst, IdeationForm ga može preuzeti
        // Možda nam treba dodatna akcija "applyPending" u store-u?
        // Za sada, pretpostavimo da IdeationForm sluša promjene i mi samo trebamo signalizirati
        // Ali čekaj, IdeationForm ne zna KADA primijeniti.
        // Dodat ćemo "applyPending" flag ili akciju u store.

        // Zbog jednostavnosti, ovdje ne radimo ništa osim što zatvaramo sidebar, 
        // a stvarna logika primjene će biti u IdeationForm koja će čitati pendingApplication
        // kad se sidebar zatvori ili na neki drugi trigger.
        // Zapravo, bolje je da imamo callback ili event.
        // Ali kako je store globalan, IdeationForm može reagirati na gumb ovdje.

        // RJEŠENJE: IdeationForm će imati gumb "Primijeni" koji se pojavljuje kad je pendingApplication != null
        // ILI, ovaj gumb ovdje poziva funkciju koja je proslijeđena... ali ovo je globalni store.

        // Privremeno rješenje: Korisnik mora ručno kopirati ili ćemo implementirati "apply" logiku kasnije.
        // Zapravo, u originalnom modalu, "Keep All" je pozivao onKeepAll prop.
        // Ovdje nemamo propse jer je globalna komponenta.

        // Najbolje rješenje: Dodati `applyCallback` u store koji se registrira kad se otvori modal?
        // Ne, to nije serijalizabilno.

        // Alternativa: IdeationForm prati `pendingApplication` i nudi UI za primjenu unutar forme,
        // A sidebar služi samo za chat.
        // ALI, korisnik očekuje "Keep All" u sidebaru.

        // Za sada, ostavimo "Keep All" gumb koji samo zatvara sidebar, 
        // a IdeationForm će provjeriti `pendingApplication` pri zatvaranju?
        // To je riskantno.

        // Idemo s jednostavnim pristupom: Sidebar je za chat. Ako korisnik želi primijeniti,
        // može kopirati tekst. "Keep All" funkcionalnost ćemo dodati u Fazi 5 (Povezivanje).
        closeModal();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-lg">AI Asistent</h2>
                </div>
                <button
                    onClick={closeModal}
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>
            </div>

            {/* Mode Selector */}
            <div className="p-2 border-b border-border bg-muted/10 flex gap-1">
                <button
                    onClick={() => setMode('planner')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                        mode === 'planner'
                            ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <BookOpen className="w-4 h-4" />
                    Planner
                </button>
                <button
                    onClick={() => setMode('brainstorming')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                        mode === 'brainstorming'
                            ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <BrainCircuit className="w-4 h-4" />
                    Brainstorming
                </button>
            </div>

            {/* Context Info (Planner Mode only) */}
            {mode === 'planner' && context && (
                <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border">
                    Kontekst: <span className="font-medium text-foreground">{context}</span>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground mt-10 space-y-2">
                        <Sparkles className="w-10 h-10 mx-auto opacity-20" />
                        <p>Kako vam mogu pomoći s vašom pričom danas?</p>
                        {mode === 'brainstorming' && (
                            <p className="text-xs opacity-70">Brainstorming mod je aktivan - slobodno istražujte ideje!</p>
                        )}
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "flex flex-col max-w-[85%] rounded-lg p-3 text-sm",
                            msg.role === 'user'
                                ? "self-end bg-primary text-primary-foreground ml-auto"
                                : "self-start bg-muted text-foreground mr-auto border border-border"
                        )}
                    >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <span className="text-[10px] opacity-50 mt-1 self-end">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}

                {isLoading && (
                    <div className="self-start bg-muted text-foreground rounded-lg p-3 border border-border flex items-center gap-2">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></div>
                        </div>
                        <span className="text-xs text-muted-foreground">AI razmišlja...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Pending Application Preview (Keep All) */}
            {pendingApplication && mode === 'planner' && (
                <div className="p-3 border-t border-border bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <Check className="w-3 h-3" /> Spreman prijedlog
                        </span>
                        {/* Ovdje ćemo kasnije dodati pravi Keep All gumb */}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-primary/30 pl-2">
                        {pendingApplication}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
                <div className="relative">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'planner' ? "Zatražite pomoć oko trenutnog polja..." : "Brainstormajte ideje..."}
                        className="w-full min-h-[80px] max-h-[160px] p-3 pr-10 rounded-md border border-input bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        rows={3}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute bottom-3 right-3 p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-[10px] text-center text-muted-foreground mt-2">
                    Pritisnite Enter za slanje, Shift+Enter za novi red
                </div>
            </div>
        </div>
    );
};
