import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PartyPopper,
  Workflow,
  Webhook,
  ArrowRight,
  Settings,
  BookOpen,
  ExternalLink,
} from "lucide-react";

interface SetupSummary {
  n8nConfigured: boolean;
  workflowsImported: number;
  workflowsTotal: number;
  webhooksConfigured: number;
}

interface SetupStepCompleteProps {
  summary: SetupSummary;
  onGoToProjects: () => void;
  onGoToSettings: () => void;
}

export function SetupStepComplete({
  summary,
  onGoToProjects,
  onGoToSettings,
}: SetupStepCompleteProps) {
  return (
    <div className="space-y-6">
      {/* Success hero */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 mb-4">
          <PartyPopper className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Setup Complete!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your AI Product Factory is now connected to n8n and ready to use.
          You can start creating projects right away.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
          <Workflow className="w-8 h-8 text-primary mb-2" />
          <div className="text-2xl font-bold">
            {summary.workflowsImported}/{summary.workflowsTotal}
          </div>
          <p className="text-sm text-muted-foreground">Workflows Imported</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
          <Webhook className="w-8 h-8 text-primary mb-2" />
          <div className="text-2xl font-bold">
            {summary.webhooksConfigured}
          </div>
          <p className="text-sm text-muted-foreground">Webhooks Configured</p>
        </div>
        <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border">
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 mb-2 text-lg px-3 py-1"
          >
            Connected
          </Badge>
          <p className="text-sm text-muted-foreground">n8n Status</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button
          size="lg"
          onClick={onGoToProjects}
          className="sm:min-w-48"
        >
          <ArrowRight className="w-4 h-4 mr-2" />
          Go to Projects
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onGoToSettings}
          className="sm:min-w-48"
        >
          <Settings className="w-4 h-4 mr-2" />
          View Settings
        </Button>
      </div>

      {/* Next steps */}
      <div className="rounded-lg border p-4 mt-6">
        <h4 className="font-medium mb-3">Next Steps</h4>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs shrink-0">1</span>
            <span>
              Create a new project and upload your source documents (requirements, architecture specs, etc.)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs shrink-0">2</span>
            <span>
              The AI agents will automatically analyze your documents and generate comprehensive vision and architecture documents
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs shrink-0">3</span>
            <span>
              Review the generated artifacts and iterate as needed
            </span>
          </li>
        </ul>
      </div>

      {/* Help resources */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Need help?</p>
        <div className="flex justify-center gap-4">
          <a
            href="https://docs.n8n.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="w-4 h-4 mr-1" />
            n8n Documentation
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default SetupStepComplete;
