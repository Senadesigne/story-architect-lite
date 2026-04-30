
import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useChiefEditorStore } from '@/store/useChiefEditorStore';
import { AnalysisDisplay } from './AnalysisDisplay';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Pretpostavka za projectId i userId. U stvarnosti bi ih trebali dobiti iz Contexta ili rute.
// Ovdje ih primamo kao props ili dohvaćamo iz nekog drugog store-a.
interface ChiefEditorModalProps {
    projectId: string;
    userId: string;
}

export const ChiefEditorModal: React.FC<ChiefEditorModalProps> = ({ projectId, userId }) => {
    const {
        isOpen,
        setIsOpen,
        currentAnalysis,
        isLoading,
        runAnalysis,
        history
    } = useChiefEditorStore();

    const [prompt, setPrompt] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);



    const handleGenerateClick = () => {
        // Ako nema povijesti (prvi put) ili se eksplicitno traži nova analiza velike knjige
        // Ovdje pojednostavljujemo logiku potvrde: ako je history prazan, traži potvrdu.
        if (history.length === 0) {
            setShowConfirm(true);
        } else {
            executeAnalysis();
        }
    };

    const executeAnalysis = async () => {
        setShowConfirm(false);
        if (!prompt.trim()) return;
        await runAnalysis(projectId, userId, prompt);
        setPrompt(''); // Clear input after send
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-serif">Chief Editor Analysis</DialogTitle>
                    <DialogDescription>
                        Request a deep analysis of your manuscript from the AI editor (Gemini 1.5 Pro).
                    </DialogDescription>
                </DialogHeader>

                {/* WORKSPACE AREA */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden mt-4">

                    {/* 1. DISPLAY AREA */}
                    <div className="flex-1 relative min-h-0">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground animate-pulse">Chief Editor is reading your manuscript...</p>
                            </div>
                        ) : null}

                        {currentAnalysis ? (
                            <AnalysisDisplay content={currentAnalysis.content} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground border rounded-md bg-muted/20">
                                <div className="text-center p-8">
                                    <p className="mb-2">No analysis selected.</p>
                                    <p className="text-sm">Ask a question below or select a past analysis from the left panel.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. CONFIRMATION ALERT (Conditional) */}
                    {showConfirm && (
                        <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800 dark:text-yellow-500">Confirm Analysis</AlertTitle>
                            <AlertDescription className="text-yellow-700 dark:text-yellow-400 flex flex-col gap-2">
                                <p>This will read your ENTIRE manuscript. It may take a while and uses AI credits.</p>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={executeAnalysis}>Got it, continue</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* 3. INPUT AREA */}
                    <div className="flex gap-2 items-end pt-2 border-t">
                        <Textarea
                            placeholder="What should the editor check? (e.g. 'Track the character development of Mark', 'Analyze the pacing')"
                            className="resize-none min-h-[80px]"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerateClick();
                                }
                            }}
                        />
                        <Button
                            className="h-[80px] px-6"
                            onClick={handleGenerateClick}
                            disabled={isLoading || !prompt.trim()}
                        >
                            Analyze
                        </Button>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
};
