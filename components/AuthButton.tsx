"use client";

import { useState, useEffect, useRef } from "react";
import { User, LogOut } from "lucide-react";
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
    <div ref={menuRef} className="fixed top-4 right-4 z-50">
      <button
        className={`w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 backdrop-blur-xl ${
          user
            ? "bg-[var(--accent-soft)] border-[var(--accent)]"
            : "bg-[var(--card)] border-[var(--card-border)] hover:border-[var(--accent)]"
        }`}
        onClick={handleClick}
        aria-label="Аккаунт"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        {initials ? (
          <span className="text-xs font-bold text-[var(--accent)] tracking-wide">
            {initials}
          </span>
        ) : (
          <User className="w-5 h-5 text-[var(--text-muted)]" strokeWidth={2} />
        )}
      </button>

      {showMenu && user && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-2 bg-[var(--card)] backdrop-blur-xl border border-[var(--card-border)] rounded-2xl shadow-xl p-2 w-[240px] origin-top-right"
        >
          <div className="px-3 py-2.5 mb-1">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Аккаунт
            </p>
            <p className="text-sm font-medium text-[var(--text)] truncate">
              {user.email}
            </p>
          </div>
          <div className="h-px bg-[var(--card-border)] mx-1 mb-1" />
          <button
            role="menuitem"
            onClick={handleLogout}
            className="w-full h-10 px-3 flex items-center gap-2.5 bg-transparent border-none text-[var(--text)] cursor-pointer text-left text-sm font-medium rounded-xl hover:bg-[var(--error-soft)] hover:text-[var(--error)] transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.25} />
            <span>Выйти</span>
          </button>
        </div>
      )}
    </div>
  );
}
