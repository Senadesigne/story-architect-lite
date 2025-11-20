import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { usePlannerAIStore } from '@/stores/plannerAIStore';

/**
 * Tip poruke u chat historiji
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface AIAssistantModalProps {
  /**
   * Kontrolira da li je modal otvoren
   */
  isOpen: boolean;
  
  /**
   * Handler za zatvaranje modala
   */
  onClose: () => void;
  
  /**
   * Kontekst polja (npr. "Logline", "Character", "Location")
   */
  context: string;
  
  /**
   * Početna vrijednost polja (trenutna vrijednost)
   */
  initialValue: string;
  
  /**
   * Handler za Keep All akciju (zamjena vrijednosti s generiranim tekstom ili objektom)
   */
  onKeepAll: (value: string | object) => void;
  
  /**
   * Povijest poruka u razgovoru (opcionalno)
   */
  messages?: ChatMessage[];
  
  /**
   * Da li se trenutno generira odgovor (loading stanje)
   */
  isLoading?: boolean;
  
  /**
   * Zadnji generirani odgovor (za Keep All)
   */
  lastResponse?: string;
}

/**
 * AIAssistantModal - Modal komponenta za AI asistenta u Planner modu
 * 
 * Layout:
 * - Header: Naslov s kontekstom polja
 * - Chat History: Scrollabilna lista poruka (User & AI)
 * - Input & Actions: Textarea za novi prompt + Send gumb + Keep All gumb
 */
export function AIAssistantModal({
  isOpen,
  onClose,
  context,
  initialValue,
  onKeepAll,
  messages = [],
  isLoading = false,
  lastResponse,
}: AIAssistantModalProps) {
  const [inputValue, setInputValue] = useState('');
  const { sendMessage } = usePlannerAIStore();

  // Dobivanje zadnje assistant poruke za Keep All
  const lastAssistantMessage = messages
    .filter(msg => msg.role === 'assistant')
    .pop();

  // Koristi lastResponse ako postoji, inače koristi zadnju assistant poruku
  const generatedText = lastResponse || lastAssistantMessage?.content || '';
  const hasGeneratedText = !!generatedText;

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const messageContent = inputValue.trim();
    setInputValue('');
    await sendMessage(messageContent);
  };

  const handleKeepAll = () => {
    if (!hasGeneratedText) return;
    
    // Provjeri je li kontekst za karakter ili lokaciju (za JSON parsiranje)
    const normalizedContext = context?.toLowerCase() || '';
    const isCharacterContext = normalizedContext.includes('character') || normalizedContext.includes('lik');
    const isLocationContext = normalizedContext.includes('location') || normalizedContext.includes('lokacij');
    
    if (isCharacterContext || isLocationContext) {
      try {
        // 1. Očisti markdown (```json ... ```) ako ga AI pošalje
        let jsonString = generatedText.trim();
        jsonString = jsonString.replace(/^```json\s*/i, ''); // Ukloni početni ```json
        jsonString = jsonString.replace(/^```\s*/i, ''); // Ukloni početni ``` ako nije json
        jsonString = jsonString.replace(/\s*```\s*$/i, ''); // Ukloni završni ```
        jsonString = jsonString.trim();
        
        // 2. Parsiraj JSON
        const data = JSON.parse(jsonString);
        
        // 3. Pošalji objekt roditelju (koji očekuje any/objekt, ne string)
        onKeepAll(data);
      } catch (e) {
        console.error("Failed to parse JSON", e);
        // Fallback: Ako parsiranje ne uspije, pošalji originalni tekst
        // Korisnik će vidjeti grešku ili može ručno kopirati
        onKeepAll(generatedText);
      }
    } else {
      // Standardno ponašanje za tekst (Logline, Tema...)
      onKeepAll(generatedText);
    }
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl h-[85vh] flex flex-col p-0"
        showCloseButton={true}
      >
        {/* Header - Fiksna visina */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle className="text-xl">
            AI Asistent: {context}
          </DialogTitle>
        </DialogHeader>

        {/* Sredina - Scrollable (Chat History) */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Chat History */}
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">
                  Započnite razgovor s AI asistentom. Postavite pitanje ili zatražite pomoć za polje "{context}".
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indikator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky (Input + Actions) */}
        <div className="flex-shrink-0 px-6 py-4 space-y-3 border-t bg-background">
            {/* Input sekcija */}
            <div className="flex gap-2">
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Napišite poruku za AI asistenta... (Enter za slanje, Shift+Enter za novi red)"
                disabled={isLoading}
                className={cn(
                  "min-h-[80px] resize-none",
                  isLoading ? "disabled:!cursor-wait" : "cursor-text"
                )}
                onKeyDown={(e) => {
                  // Enter (bez Shift) -> Pošalji poruku
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Cmd/Ctrl + Enter -> Također pošalji poruku (zadržano za kompatibilnost)
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Shift + Enter -> Novi red (default ponašanje, ne treba handler)
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !inputValue.trim()}
                size="icon"
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>

            {/* Keep All gumb */}
            {hasGeneratedText && (
              <div className="flex justify-end">
                <Button
                  variant="default"
                  onClick={handleKeepAll}
                  disabled={isLoading}
                  size="sm"
                >
                  Keep All
                </Button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

