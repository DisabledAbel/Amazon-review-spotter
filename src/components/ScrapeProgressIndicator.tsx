import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, AlertTriangle, Shield, FileSearch } from "lucide-react";
import { ScrapeProgress } from "@/hooks/useScrapeProgress";

interface ScrapeProgressIndicatorProps {
  progress: ScrapeProgress;
}

export const ScrapeProgressIndicator = ({ progress }: ScrapeProgressIndicatorProps) => {
  if (progress.status === 'idle') return null;

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'scraping':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'analyzing':
        return <FileSearch className="h-5 w-5 animate-pulse text-primary" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'blocked':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'complete':
        return 'text-green-500';
      case 'error':
        return 'text-destructive';
      case 'blocked':
        return 'text-yellow-500';
      default:
        return 'text-primary';
    }
  };

  // Estimate progress percentage (assuming ~10 reviews per page, max 50 pages)
  const estimatedProgress = Math.min((progress.currentPage / 20) * 100, 95);

  return (
    <div className="w-full space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {progress.message}
          </p>
        </div>
      </div>

      {(progress.status === 'scraping' || progress.status === 'analyzing') && (
        <div className="space-y-2">
          <Progress value={progress.status === 'analyzing' ? 95 : estimatedProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Page {progress.currentPage}</span>
            <span>{progress.totalReviews} reviews found</span>
          </div>
        </div>
      )}

      {progress.status === 'blocked' && (
        <p className="text-xs text-muted-foreground">
          Amazon rate-limited the request. Analysis will continue with {progress.totalReviews} reviews collected.
        </p>
      )}
    </div>
  );
};
