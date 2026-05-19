import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Locale = "kk" | "ru";

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
      brain: "Экстрим",
    },
    language: {
      select: "Тілді таңдау",
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
        review: "Қателерді талдау",
      },
    },
    difficulty: {
      labels: {
        easy: "1 таңба",
        medium: "2 таңба",
        hard: "3 таңбаға дейін",
        brain: "4 таңбаға дейін",
      },
    },
    auth: {
      profile: "Профиль",
      login: "Кіру",
    },
    game: {
      reviewSubtitle: "Қателерді толық шешкенше",
      finishRound: "Раундты аяқтау",
    },
    result: {
      done: "Дайын",
      title: "Нәтиже",
      returnHome: "Басты бетке оралу",
      reviewMistakes: "Қателерді талдау",
      noMistakes: "Қателер жоқ",
      anotherRound: "Тағы бір раунд",
      newRound: "Жаңа раунд",
    },
    profile: {
      title: "Профиль",
      back: "Артқа",
      memberSince: "Бізбен бірге",
      registered: "Тіркелген",
      streakDays: "Күн қатарынан",
      xp: "Тәжірибе (XP)",
      loadingStats: "Статистика жүктелуде…",
      generalStats: "Жалпы статистика",
      sessions: "Жаттығу",
      questions: "Сұрақ",
      accuracy: "Дәлдік",
      correct: "Дұрыс",
      currentStreak: "Ағымдағы серия",
      bestStreak: "Үздік серия",
      activity: "Белсенділік",
      weeklyAccuracy: "Апта бойынша дәлдік",
      byMode: "Режим бойынша",
      difficultyFilter: "Қиындық сүзгісі",
      noModeData: "Режим бойынша деректер әлі жоқ",
      sessionsCount: "жаттығу",
      accuracyLabel: "дәлдік",
      achievements: "Жетістіктер",
      loggingOut: "Шығуда…",
      logout: "Шығу",
      editProfile: "Профильді өңдеу",
      edit: "Өңдеу",
      displayName: "Аты",
      email: "Email",
      avatar: "Аватар",
      uploadAvatar: "Сурет жүктеу",
      save: "Сақтау",
      saving: "Сақтау…",
      cancel: "Болдырмау",
      daysStreak: {
        one: "1 күн қатарынан",
        few: "күн қатарынан",
        many: "күн қатарынан",
      },
    },
    authModal: {
      close: "Жабу",
      signIn: "Аккаунтқа кіру",
      enterEmail: "Email енгізіңіз — 6 таңбалы кіру кодын жібереміз",
      sending: "Жіберу...",
      getCode: "Код алу",
      verifyEmail: "Email-ді растаңыз",
      codeSentTo: "Код жіберілді",
      verifying: "Тексеру...",
      login: "Кіру",
      changeEmail: "Email-ді өзгерту",
      invalidCode: "Қате немесе ескірген код",
    },
    achievements: {
      unlocked: "ашылды",
      newAchievement: "Жаңа жетістік",
      close: "Жабу",
      items: {
        first_session: {
          title: "Алғашқы жаттығу",
          description: "Алғашқы жаттығуды аяқта",
        },
        ten_sessions: {
          title: "Тұрақтылық",
          description: "10 жаттығуды аяқта",
        },
        hundred_sessions: {
          title: "Жүзінші айналым",
          description: "100 жаттығуды аяқта",
        },
        hundred_questions: {
          title: "Жүз сұрақ",
          description: "100 сұрақты шеш",
        },
        thousand_questions: {
          title: "Мың шешілген",
          description: "1000 сұрақты шеш",
        },
        perfect_streak_5: {
          title: "5 қатесіз",
          description: "Қатарынан 5 мінсіз раунд",
        },
        perfect_streak_10: {
          title: "Қатеге құқық жоқ",
          description: "Қатарынан 10 мінсіз раунд",
        },
        all_modes: {
          title: "Әмбебап",
          description: "Барлық 6 режимді қолданып көр",
        },
        multiplication_master: {
          title: "Көбейту шебері",
          description: "Көбейтуде ≥50 сұрақта ≥90% дәлдік",
        },
        division_master: {
          title: "Бөлу шебері",
          description: "Бөлуде ≥50 сұрақта ≥90% дәлдік",
        },
        sharp_shooter: {
          title: "Мерген",
          description: "≥100 сұрақта ≥95% дәлдік",
        },
      },
    },
    heatmap: {
      weekdays: { mon: "Дс", wed: "Ср", fri: "Жм", sun: "Жс" },
      months: {
        jan: "қаң",
        feb: "ақп",
        mar: "нау",
        apr: "сәу",
        may: "мам",
        jun: "мау",
        jul: "шіл",
        aug: "там",
        sep: "қыр",
        oct: "қаз",
        nov: "қар",
        dec: "жел",
      },
      noActivity: "Белсенділік жоқ",
      sessionsShort: "жат.",
      questionsShort: "сұр.",
      label: "Жарты жылдық белсенділік",
      less: "аз",
      more: "көп",
    },
    accuracyChart: {
      months: {
        jan: "қаң",
        feb: "ақп",
        mar: "нау",
        apr: "сәу",
        may: "мам",
        jun: "мау",
        jul: "шіл",
        aug: "там",
        sep: "қыр",
        oct: "қаз",
        nov: "қар",
        dec: "жел",
      },
      halfYear: "жарты жылда",
      label: "Апта бойынша дәлдік",
      accuracy: "дәлдік",
      noActivity: "Белсенділік жоқ",
    },
    share: {
      title: "Ортақ қатынау",
      description:
        "Статистиканы ата-аналармен немесе мұғалімдермен бөлісіңіз. Балаларыңыздың немесе оқушыларыңыздың статистикасын қараңыз.",
      open: "Ашу",
      studentTab: "Мен оқушымын",
      parentTab: "Мен ата-ана / мұғаліммін",
      studentTitle: "Статистиканы бөлісіңіз",
      studentDescription:
        "Статистиканы ата-аналармен немесе мұғалімдермен бөлісіңіз – олар жауаптарыңызды, қателеріңізді және ұпайларыңызды көре алады. Төмендегі кодты айтыңыз немесе сілтеме жіберіңіз.",
      copyLink: "Сілтемені көшіру",
      codeCopied: "Код көшірілді!",
      noViewers: "Әлі ешкім қарамайды",
      viewersTitle: "Қараушылар",
      revokeAccess: "Қатынауды кері қайтару",
      parentTitle: "Статистика жинаңыз",
      parentDescription:
        "Балаларыңыздың немесе оқушыларыңыздың жауаптарын, қателерін және ұпайларын көре аласыз. Олардан ортақ қатынауды ашуын және кодты айтуын немесе сілтеме жіберуін сұраңыз.",
      enterCode: "Кодты енгізіңіз",
      add: "Қосу",
      invalidCode: "Қате код",
      rateLimitWarning: "Сіз болжап қарасыз сияқты. Оқушыдан сілтеме сұраңыз.",
      lockedMinute: "Тым көп әрекет. 1 минут күтіңіз.",
      lockedDay: "Тым көп әрекет. 1 күн күтіңіз.",
      noStudents: "Әлі ешкім байланбаған",
      linkedStudents: "Байланған оқушылар",
      unlink: "Байланысты үзу",
      revokeConfirm:
        "Бұл пайдаланушының статистикасын көру құқығын шынымен кері қайтарғыңыз келе ме?",
      unlinkConfirm:
        "Бұл оқушының статистикасын көруді шынымен тоқтатқыңыз келе ме?",
      authRequired: "Авторизация қажет",
      authRequiredDescription:
        "Статистиканы көру үшін аккаунтқа кіруіңіз керек.",
    },
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
      brain: "Экстрим",
    },
    language: {
      select: "Выбрать язык",
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
        review: "Разбор ошибок",
      },
    },
    difficulty: {
      labels: {
        easy: "1 знак",
        medium: "2 знака",
        hard: "До 3 знаков",
        brain: "До 4 знаков",
      },
    },
    auth: {
      profile: "Профиль",
      login: "Войти",
    },
    game: {
      reviewSubtitle: "Ошибки до полного решения",
      finishRound: "Закончить раунд",
    },
    result: {
      done: "Готово",
      title: "Результат",
      returnHome: "Вернуться на главную",
      reviewMistakes: "Разобрать ошибки",
      noMistakes: "Ошибок нет",
      anotherRound: "Ещё раунд",
      newRound: "Новый раунд",
    },
    profile: {
      title: "Профиль",
      back: "Назад",
      memberSince: "С нами с",
      registered: "Зарегистрирован",
      streakDays: "Серия дней подряд",
      xp: "Опыт (XP)",
      loadingStats: "Загружаем статистику…",
      generalStats: "Общая статистика",
      sessions: "Тренировок",
      questions: "Вопросов",
      accuracy: "Точность",
      correct: "Верных",
      currentStreak: "Текущая серия",
      bestStreak: "Лучшая серия",
      activity: "Активность",
      weeklyAccuracy: "Точность по неделям",
      byMode: "По режимам",
      difficultyFilter: "Фильтр сложности",
      noModeData: "Пока нет данных по режимам",
      sessionsCount: "тренировок",
      accuracyLabel: "точность",
      achievements: "Достижения",
      loggingOut: "Выходим…",
      logout: "Выйти",
      editProfile: "Редактировать профиль",
      edit: "Редактировать",
      displayName: "Имя",
      email: "Email",
      avatar: "Аватар",
      uploadAvatar: "Загрузить фото",
      save: "Сохранить",
      saving: "Сохранение…",
      cancel: "Отмена",
      daysStreak: {
        one: "1 день подряд",
        few: "дня подряд",
        many: "дней подряд",
      },
    },
    authModal: {
      close: "Закрыть",
      signIn: "Вход в аккаунт",
      enterEmail: "Введите email — пришлём 6-значный код для входа",
      sending: "Отправка...",
      getCode: "Получить код",
      verifyEmail: "Подтвердите email",
      codeSentTo: "Код отправлен на",
      verifying: "Проверка...",
      login: "Войти",
      changeEmail: "Изменить email",
      invalidCode: "Неверный или устаревший код",
    },
    achievements: {
      unlocked: "открыто",
      newAchievement: "Новое достижение",
      close: "Закрыть",
      items: {
        first_session: {
          title: "Первая тренировка",
          description: "Заверши первую тренировку",
        },
        ten_sessions: {
          title: "Постоянство",
          description: "Заверши 10 тренировок",
        },
        hundred_sessions: {
          title: "Сотый круг",
          description: "Заверши 100 тренировок",
        },
        hundred_questions: {
          title: "Сотня вопросов",
          description: "Реши 100 вопросов",
        },
        thousand_questions: {
          title: "Тысяча решённых",
          description: "Реши 1000 вопросов",
        },
        perfect_streak_5: {
          title: "5 без ошибок",
          description: "5 идеальных раундов подряд",
        },
        perfect_streak_10: {
          title: "Без права на ошибку",
          description: "10 идеальных раундов подряд",
        },
        all_modes: {
          title: "Универсал",
          description: "Попробуй все 6 режимов",
        },
        multiplication_master: {
          title: "Мастер умножения",
          description: "≥90% точности на ≥50 вопросов в умножении",
        },
        division_master: {
          title: "Мастер деления",
          description: "≥90% точности на ≥50 вопросов в делении",
        },
        sharp_shooter: {
          title: "Снайпер",
          description: "≥95% точности на ≥100 вопросов",
        },
      },
    },
    heatmap: {
      weekdays: { mon: "Пн", wed: "Ср", fri: "Пт", sun: "Вс" },
      months: {
        jan: "янв",
        feb: "фев",
        mar: "мар",
        apr: "апр",
        may: "май",
        jun: "июн",
        jul: "июл",
        aug: "авг",
        sep: "сен",
        oct: "окт",
        nov: "ноя",
        dec: "дек",
      },
      noActivity: "Без активности",
      sessionsShort: "трен.",
      questionsShort: "вопр.",
      label: "Активность за полгода",
      less: "меньше",
      more: "больше",
    },
    accuracyChart: {
      months: {
        jan: "янв",
        feb: "фев",
        mar: "мар",
        apr: "апр",
        may: "май",
        jun: "июн",
        jul: "июл",
        aug: "авг",
        sep: "сен",
        oct: "окт",
        nov: "ноя",
        dec: "дек",
      },
      halfYear: "за полгода",
      label: "Точность по неделям",
      accuracy: "точности",
      noActivity: "Без активности",
    },
    share: {
      title: "Общий доступ",
      description:
        "Делитесь своей статистикой с родителями или учителями. Просматривайте статистику детей и учеников.",
      open: "Открыть",
      studentTab: "Я ученик",
      parentTab: "Я родитель / учитель",
      studentTitle: "Поделитесь статистикой",
      studentDescription:
        "Делитесь своей статистикой с родителями или учителями – они смогут просматривать ваши ответы, ошибки и очки. Продиктуйте код ниже или отправьте ссылку.",
      copyLink: "Скопировать ссылку",
      codeCopied: "Ссылка скопирована!",
      noViewers: "Пока никто не просматривает",
      viewersTitle: "Просматривают",
      revokeAccess: "Отозвать доступ",
      parentTitle: "Собирайте статистику",
      parentDescription:
        "Вы можете просматривать ответы, ошибки и очки ваших детей или учеников. Попросите их открыть общий доступ и продиктовать код или прислать вам ссылку.",
      enterCode: "Код ученика",
      add: "Добавить",
      invalidCode: "Неверный код",
      rateLimitWarning:
        "Кажется, вы пытаетесь угадать. Попросите ученика прислать вам ссылку.",
      lockedMinute: "Слишком много попыток. Подождите 1 минуту.",
      lockedDay: "Слишком много попыток. Подождите 1 день.",
      noStudents: "Пока никто не привязан",
      linkedStudents: "Привязанные ученики",
      unlink: "Отвязать",
      revokeConfirm:
        "Вы действительно хотите отозвать доступ этого пользователя к вашей статистике?",
      unlinkConfirm:
        "Вы действительно хотите перестать просматривать статистику этого ученика?",
      accessSince: "Доступ с",
      authRequired: "Требуется авторизация",
      authRequiredDescription:
        "Для просмотра статистики необходимо войти в аккаунт.",
    },
  },
};

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("kk");

  useEffect(() => {
    const getInitialLocale = (): Locale => {
      const cookieLocale = document.cookie
        .split("; ")
        .find((row) => row.startsWith("locale="))
        ?.split("=")[1];

      if (cookieLocale && (cookieLocale === "kk" || cookieLocale === "ru")) {
        return cookieLocale;
      }

      const browserLang = navigator.language;
      if (browserLang.startsWith("ru")) {
        return "ru";
      }

      return "kk";
    };

    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);

    if (!document.cookie.includes("locale=")) {
      document.cookie = `locale=${initialLocale}; max-age=${365 * 24 * 60 * 60}; path=/; samesite=lax`;
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `locale=${newLocale}; max-age=${365 * 24 * 60 * 60}; path=/; samesite=lax`;
  };

  const t = (key: string): string => {
    const keys = key.split(".");
    let value: any = translations[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  const contextValue: TranslationContextType = {
    locale,
    setLocale,
    t,
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
    throw new Error("useTranslations must be used within TranslationProvider");
  }
  return context.t;
}

export function useLocale() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useLocale must be used within TranslationProvider");
  }
  return { locale: context.locale, setLocale: context.setLocale };
}
