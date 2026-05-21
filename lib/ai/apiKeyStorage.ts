import { useStatsStore } from "@/stores/statsStore";

export async function saveApiKey(key: string): Promise<{ success: boolean; error?: string }> {
  const result = await useStatsStore.getState().updateProfile({ geminiApiKey: key });
  return result;
}

export async function removeApiKey(): Promise<{ success: boolean; error?: string }> {
  const result = await useStatsStore.getState().updateProfile({ geminiApiKey: null });
  return result;
}

export function loadApiKey(): string | null {
  return useStatsStore.getState().user?.geminiApiKey ?? null;
}

export function isApiKeyFormatValid(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{35}$/.test(key);
}
