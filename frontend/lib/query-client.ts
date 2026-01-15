/**
 * TanStack Query Client Configuration
 *
 * This module provides the QueryClient configuration for the application.
 * It follows best practices for 2025-2026:
 * - Automatic request deduplication
 * - Background refetching for stale data
 * - Optimistic updates support
 * - Proper error handling
 */

import { QueryClient, QueryClientConfig } from "@tanstack/react-query";

/**
 * Default query client options
 * These can be overridden per-query using queryOptions
 */
const defaultQueryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,

      // Cache data for 30 minutes before garbage collection
      gcTime: 30 * 60 * 1000,

      // Retry failed queries up to 3 times
      retry: 3,

      // Exponential backoff for retries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,

      // Don't refetch on mount if data is fresh
      refetchOnMount: true,

      // Refetch when reconnecting to network
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,

      // Don't retry mutations by default (they may have side effects)
      retryDelay: 1000,
    },
  },
};

/**
 * Create a new QueryClient instance
 * Call this function to create a client for the application
 */
export function createQueryClient(): QueryClient {
  return new QueryClient(defaultQueryConfig);
}

/**
 * Singleton query client for server-side rendering
 * This ensures the same client is used during SSR
 */
let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Get or create a QueryClient
 * On the server, always creates a new client
 * On the client, reuses the same client
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always create a new query client
    return createQueryClient();
  }

  // Browser: use singleton pattern
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
}

/**
 * Query key factory for type-safe query keys
 * This pattern prevents typos and ensures consistency
 */
export const queryKeys = {
  // Projects
  projects: {
    all: ["projects"] as const,
    list: () => [...queryKeys.projects.all, "list"] as const,
    detail: (projectId: string) =>
      [...queryKeys.projects.all, "detail", projectId] as const,
    artifacts: (projectId: string) =>
      [...queryKeys.projects.all, "artifacts", projectId] as const,
    history: (projectId: string) =>
      [...queryKeys.projects.all, "history", projectId] as const,
    messages: (projectId: string) =>
      [...queryKeys.projects.all, "messages", projectId] as const,
  },

  // Auth
  auth: {
    session: ["auth", "session"] as const,
    user: ["auth", "user"] as const,
  },

  // Governance
  governance: {
    pending: (projectId: string) =>
      ["governance", "pending", projectId] as const,
  },
} as const;

/**
 * Helper to invalidate all queries for a project
 * Use after mutations that affect multiple project-related queries
 */
export function invalidateProjectQueries(
  queryClient: QueryClient,
  projectId: string
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.projects.detail(projectId),
  });
}

/**
 * Helper to invalidate all project list queries
 * Use after creating or deleting a project
 */
export function invalidateProjectListQueries(
  queryClient: QueryClient
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: queryKeys.projects.list(),
  });
}
