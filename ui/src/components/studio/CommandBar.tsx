import { useState } from 'react';
import { api } from '@/lib/serverComm';
import { useStudioStore } from '@/stores/studioStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

interface CommandBarProps {
  projectId: string;
}

export function CommandBar({ projectId }: CommandBarProps) {
  const [command, setCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { insertTextAtCursor } = useStudioStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!command.trim() || isLoading) return;

    setIsLoading(true);

    try {
      // Logiraj što šaljemo
      console.log("🚀 Šaljem API poziv:", { projectId, command });

      const finalState = await api.chat(projectId, { userInput: command });

      // Logiraj točno što smo dobili natrag
      console.log("📦 Primljen odgovor od servera (finalState):", finalState);

      if (finalState && finalState.finalOutput) {
        // Uspjeh!
        console.log("✅ Ubacujem tekst u editor:", finalState.finalOutput);
        insertTextAtCursor(finalState.finalOutput);
      } else {
        // Server je vratio odgovor, ali bez finalOutputa
        console.warn("⚠️ AI je vratio uspješan odgovor, ali bez 'finalOutput' polja.", finalState);
      }

      setCommand('');
    } catch (error) {
      // Kritična greška, npr. server je pao
      console.error("❌ Greška prilikom poziva api.chat:", error);
      // Ovdje možemo dodati i obavijest za korisnika, npr. toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-sm p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter command for AI assistant..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !command.trim()}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
