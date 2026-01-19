import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Server,
  Database,
  Workflow,
  Webhook,
  RefreshCw,
} from "lucide-react";

export interface VerificationResult {
  id: string;
  name: string;
  description: string;
  status: "pending" | "checking" | "success" | "warning" | "error";
  message?: string;
}

interface SetupStepVerifyProps {
  verificationResults: VerificationResult[];
  isVerifying: boolean;
  onVerify: () => void;
}

const getStatusIcon = (status: VerificationResult["status"]) => {
  switch (status) {
    case "success":
      return <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />;
    case "warning":
      return <CheckCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-600" aria-hidden="true" />;
    case "checking":
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" aria-hidden="true" />;
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" aria-hidden="true" />;
  }
};

const getCheckIcon = (id: string) => {
  switch (id) {
    case "n8n-health":
      return <Server className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
    case "api-access":
      return <Database className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
    case "workflows":
      return <Workflow className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
    case "webhooks":
      return <Webhook className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
    default:
      return <CheckCircle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
  }
};

export function SetupStepVerify({
  verificationResults,
  isVerifying,
  onVerify,
}: SetupStepVerifyProps) {
  const allPassed = verificationResults.every(
    (r) => r.status === "success" || r.status === "warning"
  );
  const hasErrors = verificationResults.some((r) => r.status === "error");
  const allChecked = verificationResults.every(
    (r) => r.status !== "pending" && r.status !== "checking"
  );

  return (
    <div className="space-y-6">
      {/* Verification checklist */}
      <div className="space-y-3">
        {verificationResults.map((result) => (
          <div
            key={result.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
              result.status === "success"
                ? "bg-green-50/50 border-green-200/50 dark:bg-green-950/30 dark:border-green-900/50"
                : result.status === "warning"
                ? "bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/30 dark:border-amber-900/50"
                : result.status === "error"
                ? "bg-red-50/50 border-red-200/50 dark:bg-red-950/30 dark:border-red-900/50"
                : result.status === "checking"
                ? "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/30 dark:border-blue-900/50"
                : "bg-muted/30"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {getCheckIcon(result.id)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium">{result.name}</p>
                {result.status === "warning" && (
                  <Badge variant="default" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">
                    Warning
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {result.description}
              </p>
              {result.message && (
                <p
                  className={`text-sm mt-2 ${
                    result.status === "error"
                      ? "text-red-600 dark:text-red-400"
                      : result.status === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {result.message}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {getStatusIcon(result.status)}
            </div>
          </div>
        ))}
      </div>

      {/* Verify button */}
      <div className="flex justify-center">
        <Button
          onClick={onVerify}
          disabled={isVerifying}
          size="lg"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              Verifying...
            </>
          ) : allChecked ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              Run Verification Again
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
              Run Verification
            </>
          )}
        </Button>
      </div>

      {/* Status summary */}
      {allChecked && (
        <div
          className={`text-center p-4 rounded-lg border ${
            allPassed
              ? "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-900"
              : hasErrors
              ? "bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900"
              : "bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900"
          }`}
          role="status"
          aria-live="polite"
        >
          {allPassed ? (
            <>
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" aria-hidden="true" />
              <p className="font-medium text-green-900 dark:text-green-100">
                All Checks Passed!
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your n8n integration is ready to use. Click Continue to complete setup.
              </p>
            </>
          ) : hasErrors ? (
            <>
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" aria-hidden="true" />
              <p className="font-medium text-red-900 dark:text-red-100">
                Some Checks Failed
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                Please review the errors above. You can continue anyway or fix them first.
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" aria-hidden="true" />
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Passed with Warnings
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Some issues were detected but are not critical. You can continue with setup.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SetupStepVerify;
