import { Badge } from "@/components/ui/badge";
import { type ADR, getStatusVariant } from "@/types/adr";
import { cn } from "@/lib/utils";

interface ADRListItemProps {
  adr: ADR;
  isSelected: boolean;
  onSelect: () => void;
}

export function ADRListItem({ adr, isSelected, onSelect }: ADRListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-md p-3 transition-colors",
        "hover:bg-accent",
        isSelected && "bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono text-muted-foreground">{adr.id}</p>
          <p className="text-sm font-medium truncate mt-0.5">{adr.title}</p>
        </div>
        <Badge variant={getStatusVariant(adr.status)} className="text-xs shrink-0">
          {adr.status}
        </Badge>
      </div>
      {adr.date && (
        <p className="text-xs text-muted-foreground mt-1">{adr.date}</p>
      )}
    </button>
  );
}
