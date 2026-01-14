import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DecisionLogEntry } from "@/types/history";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/types/history";
import { PHASE_NAMES } from "@/types/project";
import { formatDateTime, formatScore } from "@/lib/utils";

interface HistoryTimelineProps {
  entries: DecisionLogEntry[];
  isLoading?: boolean;
}

export function HistoryTimeline({ entries, isLoading }: HistoryTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
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
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <h3 className="text-lg font-semibold">No history yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Decision logs will appear here as the workflow progresses
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline entries */}
          <div className="space-y-6">
            {entries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

interface TimelineEntryProps {
  entry: DecisionLogEntry;
}

function TimelineEntry({ entry }: TimelineEntryProps) {
  const getBgColor = () => {
    const colorClass = ENTRY_TYPE_COLORS[entry.entry_type] || "bg-gray-500";
    return colorClass;
  };

  const getIcon = () => {
    switch (entry.entry_type) {
      case "log_decision":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <line x1="9" y1="18" x2="15" y2="18" />
            <line x1="10" y1="22" x2="14" y2="22" />
            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
          </svg>
        );
      case "log_iteration":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        );
      case "log_approval":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "log_phase_start":
      case "log_phase_end":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        );
      case "log_error":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      default:
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
    }
  };

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${getBgColor()}`}
      >
        {getIcon()}
      </div>

      {/* Content */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {ENTRY_TYPE_LABELS[entry.entry_type]}
            </Badge>
            {entry.phase !== null && (
              <Badge variant="secondary">
                {PHASE_NAMES[entry.phase] || `Phase ${entry.phase}`}
              </Badge>
            )}
            {entry.iteration !== null && (
              <span className="text-sm text-muted-foreground">
                Iteration {entry.iteration}
              </span>
            )}
          </div>
          {entry.score !== null && (
            <Badge variant={entry.score >= 90 ? "success" : "warning"}>
              Score: {formatScore(entry.score)}
            </Badge>
          )}
        </div>

        {entry.agent_name && (
          <p className="text-sm text-muted-foreground mb-2">
            Agent: <span className="font-medium">{entry.agent_name}</span>
          </p>
        )}

        {entry.content && (
          <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          {formatDateTime(entry.created_at)}
        </p>
      </div>
    </div>
  );
}
