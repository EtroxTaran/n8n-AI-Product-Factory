import { useState, useMemo } from "react";
import { createFileRoute, createServerFn } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtifactList } from "@/components/artifacts/ArtifactList";
import { ArtifactViewer } from "@/components/artifacts/ArtifactViewer";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { HistoryTimeline } from "@/components/history/HistoryTimeline";
import { ADRViewer } from "@/components/adr/ADRViewer";
import {
  getProject,
  getDecisionLogEntries,
  getChatMessages,
  insertChatMessage,
} from "@/lib/db";
import { listProjectArtifacts, getArtifactContent } from "@/lib/s3";
import { createProjectZip, downloadZip } from "@/lib/export";
import { sendChatMessage } from "@/lib/n8n";
import { parseADRs } from "@/types/adr";
import type { Project } from "@/types/project";
import type { Artifact } from "@/types/artifact";
import type { DecisionLogEntry } from "@/types/history";
import type { ChatMessage } from "@/types/chat";
import { PHASE_NAMES, STATUS_COLORS } from "@/types/project";
import { formatDateTime, formatScore, formatDuration } from "@/lib/utils";
import { Download, Loader2 } from "lucide-react";

const fetchProjectData = createServerFn({ method: "GET" })
  .validator((data: { projectId: string }) => data)
  .handler(async ({ data }) => {
    const [project, artifacts, history, messages] = await Promise.all([
      getProject(data.projectId),
      listProjectArtifacts(data.projectId).catch(() => []),
      getDecisionLogEntries(data.projectId),
      getChatMessages(data.projectId),
    ]);

    // Try to fetch decision_log.md content for ADR parsing
    let decisionLogContent = "";
    const decisionLogArtifact = (artifacts as Artifact[]).find(
      (a) => a.name.toLowerCase().includes("decision_log") || a.name.toLowerCase().includes("decision-log")
    );
    if (decisionLogArtifact) {
      try {
        decisionLogContent = await getArtifactContent(decisionLogArtifact.key);
      } catch {
        // Ignore if we can't fetch it
      }
    }

    return {
      project: project as Project | null,
      artifacts: artifacts as Artifact[],
      history: history as DecisionLogEntry[],
      messages: messages as ChatMessage[],
      decisionLogContent,
    };
  });

const fetchArtifactContent = createServerFn({ method: "GET" })
  .validator((data: { key: string }) => data)
  .handler(async ({ data }) => {
    const content = await getArtifactContent(data.key);
    return { content };
  });

const sendMessage = createServerFn({ method: "POST" })
  .validator(
    (data: { projectId: string; message: string; sessionId?: string }) => data
  )
  .handler(async ({ data }) => {
    // Save user message to database
    await insertChatMessage(
      data.projectId,
      data.sessionId || null,
      "user",
      data.message
    );

    // Send to n8n
    const response = await sendChatMessage({
      message: data.message,
      projectId: data.projectId,
      sessionId: data.sessionId,
    });

    // Save assistant response to database
    if (response.message) {
      await insertChatMessage(
        data.projectId,
        data.sessionId || null,
        "assistant",
        response.message,
        response.executionId
      );
    }

    return response;
  });

const exportProjectZip = createServerFn({ method: "POST" })
  .validator((data: { projectId: string; projectName?: string }) => data)
  .handler(async ({ data }) => {
    const result = await createProjectZip(data.projectId, data.projectName);
    return result;
  });

export const Route = createFileRoute("/projects/$projectId/")({
  loader: async ({ params }) => {
    const data = await fetchProjectData({ data: { projectId: params.projectId } });
    return data;
  },
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { project, artifacts, history, messages: initialMessages, decisionLogContent } =
    Route.useLoaderData();
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null
  );
  const [artifactContent, setArtifactContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Parse ADRs from decision log
  const adrs = useMemo(() => parseADRs(decisionLogContent || ""), [decisionLogContent]);

  if (!project) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <p className="text-muted-foreground mt-2">
            The requested project does not exist
          </p>
        </div>
      </div>
    );
  }

  const handleArtifactSelect = async (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setIsLoadingContent(true);
    try {
      const result = await fetchArtifactContent({ data: { key: artifact.key } });
      setArtifactContent(result.content);
    } catch (error) {
      console.error("Failed to load artifact:", error);
      setArtifactContent("");
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    setIsSending(true);

    // Optimistically add user message
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      project_id: project.project_id,
      session_id: null,
      role: "user",
      content: message,
      n8n_execution_id: null,
      response_time_ms: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendMessage({
        data: { projectId: project.project_id, message },
      });

      if (response.message) {
        const assistantMessage: ChatMessage = {
          id: `temp-${Date.now()}-response`,
          project_id: project.project_id,
          session_id: null,
          role: "assistant",
          content: response.message,
          n8n_execution_id: response.executionId || null,
          response_time_ms: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (response.error) {
        const errorMessage: ChatMessage = {
          id: `temp-${Date.now()}-error`,
          project_id: project.project_id,
          session_id: null,
          role: "system",
          content: `Error: ${response.error}`,
          n8n_execution_id: null,
          response_time_ms: null,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    if (!selectedArtifact || !artifactContent) return;

    const blob = new Blob([artifactContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedArtifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    if (isExporting || artifacts.length === 0) return;

    setIsExporting(true);
    try {
      const result = await exportProjectZip({
        data: {
          projectId: project.project_id,
          projectName: project.project_name,
        },
      });
      downloadZip(result.data, result.filename);
    } catch (error) {
      console.error("Failed to export project:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container py-6">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {project.project_name}
            </h1>
            <p className="text-muted-foreground">ID: {project.project_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAll}
              disabled={isExporting || artifacts.length === 0}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isExporting ? "Exporting..." : "Export All"}
            </Button>
            <Badge
              variant={project.phase_status === "completed" ? "success" : "info"}
            >
              {PHASE_NAMES[project.current_phase] ||
                `Phase ${project.current_phase}`}
            </Badge>
            <Badge variant="outline">{project.phase_status}</Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Iterations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{project.total_iterations}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatScore(project.last_iteration_score)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Duration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatDuration(project.total_duration_ms)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Updated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{formatDateTime(project.updated_at)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="artifacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="artifacts">
            Artifacts ({artifacts.length})
          </TabsTrigger>
          <TabsTrigger value="adrs">
            ADRs ({adrs.length})
          </TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="history">History ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="artifacts" className="space-y-4">
          <div className="grid grid-cols-12 gap-4 h-[600px]">
            <div className="col-span-4 border rounded-lg overflow-hidden">
              <ArtifactList
                artifacts={artifacts}
                selectedKey={selectedArtifact?.key}
                onSelect={handleArtifactSelect}
              />
            </div>
            <div className="col-span-8 border rounded-lg overflow-hidden">
              <ArtifactViewer
                content={artifactContent}
                filename={selectedArtifact?.name}
                isLoading={isLoadingContent}
                onDownload={artifactContent ? handleDownload : undefined}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="adrs" className="space-y-4">
          <ADRViewer content={decisionLogContent || ""} />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <div className="border rounded-lg h-[600px] overflow-hidden">
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              isSending={isSending}
              projectName={project.project_name}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="border rounded-lg h-[600px] overflow-hidden">
            <HistoryTimeline entries={history} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
