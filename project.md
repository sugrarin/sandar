# Math Trainer — Project Overview

## Стек технологий

### Frontend

- **Next.js 14** (App Router, React Server Components)
- **React 18** (Hooks, Client Components для интерактива)
- **TypeScript** — строгая типизация
- **Zustand** — state management для игрового стейта
- **CSS Modules** — нативные CSS переменные для тем

### Backend / Infrastructure

- **Supabase**:
  - PostgreSQL — хранение сессий, статистики, профилей
  - Auth — OTP email аутентификация
  - RLS (Row Level Security) — защита данных пользователей
- **Next.js API Routes** — `/api/sessions`, `/api/stats`
- **Vercel Edge Functions** — middleware для auth

### Деплой

- **Vercel** — хостинг, CI/CD, Edge Network
- **GitHub** — репозиторий, автодеплой

---

## Что реализовано

### MVP (готово ✅)

- [x] Генерация задач: сложение, вычитание, умножение, деление, смешанный режим
- [x] 4 уровня сложности: easy → brain
- [x] Режим "Таблица умножения"
- [x] Режим "Разбор ошибок" — повторное решение ошибок до полного успеха
- [x] Персистентность через localStorage (Zustand persist)
- [x] OTP email аутентификация (Supabase Auth)
- [x] Сохранение сессий в Supabase для авторизованных пользователей
- [x] Автосинхронизация накопленных сессий после логина
- [x] Responsive дизайн, мобильная оптимизация
- [x] Конфетти при идеальном результате

### Архитектура

- [x] Server Components для статических частей
- [x] Client Components для интерактива (используется `'use client'`)
- [x] API Routes для работы с БД
- [x] Middleware для Edge-compatible auth
- [x] RLS политики в Supabase

---

## План дальнейших улучшений

### Фаза 1: Статистика и аналитика

- [ ] Страница `/profile` с данными пользователя, графиками прогресса
- [ ] Тепловая карта активности (GitHub-style)
- [ ] График точности по дням/неделям
- [ ] Статистика по режимам
- [ ] Время реакции на вопрос (avg, best)

### Фаза 2: Геймификация

- [ ] Система достижений (achievements)
  - "Первая тренировка"
  - "10 идеальных раундов подряд"
  - "Мастер умножения"
  - "7 дней streak"
- [ ] Streak counter (дней подряд)
- [ ] Уровни пользователя (XP за тренировки)
- [ ] Leaderboard (опционально, приватный/публичный)

### Фаза 3: Улучшение UX

- [ ] Keyboard shortcuts (1-4 для ответов, Enter/Space для продолжения)
- [ ] Звуковые эффекты (on/off в настройках)
- [ ] Темная/светлая тема (toggle или system preference)
- [ ] Haptic feedback на мобильных
- [ ] PWA — install prompt, offline mode

### Фаза 4: Расширение функционала

- [ ] Настраиваемые раунды (количество вопросов)
- [ ] Время на вопрос (speed mode)
- [ ] Деление с остатком (новый режим)
- [ ] Дроби (простые: 1/2 + 1/4)
- [ ] История сессий с детализацией

### Фаза 5: Интеграции

- [ ] Экспорт статистики (CSV)
- [ ] Telegram бот — напоминания о тренировках
- [ ] Email дайджест (еженедельная статистика)

---

## Быстрый старт для разработки

```bash
# Установка
npm install

# Локальный запуск
npm run dev

# Билд
npm run build
```

## Переменные окружения

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Структура проекта

```
app/
  api/
    sessions/      # POST/GET сессий
    stats/         # GET статистики
  globals.css      # CSS переменные, стили
  layout.tsx     # Root layout
  page.tsx       # Главная (игра)
components/
  AuthButton.tsx   # Кнопка пользователя + меню
  AuthModal.tsx    # Модалка входа
  GameScreen.tsx   # Экран игры
  HomeScreen.tsx   # Выбор сложности/режима
  ResultScreen.tsx # Результаты + confetti
lib/
  session.ts       # Утилиты сохранения сессий
  supabase/
    client.ts      # Browser client
    server.ts      # Server client (API routes)
middleware.ts      # Edge auth middleware
stores/
  gameStore.ts     # Zustand store (игра)
types/
  index.ts         # TypeScript типы
```

---

## Примечания

- Дизайн mobile-first, адаптивен до 320px
- Локальный стейт работает без авторизации (offline-first)
- При логине происходит миграция накопленных сессий
- Supabase RLS защищает данные пользователей
