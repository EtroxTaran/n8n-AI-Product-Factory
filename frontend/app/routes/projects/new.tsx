/**
 * New Project Route (Protected)
 *
 * This route requires authentication.
 * Users are redirected to login if not authenticated.
 */

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUpload } from "@/components/upload/FileUpload";
import { requireAuth } from "@/lib/auth-guard";
import { RouteErrorBoundary } from "@/components/error/RouteErrorBoundary";
import { FormSkeleton } from "@/components/loading/RouteLoadingSpinner";
import { ArrowLeft, Loader2, Rocket, AlertCircle } from "lucide-react";
import type { InputFile } from "@/lib/schemas";

export const Route = createFileRoute("/projects/new")({
  beforeLoad: async ({ location }) => {
    // Require authentication before loading this route
    return requireAuth(location);
  },
  component: NewProjectPage,
  errorComponent: RouteErrorBoundary,
  pendingComponent: FormSkeleton,
  pendingMs: 200,
  pendingMinMs: 300,
});

function NewProjectPage() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<InputFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate project ID from name
  const projectId = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .concat("-", Date.now().toString(36));

  const handleUploadComplete = (files: InputFile[]) => {
    setUploadedFiles(files);
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (uploadedFiles.length === 0) {
      setError("Please upload at least one document");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the API to start the project
      const response = await fetch("/api/start-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          projectId,
          description: description.trim(),
          inputFiles: uploadedFiles,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      const data = await response.json();

      // Show success toast
      toast.success("Project created successfully", {
        description: `${projectName} is now being processed by the AI workflow.`,
      });

      // Navigate to the project page
      navigate({
        to: "/projects/$projectId",
        params: { projectId: data.project_id },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create project";
      setError(errorMessage);
      toast.error("Failed to create project", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate({ to: "/projects" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Projects
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Create New Project
          </CardTitle>
          <CardDescription>
            Upload your source documents and start the AI Product Factory workflow
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name *</Label>
              <Input
                id="projectName"
                placeholder="e.g., ShopFast E-commerce Platform"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={isSubmitting}
              />
              {projectName && (
                <p className="text-xs text-muted-foreground">
                  Project ID: {projectId}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Briefly describe your project goals and context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Source Documents *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload architecture docs, requirements, technical standards, or any
                documents that should inform the vision and architecture.
              </p>
              {!projectName.trim() ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto h-10 w-10 mb-4 opacity-50"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <p className="font-medium">Enter a project name first</p>
                    <p className="text-xs mt-1">
                      A project name is required before you can upload documents
                    </p>
                  </div>
                </div>
              ) : (
                <FileUpload
                  projectId={projectId || "temp"}
                  onUploadComplete={handleUploadComplete}
                  onUploadError={handleUploadError}
                  disabled={isSubmitting}
                  maxFiles={10}
                />
              )}
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/projects" })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || !projectName.trim() || uploadedFiles.length === 0
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Start Project
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
