import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/serverComm';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BlogArticleFull, BlogArticleStatus } from '@/lib/types';
import { ArrowLeft, Trash2, Sparkles } from 'lucide-react';

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

function dossierStatusBadgeClass(status: string): string {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'running': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'done':    return 'bg-green-100 text-green-700 border-green-200';
    case 'failed':  return 'bg-red-100 text-red-700 border-red-200';
    default:        return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function BlogDetail() {
  const { user } = useAuth();
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<BlogArticleFull | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);

  const fetchArticle = useCallback(async () => {
    if (!user || !articleId) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getBlogArticle(articleId);
      setArticle(data);
    } catch (err: any) {
      if (err.status === 404) setError('Article not found.');
      else setError('Error loading article.');
      console.error('Error fetching blog article:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, articleId]);

  useEffect(() => { fetchArticle(); }, [fetchArticle]);

  const handleGeneratePlan = async () => {
    if (!articleId) return;
    setIsPlanning(true);
    try {
      await api.startBlogPlanning(articleId);
      await fetchArticle();
    } catch (err) {
      console.error('Error generating research plan:', err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleDelete = async () => {
    if (!articleId) return;
    const confirmed = window.confirm('Delete this article? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteBlogArticle(articleId);
      navigate('/blog');
    } catch (err) {
      console.error('Error deleting article:', err);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <Link to="/blog" className="mt-1 shrink-0">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Blog
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold">{article.title}</h1>
                <Badge
                  variant="outline"
                  className={`capitalize ${statusBadgeClass(article.status)}`}
                >
                  {article.status}
                </Badge>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>

        {/* Info sekcija */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Topic</dt>
                <dd className="font-medium mt-0.5">{article.topic}</dd>
              </div>
              {article.audience && (
                <div>
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd className="font-medium mt-0.5">{article.audience}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium mt-0.5">
                  {new Date(article.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="font-medium mt-0.5">
                  {new Date(article.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Research Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Research Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {article.researchPlan ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Keyword: </span>
                  <span className="font-medium">{article.researchPlan.keyword}</span>
                </div>
                {article.researchPlan.angles.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-1">Angles:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {article.researchPlan.angles.map((angle, i) => (
                        <li key={i}>{angle}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground text-sm">No research plan yet.</p>
                {article.status === 'draft' && (
                  <Button
                    onClick={handleGeneratePlan}
                    disabled={isPlanning}
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isPlanning ? 'Generating plan...' : 'Generate Research Plan'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Research Dossiers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Research Dossiers</CardTitle>
          </CardHeader>
          <CardContent>
            {article.dossiers && article.dossiers.length > 0 ? (
              <div className="space-y-3">
                {article.dossiers.map((dossier) => (
                  <div
                    key={dossier.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-muted/30 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{dossier.angle}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {dossier.sources.length} source{dossier.sources.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-3 shrink-0 capitalize ${dossierStatusBadgeClass(dossier.status)}`}
                    >
                      {dossier.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No research dossiers yet. They will appear after the research phase.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Article Content</CardTitle>
          </CardHeader>
          <CardContent>
            {article.content ? (
              <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm">
                {article.content}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Content will appear here after the writing phase.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Citation Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Citation Report</CardTitle>
          </CardHeader>
          <CardContent>
            {article.citationReport ? (
              <div className="space-y-2">
                {article.citationReport.claims.map((claim, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm p-2 rounded border">
                    <Badge
                      variant="outline"
                      className={`shrink-0 mt-0.5 capitalize ${
                        claim.status === 'verified'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-red-100 text-red-700 border-red-200'
                      }`}
                    >
                      {claim.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p>{claim.claim}</p>
                      {claim.url && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{claim.url}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Citation report will appear here after the reviewing phase.
              </p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
