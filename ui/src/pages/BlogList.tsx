import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/serverComm';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { BlogArticle, BlogArticleStatus } from '@/lib/types';

function statusBadgeClass(status: BlogArticleStatus): string {
  switch (status) {
    case 'draft':       return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'planning':    return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'researching': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'writing':     return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'reviewing':   return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'done':        return 'bg-green-100 text-green-700 border-green-200';
    case 'failed':      return 'bg-red-100 text-red-700 border-red-200';
    default:            return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

interface CreateArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (article: BlogArticle) => void;
}

function CreateArticleDialog({ open, onOpenChange, onSuccess }: CreateArticleDialogProps) {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setTitle('');
    setTopic('');
    setAudience('');
    setError('');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedTopic = topic.trim();
    if (!trimmedTitle) { setError('Title is required'); return; }
    if (!trimmedTopic) { setError('Topic is required'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      const newArticle = await api.createBlogArticle({
        title: trimmedTitle,
        topic: trimmedTopic,
        audience: audience.trim() || undefined,
      });
      handleClose();
      onSuccess(newArticle);
    } catch (err: any) {
      if (err.status === 400) setError('Invalid data. Check the fields.');
      else if (err.status === 401) setError('Not authenticated. Please sign in again.');
      else if (err.status >= 500) setError('Server error. Please try again later.');
      else setError(err.message || 'An error occurred while creating the article');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => { if (!newOpen) handleClose(); else onOpenChange(newOpen); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Blog Article</DialogTitle>
          <DialogDescription>
            Enter the details for your new blog article. You can update them later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="article-title" className="text-right">Title</Label>
              <Input
                id="article-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter article title..."
                disabled={isSubmitting}
                autoFocus
                maxLength={256}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="article-topic" className="text-right">Topic</Label>
              <Input
                id="article-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="col-span-3"
                placeholder="e.g. AI in healthcare, climate change..."
                disabled={isSubmitting}
                maxLength={512}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="article-audience" className="text-right">Audience</Label>
              <Input
                id="article-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="col-span-3"
                placeholder="e.g. developers, general public... (optional)"
                disabled={isSubmitting}
                maxLength={256}
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !topic.trim()}>
              {isSubmitting ? 'Creating...' : 'Create Article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BlogList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchArticles = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getBlogArticles();
      setArticles(data);
    } catch (err) {
      setError('Error fetching articles');
      console.error('Error fetching blog articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleArticleCreated = async (article: BlogArticle) => {
    await fetchArticles();
    navigate(`/blog/${article.id}`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Blog Articles</h1>
            <p className="text-muted-foreground mt-2">
              Manage and create AI-assisted blog articles.
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!user} size="lg">
            + New Article
          </Button>
        </div>

        <div className="mt-8">
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading articles...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button variant="outline" onClick={fetchArticles} className="mt-4">
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !error && articles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                No blog articles yet.
              </p>
              <p className="text-muted-foreground">
                Get started by clicking 'New Article'.
              </p>
            </div>
          )}

          {!isLoading && !error && articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/blog/${article.id}`)}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2" title={article.title}>
                          {article.title}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={`shrink-0 capitalize ${statusBadgeClass(article.status)}`}
                        >
                          {article.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="line-clamp-2">
                          <strong>Topic:</strong> {article.topic}
                        </p>
                        {article.audience && (
                          <p className="line-clamp-1">
                            <strong>Audience:</strong> {article.audience}
                          </p>
                        )}
                        <p>
                          <strong>Created:</strong>{' '}
                          {new Date(article.createdAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateArticleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleArticleCreated}
      />
    </div>
  );
}
