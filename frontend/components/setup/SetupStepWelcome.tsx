import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  Key,
  Upload,
  CheckCircle,
  Settings,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Key,
    title: "Connect to n8n",
    description: "Enter your n8n instance URL and API key to establish a secure connection",
  },
  {
    icon: Upload,
    title: "Import Workflows",
    description: "Automatically import all AI Product Factory workflows to your n8n instance",
  },
  {
    icon: Workflow,
    title: "Configure Webhooks",
    description: "Auto-detect and configure webhook endpoints for seamless integration",
  },
  {
    icon: CheckCircle,
    title: "Verify Setup",
    description: "Run connection tests to ensure everything is working correctly",
  },
];

export function SetupStepWelcome() {
  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Zap className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Welcome to AI Product Factory Setup
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          This wizard will help you configure your n8n integration in just a few steps.
          You'll be up and running in under 5 minutes.
        </p>
      </div>

      {/* Features grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature, index) => (
          <Card key={feature.title} className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 text-xs"
              >
                Step {index + 2}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Prerequisites note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 p-4">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
              Before you begin
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Make sure you have access to your n8n instance and can create an API key
              from the n8n settings page. You'll need the instance URL and API key to proceed.
            </p>
          </div>
        </div>
      </div>

      {/* Skip option hint */}
      <p className="text-center text-sm text-muted-foreground">
        Already configured? Click "Skip Setup" below to proceed directly to the dashboard.
      </p>
    </div>
  );
}

export default SetupStepWelcome;
