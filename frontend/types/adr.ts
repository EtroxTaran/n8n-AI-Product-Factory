export type ADRStatus = "proposed" | "accepted" | "deprecated" | "superseded" | "unknown";

export interface ADR {
  id: string;
  title: string;
  status: ADRStatus;
  date: string;
  context: string;
  decision: string;
  consequences: string;
  raw: string;
}

/**
 * Parse ADRs from decision log markdown content
 * Expected format:
 * ## ADR-001: Title
 * **Status**: Accepted
 * **Date**: 2026-01-13
 * ### Context
 * ...
 * ### Decision
 * ...
 * ### Consequences
 * ...
 */
export function parseADRs(content: string): ADR[] {
  if (!content) return [];

  const adrs: ADR[] = [];

  // Split by ADR headers (## ADR-XXX: Title)
  const adrRegex = /## ADR-(\d+):\s*(.+?)(?=\n## ADR-\d+:|$)/gs;

  let match;
  while ((match = adrRegex.exec(content)) !== null) {
    const [fullMatch, idNum, titleLine] = match;
    const adr = parseADRContent(idNum, titleLine, fullMatch);
    if (adr) {
      adrs.push(adr);
    }
  }

  // Sort by ID (newest first)
  return adrs.sort((a, b) => {
    const aNum = parseInt(a.id.replace("ADR-", ""), 10);
    const bNum = parseInt(b.id.replace("ADR-", ""), 10);
    return bNum - aNum;
  });
}

function parseADRContent(idNum: string, titleLine: string, raw: string): ADR | null {
  const id = `ADR-${idNum.padStart(3, "0")}`;
  const title = titleLine.trim();

  // Extract status
  const statusMatch = raw.match(/\*\*Status\*\*:\s*(\w+)/i);
  const statusText = statusMatch?.[1]?.toLowerCase() || "unknown";
  const status = validateStatus(statusText);

  // Extract date
  const dateMatch = raw.match(/\*\*Date\*\*:\s*(.+?)(?:\n|$)/i);
  const date = dateMatch?.[1]?.trim() || "";

  // Extract context section
  const contextMatch = raw.match(/### Context\s*\n([\s\S]*?)(?=###|$)/i);
  const context = contextMatch?.[1]?.trim() || "";

  // Extract decision section
  const decisionMatch = raw.match(/### Decision\s*\n([\s\S]*?)(?=###|$)/i);
  const decision = decisionMatch?.[1]?.trim() || "";

  // Extract consequences section
  const consequencesMatch = raw.match(/### Consequences\s*\n([\s\S]*?)(?=###|## ADR|$)/i);
  const consequences = consequencesMatch?.[1]?.trim() || "";

  return {
    id,
    title,
    status,
    date,
    context,
    decision,
    consequences,
    raw,
  };
}

function validateStatus(status: string): ADRStatus {
  const validStatuses: ADRStatus[] = ["proposed", "accepted", "deprecated", "superseded"];
  return validStatuses.includes(status as ADRStatus) ? (status as ADRStatus) : "unknown";
}

/**
 * Get status badge color variant
 */
export function getStatusVariant(status: ADRStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "accepted":
      return "default";
    case "proposed":
      return "secondary";
    case "deprecated":
    case "superseded":
      return "destructive";
    default:
      return "outline";
  }
}
