import { createAPIFileRoute } from "@tanstack/start/api";
import { auth } from "@/lib/auth";

// Catch-all route for Better-Auth endpoints
// Handles: /api/auth/signin, /api/auth/signout, /api/auth/callback/google, etc.
export const APIRoute = createAPIFileRoute("/api/auth/$")({
  GET: async ({ request }) => {
    return auth.handler(request);
  },
  POST: async ({ request }) => {
    return auth.handler(request);
  },
});
