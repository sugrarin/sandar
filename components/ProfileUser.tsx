"use client";

import { useTranslations, useLocale } from "@/lib/translations";

interface ProfileUserProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  date?: string | null;
  action?: React.ReactNode;
  onClick?: () => void;
}

export function ProfileUser({
  avatarUrl,
  displayName,
  email,
  date,
  action,
  onClick,
}: ProfileUserProps) {
  const t = useTranslations();
  const { locale } = useLocale();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      t("profile.memberSince") +
      " " +
      date.toLocaleDateString(locale === "kk" ? "kk-KZ" : "ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
  };

  return (
    <div
      className={`panel panel--soft profile-user ${onClick ? "profile-user--clickable" : ""}`}
      onClick={onClick}
    >
      <div className="profile-user__avatar" aria-hidden="true">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="profile-user__avatar-img" />
        ) : (
          (displayName || email || "?").slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="profile-user__info">
        <p className="profile-user__name">{displayName || email || "—"}</p>
        {displayName && email && (
          <p className="profile-user__email-secondary">{email}</p>
        )}
        {date && <p className="profile-user__since">{formatDate(date)}</p>}
      </div>
      {action && <div className="profile-user__action">{action}</div>}
    </div>
  );
}
