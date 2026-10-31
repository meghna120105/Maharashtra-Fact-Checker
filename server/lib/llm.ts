import OpenAI from "openai";

try {
  process.loadEnvFile();
} catch {
  // .env is optional
}

type Provider = "groq" | "openai" | "ollama" | "none";
interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  baseURL?: string;
  model: string;
}

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_OLLAMA_MODEL = "qwen2.5:3b";

function ollamaIsEnabled() {
  return process.env.OLLAMA_ENABLED?.toLowerCase() !== "false";
}

function ollamaBaseURL() {
  const base = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
  return `${base.replace(/\/v1$/i, "")}/v1`;
}

function ollamaConfig(): ProviderConfig {
  return {
    provider: "ollama",
    apiKey: "ollama", // Ollama requires a value for OpenAI-compatible clients but ignores it.
    baseURL: ollamaBaseURL(),
    model: process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL,
  };
}

export function getProviderConfig(): ProviderConfig {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      provider: "groq",
      apiKey: groqKey,
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseURL: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL || "gpt-5",
    };
  }

  if (ollamaIsEnabled()) return ollamaConfig();
  return { provider: "none", apiKey: "", model: "" };
}

const clients = new Map<string, OpenAI>();

export const llmConfigured = () => getProviderConfig().provider !== "none";

function getClient(config: ProviderConfig) {
  if (config.provider === "none") {
    throw new Error("No AI provider is enabled. Configure GROQ_API_KEY or enable Ollama in .env.");
  }
  const cacheKey = `${config.provider}:${config.baseURL ?? "default"}:${config.apiKey}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      maxRetries: 0,
      timeout: config.provider === "ollama"
        ? Number(process.env.OLLAMA_TIMEOUT_MS || 120000)
        : Number(process.env.AI_PROVIDER_TIMEOUT_MS || 30000),
    });
    clients.set(cacheKey, client);
  }
  return client;
}

async function askWithProvider<T>(config: ProviderConfig, system: string, user: string, maxTokens: number): Promise<T> {
  const payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
    model: config.model,
    messages: [
      { role: "system", content: system + "\nRespond ONLY with a single valid JSON object." },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    ...(config.provider === "ollama"
      ? { max_tokens: maxTokens }
      : { max_completion_tokens: maxTokens }),
  };

  const res = await getClient(config).chat.completions.create(payload);
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("The AI returned an empty response.");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("The AI returned malformed JSON.");
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function askJson<T = any>(system: string, user: string, maxTokens = 2500): Promise<T> {
  const primary = getProviderConfig();
  if (primary.provider === "none") throw new Error("No AI provider is enabled. Configure GROQ_API_KEY or enable Ollama in .env.");

  try {
    return await askWithProvider<T>(primary, system, user, maxTokens);
  } catch (primaryError) {
    if (primary.provider === "ollama" || !ollamaIsEnabled()) throw primaryError;

    const fallback = ollamaConfig();
    console.warn(`[ai] ${primary.provider} request failed; trying local Ollama fallback (${errorMessage(primaryError)})`);
    try {
      return await askWithProvider<T>(fallback, system, user, maxTokens);
    } catch (fallbackError) {
      throw new Error(
        `${primary.provider} failed (${errorMessage(primaryError)}); local Ollama fallback failed (${errorMessage(fallbackError)}).`,
      );
    }
  }
}
