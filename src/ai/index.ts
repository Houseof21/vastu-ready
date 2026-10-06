import type { AIProvider } from "./types";
import { MockAIProvider } from "./mock";

export * from "./types";
export { MockAIProvider, compareResult, recommendationResult } from "./mock";

/**
 * Resolve the configured AI provider. Falls back to the grounded mock when no
 * key is present, so the full experience works with zero credentials.
 * Production adapters (Anthropic/OpenAI) plug in here behind the same interface.
 */
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER;
  const key = process.env.AI_API_KEY;
  if (!provider || provider === "mock" || !key) return MockAIProvider;
  // case "anthropic": return AnthropicProvider;  // TODO
  // case "openai":    return OpenAIProvider;      // TODO
  return MockAIProvider;
}
