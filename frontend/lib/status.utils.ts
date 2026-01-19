/**
 * Status utility functions for consistent badge/color styling
 * across the application.
 */

import { cn } from "./utils";

// ============================================
// Status Types
// ============================================

export type WorkflowImportStatus =
  | "pending"
  | "importing"
  | "imported"
  | "failed"
  | "update_available"
  | "updating"
  | "created"
  | "activation_failed";

export type VerificationStatus =
  | "pending"
  | "checking"
  | "success"
  | "warning"
  | "error";

export type HealthStatus = "healthy" | "unhealthy" | "unknown";

export type DecisionAction = "approve" | "reject" | "skip";

// ============================================
// Color Schemes
// ============================================

/**
 * Standard status color classes for backgrounds and borders
 */
export const statusColors = {
  // Success / Approved states
  success: {
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-200 dark:border-green-900",
    text: "text-green-800 dark:text-green-200",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: "text-green-600",
  },
  // Error / Failed states
  error: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-800 dark:text-red-200",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    icon: "text-red-600",
  },
  // Warning states
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    text: "text-amber-800 dark:text-amber-200",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    icon: "text-amber-600",
  },
  // Info / In-progress states
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-800 dark:text-blue-200",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: "text-blue-600",
  },
  // Neutral / Pending states
  neutral: {
    bg: "bg-muted/30",
    border: "border-muted",
    text: "text-muted-foreground",
    badge: "",
    icon: "text-muted-foreground",
  },
} as const;

// ============================================
// Workflow Import Status
// ============================================

/**
 * Get color scheme for workflow import status
 */
export function getWorkflowStatusColors(status: WorkflowImportStatus) {
  switch (status) {
    case "imported":
      return statusColors.success;
    case "importing":
    case "updating":
    case "created":
      return statusColors.info;
    case "failed":
    case "activation_failed":
      return statusColors.error;
    case "update_available":
      return statusColors.warning;
    default:
      return statusColors.neutral;
  }
}

/**
 * Get badge text for workflow import status
 */
export function getWorkflowStatusBadgeText(status: WorkflowImportStatus): string {
  switch (status) {
    case "imported":
      return "Imported";
    case "importing":
      return "Creating...";
    case "updating":
      return "Updating...";
    case "created":
      return "Created";
    case "failed":
      return "Failed";
    case "activation_failed":
      return "Activation Failed";
    case "update_available":
      return "Update Available";
    default:
      return "Pending";
  }
}

/**
 * Get combined styles for workflow status row
 */
export function getWorkflowRowStyles(status: WorkflowImportStatus): string {
  const colors = getWorkflowStatusColors(status);
  return cn(
    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
    colors.bg,
    colors.border
  );
}

// ============================================
// Verification Status
// ============================================

/**
 * Get color scheme for verification status
 */
export function getVerificationStatusColors(status: VerificationStatus) {
  switch (status) {
    case "success":
      return statusColors.success;
    case "warning":
      return statusColors.warning;
    case "error":
      return statusColors.error;
    case "checking":
      return statusColors.info;
    default:
      return statusColors.neutral;
  }
}

/**
 * Get combined styles for verification result row
 */
export function getVerificationRowStyles(status: VerificationStatus): string {
  const colors = getVerificationStatusColors(status);
  return cn(
    "flex items-start gap-4 p-4 rounded-lg border transition-colors",
    colors.bg,
    colors.border
  );
}

// ============================================
// Category Colors (for GovernanceWidget)
// ============================================

export const categoryColors: Record<string, string> = {
  database: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  framework: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  language: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  security: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  infrastructure: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  integration: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  compliance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  development: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
};

/**
 * Get category badge color class
 */
export function getCategoryColor(category: string): string {
  return categoryColors[category] || "";
}

// ============================================
// Decision Action Colors
// ============================================

/**
 * Get background styles for decision action
 */
export function getDecisionRowStyles(action: DecisionAction): string {
  switch (action) {
    case "approve":
      return "bg-green-50 dark:bg-green-950/20";
    case "reject":
      return "bg-red-50 dark:bg-red-950/20";
    case "skip":
      return "bg-muted/30";
    default:
      return "";
  }
}

// ============================================
// Health Status
// ============================================

/**
 * Get color scheme for health status
 */
export function getHealthStatusColors(healthy: boolean | undefined) {
  if (healthy === true) {
    return statusColors.success;
  }
  if (healthy === false) {
    return statusColors.error;
  }
  return statusColors.neutral;
}

// ============================================
// Confidence Bar Colors
// ============================================

/**
 * Get color class for confidence percentage
 */
export function getConfidenceColor(confidence: number): string {
  const percent = Math.round(confidence * 100);
  if (percent >= 80) return "bg-green-500";
  if (percent >= 50) return "bg-yellow-500";
  return "bg-red-500";
}
