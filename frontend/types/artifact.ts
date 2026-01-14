export interface Artifact {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  url: string;
  type: ArtifactType;
}

export type ArtifactType =
  | "vision_draft"
  | "vision_final"
  | "architecture_draft"
  | "architecture_final"
  | "decision_log"
  | "iteration"
  | "standards"
  | "unknown";

export function getArtifactType(key: string): ArtifactType {
  const filename = key.split("/").pop()?.toLowerCase() || "";

  if (filename.includes("vision") && filename.includes("final")) {
    return "vision_final";
  }
  if (filename.includes("vision")) {
    return "vision_draft";
  }
  if (filename.includes("architecture") && filename.includes("final")) {
    return "architecture_final";
  }
  if (filename.includes("architecture")) {
    return "architecture_draft";
  }
  if (filename.includes("decision_log")) {
    return "decision_log";
  }
  if (filename.includes("standards")) {
    return "standards";
  }
  if (key.includes("iterations/")) {
    return "iteration";
  }

  return "unknown";
}

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  vision_draft: "Vision Draft",
  vision_final: "Product Vision (Final)",
  architecture_draft: "Architecture Draft",
  architecture_final: "Architecture (Final)",
  decision_log: "Decision Log",
  iteration: "Iteration History",
  standards: "Tech Standards",
  unknown: "Document",
};

export const ARTIFACT_ICONS: Record<ArtifactType, string> = {
  vision_draft: "FileText",
  vision_final: "FileCheck",
  architecture_draft: "FileCode",
  architecture_final: "FileCheck",
  decision_log: "History",
  iteration: "RefreshCw",
  standards: "Settings",
  unknown: "File",
};
