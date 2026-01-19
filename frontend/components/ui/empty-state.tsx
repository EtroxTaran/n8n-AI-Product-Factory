import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================
// Icon Types
// ============================================

export type EmptyStateIcon =
  | "document"
  | "document-text"
  | "chat"
  | "project"
  | "folder"
  | "search";

// ============================================
// Icon Components (consolidated from across codebase)
// ============================================

const iconPaths: Record<EmptyStateIcon, React.ReactNode> = {
  // Document icon (used in ArtifactList)
  document: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  // Document with text lines (used in ArtifactViewer)
  "document-text": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </>
  ),
  // Chat bubble (used in ChatWindow)
  chat: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  // Project/chart icon (used in ProjectList)
  project: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 16l4-8 4 8 4-4" />
    </>
  ),
  // Folder icon
  folder: (
    <>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </>
  ),
  // Search icon
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
};

// ============================================
// EmptyState Component
// ============================================

interface EmptyStateProps {
  icon?: EmptyStateIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export function EmptyState({
  icon = "document",
  title,
  description,
  action,
  className,
  iconClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center px-4",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-12 w-12 text-muted-foreground mb-4", iconClassName)}
        aria-hidden="true"
      >
        {iconPaths[icon]}
      </svg>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// Variants for specific use cases
// ============================================

interface EmptyStateNoArtifactsProps {
  className?: string;
}

export function EmptyStateNoArtifacts({ className }: EmptyStateNoArtifactsProps) {
  return (
    <EmptyState
      icon="document"
      title="No artifacts found"
      iconClassName="h-10 w-10 mb-3"
      className={cn("py-8", className)}
    />
  );
}

interface EmptyStateNoContentProps {
  className?: string;
}

export function EmptyStateNoContent({ className }: EmptyStateNoContentProps) {
  return (
    <EmptyState
      icon="document-text"
      title="No content available"
      description="Select an artifact to view its contents"
      className={className}
    />
  );
}

interface EmptyStateChatProps {
  projectName?: string;
  className?: string;
}

export function EmptyStateChat({ projectName, className }: EmptyStateChatProps) {
  return (
    <EmptyState
      icon="chat"
      title="Start a conversation"
      description={`Send a message to interact with the ${
        projectName ? `"${projectName}"` : "project"
      } workflow`}
      className={className}
    />
  );
}

interface EmptyStateNoProjectsProps {
  action?: React.ReactNode;
  className?: string;
}

export function EmptyStateNoProjects({ action, className }: EmptyStateNoProjectsProps) {
  return (
    <EmptyState
      icon="project"
      title="No projects yet"
      description="Create your first project to get started with the AI Product Factory"
      action={action}
      className={className}
    />
  );
}

export default EmptyState;
