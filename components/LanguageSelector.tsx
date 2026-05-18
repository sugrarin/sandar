"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";

const languages = [
  { code: "kk", name: "ҚАЗ" },
  { code: "ru", name: "РУС" },
];

export function LanguageSelector() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (localeCode: "kk" | "ru") => {
    setLocale(localeCode);
    setIsOpen(false);
    // Reload page to apply new language
    window.location.reload();
  };

  return (
    <div className="language-selector" ref={dropdownRef}>
      <button
        type="button"
        className="language-selector__button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("language.select")}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="language-selector__current">
          <span className="language-selector__name">
            {currentLanguage.name}
          </span>
        </span>
        <ChevronDown
          className={`language-selector__chevron ${isOpen ? "language-selector__chevron--open" : ""}`}
          aria-hidden="true"
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <ul className="language-selector__dropdown" role="listbox">
          {languages.map((language) => (
            <li key={language.code}>
              <button
                type="button"
                className={`language-selector__option ${
                  language.code === locale
                    ? "language-selector__option--active"
                    : ""
                }`}
                onClick={() =>
                  handleLanguageChange(language.code as "kk" | "ru")
                }
                role="option"
                aria-selected={language.code === locale}
              >
                <span className="language-selector__name">{language.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
