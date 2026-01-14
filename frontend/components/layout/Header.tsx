import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { Factory } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Factory className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Product Factory
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-4">
            <Link to="/projects">
              <Button variant="ghost" size="sm">
                Projects
              </Button>
            </Link>
          </nav>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
