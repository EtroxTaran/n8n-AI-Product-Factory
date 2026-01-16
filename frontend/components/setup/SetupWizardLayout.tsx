import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
}

export const SETUP_STEPS: SetupStep[] = [
  { id: "welcome", title: "Welcome", description: "Overview of the setup process" },
  { id: "connect", title: "Connect", description: "Connect to your n8n instance" },
  { id: "import", title: "Import", description: "Import workflows to n8n" },
  { id: "webhooks", title: "Webhooks", description: "Configure webhook endpoints" },
  { id: "verify", title: "Verify", description: "Verify all connections" },
  { id: "complete", title: "Complete", description: "Setup complete" },
];

interface SetupWizardLayoutProps {
  currentStep: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  showNext?: boolean;
  showSkip?: boolean;
  isLoading?: boolean;
}

export function SetupWizardLayout({
  currentStep,
  children,
  onBack,
  onNext,
  onSkip,
  nextLabel = "Continue",
  nextDisabled = false,
  showBack = true,
  showNext = true,
  showSkip = false,
  isLoading = false,
}: SetupWizardLayoutProps) {
  const step = SETUP_STEPS[currentStep];
  const progress = ((currentStep + 1) / SETUP_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {SETUP_STEPS.length}
            </span>
            <span className="text-sm font-medium">{step.title}</span>
          </div>
          <Progress value={progress} className="h-2" />

          {/* Step indicators */}
          <div className="flex justify-between mt-2">
            {SETUP_STEPS.map((s, index) => (
              <div
                key={s.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Main card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-6">
          <div>
            {showBack && currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={onBack}
                disabled={isLoading}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {showSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Setup
              </Button>
            )}
            {showNext && (
              <Button
                onClick={onNext}
                disabled={nextDisabled || isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    {nextLabel}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SetupWizardLayout;
