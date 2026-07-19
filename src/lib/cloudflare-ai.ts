// PIP-MLK Cloudflare Workers AI client.
//
// Integrates with Cloudflare Workers AI API to provide an alternative LLM
// backend to z-ai-web-dev-sdk. The user provided a CF API token with
// Workers AI Write/Read, AI Gateway, and AutoRAG permissions.
//
// API docs: https://developers.cloudflare.com/workers-ai/
// Endpoint: POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
//
// Available text-generation models:
//   @cf/meta/llama-3.1-8b-instruct      — Llama 3.1 8B (fast, good quality)
//   @cf/meta/llama-3.1-70b-instruct     — Llama 3.1 70B (best quality, slower)
//   @cf/meta/llama-3-8b-instruct         — Llama 3 8B
//   @cf/mistral/mistral-7b-instruct-v0.2 — Mistral 7B
//   @cf/qwen/qwen1.5-14b-chat-awq        — Qwen 1.5 14B
//
// Token expires: 2026-07-29 (from metadata: plain-breeze-2fe3)

export interface CFChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CFChatResult {
  response: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface CFModelInfo {
  id: string;
  label: string;
  description: string;
  contextLength: number;
}

/**
 * Available CF Workers AI text-generation models for the PIP-MLK assistant.
 */
export const CF_MODELS: CFModelInfo[] = [
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    label: "Llama 3.1 8B",
    description: "Meta's Llama 3.1 — fast, good quality, 128K context. Recommended default.",
    contextLength: 128000,
  },
  {
    id: "@cf/meta/llama-3.1-70b-instruct",
    label: "Llama 3.1 70B",
    description: "Meta's Llama 3.1 70B — best quality, slower response. Use for complex analysis.",
    contextLength: 128000,
  },
  {
    id: "@cf/mistral/mistral-7b-instruct-v0.2",
    label: "Mistral 7B",
    description: "Mistral 7B v0.2 — fast, efficient, good for structured responses.",
    contextLength: 32000,
  },
  {
    id: "@cf/qwen/qwen1.5-14b-chat-awq",
    label: "Qwen 1.5 14B",
    description: "Alibaba's Qwen 1.5 — strong multilingual support including Bahasa Malaysia.",
    contextLength: 32000,
  },
];

/**
 * Check if Cloudflare Workers AI is configured (token + account ID present).
 */
export function isCFConfigured(): boolean {
  return !!(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN);
}

/**
 * Run a chat completion via Cloudflare Workers AI.
 *
 * @param messages - Chat messages (system + user turns)
 * @param modelId - CF Workers AI model ID (e.g. "@cf/meta/llama-3.1-8b-instruct")
 * @returns The model's response text + usage metadata
 * @throws Error if CF is not configured or the API call fails
 */
export async function cfChatCompletion(
  messages: CFChatMessage[],
  modelId: string = "@cf/meta/llama-3.1-8b-instruct"
): Promise<CFChatResult> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;

  if (!accountId || !token) {
    throw new Error(
      "Cloudflare Workers AI not configured. Set CF_ACCOUNT_ID and CF_AI_TOKEN in .env. " +
      "Token from CF dashboard: My Profile > API Tokens > 'plain-breeze-2fe3' > Roll."
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      // CF Workers AI supports streaming but we use non-streaming for simplicity
      stream: false,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `CF Workers AI HTTP ${response.status}`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.errors?.[0]?.message) {
        errorMsg += `: ${errorJson.errors[0].message}`;
      }
    } catch {
      errorMsg += `: ${errorText.substring(0, 200)}`;
    }

    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (!data.success) {
    const errMsg = data.errors?.[0]?.message ?? "Unknown CF Workers AI error";
    throw new Error(`CF Workers AI error: ${errMsg}`);
  }

  // CF Workers AI response format:
  // { result: { response: "..." }, success: true, errors: [], messages: [] }
  // For chat models, the response is in result.response
  const resultText = data.result?.response ?? data.result?.choices?.[0]?.message?.content ?? "";

  return {
    response: resultText,
    model: modelId,
    usage: data.result?.usage,
  };
}

/**
 * List available CF Workers AI models (requires auth).
 * Useful for discovering new models.
 */
export async function listCFModels(): Promise<CFModelInfo[]> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;

  if (!accountId || !token) {
    return CF_MODELS; // Return hardcoded list as fallback
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return CF_MODELS;

    const data = await response.json();
    const models = data.result ?? [];

    // Filter for text-generation models
    const textModels = models.filter((m: { task?: string }) => m.task === "text-generation");

    if (textModels.length === 0) return CF_MODELS;

    return textModels.map((m: { name?: string; description?: string; properties?: { context?: number } }) => ({
      id: m.name ?? "",
      label: m.name?.split("/").pop()?.replace(/-/g, " ") ?? m.name ?? "Unknown",
      description: m.description ?? "",
      contextLength: m.properties?.context ?? 0,
    }));
  } catch {
    return CF_MODELS; // Fallback to hardcoded list
  }
}
