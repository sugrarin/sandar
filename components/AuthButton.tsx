"use client";

import { useState, useEffect, useRef } from "react";
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
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        className={`user-button ${user ? "user-button--logged-in" : ""}`}
        onClick={handleClick}
        aria-label="Аккаунт"
      >
        {initials ? (
          <span className="user-button__avatar">{initials}</span>
        ) : (
          <svg
            className="user-button__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </button>

      {showMenu && user && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.5rem",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            padding: "0.5rem",
            minWidth: "120px",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border)",
              marginBottom: "0.5rem",
            }}
          >
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              textAlign: "left",
              borderRadius: "0.25rem",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surface-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
