"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useAiStore } from "@/stores/aiStore";
import { useStatsStore } from "@/stores/statsStore";
import { AccentButton } from "@/components/AccentButton";
import { Skeleton } from "@/components/Skeleton";

export function AiSummaryPanel() {
  const t = useTranslations();
  const [inputKey, setInputKey] = useState("");

  const user = useStatsStore((s) => s.user);
  const userResolved = useStatsStore((s) => s.userResolved);

  const isKeyValid = useAiStore((s) => s.isKeyValid);
  const isGeneratingSummary = useAiStore((s) => s.isGeneratingSummary);
  const aiSummary = useAiStore((s) => s.aiSummary);
  const summaryError = useAiStore((s) => s.summaryError);
  const applyApiKey = useAiStore((s) => s.applyApiKey);
  const removeKey = useAiStore((s) => s.removeKey);
  const refreshSummary = useAiStore((s) => s.refreshSummary);
  const init = useAiStore((s) => s.init);

  // Wait for user to be resolved before initializing AI store
  useEffect(() => {
    if (userResolved && user) {
      init();
    }
  }, [userResolved, user, init]);

  const showOnboarding = isKeyValid === null || isKeyValid === false;
  const showSummary = isKeyValid === true;

  const handleApply = async () => {
    if (!inputKey.trim()) return;
    await applyApiKey(inputKey.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleApply();
  };

  const handleRemoveKey = async () => {
    await removeKey();
    setInputKey("");
  };

  return (
    <div className="panel panel--soft ai-summary">
      <div className="ai-summary__header">
        <h2 className="ai-summary__title">
          <Sparkles size={16} />
          {t("aiSummary.title")}
        </h2>
        {showSummary && (
          <div className="ai-summary__actions">
            <button
              type="button"
              className="icon-button ai-summary__refresh"
              onClick={refreshSummary}
              disabled={isGeneratingSummary}
              aria-label={t("aiSummary.refresh")}
              title={t("aiSummary.refresh")}
            >
              <RefreshCw
                size={14}
                className={isGeneratingSummary ? "spin" : ""}
              />
            </button>
            <button
              type="button"
              className="icon-button ai-summary__remove-key"
              onClick={handleRemoveKey}
              aria-label={t("aiSummary.removeKey")}
              title={t("aiSummary.removeKey")}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {showOnboarding && (
        <div className="ai-summary__onboarding">
          <p className="ai-summary__description">
            {t("aiSummary.description")}
          </p>
          <div className="ai-summary__input-row">
            <input
              type="password"
              className="ai-summary__input"
              placeholder={t("aiSummary.keyPlaceholder")}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isGeneratingSummary}
            />
            <AccentButton
              onClick={handleApply}
              disabled={isGeneratingSummary || !inputKey.trim()}
            >
              {isGeneratingSummary
                ? t("aiSummary.validating")
                : t("aiSummary.apply")}
            </AccentButton>
          </div>
          {summaryError && isKeyValid === false && (
            <p className="ai-summary__error">{summaryError}</p>
          )}
        </div>
      )}

      {showSummary && (
        <div className="ai-summary__content">
          {isGeneratingSummary ? (
            <div className="ai-summary__skeleton">
              <Skeleton height="0.8rem" width="100%" />
              <Skeleton height="0.8rem" width="90%" />
              <Skeleton height="0.8rem" width="75%" />
              <Skeleton height="0.8rem" width="60%" />
            </div>
          ) : summaryError ? (
            <p className="ai-summary__error">{summaryError}</p>
          ) : aiSummary ? (
            <p className="ai-summary__text">{aiSummary}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
