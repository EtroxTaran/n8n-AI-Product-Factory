import type {
  ChatRequest,
  ChatResponse,
  N8nWebhookRequest,
  N8nWebhookResponse,
} from "@/types/chat";

function getWebhookUrl(): string {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    throw new Error("N8N_WEBHOOK_URL environment variable is not set");
  }
  return url;
}

export async function sendChatMessage(
  request: ChatRequest
): Promise<ChatResponse> {
  const webhookUrl = getWebhookUrl();
  const sessionId =
    request.sessionId || `dashboard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const payload: N8nWebhookRequest = {
    chatInput: request.message,
    projectId: request.projectId,
    sessionId,
    source: "dashboard",
  };

  const startTime = Date.now();

  try {
    const response = await fetch(`${webhookUrl}/ai-product-factory-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        message: "",
        error: `n8n returned ${response.status}: ${errorText}`,
      };
    }

    const data: N8nWebhookResponse = await response.json();
    const responseTime = Date.now() - startTime;

    // n8n can return the message in different fields
    const message =
      data.output || data.text || data.response || data.message || "";

    return {
      message,
      executionId: data.executionId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      message: "",
      error: `Failed to send message to n8n: ${errorMessage}`,
    };
  }
}

export async function triggerWorkflow(
  workflowName: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const webhookUrl = getWebhookUrl();

  try {
    const response = await fetch(`${webhookUrl}/${workflowName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `n8n returned ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to trigger workflow: ${errorMessage}`,
    };
  }
}

export async function checkN8nHealth(): Promise<boolean> {
  try {
    // n8n doesn't have a standard health endpoint, but we can try the webhook base
    const webhookUrl = getWebhookUrl();
    const response = await fetch(webhookUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    // Even a 404 means n8n is running
    return response.status < 500;
  } catch {
    return false;
  }
}
