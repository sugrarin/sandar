"use client";

import { ArrowLeft, X } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { useNavigation } from "@/contexts/NavigationContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { HeaderBadges } from "@/components/HeaderBadges";
import { AuthButton } from "@/components/AuthButton";

interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick }: NavbarProps) {
  const t = useTranslations();
  const { stack, push, pop, reset } = useNavigation();

  const isRoot = stack.length === 1;
  const canGoBack = stack.length > 2;
  const currentRoute = stack[stack.length - 1];
  const isProfile = currentRoute?.name === "profile";

  const routeTitle: Record<string, string> = {
    profile: t("profile.title"),
    profileEdit: t("profile.editProfile"),
    share: t("share.title"),
    studentStats: t("share.linkedStudents"),
    game: t("game.title"),
    result: t("result.title"),
  };
  const title = !isRoot ? routeTitle[currentRoute?.name ?? ""] : null;

  const handleProfileClick = () => {
    push({ name: "profile" });
  };

  return (
    <header className="site-header">
      {isRoot ? (
        <>
          <LanguageSelector />
          <HeaderBadges />
          <AuthButton
            onLoginClick={onLoginClick}
            onProfileClick={handleProfileClick}
            active={isProfile}
          />
        </>
      ) : (
        <>
          <div className="header-left">
            {canGoBack && (
              <button
                type="button"
                className="icon-button"
                onClick={pop}
                aria-label={t("profile.back")}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
            )}
          </div>

          {title && <h1 className="header-center">{title}</h1>}

          <div className="header-right">
            <button
              type="button"
              className="icon-button"
              onClick={reset}
              aria-label={t("common.close")}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
