"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeScreen } from "@/components/HomeScreen";
import { SharedAccess } from "@/components/SharedAccess";
import { AuthButton } from "@/components/AuthButton";
import { HeaderBadges } from "@/components/HeaderBadges";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationProvider, useTranslations } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import { useStatsStore } from "@/stores/statsStore";

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    checkAuth();
    useStatsStore.getState().loadAll();
  }, []);

  if (!mounted) {
    return null;
  }

  const handleClose = () => {
    router.push("/");
  };

  return (
    <TranslationProvider>
      <header className="site-header">
        <LanguageSelector />
        <div className="header-right">
          <HeaderBadges />
          <AuthButton
            onLoginClick={() => {}}
            onProfileClick={() => {}}
            active={false}
          />
        </div>
      </header>

      <main className="app">
        {!user ? (
          <div className="panel">
            <h2 className="panel__title">{t("share.authRequired")}</h2>
            <p className="panel__description">
              {t("share.authRequiredDescription")}
            </p>
            <AuthButton
              onLoginClick={() => {}}
              onProfileClick={() => {}}
              active={false}
            />
          </div>
        ) : (
          <SharedAccess onClose={handleClose} initialCode={code || undefined} />
        )}
      </main>
    </TranslationProvider>
  );
}
