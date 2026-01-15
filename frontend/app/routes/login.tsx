import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";
import { auth } from "@/lib/auth";
import { Factory } from "lucide-react";

// Server function to check if user is already authenticated
const checkAuth = createServerFn({ method: "GET" }).handler(async ({ request }) => {
  const session = await auth.api.getSession({
    headers: request?.headers,
  });
  return { isAuthenticated: !!session?.user };
});

export const Route = createFileRoute("/login")({
  // Redirect to projects if already authenticated
  beforeLoad: async () => {
    const { isAuthenticated } = await checkAuth();
    if (isAuthenticated) {
      throw redirect({ to: "/projects" });
    }
  },
  component: LoginPage,
});

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPage() {
  const handleGoogleLogin = () => {
    signIn.social({
      provider: "google",
      callbackURL: "/projects",
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Factory className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to Product Factory</CardTitle>
            <CardDescription className="mt-2">
              Sign in with your Google account to access the dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Access is restricted to authorized email domains only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
