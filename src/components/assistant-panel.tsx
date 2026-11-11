"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DEMO_PROMPT =
  "What is the weather in my preferred city, and is it suitable for an outdoor meeting during my working hours?";

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function AssistantPanel() {
  const [draft, setDraft] = useState(DEMO_PROMPT);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, pending]);

  async function send(content = draft) {
    const text = content.trim();
    if (!text || pending) return;
    const nextMessages: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setDraft("");
    setPending(true);
    setError(null);

    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: nextMessages }),
    });
    const body = (await response.json().catch(() => null)) as
      | { reply?: string; tools_used?: string[]; error?: { message?: string } }
      | null;
    setPending(false);

    if (!response.ok || !body?.reply) {
      setError(body?.error?.message ?? "The assistant could not answer.");
      return;
    }

    setTools(body.tools_used ?? []);
    setMessages([...nextMessages, { role: "assistant", content: body.reply }]);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation</CardTitle>
        <CardDescription>Tools run on the server for the signed-in user. The model cannot choose another user id.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="max-h-[28rem] min-h-72 space-y-3 overflow-y-auto rounded-2xl bg-muted p-4"
        >
          {messages.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              Ask about your saved city and working hours. The reply uses the preference and weather results, not a
              guessed forecast.
            </p>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-xl rounded-2xl bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground"
                    : "max-w-xl rounded-2xl bg-white px-4 py-3 text-sm leading-6 shadow-sm"
                }
              >
                <p className="mb-1 text-xs font-semibold tracking-wide uppercase opacity-70">
                  {message.role === "user" ? "You" : "SecureDesk"}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}
          {pending ? (
            <p className="max-w-xl rounded-2xl bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
              Checking your account…
            </p>
          ) : null}
        </div>
        {tools.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tools used</span>
            {tools.map((tool) => (
              <Badge key={tool}>{tool.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="assistant-message">Message</Label>
          <Textarea
            id="assistant-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your preferred city"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void send()} disabled={pending || draft.trim().length === 0} aria-busy={pending}>
            {pending ? "Asking…" : "Send"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void send(DEMO_PROMPT)} disabled={pending}>
            Ask the outdoor-meeting question
          </Button>
          <p className="text-xs text-muted-foreground">Enter sends. Shift+Enter adds a line.</p>
        </div>
      </CardContent>
    </Card>
  );
}
