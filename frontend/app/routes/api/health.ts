import { createAPIFileRoute } from "@tanstack/react-start/api";
import { healthCheck } from "@/lib/db";

export const APIRoute = createAPIFileRoute("/api/health")({
  GET: async () => {
    const startTime = Date.now();

    // Check database connectivity
    let dbHealthy = false;
    try {
      dbHealthy = await healthCheck();
    } catch {
      dbHealthy = false;
    }

    const responseTime = Date.now() - startTime;

    const status = dbHealthy ? "healthy" : "unhealthy";
    const statusCode = dbHealthy ? 200 : 503;

    return Response.json(
      {
        status,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        checks: {
          database: {
            status: dbHealthy ? "up" : "down",
          },
        },
        version: process.env.npm_package_version || "1.0.0",
      },
      {
        status: statusCode,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  },
});
