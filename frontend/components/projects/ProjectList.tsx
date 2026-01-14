import { ProjectCard } from "./ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectSummary } from "@/types/project";

interface ProjectListProps {
  projects: ProjectSummary[];
  isLoading?: boolean;
}

export function ProjectList({ projects, isLoading }: ProjectListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <ProjectSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-12 w-12 text-muted-foreground mb-4"
        >
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 8 4-4" />
        </svg>
        <h3 className="text-lg font-semibold">No projects yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new project using the n8n workflow chat interface
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-3 w-32 mt-4" />
    </div>
  );
}
