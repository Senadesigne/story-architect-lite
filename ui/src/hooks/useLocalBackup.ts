import { useEffect, useRef, useCallback } from 'react';

interface LocalBackup {
    sceneId: string;
    content: string;
    timestamp: number;
    version: number;
}

interface UseLocalBackupReturn {
    startBackup: (sceneId: string, content: string) => void;
    stopBackup: () => void;
    hasBackup: (sceneId: string) => boolean;
    getBackup: (sceneId: string) => LocalBackup | null;
    clearBackup: (sceneId: string) => void;
    isBackupNewer: (sceneId: string, serverContent: string, serverTimestamp: number) => boolean;
    clearOldBackups: () => void;
}

const BACKUP_INTERVAL = 5000; // 5 sekundi
const BACKUP_EXPIRY_DAYS = 7; // Čuvaj backup 7 dana
const BACKUP_KEY_PREFIX = 'scene_backup_';

export function useLocalBackup(): UseLocalBackupReturn {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const currentSceneIdRef = useRef<string | null>(null);
    const currentContentRef = useRef<string | null>(null);

    // Funkcija za spremanje backup-a
    const saveBackup = useCallback(() => {
        if (!currentSceneIdRef.current || !currentContentRef.current) {
            return;
        }

        const sceneId = currentSceneIdRef.current;
        const content = currentContentRef.current;

        try {
            // Dohvati postojeći backup za verzioniranje
            const existingBackup = getBackup(sceneId);
            const version = existingBackup ? existingBackup.version + 1 : 1;

            const backup: LocalBackup = {
                sceneId,
                content,
                timestamp: Date.now(),
                version
            };

            localStorage.setItem(`${BACKUP_KEY_PREFIX}${sceneId}`, JSON.stringify(backup));
            console.log(`💾 Backup spremljen za scenu ${sceneId} (verzija ${version})`);
        } catch (error) {
            console.error('❌ Greška pri spremanju backup-a:', error);

            // Ako je localStorage pun, pokušaj očistiti stare backup-e
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage je pun, čistim stare backup-e...');
                clearOldBackups();

                // Pokušaj ponovno
                try {
                    localStorage.setItem(`${BACKUP_KEY_PREFIX}${sceneId}`, JSON.stringify({
                        sceneId,
                        content,
                        timestamp: Date.now(),
                        version: 1
                    }));
                } catch (retryError) {
                    console.error('❌ Nije moguće spremiti backup ni nakon čišćenja:', retryError);
                }
            }
        }
    }, []);

    // Pokreni backup interval
    const startBackup = useCallback((sceneId: string, content: string) => {
        // Ažuriraj trenutne vrijednosti
        currentSceneIdRef.current = sceneId;
        currentContentRef.current = content;

        // Ako interval već postoji, ne kreiraj novi
        if (intervalRef.current) {
            return;
        }

        // Kreiraj interval za backup svakih 5 sekundi
        intervalRef.current = setInterval(saveBackup, BACKUP_INTERVAL);

        console.log(`🔄 Backup interval pokrenut za scenu ${sceneId}`);
    }, [saveBackup]);

    // Zaustavi backup interval
    const stopBackup = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('⏹️ Backup interval zaustavljen');
        }

        currentSceneIdRef.current = null;
        currentContentRef.current = null;
    }, []);

    // Provjeri ima li backup za scenu
    const hasBackup = useCallback((sceneId: string): boolean => {
        return localStorage.getItem(`${BACKUP_KEY_PREFIX}${sceneId}`) !== null;
    }, []);

    // Dohvati backup za scenu
    const getBackup = useCallback((sceneId: string): LocalBackup | null => {
        try {
            const backupStr = localStorage.getItem(`${BACKUP_KEY_PREFIX}${sceneId}`);
            if (!backupStr) {
                return null;
            }

            const backup = JSON.parse(backupStr) as LocalBackup;
            return backup;
        } catch (error) {
            console.error('❌ Greška pri čitanju backup-a:', error);
            return null;
        }
    }, []);

    // Obriši backup za scenu
    const clearBackup = useCallback((sceneId: string) => {
        try {
            localStorage.removeItem(`${BACKUP_KEY_PREFIX}${sceneId}`);
            console.log(`🗑️ Backup obrisan za scenu ${sceneId}`);
        } catch (error) {
            console.error('❌ Greška pri brisanju backup-a:', error);
        }
    }, []);

    // Provjeri je li backup noviji od server verzije
    const isBackupNewer = useCallback((
        sceneId: string,
        serverContent: string,
        serverTimestamp: number
    ): boolean => {
        const backup = getBackup(sceneId);

        if (!backup) {
            return false;
        }

        // Backup je noviji ako:
        // 1. Ima noviji timestamp OD server verzije
        // 2. Sadržaj se razlikuje od server verzije
        const isNewer = backup.timestamp > serverTimestamp;
        const isDifferent = backup.content !== serverContent;

        return isNewer && isDifferent;
    }, [getBackup]);

    // Očisti stare backup-e (starije od 7 dana)
    const clearOldBackups = useCallback(() => {
        const now = Date.now();
        const expiryTime = BACKUP_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 dana u milisekundama
        let clearedCount = 0;

        try {
            // Iteriraj kroz sve ključeve u localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                if (key && key.startsWith(BACKUP_KEY_PREFIX)) {
                    const backupStr = localStorage.getItem(key);

                    if (backupStr) {
                        try {
                            const backup = JSON.parse(backupStr) as LocalBackup;

                            // Ako je backup stariji od 7 dana, obriši ga
                            if (now - backup.timestamp > expiryTime) {
                                localStorage.removeItem(key);
                                clearedCount++;
                            }
                        } catch (parseError) {
                            // Ako backup nije valjan JSON, obriši ga
                            localStorage.removeItem(key);
                            clearedCount++;
                        }
                    }
                }
            }

            if (clearedCount > 0) {
                console.log(`🧹 Očišćeno ${clearedCount} starih backup-a`);
            }
        } catch (error) {
            console.error('❌ Greška pri čišćenju starih backup-a:', error);
        }
    }, []);

    // Cleanup pri unmount-u
    useEffect(() => {
        return () => {
            stopBackup();
        };
    }, [stopBackup]);

    // Očisti stare backup-e pri mount-u
    useEffect(() => {
        clearOldBackups();
    }, [clearOldBackups]);

    return {
        startBackup,
        stopBackup,
        hasBackup,
        getBackup,
        clearBackup,
        isBackupNewer,
        clearOldBackups
    };
}
