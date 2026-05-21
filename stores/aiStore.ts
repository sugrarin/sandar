"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveApiKey, removeApiKey, loadApiKey, isApiKeyFormatValid } from "@/lib/ai/apiKeyStorage";
import { validateApiKey, generateSummary } from "@/lib/ai/geminiClient";
import { buildAnalyticsPayload, computeStatsHash } from "@/lib/ai/analyticsPayload";

interface AiStoreState {
  isKeyValid: boolean | null;
  isValidatingKey: boolean;
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
      isValidatingKey: false,
      isGeneratingSummary: false,
      aiSummary: null,
      summaryError: null,
      summaryGeneratedAt: null,
      statsHashAtGeneration: null,

      applyApiKey: async (key: string) => {
        if (!isApiKeyFormatValid(key)) {
          return { success: false, error: "Неверный формат ключа" };
        }

        set({ isValidatingKey: true, summaryError: null });

        const validation = await validateApiKey(key);
        if (!validation.valid) {
          set({ isValidatingKey: false, isKeyValid: false, summaryError: validation.error });
          return { success: false, error: validation.error };
        }

        const saveResult = await saveApiKey(key);
        if (!saveResult.success) {
          set({ isValidatingKey: false, summaryError: saveResult.error });
          return { success: false, error: saveResult.error };
        }

        set({ isValidatingKey: false, isKeyValid: true, summaryError: null });

        // Auto-generate summary after successful key validation
        await get().generateAiSummary();

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
          if (result.error === "Неверный API ключ") {
            set({ isKeyValid: false });
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
        set({ aiSummary: null, summaryGeneratedAt: null, statsHashAtGeneration: null });
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
