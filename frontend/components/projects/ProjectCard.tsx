import { Link } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectSummary } from "@/types/project";
import { PHASE_NAMES } from "@/types/project";
import { formatRelativeTime, formatScore } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const getStatusVariant = () => {
    switch (project.phase_status) {
      case "completed":
        return "success";
      case "in_progress":
        return "info";
      case "failed":
        return "destructive";
      case "paused":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getPhaseVariant = () => {
    switch (project.current_phase) {
      case 0:
        return "warning";
      case 1:
        return "info";
      case 2:
        return "default";
      case 3:
        return "success";
      default:
        return "secondary";
    }
  };

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.project_id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{project.project_name}</CardTitle>
            <Badge variant={getPhaseVariant()}>
              {PHASE_NAMES[project.current_phase] || `Phase ${project.current_phase}`}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            ID: {project.project_id}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={getStatusVariant()} className="ml-1">
                {project.phase_status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Score:</span>{" "}
              <span className="font-medium">
                {formatScore(project.last_iteration_score)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Iterations:</span>{" "}
              <span className="font-medium">{project.total_iterations}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Decisions:</span>{" "}
              <span className="font-medium">{project.decision_count}</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Updated {formatRelativeTime(project.updated_at)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
