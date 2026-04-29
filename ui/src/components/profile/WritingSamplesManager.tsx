import { useEffect, useState } from 'react';
import { api } from '@/lib/serverComm';
import { Trash2, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WritingSample {
  id: string;
  wordCount: number | null;
  createdAt: string;
}

interface StyleFingerprintStatus {
  sampleCount: number;
  updatedAt: string;
  vocabularyLevel: string | null;
}

export function WritingSamplesManager() {
  const [samples, setSamples] = useState<WritingSample[]>([]);
  const [fingerprint, setFingerprint] = useState<StyleFingerprintStatus | null>(null);
  const [newText, setNewText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const charCount = newText.length;
  const canUpload = charCount >= 100 && charCount <= 5000 && !isUploading;
  const canAnalyze = samples.length >= 3 && !isAnalyzing;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [samplesData, fingerprintData] = await Promise.all([
        api.getWritingSamples(),
        api.getStyleFingerprint(),
      ]);
      setSamples(samplesData);
      setFingerprint(fingerprintData);
    } catch {
      setError('Greška pri učitavanju podataka.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload() {
    if (!canUpload) return;
    setIsUploading(true);
    setError(null);
    try {
      const sample = await api.uploadWritingSample(newText.trim());
      setSamples(prev => [sample, ...prev]);
      setNewText('');
      showSuccess('Uzorak dodan.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Greška pri uploadu.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Obriši ovaj uzorak?')) return;
    try {
      await api.deleteWritingSample(id);
      setSamples(prev => prev.filter(s => s.id !== id));
      showSuccess('Uzorak obrisan.');
    } catch {
      setError('Greška pri brisanju.');
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      await api.analyzeStyle();
      await loadData();
      showSuccess('Stil analiziran.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analiza nije uspjela. Provjeri je li HPE #1 server upaljen.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function showSuccess(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Učitavam...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status fingerprinta */}
      <div className="rounded-lg border border-border p-3 bg-muted/20 text-sm">
        {fingerprint ? (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Stil analiziran</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {fingerprint.sampleCount} uzoraka • Vokabular: {fingerprint.vocabularyLevel ?? '—'} •{' '}
                Ažurirano: {new Date(fingerprint.updatedAt).toLocaleDateString('hr')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Stil nije analiziran</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Dodaj minimalno 3 uzorka i klikni "Analiziraj stil".
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback poruke */}
      {error && (
        <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
          {successMsg}
        </div>
      )}

      {/* Upload novi uzorak */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Dodaj uzorak pisanja</label>
        <textarea
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Paste odlomak svog teksta (100–5000 znakova)..."
          className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          rows={5}
        />
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs",
            charCount < 100 ? "text-muted-foreground" :
            charCount > 5000 ? "text-red-500" :
            "text-green-600"
          )}>
            {charCount} / 5000 znakova{charCount < 100 ? ` (još ${100 - charCount} za min.)` : ''}
          </span>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Dodaj uzorak
          </button>
        </div>
      </div>

      {/* Lista samplea */}
      {samples.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Uzorci ({samples.length})
            </label>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-500/40 text-amber-600 rounded-md hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isAnalyzing ? 'Analiziram...' : `Analiziraj stil${samples.length < 3 ? ` (još ${3 - samples.length})` : ''}`}
            </button>
          </div>
          <div className="space-y-1.5">
            {samples.map(sample => (
              <div
                key={sample.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/10 text-sm"
              >
                <span className="text-muted-foreground">
                  {sample.wordCount ?? '?'} riječi •{' '}
                  {new Date(sample.createdAt).toLocaleDateString('hr')}
                </span>
                <button
                  onClick={() => handleDelete(sample.id)}
                  className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  title="Obriši uzorak"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {samples.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nema uzoraka. Dodaj minimalno 3 da bi AI naučio tvoj stil.
        </p>
      )}
    </div>
  );
}
