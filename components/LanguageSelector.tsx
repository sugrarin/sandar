"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const languages = [
  { code: "kk", name: "ҚАЗ", flag: "🇰🇿" },
  { code: "ru", name: "РУС", flag: "🇷🇺" },
];

export function LanguageSelector() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current locale from pathname
  const currentLocale = pathname.split("/")[1] || "kk";
  const currentLanguage =
    languages.find((lang) => lang.code === currentLocale) || languages[0];

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

  const handleLanguageChange = (localeCode: string) => {
    const newPath = pathname.replace(/^\/[^\/]*/, `/${localeCode}`);
    router.push(newPath);
    setIsOpen(false);
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
          <span className="language-selector__flag" aria-hidden="true">
            {currentLanguage.flag}
          </span>
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
                  language.code === currentLocale
                    ? "language-selector__option--active"
                    : ""
                }`}
                onClick={() => handleLanguageChange(language.code)}
                role="option"
                aria-selected={language.code === currentLocale}
              >
                <span className="language-selector__flag" aria-hidden="true">
                  {language.flag}
                </span>
                <span className="language-selector__name">{language.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
