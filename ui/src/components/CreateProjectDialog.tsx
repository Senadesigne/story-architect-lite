import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/serverComm';
import { Project } from '@/lib/types';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (project: Project) => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Frontend validacija
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Ime projekta je obavezno');
      return;
    }

    if (trimmedName.length < 1) {
      setError('Ime projekta mora imati najmanje 1 karakter');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const newProject = await api.createProject(trimmedName);
      
      // Reset stanja
      setName('');
      setError('');
      
      // Pozovi success callback
      onSuccess(newProject);
      
      // Zatvori modal
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      // Prikaz user-friendly poruke
      if (error.status === 400) {
        setError('Neispravni podaci. Molimo provjerite ime projekta.');
      } else if (error.status === 401) {
        setError('Niste autentificirani. Molimo prijavite se ponovno.');
      } else if (error.status >= 500) {
        setError('Greška na serveru. Molimo pokušajte kasnije.');
      } else {
        setError(error.message || 'Došlo je do greške pri kreiranju projekta');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset stanja kada se modal zatvara
    setName('');
    setError('');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      handleClose();
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kreiraj Novi Projekt</DialogTitle>
          <DialogDescription>
            Unesite ime za vaš novi projekt. Možete ga kasnije promijeniti u postavkama projekta.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project-name" className="text-right">
                Ime projekta
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Unesite ime projekta..."
                disabled={isSubmitting}
                required
                autoFocus
                maxLength={256}
              />
            </div>
            
            {error && (
              <div className="col-span-4 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Odustani
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Kreiram...' : 'Kreiraj Projekt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
