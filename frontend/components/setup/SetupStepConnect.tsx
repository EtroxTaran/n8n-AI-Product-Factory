import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SetupStepConnectProps {
  apiUrl: string;
  apiKey: string;
  webhookBaseUrl: string;
  onApiUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onWebhookBaseUrlChange: (value: string) => void;
  onTestConnection: () => Promise<void>;
  connectionStatus: "idle" | "testing" | "success" | "error";
  connectionError?: string;
  connectionVersion?: string;
}

export function SetupStepConnect({
  apiUrl,
  apiKey,
  webhookBaseUrl,
  onApiUrlChange,
  onApiKeyChange,
  onWebhookBaseUrlChange,
  onTestConnection,
  connectionStatus,
  connectionError,
  connectionVersion,
}: SetupStepConnectProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  const isValid = apiUrl.trim() !== "" && apiKey.trim() !== "";

  return (
    <div className="space-y-6">
      {/* n8n URL */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="apiUrl">n8n Instance URL</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  The base URL of your n8n instance. For self-hosted installations,
                  this is usually something like <code>https://n8n.yourdomain.com</code>
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="apiUrl"
          type="url"
          placeholder="https://n8n.example.com"
          value={apiUrl}
          onChange={(e) => onApiUrlChange(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          The URL where your n8n instance is accessible
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="apiKey">API Key</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Generate an API key in n8n: Settings → API → Create API Key.
                  Make sure to copy the full key.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="relative">
          <Input
            id="apiKey"
            type={showApiKey ? "text" : "password"}
            placeholder="n8n_api_..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="font-mono pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowApiKey(!showApiKey)}
          >
            {showApiKey ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your n8n API key will be encrypted before storage
        </p>
      </div>

      {/* Webhook Base URL (optional) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="webhookBaseUrl">Webhook Base URL (Optional)</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  If your n8n webhooks are accessible from a different URL than the
                  API, specify it here. Usually this is the same as the instance URL.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="webhookBaseUrl"
          type="url"
          placeholder={apiUrl || "https://n8n.example.com"}
          value={webhookBaseUrl}
          onChange={(e) => onWebhookBaseUrlChange(e.target.value)}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Leave empty to use the same URL as your n8n instance
        </p>
      </div>

      {/* Test Connection Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onTestConnection}
          disabled={!isValid || connectionStatus === "testing"}
          variant={connectionStatus === "success" ? "default" : "outline"}
          className="min-w-48"
        >
          {connectionStatus === "testing" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : connectionStatus === "success" ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Connection Verified
            </>
          ) : (
            <>Test Connection</>
          )}
        </Button>
      </div>

      {/* Connection Status */}
      {connectionStatus === "success" && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            Connection Successful
          </AlertTitle>
          <AlertDescription className="text-green-800 dark:text-green-200">
            Successfully connected to your n8n instance
            {connectionVersion && ` (version ${connectionVersion})`}.
            Click Continue to proceed with workflow import.
          </AlertDescription>
        </Alert>
      )}

      {connectionStatus === "error" && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Connection Failed</AlertTitle>
          <AlertDescription>
            {connectionError || "Unable to connect to the n8n instance. Please check your URL and API key."}
          </AlertDescription>
        </Alert>
      )}

      {/* Help link */}
      <div className="text-center">
        <a
          href="https://docs.n8n.io/api/api-reference/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          How to create an n8n API key
        </a>
      </div>
    </div>
  );
}

export default SetupStepConnect;
