import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from '@/lib/types';
import { api } from '@/lib/serverComm';

interface RenameProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project | null;
    onSuccess: () => void;
}

export function RenameProjectDialog({ open, onOpenChange, project, onSuccess }: RenameProjectDialogProps) {
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (project) {
            setTitle(project.title);
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        setIsLoading(true);
        try {
            // @ts-ignore - serverComm definition might be slightly off regarding types, but API accepts partial updates
            await api.updateProject(project.id, { title });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to rename project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Preimenuj projekt</DialogTitle>
                    <DialogDescription>
                        Unesite novi naziv za projekt.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Naziv
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Odustani
                        </Button>
                        <Button type="submit" disabled={isLoading || !title.trim()}>
                            {isLoading ? 'Spremanje...' : 'Spremi'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
