export interface DecisionLogEntry {
  id: string;
  project_id: string;
  session_id: string | null;
  entry_type: EntryType;
  phase: number | null;
  iteration: number | null;
  content: string | null;
  metadata: Record<string, object | string | number | boolean | null>;
  agent_name: string | null;
  score: number | null;
  issues_count: number | null;
  created_at: string;
}

export type EntryType =
  | "log_decision"
  | "log_iteration"
  | "log_approval"
  | "log_phase_start"
  | "log_phase_end"
  | "log_error"
  | "log_info";

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  log_decision: "Decision",
  log_iteration: "Iteration",
  log_approval: "Approval",
  log_phase_start: "Phase Started",
  log_phase_end: "Phase Completed",
  log_error: "Error",
  log_info: "Info",
};

export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  log_decision: "bg-blue-500",
  log_iteration: "bg-purple-500",
  log_approval: "bg-green-500",
  log_phase_start: "bg-yellow-500",
  log_phase_end: "bg-green-600",
  log_error: "bg-red-500",
  log_info: "bg-gray-500",
};

export const ENTRY_TYPE_ICONS: Record<EntryType, string> = {
  log_decision: "Lightbulb",
  log_iteration: "RefreshCw",
  log_approval: "CheckCircle",
  log_phase_start: "Play",
  log_phase_end: "CheckSquare",
  log_error: "AlertCircle",
  log_info: "Info",
};
