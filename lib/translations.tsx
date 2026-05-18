import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Locale = 'kk' | 'ru';

interface Translations {
  [key: string]: string | Translations;
}

const translations: Record<Locale, Translations> = {
  kk: {
    common: {
      sandar: "Sandar",
      trainer: "Есептеу тренажері",
      difficulty: "Қиындық",
      mode: "Режим",
      profile: "Профиль",
      login: "Кіру",
      easy: "Оңай",
      medium: "Орташа",
      hard: "Қиын",
      brain: "Экстрим"
    },
    language: {
      select: "Тілді таңдау"
    },
    home: {
      title: "Есептеу тренажері",
      selectDifficulty: "Қиындықты таңдау",
      modes: {
        addition: "Қосу",
        subtraction: "Азайту",
        multiplication: "Көбейту",
        division: "Бөлу",
        mixed: "Барлығы",
        table: "Көбейту кестесі",
        review: "Қателерді талдау"
      }
    },
    difficulty: {
      labels: {
        easy: "1 таңба",
        medium: "2 таңба",
        hard: "3 таңбаға дейін",
        brain: "4 таңбаға дейін"
      }
    },
    auth: {
      profile: "Профиль",
      login: "Кіру"
    }
  },
  ru: {
    common: {
      sandar: "Sandar",
      trainer: "Тренажёр счёта",
      difficulty: "Сложность",
      mode: "Режим",
      profile: "Профиль",
      login: "Войти",
      easy: "Легко",
      medium: "Средне",
      hard: "Сложно",
      brain: "Экстрим"
    },
    language: {
      select: "Выбрать язык"
    },
    home: {
      title: "Тренажёр счёта",
      selectDifficulty: "Выбор сложности",
      modes: {
        addition: "Сложение",
        subtraction: "Вычитание",
        multiplication: "Умножение",
        division: "Деление",
        mixed: "Всё подряд",
        table: "Таблица умножения",
        review: "Разбор ошибок"
      }
    },
    difficulty: {
      labels: {
        easy: "1 знак",
        medium: "2 знака",
        hard: "До 3 знаков",
        brain: "До 4 знаков"
      }
    },
    auth: {
      profile: "Профиль",
      login: "Войти"
    }
  }
};

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('kk');

  useEffect(() => {
    const getInitialLocale = (): Locale => {
      const cookieLocale = document.cookie
        .split('; ')
        .find(row => row.startsWith('locale='))
        ?.split('=')[1];
      
      if (cookieLocale && (cookieLocale === 'kk' || cookieLocale === 'ru')) {
        return cookieLocale;
      }
      
      const browserLang = navigator.language;
      if (browserLang.startsWith('ru')) {
        return 'ru';
      }
      
      return 'kk';
    };

    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);
    
    if (!document.cookie.includes('locale=')) {
      document.cookie = `locale=${initialLocale}; max-age=${365 * 24 * 60 * 60}; path=/; samesite=lax`;
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `locale=${newLocale}; max-age=${365 * 24 * 60 * 60}; path=/; samesite=lax`;
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };

  const contextValue: TranslationContextType = {
    locale,
    setLocale,
    t
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslations() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within TranslationProvider');
  }
  return context.t;
}

export function useLocale() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useLocale must be used within TranslationProvider');
  }
  return { locale: context.locale, setLocale: context.setLocale };
}
