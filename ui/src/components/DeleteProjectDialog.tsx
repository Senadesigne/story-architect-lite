import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Project } from '@/lib/types';
import { api } from '@/lib/serverComm';

interface DeleteProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project | null;
    onSuccess: () => void;
}

export function DeleteProjectDialog({ open, onOpenChange, project, onSuccess }: DeleteProjectDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDelete = async () => {
        if (!project) return;

        setIsLoading(true);
        try {
            await api.deleteProject(project.id);
            // Close dialog first to ensure body scroll/focus is restored
            onOpenChange(false);

            // Wait for dialog close animation/cleanup before removing the item from the list
            setTimeout(() => {
                // Manually cleanup body styles just in case Radix fails
                document.body.style.pointerEvents = '';
                document.body.style.overflow = '';
                document.body.removeAttribute('data-scroll-locked');

                onSuccess();
            }, 500);
        } catch (error) {
            console.error('Failed to delete project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Jeste li sigurni?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ova radnja se ne može poništiti. Ovo će trajno obrisati projekt
                        <span className="font-semibold text-foreground"> "{project?.title}" </span>
                        i sve povezane podatke (likove, scene, lokacije).
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Odustani</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? 'Brisanje...' : 'Obriši'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
