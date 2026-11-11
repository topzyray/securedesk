"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PublicUser = {
  sub: string;
  name: string | null;
  email: string | null;
};

type PublicPreference = {
  preferred_city: string;
  preferred_country: string;
  preferred_timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  temperature_unit: "celsius" | "fahrenheit";
};

type WeatherReport = {
  resolved_name: string;
  temperature: number;
  temperature_unit: string;
  condition: string;
  local_time: string;
  within_working_hours: boolean;
  outdoor_meeting_suitable: boolean;
  suitability_reasons: string[];
};

type Notice = {
  message: string;
  tone: "loading" | "info" | "success" | "error";
};

const emptyPreference: PublicPreference = {
  preferred_city: "",
  preferred_country: "",
  preferred_timezone: "",
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  temperature_unit: "celsius",
};

const timeZones =
  typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? Intl.supportedValuesOf("timeZone") : ["UTC"];

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
  return body?.error?.message ?? "The request failed.";
}

export function PreferencesPanel() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [form, setForm] = useState<PublicPreference>(emptyPreference);
  const [notice, setNotice] = useState<Notice>({ message: "Loading your account.", tone: "loading" });
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const meResponse = await fetch("/api/me", { cache: "no-store" });
      if (!meResponse.ok) {
        if (!cancelled) setNotice({ message: await readError(meResponse), tone: "error" });
        return;
      }
      const me = (await meResponse.json()) as { user: PublicUser };
      if (cancelled) return;
      setUser(me.user);

      const preferenceResponse = await fetch("/api/me/preferences", { cache: "no-store" });
      if (preferenceResponse.status === 404) {
        if (!cancelled) setNotice({ message: "Save a preferred city before asking about the weather.", tone: "info" });
        return;
      }
      if (!preferenceResponse.ok) {
        if (!cancelled) setNotice({ message: await readError(preferenceResponse), tone: "error" });
        return;
      }
      const preferenceBody = (await preferenceResponse.json()) as { preference: PublicPreference };
      if (cancelled) return;
      setForm(preferenceBody.preference);
      setNotice({ message: "Preferences loaded from your account.", tone: "success" });
      await loadWeather(cancelled);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadWeather(cancelled = false) {
    const response = await fetch("/api/weather", { cache: "no-store" });
    if (response.status === 409) {
      if (!cancelled) {
        setWeather(null);
        setWeatherError(null);
      }
      return;
    }
    if (!response.ok) {
      if (!cancelled) {
        setWeather(null);
        setWeatherError(await readError(response));
      }
      return;
    }
    const body = (await response.json()) as { weather: WeatherReport };
    if (!cancelled) {
      setWeather(body.weather);
      setWeatherError(null);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice({ message: "Saving preferences.", tone: "loading" });
    const response = await fetch("/api/me/preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!response.ok) {
      setNotice({ message: await readError(response), tone: "error" });
      return;
    }
    const body = (await response.json()) as { preference: PublicPreference };
    setForm(body.preference);
    setNotice({ message: "Preferences saved for this signed-in user.", tone: "success" });
    await loadWeather();
  }

  return (
    <div className="grid gap-6">
      <section aria-labelledby="identity-heading" className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[0_12px_40px_rgba(20,34,27,0.05)]">
        <h2 id="identity-heading" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Validated identity
        </h2>
        {user ? (
          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="font-semibold">{user.name || user.email || "Signed in"}</p>
            <p className="font-mono text-xs break-all text-muted-foreground">{user.sub}</p>
          </div>
        ) : (
          <div className="mt-3 h-5 w-64 animate-pulse rounded-full bg-muted" />
        )}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>These values belong to the signed-in subject. The form cannot change that id.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6" onSubmit={onSubmit}>
              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-semibold">Location</legend>
                <div className="grid gap-2">
                  <Label htmlFor="preferred_city">Preferred city</Label>
                  <Input
                    id="preferred_city"
                    value={form.preferred_city}
                    onChange={(event) => setForm({ ...form, preferred_city: event.target.value })}
                    placeholder="Lagos"
                    autoComplete="address-level2"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="preferred_country">Country code</Label>
                    <Input
                      id="preferred_country"
                      value={form.preferred_country}
                      onChange={(event) => setForm({ ...form, preferred_country: event.target.value.toUpperCase() })}
                      placeholder="NG"
                      maxLength={2}
                      autoComplete="country"
                      pattern="[A-Za-z]{2}"
                      title="Two-letter ISO country code"
                      required
                    />
                    <p className="text-xs text-muted-foreground">ISO code, such as NG.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="preferred_timezone">Timezone</Label>
                    <Input
                      id="preferred_timezone"
                      value={form.preferred_timezone}
                      onChange={(event) => setForm({ ...form, preferred_timezone: event.target.value })}
                      placeholder="Africa/Lagos"
                      list="timezones"
                      required
                    />
                    <datalist id="timezones">
                      {timeZones.map((zone) => (
                        <option key={zone} value={zone} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </fieldset>
              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-semibold">Working hours</legend>
                <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="working_hours_start">Starts</Label>
                  <Input
                    id="working_hours_start"
                    type="time"
                    value={form.working_hours_start}
                    onChange={(event) => setForm({ ...form, working_hours_start: event.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="working_hours_end">Ends</Label>
                  <Input
                    id="working_hours_end"
                    type="time"
                    value={form.working_hours_end}
                    onChange={(event) => setForm({ ...form, working_hours_end: event.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="temperature_unit">Temperature</Label>
                  <select
                    id="temperature_unit"
                    className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.temperature_unit}
                    onChange={(event) =>
                      setForm({ ...form, temperature_unit: event.target.value as PublicPreference["temperature_unit"] })
                    }
                  >
                    <option value="celsius">Celsius</option>
                    <option value="fahrenheit">Fahrenheit</option>
                  </select>
                </div>
                </div>
              </fieldset>
              <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  role="status"
                  className={cn(
                    "text-sm",
                    notice.tone === "error" && "text-destructive",
                    notice.tone === "success" && "font-medium text-primary",
                    notice.tone !== "error" && notice.tone !== "success" && "text-muted-foreground",
                  )}
                >
                  {notice.message}
                </p>
                <Button type="submit" disabled={saving} aria-busy={saving}>
                  {saving ? "Saving…" : "Save preferences"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Current weather</CardTitle>
            <CardDescription>Open-Meteo is called with the city stored for this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weather ? (
              <>
                <div>
                  <p className="font-serif text-5xl tracking-tight">
                    {weather.temperature.toFixed(1)}°{weather.temperature_unit === "fahrenheit" ? "F" : "C"}
                  </p>
                  <p className="mt-2 text-lg">{weather.condition}</p>
                  <p className="text-sm text-muted-foreground">
                    {weather.resolved_name} · {weather.local_time}
                  </p>
                </div>
                <Badge className={weather.outdoor_meeting_suitable ? "border-primary/20 bg-primary text-primary-foreground" : undefined}>
                  {weather.outdoor_meeting_suitable ? "Suitable for an outdoor meeting" : "Not ideal outdoors"}
                </Badge>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {weather.suitability_reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  {weather.within_working_hours ? "Inside your working hours." : "Outside your working hours."}
                </p>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-8 text-sm leading-6 text-muted-foreground">
                {weatherError ?? "Weather appears here after you save a preferred city."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
