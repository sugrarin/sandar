"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthButtonProps {
  onClick: () => void;
}

export function AuthButton({ onClick }: AuthButtonProps) {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  const handleClick = () => {
    if (user) {
      setShowMenu(!showMenu);
    } else {
      onClick();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setShowMenu(false);
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || null;

  return (
    <div ref={menuRef} className="relative">
      <button
        className={`fixed top-4 right-4 w-10 h-10 rounded-full border border-[var(--card-border)] bg-[var(--card)] flex items-center justify-center cursor-pointer transition-all duration-150 z-50 ${
          user ? "bg-[var(--accent-soft)] border-[var(--accent)]" : ""
        }`}
        onClick={handleClick}
        aria-label="Аккаунт"
      >
        {initials ? (
          <span className="text-xs font-semibold">{initials}</span>
        ) : (
          <User className="w-5 h-5" strokeWidth={1.5} />
        )}
      </button>

      {showMenu && user && (
        <div className="absolute top-full right-0 mt-2 bg-[var(--card)] border border-[var(--card-border)] rounded-lg p-2 min-w-[150px] z-[100]">
          <div className="p-2 text-sm text-[var(--text-muted)] border-b border-[var(--card-border)] mb-2 truncate">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full p-2 bg-transparent border-none text-[var(--text)] cursor-pointer text-left rounded hover:bg-black/5 transition-colors"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
