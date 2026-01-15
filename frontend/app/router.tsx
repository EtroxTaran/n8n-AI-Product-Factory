import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getQueryClient } from "@/lib/query-client";

export function getRouter() {
  const queryClient = getQueryClient();

  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    context: {
      queryClient,
    },
  });
}

// Backwards compatibility alias
export const createRouter = getRouter;

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
