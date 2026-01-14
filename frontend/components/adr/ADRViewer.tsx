import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { parseADRs, type ADR } from "@/types/adr";
import { ADRListItem } from "./ADRListItem";
import { ADRDetail } from "./ADRDetail";
import { FileText, Search } from "lucide-react";

interface ADRViewerProps {
  content: string;
  isLoading?: boolean;
}

export function ADRViewer({ content, isLoading }: ADRViewerProps) {
  const [selectedADR, setSelectedADR] = useState<ADR | null>(null);
  const [filter, setFilter] = useState("");

  const adrs = useMemo(() => parseADRs(content), [content]);

  const filteredADRs = useMemo(() => {
    if (!filter) return adrs;
    const lowerFilter = filter.toLowerCase();
    return adrs.filter(
      (adr) =>
        adr.title.toLowerCase().includes(lowerFilter) ||
        adr.id.toLowerCase().includes(lowerFilter) ||
        adr.status.toLowerCase().includes(lowerFilter)
    );
  }, [adrs, filter]);

  // Auto-select first ADR when loaded
  useMemo(() => {
    if (adrs.length > 0 && !selectedADR) {
      setSelectedADR(adrs[0]);
    }
  }, [adrs, selectedADR]);

  if (isLoading) {
    return <ADRViewerSkeleton />;
  }

  if (adrs.length === 0) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center text-center">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No ADRs Found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-2">
          Architecture Decision Records will appear here once they are added to
          the decision log.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-0 h-[600px] border rounded-lg overflow-hidden">
      {/* ADR List - Left Panel */}
      <div className="col-span-4 border-r flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter ADRs..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filteredADRs.length} of {adrs.length} records
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredADRs.map((adr) => (
              <ADRListItem
                key={adr.id}
                adr={adr}
                isSelected={selectedADR?.id === adr.id}
                onSelect={() => setSelectedADR(adr)}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ADR Detail - Right Panel */}
      <div className="col-span-8 flex flex-col">
        {selectedADR ? (
          <ADRDetail adr={selectedADR} />
        ) : (
          <div className="flex h-full items-center justify-center text-center p-4">
            <div>
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                Select an ADR to view details
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ADRViewerSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-0 h-[600px] border rounded-lg overflow-hidden">
      <div className="col-span-4 border-r p-3 space-y-3">
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
      <div className="col-span-8 p-4 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
