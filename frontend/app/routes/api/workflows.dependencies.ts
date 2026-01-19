import { createFileRoute } from "@tanstack/react-router";
import { getServerSession } from "@/lib/auth";
import {
  getBundledWorkflows,
  detectCircularDependencies,
  type BundledWorkflow,
} from "@/lib/workflow-importer";
import {
  createRequestContext,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  withCorrelationId,
} from "@/lib/request-context";

/**
 * Dependency graph node representation.
 */
interface DependencyNode {
  id: string;
  name: string;
  filename: string;
  level: number; // Depth in dependency tree (0 = no dependencies)
  nodeCount: number;
  hasCredentials: boolean;
  webhookPaths: string[];
}

/**
 * Dependency graph edge representation.
 */
interface DependencyEdge {
  from: string; // Workflow name
  to: string; // Dependency workflow name
}

/**
 * Full dependency graph response.
 */
interface DependencyGraphResponse {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  levels: Record<number, string[]>; // Level -> workflow names at that level
  importOrder: string[]; // Safe topological import order
  hasCycles: boolean;
  cycles: string[][]; // Any detected cycles
}

/**
 * Build a dependency graph from bundled workflows.
 */
function buildDependencyGraph(workflows: BundledWorkflow[]): DependencyGraphResponse {
  // Run cycle detection to get topological order
  const cycleResult = detectCircularDependencies(workflows);

  // Build workflow lookup by name
  const workflowByName = new Map<string, BundledWorkflow>();
  for (const wf of workflows) {
    workflowByName.set(wf.name, wf);
  }

  // Calculate levels (depth from root)
  const levels = new Map<string, number>();

  function calculateLevel(name: string, visited: Set<string>): number {
    if (levels.has(name)) {
      return levels.get(name)!;
    }

    if (visited.has(name)) {
      // Circular dependency, return 0 to avoid infinite loop
      return 0;
    }

    visited.add(name);
    const wf = workflowByName.get(name);
    if (!wf || !wf.dependencies || wf.dependencies.length === 0) {
      levels.set(name, 0);
      return 0;
    }

    // Level is 1 + max level of dependencies
    let maxDepLevel = 0;
    for (const dep of wf.dependencies) {
      if (workflowByName.has(dep)) {
        const depLevel = calculateLevel(dep, visited);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }
    }

    const level = maxDepLevel + 1;
    levels.set(name, level);
    return level;
  }

  // Calculate levels for all workflows
  for (const wf of workflows) {
    calculateLevel(wf.name, new Set());
  }

  // Build nodes
  const nodes: DependencyNode[] = workflows.map((wf) => ({
    id: wf.filename,
    name: wf.name,
    filename: wf.filename,
    level: levels.get(wf.name) || 0,
    nodeCount: wf.nodeCount,
    hasCredentials: wf.hasCredentials,
    webhookPaths: wf.webhookPaths,
  }));

  // Build edges
  const edges: DependencyEdge[] = [];
  for (const wf of workflows) {
    if (wf.dependencies) {
      for (const dep of wf.dependencies) {
        // Only add edge if dependency is in our workflow set
        if (workflowByName.has(dep)) {
          edges.push({
            from: wf.name,
            to: dep,
          });
        }
      }
    }
  }

  // Group workflows by level
  const levelGroups: Record<number, string[]> = {};
  for (const [name, level] of levels.entries()) {
    if (!levelGroups[level]) {
      levelGroups[level] = [];
    }
    levelGroups[level].push(name);
  }

  return {
    nodes,
    edges,
    levels: levelGroups,
    importOrder: cycleResult.dependencyOrder,
    hasCycles: cycleResult.hasCycle,
    cycles: cycleResult.cycles,
  };
}

/**
 * GET /api/workflows/dependencies
 *
 * Returns the dependency graph for bundled workflows.
 *
 * This endpoint provides:
 * - Nodes: All workflows with their metadata
 * - Edges: Dependencies between workflows
 * - Levels: Workflows grouped by dependency depth
 * - Import order: Safe topological import order
 * - Cycle detection: Any circular dependencies
 *
 * Useful for:
 * - Visualizing workflow dependencies
 * - Understanding import order
 * - Debugging dependency issues
 */
export const Route = createFileRoute("/api/workflows/dependencies")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const startTime = Date.now();
        const ctx = createRequestContext(request);
        const log = ctx.logger.child({ operation: "get-dependencies" });

        logRequestStart(ctx);

        try {
          // Check authentication
          const session = await getServerSession(request.headers);
          if (!session?.user) {
            const response = Response.json(
              { error: "Authentication required" },
              { status: 401 }
            );
            logRequestComplete(ctx, 401, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          log.info("Building workflow dependency graph");

          // Get bundled workflows
          const workflows = await getBundledWorkflows();

          if (workflows.length === 0) {
            const response = Response.json(
              { error: "No workflows found" },
              { status: 404 }
            );
            logRequestComplete(ctx, 404, Date.now() - startTime);
            return withCorrelationId(response, ctx.correlationId);
          }

          // Build dependency graph
          const graph = buildDependencyGraph(workflows);

          log.info("Dependency graph built", {
            nodes: graph.nodes.length,
            edges: graph.edges.length,
            hasCycles: graph.hasCycles,
          });

          const response = Response.json(graph);
          logRequestComplete(ctx, 200, Date.now() - startTime);
          return withCorrelationId(response, ctx.correlationId);
        } catch (error) {
          log.error("Failed to build dependency graph", { error });
          logRequestError(ctx, error, 500);

          const response = Response.json(
            {
              error: "Failed to build dependency graph",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
          );

          return withCorrelationId(response, ctx.correlationId);
        }
      },
    },
  },
});
