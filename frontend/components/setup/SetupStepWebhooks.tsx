import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Webhook,
  Copy,
  CheckCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface WebhookInfo {
  workflowName: string;
  path: string;
  fullUrl: string;
  isActive: boolean;
}

interface SetupStepWebhooksProps {
  webhooks: WebhookInfo[];
  webhookBaseUrl: string;
}

export function SetupStepWebhooks({
  webhooks,
  webhookBaseUrl,
}: SetupStepWebhooksProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const activeWebhooks = webhooks.filter((w) => w.isActive);

  return (
    <div className="space-y-6">
      {/* Info section */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Webhook Endpoints Auto-Detected
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              The following webhook URLs have been detected from your imported workflows.
              These endpoints are used for the dashboard to communicate with n8n.
            </p>
          </div>
        </div>
      </div>

      {/* Base URL display */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-2">
          <Webhook className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Webhook Base URL</span>
        </div>
        <code className="text-sm font-mono bg-background px-2 py-1 rounded">
          {webhookBaseUrl}
        </code>
      </div>

      {/* Webhooks list */}
      <div>
        <h3 className="font-medium mb-3">Detected Webhook Endpoints</h3>
        <ScrollArea className="h-56 rounded-lg border">
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Webhook className="w-8 h-8 mb-2 opacity-50" />
              <p>No webhook endpoints detected</p>
              <p className="text-sm">
                Your workflows may not have webhook triggers
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {webhooks.map((webhook, index) => (
                <div
                  key={`${webhook.workflowName}-${webhook.path}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <Webhook className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{webhook.workflowName}</p>
                      {webhook.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs font-mono text-muted-foreground block truncate">
                      {webhook.path}
                    </code>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(webhook.fullUrl)}
                          >
                            {copiedUrl === webhook.fullUrl ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy full URL</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={webhook.fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in new tab</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Summary */}
      <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50 border">
        <div>
          <p className="font-medium">Webhook Summary</p>
          <p className="text-sm text-muted-foreground">
            {webhooks.length} endpoints detected, {activeWebhooks.length} active
          </p>
        </div>
        {activeWebhooks.length > 0 && (
          <CheckCircle className="w-6 h-6 text-green-600" />
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        These webhook URLs have been saved automatically. You can view and manage
        them in Settings after setup is complete.
      </p>
    </div>
  );
}

export default SetupStepWebhooks;
