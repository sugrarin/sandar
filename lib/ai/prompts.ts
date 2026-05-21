export interface PromptConfig {
  systemPrompt: string;
  userPromptTemplate: string;
}

export const SUMMARY_PROMPT: PromptConfig = {
  systemPrompt:
    "Ты аналитик образовательного приложения по математике. Ты получаешь структурированную статистику пользователя в формате JSON. Твоя задача — дать короткую, понятную сводку без воды. Пиши на русском языке. Не используй markdown-разметку, пиши простым текстом.",

  userPromptTemplate:
    "Ты получил статистику пользователя по изучению математики. На её основе дай пользователю короткую сводку вида:\n\nТы завершил Х тренировок, из них Х без ошибок.\nТочнее всего получается {вид-операции} — здесь X% решений без ошибок.\nНужно подтянуть {вид-операции} — здесь ошибаешься в X% случаев.\nЧтобы снизить % ошибок, нужно решить примерно X примеров.\n\nПиши коротко, понятно и без воды.\n\nСтатистика:\n```json\n{{payload}}\n```",
};

export function buildUserPrompt(payloadJson: string): string {
  return SUMMARY_PROMPT.userPromptTemplate.replace("{{payload}}", payloadJson);
}
