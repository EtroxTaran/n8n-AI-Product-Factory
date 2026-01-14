import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Create a dedicated pool for auth
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get allowed email domains from environment
function getAllowedDomains(): string[] {
  const domains = process.env.ALLOWED_EMAIL_DOMAINS || "";
  return domains
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export const auth = betterAuth({
  database: pool,

  // Disable email/password - Google OAuth only
  emailAndPassword: {
    enabled: false,
  },

  // Google OAuth provider
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Secret for JWT signing
  secret: process.env.AUTH_SECRET,

  // Base URL for callbacks
  baseURL: process.env.AUTH_URL || "http://localhost:3000",

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.AUTH_URL || "http://localhost:3000",
  ],

  // Callbacks for domain restriction
  callbacks: {
    async signIn({ user }) {
      const allowedDomains = getAllowedDomains();

      // If no domains specified, allow all
      if (allowedDomains.length === 0) {
        return true;
      }

      // Check if user email domain is allowed
      if (user.email) {
        const emailDomain = user.email.split("@")[1]?.toLowerCase();
        if (emailDomain && allowedDomains.includes(emailDomain)) {
          return true;
        }
      }

      // Reject sign-in for unauthorized domains
      console.warn(`Sign-in rejected for email: ${user.email} - domain not allowed`);
      return false;
    },
  },
});

// Export session type for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
