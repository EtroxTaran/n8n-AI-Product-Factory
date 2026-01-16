import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { isSetupComplete, isN8nConfigured } from "@/lib/settings";

/**
 * Server function to check if setup wizard should be shown.
 * Returns the destination route based on setup status.
 */
const checkSetupStatus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const setupComplete = await isSetupComplete();
    const n8nConfigured = await isN8nConfigured();

    // If setup is not complete and n8n is not configured, redirect to setup
    if (!setupComplete && !n8nConfigured) {
      return { redirectTo: "/setup" };
    }

    // Otherwise, go to projects
    return { redirectTo: "/projects" };
  } catch (error) {
    // On error, default to projects (setup check failed, but let user proceed)
    console.error("Setup status check failed:", error);
    return { redirectTo: "/projects" };
  }
});

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { redirectTo } = await checkSetupStatus();
    throw redirect({ to: redirectTo });
  },
  component: () => null,
});
