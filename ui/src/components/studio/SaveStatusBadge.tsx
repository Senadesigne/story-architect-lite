import { useStudioStore } from '@/stores/studioStore';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function SaveStatusBadge() {
    // Koristimo selektore za optimizirano renderiranje
    const saveStatus = useStudioStore(state => state.saveStatus);
    const lastSaveError = useStudioStore(state => state.lastSaveError);
    const forceSave = useStudioStore(state => state.forceSave);

    // console.log('[SaveStatusBadge] Rendered with status:', saveStatus);

    return (
        <div className="flex items-center ml-2 w-6 h-6 justify-center">
            {saveStatus === 'idle' && (
                <div className="w-4 h-4" /> // Empty placeholder
            )}
            {saveStatus === 'saving' && (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}

            {saveStatus === 'saved' && (
                <Check className="h-4 w-4 text-green-500" />
            )}

            {saveStatus === 'error' && (
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertCircle
                                    className="h-4 w-4 text-destructive cursor-pointer hover:opacity-80"
                                    onClick={() => forceSave()}
                                />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Greška pri spremanju: {lastSaveError}</p>
                                <p className="text-xs opacity-70">Klikni za ponovni pokušaj</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-destructive font-semibold">Greška: Nije spremljeno</span>
                </div>
            )}
        </div>
    );
}
