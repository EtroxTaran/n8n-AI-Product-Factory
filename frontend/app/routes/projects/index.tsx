import { createFileRoute, createServerFn } from "@tanstack/react-router";
import { ProjectList } from "@/components/projects/ProjectList";
import { getProjects } from "@/lib/db";
import type { ProjectSummary } from "@/types/project";

const fetchProjects = createServerFn({ method: "GET" }).handler(async () => {
  const projects = await getProjects();
  return projects as ProjectSummary[];
});

export const Route = createFileRoute("/projects/")({
  loader: async () => {
    const projects = await fetchProjects();
    return { projects };
  },
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects } = Route.useLoaderData();

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your Product Factory projects
          </p>
        </div>
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
