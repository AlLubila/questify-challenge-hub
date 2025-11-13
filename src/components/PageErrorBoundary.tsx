import { ErrorBoundary } from './ErrorBoundary';
import { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PageErrorBoundaryProps {
  children: ReactNode;
  pageName?: string;
}

export const PageErrorBoundary = ({ children, pageName }: PageErrorBoundaryProps) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Error in ${pageName || 'page'}:`, error, errorInfo);
  };

  const fallback = (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-lg">Page Error</CardTitle>
          </div>
          <CardDescription>
            {pageName ? `Unable to load ${pageName}.` : 'Unable to load this page.'}
            {' '}Please try refreshing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
