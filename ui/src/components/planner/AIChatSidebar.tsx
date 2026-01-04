import React, { useRef, useEffect, useState } from 'react';
import { usePlannerAIStore } from '@/stores/plannerAIStore';
import { X, Send, Sparkles, BrainCircuit, BookOpen, Check, PenTool, ThumbsUp, ThumbsDown, Clock, Plus, Trash2, MessageSquare } from 'lucide-react';
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
        setActiveView,
        // Session Management
        sessions,
        loadSessions,
        loadSession,
        deleteSession,
        resetSession,
        currentSessionId,
        projectId,
        saveToResearch
    } = usePlannerAIStore();

    const location = useLocation();
    const isStudioMode = location.pathname.includes('/studio');
    const [showHistory, setShowHistory] = useState(false);

    // Ažuriraj activeView u store-u kad se promijeni lokacija
    useEffect(() => {
        setActiveView(isStudioMode ? 'studio' : 'planner');
    }, [isStudioMode, setActiveView]);

    // Load sessions when sidebar opens
    useEffect(() => {
        if (isOpen && projectId) {
            loadSessions(projectId);
        }
    }, [isOpen, projectId, loadSessions]);

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

    const handleNewChat = () => {
        resetSession();
        setShowHistory(false);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleSelectSession = async (sessionId: string) => {
        await loadSession(sessionId);
        setShowHistory(false);
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this chat?')) {
            await deleteSession(sessionId);
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
                        AI Assistant{context && mode === 'planner' ? ` - ${getContextDisplayName()}` : ''}
                    </h2>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleNewChat}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                        title="New Session"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn(
                            "p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground",
                            showHistory && "bg-muted text-foreground"
                        )}
                        title="Chat History"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                    <button
                        onClick={closeModal}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Mode Selector & Model Config */}
            {!showHistory && (
                <div className="p-2 border-b border-border bg-muted/10 space-y-2">
                    <div className="flex gap-1">
                        {/* Primary Mode Button (Planner or Writer) */}
                        <button
                            onClick={() => setMode(isStudioMode ? 'writer' : 'planner')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
                                (mode === 'planner' || mode === 'writer')
                                    ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {isStudioMode ? <PenTool className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                            {isStudioMode ? 'Writer' : 'Planner'}
                        </button>

                        {/* Brainstorming Button - Always second, fixed position relative to first */}
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

                    {/* Worker Model Selector */}
                    <div className="px-1">
                        <select
                            className="w-full p-1.5 text-xs rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            onChange={(e) => usePlannerAIStore.getState().setWorkerModel(e.target.value)}
                            defaultValue="claude-3-5-sonnet-20240620"
                        >
                            <option value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet (Writer)</option>
                            <option value="gpt-4o">GPT-4o (Writer)</option>
                            <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fast)</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Context Info (Planner Mode only) */}
            {!showHistory && mode === 'planner' && context && (
                <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground border-b border-border">
                    Context: <span className="font-medium text-foreground">{context}</span>
                </div>
            )}

            {/* Content Area (Messages or History) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                {showHistory ? (
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground mb-4">Chat History</h3>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No saved chats.</p>
                        ) : (
                            sessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSelectSession(session.id)}
                                    className={cn(
                                        "group flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer transition-all hover:bg-muted/50",
                                        currentSessionId === session.id && "bg-primary/5 border-primary/30"
                                    )}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <MessageSquare className={cn(
                                            "w-4 h-4 flex-shrink-0",
                                            currentSessionId === session.id ? "text-primary" : "text-muted-foreground"
                                        )} />
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-medium truncate">{session.name}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(session.updatedAt).toLocaleDateString()} • {session.mode}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 text-red-500 rounded transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground mt-10 space-y-2">
                                <Sparkles className="w-10 h-10 mx-auto opacity-20" />
                                <p>How can I help with your story today?</p>
                                {mode === 'brainstorming' && (
                                    <p className="text-xs opacity-70">Brainstorming mode is active - feel free to explore ideas!</p>
                                )}
                                {mode === 'writer' && (
                                    <p className="text-xs opacity-70">Writer mode is active - ask for writing assistance!</p>
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
                                <span className="text-xs text-muted-foreground">AI is thinking...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Pending Application Preview */}
            {!showHistory && pendingApplication && (mode === 'planner' || mode === 'writer' || mode === 'brainstorming') && (
                <div className="p-3 border-t border-border bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            {mode === 'writer' ? 'Proposed text' :
                                mode === 'brainstorming' ? 'Save idea' : 'Ready proposal'}
                        </span>

                        {/* Writer Mode Actions */}
                        {mode === 'writer' && (
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setGhostTextAction('reject')}
                                    className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors"
                                    title="Reject"
                                >
                                    <ThumbsDown className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => setGhostTextAction('accept')}
                                    className="p-1 hover:bg-green-100 text-green-600 rounded transition-colors"
                                    title="Accept"
                                >
                                    <ThumbsUp className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {/* Brainstorming Mode Actions */}
                        {mode === 'brainstorming' && (
                            <button
                                onClick={async () => {
                                    if (pendingApplication) {
                                        const title = window.prompt("Enter a title for this idea (will be shown as a navigation button):");
                                        if (!title) return; // Cancelled

                                        const formattedContent = `=== ${title} ===\n\n${pendingApplication}`;
                                        await saveToResearch(formattedContent);

                                        // Optional: Clear pending application or show success feedback
                                        alert('Saved to Research!');
                                    }
                                }}
                                className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors flex items-center gap-1"
                                title="Save to Research"
                            >
                                <BookOpen className="w-3 h-3" /> Save
                            </button>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-3 italic border-l-2 border-primary/30 pl-2 max-h-24 overflow-y-auto">
                        {pendingApplication}
                    </div>
                </div>
            )}

            {/* Input Area */}
            {!showHistory && (
                <div className="p-4 border-t border-border bg-background">
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                mode === 'planner' ? "Ask for help with the current field..." :
                                    mode === 'writer' ? "Describe a scene, write dialogue, or continue the story..." :
                                        "Brainstorm ideas..."
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
                        Press Enter to send, Shift+Enter for new line
                    </div>
                </div>
            )}
        </div>
    );
};
