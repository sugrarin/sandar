import { SUMMARY_PROMPT, buildUserPrompt } from "./prompts";
import type { AnalyticsPayload } from "./analyticsPayload";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

export async function generateSummary(
  apiKey: string,
  payload: AnalyticsPayload,
): Promise<{ summary: string | null; error?: string }> {
  try {
    const payloadJson = JSON.stringify(payload, null, 2);
    const userPrompt = buildUserPrompt(payloadJson);

    const res = await fetch(
      `${GEMINI_BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SUMMARY_PROMPT.systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (res.status === 400 || res.status === 403) {
      return { summary: null, error: "invalid_key" };
    }
    if (res.status === 429) {
      return { summary: null, error: "rate_limit" };
    }
    if (!res.ok) {
      return { summary: null, error: "Сервис недоступен" };
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      return { summary: null, error: "Пустой ответ от AI" };
    }

    // If response was truncated by token limit, reject it
    if (finishReason === "MAX_TOKENS") {
      return { summary: null, error: "Ответ обрезан. Попробуйте обновить." };
    }

    // Extra safety: if text doesn't end with sentence-ending punctuation, it's likely incomplete
    const trimmed = text.trim();
    if (!/[.!?]$/.test(trimmed)) {
      return { summary: null, error: "Ответ обрезан. Попробуйте обновить." };
    }

    return { summary: trimmed };
  } catch {
    return { summary: null, error: "Ошибка сети" };
  }
}
