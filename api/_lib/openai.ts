import { optionalEnv, requireEnv } from "./env.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export type WebSource = {
  title: string;
  url: string;
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

type ResponsesOutputTextAnnotation = {
  type?: string;
  url?: string;
  title?: string;
};

type ResponsesOutputTextChunk = {
  type?: string;
  text?: string;
  annotations?: ResponsesOutputTextAnnotation[];
};

type ResponsesOutputItem = {
  type?: string;
  content?: ResponsesOutputTextChunk[];
  action?: {
    sources?: Array<{
      url?: string;
      title?: string;
    }>;
  };
};

type ResponsesApiResponse = {
  output_text?: string;
  output?: ResponsesOutputItem[];
  error?: {
    message?: string;
  };
};

async function callResponsesApi(body: Record<string, unknown>): Promise<ResponsesApiResponse> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed: ResponsesApiResponse = {};
  try {
    parsed = JSON.parse(raw) as ResponsesApiResponse;
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errorMessage = parsed.error?.message ?? `OpenAI responses request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return parsed;
}

function extractResponseOutputText(payload: ResponsesApiResponse): string {
  if (payload.output_text && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const chunk of item.content ?? []) {
      if ((chunk.type === "output_text" || chunk.type === "text") && chunk.text) {
        parts.push(chunk.text);
      }
    }
  }

  const merged = parts.join("\n").trim();
  if (!merged) {
    throw new Error("OpenAI returned empty output text");
  }

  return merged;
}

function collectWebSources(payload: ResponsesApiResponse): WebSource[] {
  const byUrl = new Map<string, WebSource>();

  for (const item of payload.output ?? []) {
    for (const chunk of item.content ?? []) {
      for (const annotation of chunk.annotations ?? []) {
        if (annotation.type !== "url_citation" || !annotation.url) continue;
        byUrl.set(annotation.url, {
          title: annotation.title ?? annotation.url,
          url: annotation.url,
        });
      }
    }

    for (const source of item.action?.sources ?? []) {
      if (!source.url) continue;
      byUrl.set(source.url, {
        title: source.title ?? source.url,
        url: source.url,
      });
    }
  }

  return Array.from(byUrl.values());
}

function parseJsonFromText<T>(rawText: string): T {
  try {
    return JSON.parse(rawText) as T;
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("Failed to parse JSON response");
    }
    return JSON.parse(rawText.slice(start, end + 1)) as T;
  }
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

export async function generateWebResearchJson<T>(
  systemInstruction: string,
  userPrompt: string
): Promise<{ data: T; sources: WebSource[] }> {
  const researchModel = optionalEnv("OPENAI_RESEARCH_MODEL") ?? optionalEnv("OPENAI_MODEL") ?? "gpt-4o-mini";

  try {
    const payload = await callResponsesApi({
      model: researchModel,
      input: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "web_search_preview" }],
      tool_choice: "auto",
      temperature: 0.2,
    });

    const text = extractResponseOutputText(payload);
    return {
      data: parseJsonFromText<T>(text),
      sources: collectWebSources(payload),
    };
  } catch {
    // Graceful fallback for projects without tool-enabled models.
    return {
      data: await generateJson<T>(systemInstruction, userPrompt),
      sources: [],
    };
  }
}

type ImageGenerationResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function generateImageBase64(prompt: string): Promise<string> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const model = optionalEnv("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      quality: "medium",
      response_format: "b64_json",
    }),
  });

  const raw = await response.text();
  let parsed: ImageGenerationResponse = {};
  try {
    parsed = JSON.parse(raw) as ImageGenerationResponse;
  } catch {
    parsed = {};
  }

  if (!response.ok) {
    const errorMessage = parsed.error?.message ?? `OpenAI image generation failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  const base64 = parsed.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI returned empty image data");
  }

  return base64;
}
