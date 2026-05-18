"use client";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useStatsStore } from "@/stores/statsStore";

interface AuthButtonProps {
  onLoginClick: () => void;
  onProfileClick: () => void;
  active?: boolean;
}

export function AuthButton({
  onLoginClick,
  onProfileClick,
  active = false,
}: AuthButtonProps) {
  const t = useTranslations();
  const user = useStatsStore((s) => s.user);

  const handleClick = () => {
    if (user) {
      onProfileClick();
    } else {
      onLoginClick();
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || null;

  return (
    <button
      type="button"
      className={`user-button${user ? " user-button--logged-in" : ""}${
        active ? " user-button--active" : ""
      }`}
      onClick={handleClick}
      aria-label={user ? t("auth.profile") : t("auth.login")}
      aria-pressed={active}
    >
      {initials ? (
        <span className="user-button__avatar">{initials}</span>
      ) : (
        <User aria-hidden="true" />
      )}
    </button>
  );
}
