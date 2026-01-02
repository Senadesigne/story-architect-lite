import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LocalBackup {
    sceneId: string;
    content: string;
    timestamp: number;
    version: number;
}

interface RestoreBackupDialogProps {
    open: boolean;
    backup: LocalBackup | null;
    serverTimestamp: number;
    onRestore: () => void;
    onKeepServer: () => void;
}

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('hr-HR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function RestoreBackupDialog({
    open,
    backup,
    serverTimestamp,
    onRestore,
    onKeepServer
}: RestoreBackupDialogProps) {
    const [isRestoring, setIsRestoring] = useState(false);

    const handleRestore = async () => {
        setIsRestoring(true);
        try {
            await onRestore();
        } finally {
            setIsRestoring(false);
        }
    };

    if (!backup) {
        return null;
    }

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>🔄 Pronađen Nespremljen Rad</DialogTitle>
                    <DialogDescription>
                        Postoji lokalni backup koji je noviji od verzije na serveru.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Timestamp Comparison */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                            <p className="font-semibold text-muted-foreground">Backup:</p>
                            <p className="text-foreground">{formatDate(backup.timestamp)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold text-muted-foreground">Server:</p>
                            <p className="text-foreground">{formatDate(serverTimestamp)}</p>
                        </div>
                    </div>

                    {/* Backup Info */}
                    <div className="bg-muted p-4 rounded-md space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Duljina sadržaja:</span>
                            <span className="font-medium">{backup.content.length} znakova</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Verzija backup-a:</span>
                            <span className="font-medium">#{backup.version}</span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Odabirom "Zadrži Server Verziju" trajno ćete izgubiti lokalni backup.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={onKeepServer}
                        disabled={isRestoring}
                    >
                        Zadrži Server Verziju
                    </Button>
                    <Button
                        onClick={handleRestore}
                        disabled={isRestoring}
                    >
                        {isRestoring ? (
                            <>
                                <span className="mr-2">Vraćam...</span>
                            </>
                        ) : (
                            <>🔄 Vrati Backup</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
