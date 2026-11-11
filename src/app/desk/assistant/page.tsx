import { AssistantPanel } from "@/components/assistant-panel";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="font-serif text-4xl tracking-tight">Assistant</h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          Ask about your saved city. Answers come from your preferences and the live forecast.
        </p>
      </div>
      <AssistantPanel />
    </div>
  );
}
