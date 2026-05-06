import { optionalEnv, requireEnv } from "./env.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

async function callOpenAI(messages: ChatMessage[], jsonMode = false): Promise<string> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_MODEL") ?? "gpt-4o-mini";

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed: ChatCompletionResponse = {};

  try {
    parsed = JSON.parse(raw) as ChatCompletionResponse;
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errorMessage = parsed.error?.message ?? `OpenAI request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  return content;
}

export async function generateText(systemInstruction: string, userPrompt: string): Promise<string> {
  return callOpenAI(
    [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    false
  );
}

export async function generateJson<T>(systemInstruction: string, userPrompt: string): Promise<T> {
  const content = await callOpenAI(
    [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    true
  );

  return JSON.parse(content) as T;
}
