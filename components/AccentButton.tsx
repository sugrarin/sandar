import React from "react";

interface AccentButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

export function AccentButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: AccentButtonProps) {
  return (
    <button
      type={type}
      className={`accent-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
