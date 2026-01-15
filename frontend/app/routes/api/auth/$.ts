import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

// Catch-all route for Better-Auth endpoints
// Handles: /api/auth/signin, /api/auth/signout, /api/auth/callback/google, etc.
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        return auth.handler(request);
      },
    },
  },
});
