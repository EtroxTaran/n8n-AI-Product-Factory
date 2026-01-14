import { createAuthClient } from "better-auth/react";

// Create the auth client for client-side operations
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

// Export commonly used hooks and functions
export const { signIn, signOut, useSession, getSession } = authClient;

// Helper to check if user is authenticated
export function useIsAuthenticated() {
  const { data: session, isPending } = useSession();
  return {
    isAuthenticated: !!session?.user,
    isPending,
    user: session?.user,
    session: session?.session,
  };
}
