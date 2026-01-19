/**
 * State Management Component
 *
 * Provides UI for managing workflow registry state, including:
 * - Current state display (workflows imported, pending, failed)
 * - Quick actions (sync, fix stuck imports)
 * - Reset options (soft, full, clear config, factory reset)
 * - Confirmation for destructive operations
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  RefreshCw,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  RotateCcw,
  History,
  Database,
  Settings,
} from "lucide-react";

export type ResetMode = "soft" | "full" | "clear_config" | "factory";

export interface WorkflowState {
  workflowsImported: number;
  workflowsPending: number;
  workflowsFailed: number;
  workflowsTotal: number;
  lastSync: Date | null;
  n8nHealthy: boolean;
  n8nConfigured: boolean;
}

export interface SyncResult {
  success: boolean;
  mode: string;
  total: number;
  synced: number;
  deleted: number;
  stateChanged: number;
  orphans: Array<{ name: string; id: string }>;
  conflicts: Array<{ name: string; type: string }>;
  errors: number;
}

export interface ResetResult {
  success: boolean;
  mode: string;
  deletedFromN8n: number;
  clearedFromRegistry: number;
  settingsReset: boolean;
  errors: string[];
  warnings: string[];
  canUndo?: boolean;
  undoToken?: string;
}

interface StateManagementProps {
  currentState: WorkflowState;
  isLoading?: boolean;
  onRefresh: () => Promise<void>;
}

const RESET_OPTIONS: Array<{
  value: ResetMode;
  label: string;
  description: string;
  icon: React.ElementType;
  destructive: boolean;
}> = [
  {
    value: "soft",
    label: "Soft Reset",
    description: "Clear workflow registry. Workflows remain in n8n. Good for re-importing without losing n8n setup.",
    icon: RotateCcw,
    destructive: false,
  },
  {
    value: "full",
    label: "Full Reset",
    description: "Delete all workflows from n8n AND clear registry. Good for complete removal of Product Factory.",
    icon: Trash2,
    destructive: true,
  },
  {
    value: "clear_config",
    label: "Clear Config Only",
    description: "Remove n8n URL and API key only. Good for switching to a different n8n instance.",
    icon: Settings,
    destructive: false,
  },
  {
    value: "factory",
    label: "Factory Reset",
    description: "Delete from n8n + clear all settings + reset setup wizard. Good for starting completely fresh.",
    icon: Database,
    destructive: true,
  },
];

export function StateManagement({
  currentState,
  isLoading = false,
  onRefresh,
}: StateManagementProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFixingStuck, setIsFixingStuck] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedResetMode, setSelectedResetMode] = useState<ResetMode>("soft");
  const [confirmationText, setConfirmationText] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastResetResult, setLastResetResult] = useState<ResetResult | null>(null);
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const [undoExpiry, setUndoExpiry] = useState<Date | null>(null);

  // Sync state with n8n
  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const response = await fetch("/api/workflows/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "detect", includeOrphans: true }),
      });
      const data = await response.json();

      if (data.success || data.errors === 0) {
        setLastSyncResult(data);
        toast.success(`Sync complete: ${data.synced} workflows synced`);

        // Show additional info if there were changes
        if (data.deleted > 0 || data.stateChanged > 0 || data.orphans?.length > 0) {
          const changes = [];
          if (data.deleted > 0) changes.push(`${data.deleted} deleted`);
          if (data.stateChanged > 0) changes.push(`${data.stateChanged} state changed`);
          if (data.orphans?.length > 0) changes.push(`${data.orphans.length} orphans found`);
          toast.info(`Detected: ${changes.join(", ")}`);
        }
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch {
      toast.error("Failed to sync with n8n");
    } finally {
      setIsSyncing(false);
      await onRefresh();
    }
  };

  // Fix stuck imports
  const handleFixStuck = async () => {
    setIsFixingStuck(true);

    try {
      const response = await fetch("/api/workflows/fix-stuck", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        if (data.resetCount > 0) {
          toast.success(`Fixed ${data.resetCount} stuck workflow(s)`);
        } else {
          toast.info("No stuck workflows found");
        }
      } else {
        toast.error(data.error || "Failed to fix stuck imports");
      }
    } catch {
      toast.error("Failed to fix stuck imports");
    } finally {
      setIsFixingStuck(false);
      await onRefresh();
    }
  };

  // Handle reset
  const handleReset = async () => {
    if (confirmationText !== "RESET") {
      toast.error("Please type 'RESET' to confirm");
      return;
    }

    setIsResetting(true);
    setLastResetResult(null);

    try {
      const response = await fetch("/api/setup/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: selectedResetMode,
          confirmation: "RESET",
          preserveN8nConfig: selectedResetMode === "soft",
        }),
      });
      const data = await response.json();

      setLastResetResult(data);

      if (data.success) {
        toast.success(`${getResetModeLabel(selectedResetMode)} completed successfully`);

        // Track undo token if provided
        if (data.canUndo && data.undoToken) {
          setUndoToken(data.undoToken);
          setUndoExpiry(new Date(Date.now() + 60000)); // 60 second window
          toast.info("Undo available for 60 seconds");
        }

        // For factory reset, redirect to setup wizard
        if (selectedResetMode === "factory") {
          window.location.href = "/setup/welcome";
          return;
        }
      } else {
        toast.error(data.errors?.[0] || "Reset failed");
      }
    } catch {
      toast.error("Failed to perform reset");
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
      setConfirmationText("");
      await onRefresh();
    }
  };

  // Handle undo
  const handleUndo = async () => {
    if (!undoToken) return;

    try {
      const response = await fetch("/api/setup/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: undoToken }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success("Reset undone successfully");
        setUndoToken(null);
        setUndoExpiry(null);
        setLastResetResult(null);
      } else {
        toast.error(data.error || "Failed to undo reset");
      }
    } catch {
      toast.error("Failed to undo reset");
    } finally {
      await onRefresh();
    }
  };

  const getResetModeLabel = (mode: ResetMode): string => {
    return RESET_OPTIONS.find((o) => o.value === mode)?.label || mode;
  };

  const selectedOption = RESET_OPTIONS.find((o) => o.value === selectedResetMode);
  const isDestructive = selectedOption?.destructive ?? false;

  // Calculate affected items for the selected reset mode
  const getAffectedItems = (): string => {
    const items: string[] = [];

    switch (selectedResetMode) {
      case "soft":
        items.push(`${currentState.workflowsTotal} registry entries`);
        break;
      case "full":
        items.push(`${currentState.workflowsImported} workflows from n8n`);
        items.push(`${currentState.workflowsTotal} registry entries`);
        break;
      case "clear_config":
        items.push("n8n URL and API key");
        break;
      case "factory":
        items.push(`${currentState.workflowsImported} workflows from n8n`);
        items.push(`${currentState.workflowsTotal} registry entries`);
        items.push("all settings");
        items.push("setup wizard state");
        break;
    }

    return items.join(", ");
  };

  // Check if undo is still valid
  const isUndoValid = undoToken && undoExpiry && new Date() < undoExpiry;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5" aria-hidden="true" />
            State Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
            <span className="ml-2 text-muted-foreground">Loading state...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="w-5 h-5" aria-hidden="true" />
          State Management
        </CardTitle>
        <CardDescription>
          Manage workflow registry state and reset options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current State Display */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Current State</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {currentState.workflowsImported}
              </div>
              <div className="text-xs text-muted-foreground">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {currentState.workflowsPending}
              </div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {currentState.workflowsFailed}
              </div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {currentState.workflowsTotal}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">n8n Status:</span>
              {currentState.n8nConfigured ? (
                currentState.n8nHealthy ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                    Healthy
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                    Unhealthy
                  </Badge>
                )
              ) : (
                <Badge variant="secondary">Not Configured</Badge>
              )}
            </div>
            {currentState.lastSync && (
              <div className="text-muted-foreground flex items-center gap-1">
                <History className="w-3 h-3" aria-hidden="true" />
                Last sync: {new Date(currentState.lastSync).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing || !currentState.n8nConfigured}
              aria-label="Sync workflow state with n8n"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              Sync State
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFixStuck}
              disabled={isFixingStuck}
              aria-label="Fix workflows stuck in importing state"
            >
              {isFixingStuck ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              Fix Stuck Imports
            </Button>
          </div>
        </div>

        {/* Sync Result */}
        {lastSyncResult && (
          <Alert className={lastSyncResult.errors > 0 ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/50" : "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50"}>
            <RefreshCw className="h-4 w-4" />
            <AlertTitle>Sync Results</AlertTitle>
            <AlertDescription className="space-y-1">
              <div>Synced: {lastSyncResult.synced} | Deleted: {lastSyncResult.deleted} | Changed: {lastSyncResult.stateChanged}</div>
              {lastSyncResult.orphans?.length > 0 && (
                <div className="text-yellow-700 dark:text-yellow-300">
                  Orphaned workflows in n8n: {lastSyncResult.orphans.map(o => o.name).join(", ")}
                </div>
              )}
              {lastSyncResult.conflicts?.length > 0 && (
                <div className="text-orange-700 dark:text-orange-300">
                  Conflicts detected: {lastSyncResult.conflicts.length}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Reset Result */}
        {lastResetResult && (
          <Alert className={lastResetResult.success ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50"}>
            {lastResetResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>Reset {lastResetResult.success ? "Complete" : "Failed"}</AlertTitle>
            <AlertDescription className="space-y-1">
              {lastResetResult.deletedFromN8n > 0 && (
                <div>Deleted from n8n: {lastResetResult.deletedFromN8n}</div>
              )}
              {lastResetResult.clearedFromRegistry > 0 && (
                <div>Cleared from registry: {lastResetResult.clearedFromRegistry}</div>
              )}
              {lastResetResult.warnings?.length > 0 && (
                <div className="text-yellow-700 dark:text-yellow-300">
                  Warnings: {lastResetResult.warnings.join(", ")}
                </div>
              )}
              {lastResetResult.errors?.length > 0 && (
                <div className="text-red-700 dark:text-red-300">
                  Errors: {lastResetResult.errors.join(", ")}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Undo Banner */}
        {isUndoValid && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
            <RotateCcw className="h-4 w-4 text-blue-600" />
            <AlertTitle>Undo Available</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>You can undo the last reset. This expires shortly.</span>
              <Button size="sm" variant="outline" onClick={handleUndo}>
                Undo Reset
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Reset Options */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm text-muted-foreground">Reset Options</h4>
            <Badge variant="outline" className="text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
              Caution
            </Badge>
          </div>

          <RadioGroup
            value={selectedResetMode}
            onValueChange={(value) => setSelectedResetMode(value as ResetMode)}
            className="space-y-3"
          >
            {RESET_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedResetMode === option.value
                      ? option.destructive
                        ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                        : "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedResetMode(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className={`font-medium cursor-pointer flex items-center gap-2 ${
                        option.destructive ? "text-red-700 dark:text-red-300" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      {option.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          {/* Affected Items Preview */}
          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/50">
            <span className="font-medium">Affected:</span> {getAffectedItems()}
          </div>

          {/* Reset Button */}
          <Button
            variant={isDestructive ? "destructive" : "outline"}
            onClick={() => setShowResetDialog(true)}
            disabled={isResetting}
            className="w-full"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Resetting...
              </>
            ) : (
              <>
                {selectedOption && <selectedOption.icon className="w-4 h-4 mr-2" aria-hidden="true" />}
                {getResetModeLabel(selectedResetMode)}
              </>
            )}
          </Button>
        </div>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className={isDestructive ? "text-red-600" : ""}>
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                  Confirm {getResetModeLabel(selectedResetMode)}
                </span>
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  {selectedOption?.description}
                </p>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="font-medium">This will affect:</span>
                  <div className="mt-1">{getAffectedItems()}</div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Type <span className="font-mono font-bold">RESET</span> to confirm:
                  </Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="Type RESET here"
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmationText("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                disabled={confirmationText !== "RESET" || isResetting}
                className={isDestructive ? "bg-red-600 hover:bg-red-700" : ""}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    Resetting...
                  </>
                ) : (
                  "Confirm Reset"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
