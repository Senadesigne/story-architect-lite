import React, { useRef, useEffect } from 'react';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { X, Send, Sparkles, BrainCircuit, BookOpen, Check, PenTool, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

export const AIChatSidebar: React.FC = () => {
    const {
        isOpen,
        closeModal,
        plannerMessages,
        writerMessages,
        plannerBrainstormingMessages,
        studioBrainstormingMessages,
        sendMessage,
        isLoading,
        mode,
        setMode,
        context,
        pendingApplication,
        setGhostTextAction,
        setActiveView
    } = usePlannerAIStore();

    const location = useLocation();
    const isStudioMode = location.pathname.includes('/studio');

    // Ažuriraj activeView u store-u kad se promijeni lokacija
    useEffect(() => {
        setActiveView(isStudioMode ? 'studio' : 'planner');
    }, [isStudioMode, setActiveView]);

    const messages = mode === 'planner' ? plannerMessages :
        mode === 'writer' ? writerMessages :
            (isStudioMode ? studioBrainstormingMessages : plannerBrainstormingMessages);

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

    if (!isOpen) return null;

    // Helper funkcija za prikazno ime konteksta
    const getContextDisplayName = (): string => {
        if (!context) return '';
        // Ukloni "planner_" prefix i kapitaliziraj prvo slovo
        return context.replace('planner_', '').charAt(0).toUpperCase() + context.replace('planner_', '').slice(1);
    };

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-background border-l border-border shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-lg">
                        AI Asistent{context && mode === 'planner' ? ` - ${getContextDisplayName()}` : ''}
                    </h2>
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
                {!isStudioMode && (
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
                )}

                {isStudioMode && (
                    <button
                        onClick={() => setMode('writer')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                            mode === 'writer'
                                ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <PenTool className="w-4 h-4" />
                        Writer
                    </button>
                )}

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
                        {mode === 'writer' && (
                            <p className="text-xs opacity-70">Writer mod je aktivan - zatražite pomoć u pisanju!</p>
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
            {pendingApplication && (mode === 'planner' || mode === 'writer') && (
                <div className="p-3 border-t border-border bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <Check className="w-3 h-3" /> {mode === 'writer' ? 'Predloženi tekst' : 'Spreman prijedlog'}
                        </span>
                        {mode === 'writer' && (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setGhostTextAction('reject')}
                                    className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                                    title="Odbaci"
                                >
                                    <ThumbsDown className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => setGhostTextAction('accept')}
                                    className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors"
                                    title="Prihvati"
                                >
                                    <ThumbsUp className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-3 italic border-l-2 border-primary/30 pl-2 max-h-24 overflow-y-auto">
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
                        placeholder={
                            mode === 'planner' ? "Zatražite pomoć oko trenutnog polja..." :
                                mode === 'writer' ? "Opiši scenu, napiši dijalog ili nastavi priču..." :
                                    "Brainstormajte ideje..."
                        }
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
