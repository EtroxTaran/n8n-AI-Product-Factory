import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { type ADR, getStatusVariant } from "@/types/adr";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, FileText, AlertCircle, CheckCircle } from "lucide-react";

interface ADRDetailProps {
  adr: ADR;
}

export function ADRDetail({ adr }: ADRDetailProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              {adr.id}
            </span>
            <Badge variant={getStatusVariant(adr.status)}>{adr.status}</Badge>
          </div>
          <h2 className="text-2xl font-bold">{adr.title}</h2>
          {adr.date && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{adr.date}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Context */}
        {adr.context && (
          <ADRSection
            title="Context"
            icon={<FileText className="h-4 w-4" />}
            content={adr.context}
          />
        )}

        {/* Decision */}
        {adr.decision && (
          <ADRSection
            title="Decision"
            icon={<CheckCircle className="h-4 w-4" />}
            content={adr.decision}
          />
        )}

        {/* Consequences */}
        {adr.consequences && (
          <ADRSection
            title="Consequences"
            icon={<AlertCircle className="h-4 w-4" />}
            content={adr.consequences}
          />
        )}
      </div>
    </ScrollArea>
  );
}

interface ADRSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string;
}

function ADRSection({ title, icon, content }: ADRSectionProps) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
        {icon}
        {title}
      </h3>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
