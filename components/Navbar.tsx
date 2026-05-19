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

  const handleProfileClick = () => {
    push({ name: "profile" });
  };

  return (
    <header className="site-header">
      {isRoot ? (
        <>
          <LanguageSelector />
          <div className="header-right">
            <HeaderBadges />
            <AuthButton
              onLoginClick={onLoginClick}
              onProfileClick={handleProfileClick}
              active={isProfile}
            />
          </div>
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
