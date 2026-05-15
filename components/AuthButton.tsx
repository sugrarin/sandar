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
    <div ref={menuRef}>
      <button
        type="button"
        className={`user-button${user ? " user-button--logged-in" : ""}`}
        onClick={handleClick}
        aria-label="Аккаунт"
        aria-expanded={showMenu}
        aria-haspopup="menu"
      >
        {initials ? (
          <span className="user-button__avatar">{initials}</span>
        ) : (
          <User aria-hidden="true" />
        )}
      </button>

      {showMenu && user && (
        <div role="menu" className="user-menu">
          <div className="user-menu__header">
            <p className="user-menu__eyebrow">Аккаунт</p>
            <p className="user-menu__email">{user.email}</p>
          </div>
          <div className="user-menu__divider" />
          <button
            type="button"
            role="menuitem"
            className="user-menu__item"
            onClick={handleLogout}
          >
            <LogOut aria-hidden="true" />
            <span>Выйти</span>
          </button>
        </div>
      )}
    </div>
  );
}
