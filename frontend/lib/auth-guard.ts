/**
 * Authentication Guard Utilities
 *
 * This module provides utilities for protecting routes and server functions
 * with authentication checks.
 */

import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getServerSession, type Session, type User } from "@/lib/auth";

/**
 * Server function to validate the session
 * Returns the session if authenticated, null otherwise
 */
export const validateSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await getServerSession(request?.headers);

    if (!session?.user) {
      return { authenticated: false as const, user: null, session: null };
    }

    return {
      authenticated: true as const,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      } as User,
      session: session,
    };
  }
);

/**
 * Auth guard result type
 */
export type AuthGuardResult =
  | { authenticated: true; user: User; session: Session }
  | { authenticated: false; user: null; session: null };

/**
 * Require authentication for a route
 * Call this in beforeLoad to protect a route
 *
 * @param location - The current location from beforeLoad
 * @returns The user if authenticated
 * @throws Redirect to login if not authenticated
 */
export async function requireAuth(
  location: { pathname: string }
): Promise<{ user: User }> {
  const result = await validateSession();

  if (!result.authenticated) {
    throw redirect({
      to: "/login",
      search: {
        redirect: location.pathname,
      },
    });
  }

  return { user: result.user };
}

/**
 * Check authentication without redirecting
 * Useful for conditional rendering based on auth state
 */
export async function checkAuth(): Promise<AuthGuardResult> {
  return validateSession();
}
