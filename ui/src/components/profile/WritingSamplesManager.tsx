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
      setError('Error loading data.');
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
      showSuccess('Sample added.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload error.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sample?')) return;
    try {
      await api.deleteWritingSample(id);
      setSamples(prev => prev.filter(s => s.id !== id));
      showSuccess('Sample deleted.');
    } catch {
      setError('Delete error.');
    }
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      await api.analyzeStyle();
      await loadData();
      showSuccess('Style analyzed.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. The local AI service is unavailable.');
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
        Loading...
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
              <p className="font-medium text-foreground">Style analyzed</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {fingerprint.sampleCount} samples • Vocabulary: {fingerprint.vocabularyLevel ?? '—'} •{' '}
                Updated: {new Date(fingerprint.updatedAt).toLocaleDateString('en')}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Style not analyzed</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Add at least 3 samples and click "Analyze style".
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
        <label className="text-sm font-medium text-foreground">Add writing sample</label>
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
            {charCount} / 5000 characters{charCount < 100 ? ` (${100 - charCount} more to min.)` : ''}
          </span>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add sample
          </button>
        </div>
      </div>

      {/* Lista samplea */}
      {samples.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">
              Samples ({samples.length})
            </label>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-amber-500/40 text-amber-600 rounded-md hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {isAnalyzing ? 'Analyzing...' : `Analyze style${samples.length < 3 ? ` (${3 - samples.length} more)` : ''}`}
            </button>
          </div>
          <div className="space-y-1.5">
            {samples.map(sample => (
              <div
                key={sample.id}
                className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/10 text-sm"
              >
                <span className="text-muted-foreground">
                  {sample.wordCount ?? '?'} words •{' '}
                  {new Date(sample.createdAt).toLocaleDateString('en')}
                </span>
                <button
                  onClick={() => handleDelete(sample.id)}
                  className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete sample"
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
          No samples. Add at least 3 so the AI can learn your style.
        </p>
      )}
    </div>
  );
}
