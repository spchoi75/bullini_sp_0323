const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SONNET_MODEL = "claude-sonnet-4-20250514";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeOptions {
  model?: "sonnet" | "haiku";
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export async function callClaude(
  messages: ClaudeMessage[],
  options: ClaudeOptions = {}
): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const {
    model = "sonnet",
    maxTokens = 4096,
    temperature = 0.3,
    system,
  } = options;

  const modelId = model === "haiku" ? HAIKU_MODEL : SONNET_MODEL;

  const body: Record<string, unknown> = {
    model: modelId,
    max_tokens: maxTokens,
    temperature,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.content?.[0];
  if (content?.type === "text") return content.text;
  throw new Error("Unexpected Claude response format");
}
