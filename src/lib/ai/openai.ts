import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import { runAssistant, type AssistantResult, type ChatMessage } from "@/lib/ai/assistant";
import { executeAssistantTool } from "@/lib/ai/tools";
import { readPreferences } from "@/lib/preferences/service";
import { buildWeatherReport } from "@/lib/weather/service";
import { PreferencesRequiredError } from "@/lib/weather/service";

export function openAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function completeAssistantTurn(input: {
  subject: string;
  messages: ChatMessage[];
}): Promise<AssistantResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  const model = process.env.OPENAI_MODEL || "gpt-4o";

  return runAssistant({
    subject: input.subject,
    messages: input.messages,
    model,
    client: {
      responses: {
        create: async (body) => {
          const response = await client.responses.create({
            model: body.model,
            instructions: body.instructions,
            tools: body.tools,
            input: body.input,
          } as never);
          return response as never;
        },
      },
    },
    appendModelOutput: (items, output) => {
      items.push(...toResponseInputItems(output as never));
    },
    dependencies: {
      loadPreferences: (subject) => readPreferences(subject),
      loadWeather: async (subject) => {
        const preference = await readPreferences(subject);
        if (!preference) throw new PreferencesRequiredError();
        return buildWeatherReport({ preference });
      },
    },
  });
}

export { executeAssistantTool };
