export interface Project {
  id: string;
  project_id: string;
  project_name: string;
  session_id: string | null;
  current_phase: number;
  phase_status: "pending" | "in_progress" | "completed" | "failed" | "paused";
  last_iteration_phase: number | null;
  last_iteration_number: number | null;
  last_iteration_score: number | null;
  tech_standards_global: TechStandard[];
  tech_standards_local: TechStandard[];
  artifact_vision_draft: string | null;
  artifact_vision_final: string | null;
  artifact_architecture_draft: string | null;
  artifact_architecture_final: string | null;
  artifact_decision_log: string | null;
  total_iterations: number;
  total_duration_ms: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  full_state: Record<string, unknown> | null;
}

export interface ProjectSummary {
  id: string;
  project_id: string;
  project_name: string;
  current_phase: number;
  phase_status: string;
  last_iteration_score: number | null;
  total_iterations: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  phase_name: string;
  decision_count: number;
  last_decision_at: string | null;
}

export interface TechStandard {
  name: string;
  category: string;
  source: string;
  confidence: number;
  scope: "global" | "local";
}

export const PHASE_NAMES: Record<number, string> = {
  0: "Scavenging",
  1: "Vision Loop",
  2: "Architecture Loop",
  3: "Completed",
};

export const PHASE_COLORS: Record<number, string> = {
  0: "bg-yellow-500",
  1: "bg-blue-500",
  2: "bg-purple-500",
  3: "bg-green-500",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-400",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  paused: "bg-yellow-500",
};
