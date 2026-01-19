import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateNoContent } from "@/components/ui/empty-state";

interface ArtifactViewerProps {
  content: string;
  filename?: string;
  isLoading?: boolean;
  onDownload?: () => void;
}

export function ArtifactViewer({
  content,
  filename,
  isLoading,
  onDownload,
}: ArtifactViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!content) {
    return <EmptyStateNoContent />;
  }

  return (
    <div className="flex flex-col h-full">
      {(filename || onDownload) && (
        <div className="flex items-center justify-between border-b px-4 py-2">
          {filename && (
            <span className="text-sm font-medium text-muted-foreground">
              {filename}
            </span>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 mr-2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </Button>
          )}
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="markdown-content p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {content}
          </ReactMarkdown>
        </div>
      </ScrollArea>
    </div>
  );
}
