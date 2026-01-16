/**
 * Route Error Boundary Component
 *
 * Provides a user-friendly error page when routes fail to load.
 * Used as errorComponent in TanStack Router routes.
 */

import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";

interface RouteErrorBoundaryProps {
  error: Error;
  reset?: () => void;
}

export function RouteErrorBoundary({ error, reset }: RouteErrorBoundaryProps) {
  const router = useRouter();

  const handleRetry = () => {
    if (reset) {
      reset();
    } else {
      router.invalidate();
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    router.navigate({ to: "/" });
  };

  // Check if it's a not found error
  const isNotFound =
    error.message.toLowerCase().includes("not found") ||
    error.message.toLowerCase().includes("404");

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isNotFound ? "Page Not Found" : "Something went wrong"}
          </h1>
        </CardHeader>
        <CardContent className="pb-6">
          <p className="text-muted-foreground">
            {isNotFound
              ? "The page you're looking for doesn't exist or has been moved."
              : error.message || "An unexpected error occurred. Please try again."}
          </p>
          {process.env.NODE_ENV === "development" && error.stack && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                View error details
              </summary>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          {!isNotFound && (
            <Button onClick={handleRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button variant="secondary" onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

/**
 * Not Found Component
 *
 * Specialized error component for 404 pages.
 * Used as notFoundComponent in TanStack Router routes.
 */
export function NotFound() {
  const router = useRouter();

  return (
    <div className="container flex min-h-[60vh] items-center justify-center py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 text-6xl font-bold text-muted-foreground/30">
            404
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Page Not Found</h1>
        </CardHeader>
        <CardContent className="pb-6">
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => router.navigate({ to: "/" })}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
