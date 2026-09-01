"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  saveApiKey,
  removeApiKey,
  loadApiKey,
  isApiKeyFormatValid,
} from "@/lib/ai/apiKeyStorage";
import { generateSummary } from "@/lib/ai/geminiClient";
import {
  buildAnalyticsPayload,
  computeStatsHash,
} from "@/lib/ai/analyticsPayload";

interface AiStoreState {
  isKeyValid: boolean | null;
  isGeneratingSummary: boolean;
  aiSummary: string | null;
  summaryError: string | null;
  summaryGeneratedAt: number | null;
  statsHashAtGeneration: string | null;

  // Actions
  applyApiKey: (key: string) => Promise<{ success: boolean; error?: string }>;
  removeKey: () => Promise<void>;
  generateAiSummary: () => Promise<void>;
  init: () => void;
  refreshSummary: () => Promise<void>;
}

export const useAiStore = create<AiStoreState>()(
  persist(
    (set, get) => ({
      isKeyValid: null,
      isGeneratingSummary: false,
      aiSummary: null,
      summaryError: null,
      summaryGeneratedAt: null,
      statsHashAtGeneration: null,

      applyApiKey: async (key: string) => {
        if (!isApiKeyFormatValid(key)) {
          return { success: false, error: "Неверный формат ключа" };
        }

        set({ isGeneratingSummary: true, summaryError: null });

        // Save key first so generateAiSummary can pick it up
        const saveResult = await saveApiKey(key);
        if (!saveResult.success) {
          set({ isGeneratingSummary: false, summaryError: saveResult.error });
          return { success: false, error: saveResult.error };
        }

        // Single request: validate + generate in one call
        await get().generateAiSummary();

        const { summaryError } = get();
        if (summaryError === "invalid_key") {
          set({ isKeyValid: false, summaryError: "Неверный API ключ" });
          return { success: false, error: "Неверный API ключ" };
        }
        if (summaryError === "rate_limit") {
          // Key is valid but rate limited — still mark as connected
          set({
            isKeyValid: true,
            summaryError:
              "Слишком много запросов. Сводка появится через минуту.",
          });
          return { success: true };
        }
        if (summaryError) {
          return { success: false, error: summaryError };
        }

        set({ isKeyValid: true });
        return { success: true };
      },

      removeKey: async () => {
        await removeApiKey();
        set({
          isKeyValid: null,
          aiSummary: null,
          summaryError: null,
          summaryGeneratedAt: null,
          statsHashAtGeneration: null,
        });
      },

      generateAiSummary: async () => {
        const apiKey = loadApiKey();
        if (!apiKey) {
          set({ summaryError: "API ключ не задан" });
          return;
        }

        const payload = buildAnalyticsPayload();
        if (!payload) {
          set({ summaryError: "Недостаточно данных для сводки" });
          return;
        }

        set({ isGeneratingSummary: true, summaryError: null });

        const result = await generateSummary(apiKey, payload);
        if (result.error) {
          set({ isGeneratingSummary: false, summaryError: result.error });
          if (result.error === "invalid_key") {
            set({ isKeyValid: false, summaryError: "Неверный API ключ" });
          } else if (result.error === "rate_limit") {
            set({
              summaryError:
                "Слишком много запросов. Сводка появится через минуту.",
            });
          }
          return;
        }

        const hash = computeStatsHash(payload);
        set({
          aiSummary: result.summary,
          isGeneratingSummary: false,
          summaryGeneratedAt: Date.now(),
          statsHashAtGeneration: hash,
          summaryError: null,
        });
      },

      init: () => {
        const apiKey = loadApiKey();
        if (apiKey) {
          set({ isKeyValid: true });

          // Check if summary needs regeneration
          const { statsHashAtGeneration, aiSummary } = get();
          const payload = buildAnalyticsPayload();
          if (!payload) return;

          const currentHash = computeStatsHash(payload);
          if (aiSummary && statsHashAtGeneration === currentHash) {
            // Cache is valid, no regeneration needed
            return;
          }

          // Stats changed or no summary yet — regenerate
          get().generateAiSummary();
        }
      },

      refreshSummary: async () => {
        set({
          aiSummary: null,
          summaryGeneratedAt: null,
          statsHashAtGeneration: null,
        });
        await get().generateAiSummary();
      },
    }),
    {
      name: "math-trainer-ai",
      partialize: (state) => ({
        aiSummary: state.aiSummary,
        summaryGeneratedAt: state.summaryGeneratedAt,
        statsHashAtGeneration: state.statsHashAtGeneration,
      }),
    },
  ),
);
