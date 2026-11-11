import { PreferencesPanel } from "@/components/preferences-panel";

export const dynamic = "force-dynamic";

export default function DeskPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h1 className="font-serif text-4xl tracking-tight">Your desk</h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          Save the city and working hours this account should use. Weather is read from that saved city.
        </p>
      </div>
      <PreferencesPanel />
    </div>
  );
}
