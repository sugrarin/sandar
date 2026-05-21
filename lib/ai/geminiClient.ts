import { SUMMARY_PROMPT, buildUserPrompt } from "./prompts";
import type { AnalyticsPayload } from "./analyticsPayload";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.0-flash";

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${GEMINI_BASE_URL}/models?key=${apiKey}`, {
      method: "GET",
    });

    if (res.ok) return { valid: true };
    if (res.status === 400 || res.status === 403) {
      return { valid: false, error: "Неверный API ключ" };
    }
    return { valid: false, error: "Ошибка проверки ключа" };
  } catch {
    return { valid: false, error: "Ошибка сети" };
  }
}

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
            maxOutputTokens: 512,
          },
        }),
      },
    );

    if (res.status === 400 || res.status === 403) {
      return { summary: null, error: "Неверный API ключ" };
    }
    if (res.status === 429) {
      return { summary: null, error: "Слишком много запросов, попробуйте позже" };
    }
    if (!res.ok) {
      return { summary: null, error: "Сервис недоступен" };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return { summary: null, error: "Пустой ответ от AI" };
    }

    return { summary: text.trim() };
  } catch {
    return { summary: null, error: "Ошибка сети" };
  }
}
