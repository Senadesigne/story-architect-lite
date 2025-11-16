import { useState } from 'react';
import { useParams } from 'react-router-dom';
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
      const response = await api.chat(projectId, { userInput: command });
      
      // Provjeri je li odgovor uspješan
      if (response.finalState?.finalOutput) {
        insertTextAtCursor(response.finalState.finalOutput);
      }
      
      // Očisti input polje
      setCommand('');
    } catch (error) {
      console.error('Error calling AI chat:', error);
      // TODO: Dodaj toast notifikaciju za greške
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Unesite naredbu za AI asistenta..."
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
