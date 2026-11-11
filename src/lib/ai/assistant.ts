import { assistantTools, executeAssistantTool, type ToolDependencies } from "@/lib/ai/tools";

export const ASSISTANT_INSTRUCTIONS = `You are SecureDesk, a personal assistant for the authenticated user.
Learn their preferences and the weather only by calling the provided tools.
The server binds every tool to the signed-in user. Never ask for, invent, or pass a user id.
Never invent a city, temperature, weather condition, timezone, or working-hours window.
When asked about the weather in the preferred city and an outdoor meeting, call get_user_preferences and get_current_weather.
Answer from the tool results only. Include the city, temperature with its unit, the condition, whether the local time is inside working hours, and whether an outdoor meeting is suitable, using the suitability reasons returned by the tool.
If a tool returns an error, explain that error without guessing the missing data.`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type FunctionCallItem = {
  type: "function_call";
  name: string;
  arguments: string;
  call_id: string;
};

export type ModelResponse = {
  output: Array<FunctionCallItem | { type: string }>;
  output_text?: string | null;
};

export type AssistantModelClient = {
  responses: {
    create: (body: {
      model: string;
      instructions: string;
      tools: typeof assistantTools;
      input: unknown[];
    }) => Promise<ModelResponse>;
  };
};

export type AssistantResult = {
  reply: string;
  tools_used: string[];
};

const MAX_TOOL_ROUNDS = 4;

export async function runAssistant(input: {
  subject: string;
  messages: ChatMessage[];
  client: AssistantModelClient;
  dependencies: ToolDependencies;
  model: string;
  appendModelOutput?: (items: unknown[], output: ModelResponse["output"]) => void;
}): Promise<AssistantResult> {
  const items: unknown[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await input.client.responses.create({
      model: input.model,
      instructions: ASSISTANT_INSTRUCTIONS,
      tools: assistantTools,
      input: items,
    });

    const functionCalls = response.output.filter((item): item is FunctionCallItem => item.type === "function_call");
    if (functionCalls.length === 0) {
      const reply = response.output_text?.trim();
      if (!reply) {
        throw new Error("The assistant returned an empty response.");
      }
      return { reply, tools_used: toolsUsed };
    }

    if (input.appendModelOutput) {
      input.appendModelOutput(items, response.output);
    } else {
      items.push(...response.output);
    }

    for (const call of functionCalls) {
      toolsUsed.push(call.name);
      const output = await executeAssistantTool({
        name: call.name,
        subject: input.subject,
        argumentsJson: call.arguments,
        dependencies: input.dependencies,
      });
      items.push({
        type: "function_call_output",
        call_id: call.call_id,
        output,
      });
    }
  }

  throw new Error("The assistant exceeded the tool-call limit.");
}
