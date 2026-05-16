"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      aria-label={user ? "Профиль" : "Войти"}
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
