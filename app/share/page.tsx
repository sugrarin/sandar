"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SharedAccess } from "@/components/SharedAccess";
import { AuthButton } from "@/components/AuthButton";
import { AuthModal } from "@/components/AuthModal";
import { HeaderBadges } from "@/components/HeaderBadges";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationProvider, useTranslations } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import { useStatsStore } from "@/stores/statsStore";

function SharePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const t = useTranslations();
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    void checkAuth();
    useStatsStore.getState().loadAll();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <header className="site-header">
        <LanguageSelector />
        <div className="header-right">
          <HeaderBadges />
          <AuthButton
            onLoginClick={() => setAuthModalOpen(true)}
            onProfileClick={() => router.push("/")}
            active={Boolean(user)}
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
              onLoginClick={() => setAuthModalOpen(true)}
              onProfileClick={() => router.push("/")}
              active={false}
            />
          </div>
        ) : (
          <section className="screen screen--active">
            <SharedAccess initialCode={code || undefined} />
          </section>
        )}
      </main>
      {authModalOpen && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
    </>
  );
}

export default function SharePage() {
  return (
    <TranslationProvider>
      <SharePageContent />
    </TranslationProvider>
  );
}
