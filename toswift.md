# Sandar — iOS SwiftUI: Техническое задание

## Цель
Реализовать iOS-приложение «Sandar — тренажёр счёта» на SwiftUI. Приложение предназначено для детей и их родителей. Язык UI — русский (по умолчанию) с поддержкой казахского.

---

## Стек и требования окружения

- **Язык:** Swift 6
- **UI Framework:** SwiftUI, минимальный таргет **iOS 18**
- **Async:** Swift Concurrency (`async/await`, `Task`, `@MainActor`)
- **State:** `@Observable` macro (iOS 17+) вместо `ObservableObject`/`@Published` — использовать везде
- **Хранилище:** `@AppStorage` для настроек и предпочтений, `UserDefaults` + `Codable` для кэша сессий
- **Auth/DB:** Supabase — пакет `Supabase/supabase-swift`, сессия хранится в Keychain через SDK автоматически
- **Сеть:** `supabase-swift` SDK — все запросы напрямую к Supabase, никаких HTTP-вызовов к стороннему серверу
- **Графики:** фреймворк `Charts` (iOS 16+)
- **Фото:** `PhotosUI` (`PhotosPicker`)
- **Навигация:** `NavigationStack` с `NavigationPath`
- **Конфетти:** `UIViewRepresentable` обёртка над `CAEmitterLayer`
- **Dependency Injection:** `@Environment` с кастомными ключами для store-ов (iOS 18 подход через `@Observable`)

### iOS-специфичные правила
1. Все UI-обновления только на `@MainActor`. С `@Observable` это проще — помечать классы `@MainActor` целиком.
2. Сетевые вызовы — в `.task { }` модификаторе или явном `Task { }` внутри `@MainActor` контекста.
3. `DispatchQueue.main` не использовать — только Swift Concurrency.
4. `NavigationStack` — один на всё приложение, передавать через `@Environment`.
5. `GameView` и `ResultView` — через `fullScreenCover`, не push, с `.interactiveDismissDisabled(true)`.
6. Dark Mode — через семантические цвета в Asset Catalog (Color Set с Any/Dark вариантами).
7. Safe area — `.safeAreaInset`, `.ignoresSafeArea(.keyboard)` где нужно.
8. Поля ввода — `.scrollDismissesKeyboard(.interactively)` в скроллируемых экранах.
9. Haptic при ответе: `UIImpactFeedbackGenerator(style: .medium/heavy)`.
10. `ModeStats.id` — вычисляемая строка `"\(mode.rawValue)-\(difficulty.rawValue)"`, не `UUID()`.

---

## Цветовая схема

Определить в Asset Catalog как Color Set с вариантами Any/Dark. Именовать:

- `AppBackground` — основной фон
- `AppElevated` — фон карточек и панелей
- `AppTextMain` — основной текст
- `AppTextSoft` — вторичный текст
- `AppAccent` — акцентный цвет (зелёный)
- `AppAccentStrong` — более насыщенный акцент
- `AppAccentSoft` — бледный акцент для фонов кнопок
- `AppDanger` — цвет ошибки
- `AppWarning` — предупреждение

Referencing в коде через `extension Color`:
```swift
extension Color {
    static let appBackground = Color("AppBackground")
    static let appElevated   = Color("AppElevated")
    static let appAccent     = Color("AppAccent")
    // и т.д.
}
```

---

## Модели данных

Все модели — `Codable`, `Identifiable`, `Equatable` где нужно.

```swift
enum GameMode: String, Codable, CaseIterable {
    case addition, subtraction, multiplication, division, table, mixed, review
    // При добавлении нового режима — добавить case сюда и зарегистрировать
    // TaskGeneratorStrategy в TaskGenerator.registry (см. раздел Extensibility)
}

enum Difficulty: String, Codable, CaseIterable {
    case easy, medium, hard, brain

    var xpMultiplier: Int {
        switch self { case .easy: 1; case .medium: 2; case .hard: 3; case .brain: 5 }
    }
    var emoji: String {
        switch self { case .easy: "👶"; case .medium: "👦"; case .hard: "👴"; case .brain: "🧠" }
    }
    var label: String {
        switch self { case .easy: "Лёгкий"; case .medium: "Средний"; case .hard: "Сложный"; case .brain: "Мозг" }
    }
    var previous: Difficulty? {
        switch self { case .easy: nil; case .medium: .easy; case .hard: .medium; case .brain: .hard }
    }
}

// AnswerKind — тип ответа. Текущие режимы используют .integer.
// Дроби будут использовать .fraction, сравнения — .symbol.
// GameView переключает InputView в зависимости от этого поля.
enum AnswerKind: String, Codable {
    case integer    // 42
    case fraction   // "3/4" (будущий режим)
    case symbol     // ">", "<", "=" (будущий режим сравнений)
}

struct GameTask: Identifiable, Codable, Equatable {
    let id: UUID
    var question: String       // отображаемое выражение, например "12 + 8"
    var answer: Int            // правильный ответ для integer-режимов
    var options: [Int]         // 4 варианта для кнопочного режима
    var operation: GameMode
    var left: Int
    var right: Int
    var subtitle: String?
    var answerKind: AnswerKind = .integer
}

struct SessionAnswer: Codable {
    var question: String
    var correctAnswer: Int
    var userAnswer: Int
    var isCorrect: Bool
    var timeSpentSeconds: Int?
}

struct GameSession: Codable {
    var id: UUID
    var sourceMode: GameMode
    var mode: GameMode
    var difficulty: Difficulty
    var index: Int
    var total: Int             // 12 по умолчанию
    var score: Int
    var tasks: [GameTask]
    var mistakes: [GameTask]
    var answers: [SessionAnswer]
    var status: SessionStatus
    var allowAdvance: Bool
    var lastAnswer: Int?
    var reviewQueue: [GameTask]
    var startTime: Date?

    enum SessionStatus: String, Codable { case playing, completed }
}

struct UserStats: Codable {
    var totalSessions: Int
    var totalQuestions: Int
    var totalCorrect: Int
    var totalWrong: Int
    var totalTimeSeconds: Int
    var currentStreak: Int
    var bestStreak: Int
    var streakDays: Int
    var totalXP: Int
    var lastSessionAt: String?

    var level: Int { totalXP / 1000 + 1 }
    var accuracy: Double { totalQuestions > 0 ? Double(totalCorrect) / Double(totalQuestions) : 0 }
}

struct ModeStats: Codable, Identifiable {
    var id: String { "\(mode.rawValue)-\(difficulty.rawValue)" }
    var mode: GameMode
    var difficulty: Difficulty
    var sessionsCount: Int
    var questionsCount: Int
    var correctCount: Int
    var wrongCount: Int
    var accuracy: Double { questionsCount > 0 ? Double(correctCount) / Double(questionsCount) : 0 }
}

struct ActivityDay: Codable, Identifiable {
    var id: String { date }
    var date: String           // "YYYY-MM-DD"
    var sessions: Int
    var questions: Int
    var correct: Int

    var level: Int {           // 0–4 для интенсивности цвета в heatmap
        switch sessions {
        case 0: return 0; case 1: return 1; case 2...3: return 2
        case 4...6: return 3; default: return 4
        }
    }
}

struct Achievement: Identifiable, Codable {
    var id: String
    var unlockedAt: String?
    var progress: Int?
    var isUnlocked: Bool { unlockedAt != nil }
    // Статические данные (заголовок, описание, иконка SF Symbol) — в AchievementCatalog.swift
}

struct AccountUser: Codable {
    var id: String
    var email: String?
    var displayName: String?
    var avatarUrl: String?
    var geminiApiKey: String?
    var createdAt: String?

    var initials: String {
        String((displayName ?? email ?? "?").prefix(2)).uppercased()
    }
}

// share_codes: id, user_id, code, created_at (нет is_active — удалена при миграции)
struct ShareCode: Codable {
    var id: String
    var code: String           // 8 символов uppercase
    var createdAt: String
}

// Возвращается RPC get_owner_share_access — viewer-данные приходят из JOIN с profiles
struct ShareAccessViewer: Identifiable, Codable {
    var id: String             // share_access.id
    var shareCodeId: String
    var viewerId: String
    var viewerEmail: String
    var viewerDisplayName: String?
    var viewerAvatarUrl: String?
    var activatedAt: String    // алиас share_access.created_at в RPC
    var isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, viewerId = "viewer_id", shareCodeId = "share_code_id"
        case viewerEmail = "viewer_email", viewerDisplayName = "viewer_display_name"
        case viewerAvatarUrl = "viewer_avatar_url", activatedAt = "activated_at", isActive = "is_active"
    }
}

// Возвращается RPC get_viewed_students
struct LinkedStudent: Identifiable, Codable {
    var id: String             // share_access.id (access_id для отвязки)
    var studentId: String      // share_codes.user_id
    var studentEmail: String
    var studentDisplayName: String?
    var studentAvatarUrl: String?
    var activatedAt: String    // алиас share_access.created_at в RPC
    var isActive: Bool

    enum CodingKeys: String, CodingKey {
        case id, studentId = "student_id", studentEmail = "student_email"
        case studentDisplayName = "student_display_name", studentAvatarUrl = "student_avatar_url"
        case activatedAt = "activated_at", isActive = "is_active"
    }
}

struct PendingSession: Codable {
    var id: UUID
    var mode: GameMode
    var difficulty: Difficulty
    var totalQuestions: Int
    var correctAnswers: Int
    var wrongAnswers: Int
    var durationSeconds: Int
    var answers: [SessionAnswer]
    var createdAt: Date
}

struct StudentStatBundle: Codable {
    var profile: AccountUser
    var userStats: UserStats
    var modeStats: [ModeStats]
    var activityDays: [ActivityDay]
}
```

---

## Генерация задач (Game Logic)

Реализовать в `TaskGenerator.swift` — чистые статические функции, без UI, без side effects.

### Диапазоны чисел по сложности

| Difficulty | +/− | × | ÷ |
|---|---|---|---|
| easy | 1–10 | 1–10 × 1–10 | делимое = произведение двух 1–10 |
| medium | 10–99 | 2–19 × 2–9 | делитель 2–9, результат 2–19 |
| hard | 100–999 | 10–50 × 2–15 | делитель 2–15, результат 10–50 |
| brain | 1000–9999 | 10–99 × 10–50 | делитель 10–50, результат 10–99 |

**Blending (hard/brain):** 80% задач из текущей сложности, 20% из предыдущей.

### Генерация вариантов ответа (4 варианта для кнопочного режима)
```
1. Правильный ответ
2. answer ± 1
3. answer ± 10
4. Если answer имеет ≥2 цифры — транспозиция цифр (12→21); иначе jitter ±20%
5. Убрать дубликаты и отрицательные
6. Если < 4 — дополнить answer+1, answer+2, ...
7. .shuffled()
```

### Режимы
- **`table`**: 12 задач умножения на фиксированный множитель (случайный из 2–9). `subtitle = "× N"`
- **`review`**: входные данные — `session.mistakes`. Перемешать, взять ≤12. Результат не сохранять на сервер.
- **`mixed`**: для каждой задачи случайный выбор из addition/subtraction/multiplication/division

---

## Расширяемость (Extensibility)

Архитектура рассчитана на добавление новых режимов (сравнения `>/<`, дроби, уравнения) без изменения существующего кода.

### Паттерн: Strategy Registry в TaskGenerator

```swift
// Протокол генератора для одного режима
protocol TaskGeneratorStrategy {
    func generate(difficulty: Difficulty) -> GameTask
}

// Реестр — добавление нового режима = один новый файл + одна строка регистрации
enum TaskGenerator {
    private static var registry: [GameMode: any TaskGeneratorStrategy] = [
        .addition:       AdditionStrategy(),
        .subtraction:    SubtractionStrategy(),
        .multiplication: MultiplicationStrategy(),
        .division:       DivisionStrategy(),
        .table:          TableStrategy(),
    ]

    static func register(_ strategy: some TaskGeneratorStrategy, for mode: GameMode) {
        registry[mode] = strategy
    }

    static func generate(mode: GameMode, difficulty: Difficulty) -> GameTask {
        guard let strategy = registry[mode] else { fatalError("No strategy for \(mode)") }
        return strategy.generate(difficulty: difficulty)
    }
}
```

### Расширяемость входного интерфейса (AnswerInputMode)

В `GameView` компонент ввода ответа подбирается по `task.answerKind`:
- `.integer` → либо `AnswerButtonsView` (4 кнопки), либо `AnswerKeyboardView` (TextField + numpad) — переключается пользователем через `AnswerInputModePicker`
- `.symbol` — 4 кнопки с символами `>`, `<`, `=`, `≈` (для будущего режима сравнений, не требует keyboard-режима)
- `.fraction` — `AnswerKeyboardView` с форматированием дроби (для будущего)

Добавление нового режима требует только:
1. Новый `case` в `GameMode`
2. Новый класс, реализующий `TaskGeneratorStrategy`
3. При необходимости — новый `AnswerKind` и соответствующий Input-компонент

---

## Архитектура приложения

### Структура проекта
```
Sandar/
├── App/
│   ├── SandarApp.swift
│   └── AppEnvironment.swift      // создание всех Observable объектов
├── Stores/
│   ├── GameStore.swift
│   ├── StatsStore.swift
│   ├── AccountStore.swift
│   └── AIStore.swift
├── Models/
│   └── Models.swift
├── Services/
│   ├── SupabaseService.swift
│   └── SupabaseService.swift
│   └── TaskGenerator/
│       ├── TaskGenerator.swift          // реестр + протокол
│       ├── AdditionStrategy.swift
│       ├── SubtractionStrategy.swift
│       ├── MultiplicationStrategy.swift
│       ├── DivisionStrategy.swift
│       └── TableStrategy.swift
├── Views/
│   ├── Home/
│   │   ├── HomeView.swift
│   │   ├── DifficultyPickerView.swift
│   │   └── ModeCardView.swift
│   ├── Game/
│   │   ├── GameView.swift
│   │   ├── ProgressBarView.swift
│   │   ├── ProblemCardView.swift
│   │   ├── AnswerInputModePicker.swift  // segmented control кнопки/клавиатура
│   │   ├── AnswerButtonsView.swift      // 4 кнопки-варианта
│   │   └── AnswerKeyboardView.swift     // TextField + numpad
│   ├── Result/
│   │   ├── ResultView.swift
│   │   └── ConfettiView.swift
│   ├── Profile/
│   │   ├── ProfileView.swift
│   │   ├── ProfileEditView.swift
│   │   ├── StatGridView.swift
│   │   ├── ActivityHeatmapView.swift
│   │   ├── WeeklyAccuracyChartView.swift
│   │   ├── ModeStatsListView.swift
│   │   └── AchievementsView.swift
│   ├── Sharing/
│   │   ├── SharedAccessView.swift
│   │   └── StudentStatsView.swift
│   ├── Auth/
│   │   └── AuthView.swift
│   └── Components/
│       ├── AvatarView.swift
│       ├── BadgeRowView.swift
│       ├── AchievementToastView.swift
│       └── SkeletonView.swift
├── Catalog/
│   └── AchievementCatalog.swift         // статические данные достижений
└── Extensions/
    ├── Color+App.swift
    ├── Date+Formatting.swift
    └── String+Pluralization.swift
```

### GameStore (`@Observable`)

```swift
@Observable
@MainActor
final class GameStore {
    var session: GameSession?
    var isLoading = false
    @ObservationIgnored @AppStorage("difficulty") var difficulty: Difficulty = .easy

    func startGame(mode: GameMode)
    func submitAnswer(_ answer: Int)
    func advance()
    func completeSession() async

    func savePendingSession(_ s: PendingSession)
    func syncPendingSessions() async
    private func loadPendingSessions() -> [PendingSession]
    private func clearPendingSessions()
}
```

Логика `submitAnswer`:
1. Записать `SessionAnswer`
2. Correct → `score += 1`, haptic `.medium`, `allowAdvance = true`, через 200ms `advance()`
3. Wrong → добавить в `mistakes`, haptic `.heavy`, `allowAdvance = true`

### StatsStore (`@Observable`)

```swift
@Observable
@MainActor
final class StatsStore {
    var profile: AccountUser?
    var userStats: UserStats?
    var modeStats: [ModeStats] = []
    var activityDays: [ActivityDay] = []
    var achievements: [Achievement] = []
    var newAchievements: [Achievement] = []
    var isLoading = false
    var error: String?

    private var lastFetchedAt: Date?
    private let cacheTTL: TimeInterval = 60

    func loadIfNeeded() async
    func reload() async
    func clear()
    func updateProfile(displayName: String?, avatarUrl: String?, geminiApiKey: String?) async throws
    func dismissAchievement(_ id: String)
}
```

### AccountStore (`@Observable`)

```swift
@Observable
@MainActor
final class AccountStore {
    var shareCode: ShareCode?
    var viewers: [ShareAccessViewer] = []
    var students: [LinkedStudent] = []
    var studentStatCache: [String: StudentStatBundle] = [:]
    var isLoading = false

    func loadShareData() async
    func activateCode(_ code: String) async throws
    func revokeViewer(accessId: String) async throws
    func unlinkStudent(accessId: String) async throws
    func prefetchStudentStats(studentId: String) async
    func clear()
}
```

---

## Навигация

```swift
enum AppRoute: Hashable {
    case profile
    case profileEdit
    case shareAccess
    case studentStats(studentId: String, activatedAt: String)
}

@Observable
@MainActor
final class Router {
    var path = NavigationPath()
    var showGame = false
    var showResult = false

    func push(_ route: AppRoute) { path.append(route) }
    func pop() { guard !path.isEmpty else { return }; path.removeLast() }
    func popToRoot() { path.removeLast(path.count) }
}
```

В `SandarApp.swift` инжектировать через `@Environment`:
```swift
@main
struct SandarApp: App {
    @State private var router = Router()
    @State private var gameStore = GameStore()
    @State private var statsStore = StatsStore()
    @State private var accountStore = AccountStore()

    var body: some Scene {
        WindowGroup {
            NavigationStack(path: $router.path) {
                HomeView()
                    .navigationDestination(for: AppRoute.self) { route in
                        switch route {
                        case .profile:                         ProfileView()
                        case .profileEdit:                     ProfileEditView()
                        case .shareAccess:                     SharedAccessView()
                        case .studentStats(let id, let date):  StudentStatsView(studentId: id, activatedAt: date)
                        }
                    }
            }
            .fullScreenCover(isPresented: $router.showGame) { GameView() }
            .fullScreenCover(isPresented: $router.showResult) { ResultView() }
            .environment(router)
            .environment(gameStore)
            .environment(statsStore)
            .environment(accountStore)
        }
    }
}
```

---

## Экраны

### 1. HomeView
- Заголовок приложения, подзаголовок
- `DifficultyPickerView` — `Picker` стиль `.segmented` или кастомные кнопки, 4 варианта с emoji. Выбор сохраняется в `gameStore.difficulty` через `@AppStorage`.
- Сетка 3×2 из `ModeCardView` — стандартные `Button` с иконкой SF Symbol и названием режима. Нажатие → `gameStore.startGame(mode:)` + `router.showGame = true`.
- `.toolbar { ToolbarItem(placement: .topBarTrailing) { ProfileButton() } }` — кнопка профиля. `.toolbar { ToolbarItem(placement: .topBarLeading) { LanguagePicker() } }`

### 2. GameView (`fullScreenCover`)
- `.interactiveDismissDisabled(true)`
- Кастомный toolbar или `VStack` с: название режима слева, счётчик "N / 12" справа, кнопка закрыть (xmark) с `confirmationDialog`
- `ProgressBarView` — стандартный `ProgressView(value:)` или `GeometryReader` + `Rectangle`
- `ProblemCardView` — вопрос крупным шрифтом, subtitle мелким
- Область ответа (нижняя часть экрана):
  - Справа над кнопками/полем: `AnswerInputModePicker` (segmented control)
  - Под пикером: `AnswerButtonsView` или `AnswerKeyboardView` — в зависимости от выбранного режима
- `session.index >= session.total` → `router.showGame = false; router.showResult = true`

#### AnswerInputModePicker
```swift
// Персистентный выбор между кнопками и клавиатурой
@AppStorage("answerInputMode") private var inputMode: AnswerInputMode = .buttons

enum AnswerInputMode: String {
    case buttons   // 4 кнопки с вариантами
    case keyboard  // TextField + numberPad
}

// UI: Picker с двумя иконками, стиль .segmented, размещается справа над областью ответа
Picker("", selection: $inputMode) {
    Image(systemName: "rectangle.grid.2x2.fill").tag(AnswerInputMode.buttons)
    Image(systemName: "keyboard").tag(AnswerInputMode.keyboard)
}
.pickerStyle(.segmented)
.fixedSize()
```

**Поведение:**
- `@AppStorage` — выбор сохраняется между раундами и сессиями приложения
- В keyboard-режиме клавиатура не скрывается между вопросами до конца раунда — поле получает фокус через `@FocusState` и `focused($isFocused)`, `isFocused = true` вызывается при каждом переходе к новому вопросу в `advance()`
- При старте нового раунда активируется тот же режим, что был сохранён

#### AnswerButtonsView
- `LazyVGrid` 2 колонки, 4 кнопки с вариантами ответа
- Состояния кнопки: обычное / correct (акцент) / wrong (danger) / locked (disabled)
- После выбора: все кнопки блокируются, через 200ms `gameStore.advance()`

#### AnswerKeyboardView
```swift
// TextField с .keyboardType(.numberPad), поле всегда в фокусе внутри раунда
@FocusState private var isFocused: Bool
@State private var input: String = ""

// Структура:
// TextField("Ответ", text: $input)
//     .keyboardType(.numberPad)
//     .focused($isFocused)
//     .onSubmit { submitKeyboardAnswer() }  // кнопка Done на клавиатуре
// + кнопка "Проверить" рядом с полем (на случай если onSubmit не сработает)

func submitKeyboardAnswer() {
    guard let answer = Int(input) else { return }
    input = ""
    gameStore.submitAnswer(answer)
    // задержка 200ms при correct, потом isFocused = true снова
}
```

**Важно:** `.keyboardType(.numberPad)` не показывает кнопку Done по умолчанию. Добавить кнопку Done через `toolbar`:
```swift
.toolbar {
    ToolbarItemGroup(placement: .keyboard) {
        Spacer()
        Button("Готово") { submitKeyboardAnswer() }
    }
}
```

### 3. ResultView (`fullScreenCover`)
- `ConfettiView` как overlay — только при `score == total`
- Заголовок, счёт "score / total"
- Кнопка "Разбор ошибок" — `.disabled(session.mistakes.isEmpty)` → review-раунд
- Кнопка "Ещё раунд" → тот же режим заново
- Сетка из 6 `ModeCardView` для быстрого старта другого режима

### 4. ProfileView
- **Авторизован:**
  - `AvatarView` — `AsyncImage` с fallback на инициалы. Кнопка редактировать в toolbar.
  - Имя / email / дата регистрации
  - `BadgeRowView` — 🔥 дней подряд, ⚡ XP
  - `StatGridView` — 6 ячеек: сессии, вопросы, точность, правильных, серия, рекорд серии
  - `AISummaryPanel` (если `geminiApiKey != nil`)
  - `ActivityHeatmapView`
  - `WeeklyAccuracyChartView`
  - `ModeStatsListView` с `Picker` `.segmented` для фильтра по сложности
  - `AchievementsView`
  - Кнопка "Поделиться" → `router.push(.shareAccess)`
  - Кнопка "Выход" → `supabase.auth.signOut()`, `statsStore.clear()`, `accountStore.clear()`
- **Не авторизован:** кнопка "Войти" → `.sheet { AuthView() }`
- `redacted(reason: .placeholder)` во время загрузки

### 5. ProfileEditView
- `PhotosPicker(selection: $photoItem, matching: .images)` — конвертировать в JPEG `Data`, проверить ≤ 2MB
- `TextField` для имени, ограничение 50 символов через `.onChange`
- Email — нередактируемый `Text`
- Кнопка "Сохранить" — `.disabled(isSaving)`
- Загрузка через `supabase.storage.from("avatars").upload(...)` → получить publicURL → обновить профиль

### 6. AuthView (sheet)
- Шаг 1: `TextField` для email (`.keyboardType(.emailAddress)`, `.textInputAutocapitalization(.never)`) + кнопка "Отправить код" → `supabase.auth.signInWithOTP(email:)`
- Шаг 2: `TextField` для 6-значного кода (`.keyboardType(.numberPad)`) + кнопка "Войти" → `supabase.auth.verifyOTP(email:token:type:.email)` + кнопка "Назад"
- После логина: dismiss, `statsStore.reload()`, `gameStore.syncPendingSessions()`
- Ошибки — `Text` под кнопкой

### 7. SharedAccessView
- `Picker` `.segmented`: "Родитель" / "Студент"
- **Родитель:** `TextField` для кода (`.autocapitalization(.characters)`) + кнопка "Добавить". `List` студентов → `router.push(.studentStats(...))`
- **Студент:** моноширинный `Text` с кодом. Кнопка "Копировать" → `UIPasteboard.general.string = deepLink`, label меняется на "Скопировано!" на 2с. `List` вьюеров с кнопкой отзыва через `confirmationDialog`.

### 8. StudentStatsView
- Read-only профиль студента
- `BadgeRowView`, `StatGridView`, `ActivityHeatmapView`, `WeeklyAccuracyChartView`, `ModeStatsListView`
- Данные из `accountStore.studentStatCache[studentId]`
- Toolbar кнопка "Отвязать" → `confirmationDialog` → `accountStore.unlinkStudent(accessId:)` → `router.pop()`

### 9. ActivityHeatmapView
- 26 недель × 7 дней, 182 ячейки
- `LazyHGrid` с 7 строками (дни недели) — колонки слева направо = недели
- Интенсивность цвета по `day.level` (0–4): от `AppElevated` до `AppAccent`
- Тап → `.popover` или `.overlay` с датой и кол-вом сессий

### 10. WeeklyAccuracyChartView
- `Charts` framework, `BarMark` по неделям, Y-axis 0–100%
- Данные: агрегировать `activityDays` по ISO-неделям, считать `sum(correct) / sum(questions)`

---

## API Layer — прямые запросы к Supabase

**Важно:** iOS-приложение НЕ вызывает `/api/*` эндпоинты веб-сервера. Это Next.js обёртки для браузерной cookie-авторизации. iOS работает **напрямую с Supabase** через SDK. Никакого `API_BASE_URL` не нужно — только `SUPABASE_URL` и `SUPABASE_ANON_KEY`.

Ниже — точные вызовы по реальным схемам из `schema.sql` и `migration_share.sql`.

### Статистика пользователя

```swift
let db = SupabaseService.shared.client

// Таблица user_stats: user_id, total_sessions, total_questions, total_correct,
// total_wrong, total_time_seconds, total_xp, current_streak, best_streak,
// streak_days, last_session_at, last_session_date, updated_at
let userStats: UserStats = try await db
    .from("user_stats")
    .select()
    .eq("user_id", value: userId)
    .single()
    .execute()
    .value

// Таблица mode_stats: id, user_id, mode, difficulty, sessions_count,
// questions_count, correct_count, wrong_count, avg_time_per_question, last_played_at
let modeStats: [ModeStats] = try await db
    .from("mode_stats")
    .select()
    .eq("user_id", value: userId)
    .execute()
    .value
```

### Активность (heatmap)

```swift
// sessions: created_at, total_questions, correct_answers
let since = Calendar.current.date(byAdding: .weekOfYear, value: -26, to: Date())!
let isoSince = ISO8601DateFormatter().string(from: since)

struct SessionActivityRow: Decodable {
    let createdAt: String
    let totalQuestions: Int
    let correctAnswers: Int
    enum CodingKeys: String, CodingKey {
        case createdAt = "created_at"
        case totalQuestions = "total_questions"
        case correctAnswers = "correct_answers"
    }
}

let rows: [SessionActivityRow] = try await db
    .from("sessions")
    .select("created_at, total_questions, correct_answers")
    .eq("user_id", value: userId)
    .gte("created_at", value: isoSince)
    .execute()
    .value
// Группировать по "YYYY-MM-DD" на клиенте → [ActivityDay]
```

### Сохранение сессии

```swift
// КРИТИЧНО: триггер update_user_stats_after_session() срабатывает только при
// WHEN (NEW.completed_at IS NOT NULL) — обязательно передавать completed_at!

struct SessionInsert: Encodable {
    let user_id: String
    let mode: String
    let difficulty: String
    let total_questions: Int
    let correct_answers: Int
    let wrong_answers: Int
    let duration_seconds: Int
    let completed_at: String   // ISO8601, обязательно — иначе триггер не сработает
}

struct SessionIdRow: Decodable { let id: String }

let row: SessionIdRow = try await db
    .from("sessions")
    .insert(SessionInsert(
        user_id: userId,
        mode: session.mode.rawValue,
        difficulty: session.difficulty.rawValue,
        total_questions: session.total,
        correct_answers: session.score,
        wrong_answers: session.total - session.score,
        duration_seconds: durationSeconds,
        completed_at: ISO8601DateFormatter().string(from: Date())
    ))
    .select("id")
    .single()
    .execute()
    .value

// Детальные ответы (опционально)
struct AnswerInsert: Encodable {
    let session_id: String
    let question: String
    let correct_answer: Int
    let user_answer: Int
    let is_correct: Bool
}
let answerRows = session.answers.map {
    AnswerInsert(session_id: row.id, question: $0.question,
                 correct_answer: $0.correctAnswer, user_answer: $0.userAnswer,
                 is_correct: $0.isCorrect)
}
try await db.from("session_answers").insert(answerRows).execute()
```

### Share code — получить или создать

```swift
// RPC: get_or_create_share_code(p_user_id UUID)
// Возвращает: TABLE(id UUID, code TEXT, created_at TIMESTAMPTZ)
// share_codes НЕ имеет колонки is_active
struct ShareCodeParams: Encodable { let p_user_id: String }
struct ShareCodeRow: Decodable {
    let id: String
    let code: String
    let createdAt: String
    enum CodingKeys: String, CodingKey {
        case id, code, createdAt = "created_at"
    }
}

let row: ShareCodeRow = try await db
    .rpc("get_or_create_share_code", params: ShareCodeParams(p_user_id: userId))
    .single()
    .execute()
    .value
```

### Активация кода (родитель добавляет студента) — два шага

```swift
// Шаг 1: RPC validate_share_code(p_code TEXT)
// Возвращает: TABLE(id UUID, user_id UUID)
//   id      = share_codes.id (нужен для вставки в share_access)
//   user_id = владелец кода (студент)
struct ValidateParams: Encodable { let p_code: String }
struct ValidateResult: Decodable {
    let id: String
    let userId: String
    enum CodingKeys: String, CodingKey { case id, userId = "user_id" }
}

let validated: ValidateResult = try await db
    .rpc("validate_share_code", params: ValidateParams(p_code: code.uppercased()))
    .single()
    .execute()
    .value

// Шаг 2: INSERT INTO share_access
// share_access: id, share_code_id, viewer_id, created_at, is_active
// RLS INSERT CHECK: auth.uid() = viewer_id
struct ShareAccessInsert: Encodable {
    let share_code_id: String
    let viewer_id: String      // = текущий пользователь
}
try await db
    .from("share_access")
    .insert(ShareAccessInsert(share_code_id: validated.id, viewer_id: currentUserId))
    .execute()
```

### Список вьюеров (кто смотрит мою статистику)

```swift
// RPC: get_owner_share_access(p_owner_id UUID)
// Возвращает: TABLE(id, share_code_id, viewer_id, viewer_email, viewer_display_name,
//                   viewer_avatar_url, activated_at [=share_access.created_at], is_active)
struct OwnerParams: Encodable { let p_owner_id: String }

let viewers: [ShareAccessViewer] = try await db
    .rpc("get_owner_share_access", params: OwnerParams(p_owner_id: userId))
    .execute()
    .value
```

### Список студентов (которых я вижу как родитель)

```swift
// RPC: get_viewed_students(p_viewer_id UUID)
// Возвращает: TABLE(id [=share_access.id], student_id [=share_codes.user_id],
//                   student_email, student_display_name, student_avatar_url,
//                   activated_at [=share_access.created_at], is_active)
struct ViewedParams: Encodable { let p_viewer_id: String }

let students: [LinkedStudent] = try await db
    .rpc("get_viewed_students", params: ViewedParams(p_viewer_id: userId))
    .execute()
    .value
```

### Данные студента (для родителя)

```swift
// Все данные студента — через SECURITY DEFINER RPC (обходят RLS)
struct StudentIdParams: Encodable { let p_student_id: String }

// get_student_profile(p_student_id UUID) → TABLE(id, email, display_name, avatar_url, created_at)
let profile: AccountUser = try await db
    .rpc("get_student_profile", params: StudentIdParams(p_student_id: studentId))
    .single().execute().value

// get_student_stats(p_student_id UUID) → TABLE(total_sessions, total_questions, total_correct,
//   total_wrong, total_time_seconds, total_xp, current_streak, best_streak, streak_days,
//   last_session_at, last_session_date, updated_at)
let stats: UserStats = try await db
    .rpc("get_student_stats", params: StudentIdParams(p_student_id: studentId))
    .single().execute().value

// get_student_mode_stats(p_student_id UUID) → TABLE(id, mode, difficulty, sessions_count,
//   questions_count, correct_count, wrong_count, avg_time_per_question, last_played_at)
let modeStats: [ModeStats] = try await db
    .rpc("get_student_mode_stats", params: StudentIdParams(p_student_id: studentId))
    .execute().value

// get_student_activity(p_student_id UUID) → TABLE(created_at, total_questions, correct_answers)
// Возвращает последние 180 сессий, агрегировать по дате на клиенте → [ActivityDay]
let activityRows: [SessionActivityRow] = try await db
    .rpc("get_student_activity", params: StudentIdParams(p_student_id: studentId))
    .execute().value
```

### Отзыв доступа

```swift
// Владелец отзывает чужой доступ:
// RPC: revoke_access_by_owner(p_access_id UUID, p_owner_id UUID) → VOID
struct RevokeParams: Encodable { let p_access_id: String; let p_owner_id: String }
try await db
    .rpc("revoke_access_by_owner", params: RevokeParams(p_access_id: accessId, p_owner_id: userId))
    .execute()

// Вьюер сам отвязывается (RLS UPDATE позволяет где viewer_id = auth.uid()):
try await db
    .from("share_access")
    .update(["is_active": false])
    .eq("id", value: accessId)
    .eq("viewer_id", value: currentUserId)
    .execute()
```

### Профиль пользователя

```swift
// profiles: id, email, display_name, avatar_url, gemini_api_key,
//           created_at, updated_at, last_active_at
let profile: AccountUser = try await db
    .from("profiles")
    .select()
    .eq("id", value: userId)
    .single()
    .execute()
    .value

try await db
    .from("profiles")
    .update(["display_name": name, "avatar_url": avatarUrl,
             "updated_at": ISO8601DateFormatter().string(from: Date())])
    .eq("id", value: userId)
    .execute()
```

### Ошибки

```swift
// supabase-swift бросает PostgrestError (message, code, details, hint)
// PGRST116 — нет строки для .single() → пустое состояние
// 42501     — нет прав RLS → разлогинить
// 23505     — UNIQUE violation (share_access уже существует) → "уже подключён"
```

---

## AI Summary (Gemini)

```swift
@Observable
@MainActor
final class AIStore {
    var summary: String?
    var isLoading = false
    var error: AIError?

    @ObservationIgnored @AppStorage("aiSummaryCache") private var cachedSummary = ""
    @ObservationIgnored @AppStorage("aiSummaryHash") private var cachedHash = ""

    func generateSummary(stats: UserStats, modeStats: [ModeStats]) async
    func validateAndSave(apiKey: String) async throws
    func clearSummary()

    private func statsHash(_ stats: UserStats) -> String {
        "\(stats.totalCorrect)-\(stats.totalSessions)-\(stats.currentStreak)"
    }
}
```

- Gemini endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=KEY`
- Валидация ключа: `NSPredicate(format: "SELF MATCHES %@", "AIza[0-9A-Za-z_-]{35}")`
- HTTP 400/403 → `.invalidKey`, 429 → `.rateLimit`
- Регенерировать только если `statsHash != cachedHash`

---

## Offline режим

```swift
// UserDefaults key: "pendingSessions", тип [PendingSession] через JSONEncoder
// Максимум 50 — при превышении удалять самые старые

// GameStore.completeSession():
func completeSession() async {
    let payload = buildPayload()
    guard await isLoggedIn() else { savePendingSession(payload); return }
    do {
        try await SupabaseService.shared.saveSession(payload)
        await statsStore.reload()
        checkAchievements()
    } catch {
        savePendingSession(payload)
    }
}

// Вызывать при signedIn:
func syncPendingSessions() async {
    let pending = loadPendingSessions()
    guard !pending.isEmpty else { return }
    for session in pending { try? await SupabaseService.shared.saveSession(session) }
    clearPendingSessions()
    await statsStore.reload()
}
```

---

## Достижения

Статические данные в `AchievementCatalog.swift`. Проверять после каждой сохранённой сессии:

| ID | Условие |
|---|---|
| `first_session` | totalSessions >= 1 |
| `ten_sessions` | totalSessions >= 10 |
| `hundred_sessions` | totalSessions >= 100 |
| `hundred_questions` | totalQuestions >= 100 |
| `thousand_questions` | totalQuestions >= 1000 |
| `perfect_streak_5` | currentStreak >= 5 |
| `perfect_streak_10` | currentStreak >= 10 |
| `all_modes` | попробованы все 6 режимов (Set в UserDefaults) |
| `multiplication_master` | accuracy >= 0.9 && questionsCount >= 50 (multiplication) |
| `division_master` | accuracy >= 0.9 && questionsCount >= 50 (division) |
| `sharp_shooter` | accuracy >= 0.95 && totalQuestions >= 100 |

**Toast:** `AchievementToastView` поверх всего через `ZStack` в корне приложения, стандартные SwiftUI анимации, автоскрытие через `Task.sleep(.seconds(3))`. Показанные хранить в `UserDefaults("seenAchievements")`.

---

## Локализация

Языки: `ru` (по умолчанию), `kk`. Выбор в `@AppStorage("appLocale")`.

Стандартные `Localizable.strings` (добавить через Add Files → Localize). Обращение через `String(localized:)` или кастомный `LocaleManager` если нужен runtime switch без перезапуска.

Ключевые строки:
```
"app.title" = "Тренажёр счёта";
"mode.addition" = "Сложение";
"mode.subtraction" = "Вычитание";
"mode.multiplication" = "Умножение";
"mode.division" = "Деление";
"mode.table" = "Таблица умножения";
"mode.mixed" = "Всё подряд";
"mode.review" = "Разбор ошибок";
"difficulty.easy" = "Лёгкий";
"difficulty.medium" = "Средний";
"difficulty.hard" = "Сложный";
"difficulty.brain" = "Мозг";
"result.done" = "Готово!";
"result.results" = "Результаты";
"result.review" = "Разбор ошибок";
"result.again" = "Ещё раунд";
"profile.logout" = "Выход";
"auth.title" = "Вход";
"auth.enterEmail" = "Введите email";
"auth.sendCode" = "Отправить код";
"auth.checkEmail" = "Проверьте email";
"auth.signIn" = "Войти";
"auth.back" = "Назад";
"share.parent" = "Родитель";
"share.student" = "Студент";
"share.copy" = "Копировать";
"share.copied" = "Скопировано!";
"share.noStudents" = "Нет студентов";
"share.noViewers" = "Нет зрителей";
```

Склонение дней:
```swift
func daysString(_ n: Int) -> String {
    switch n % 10 {
    case 1 where n % 100 != 11: return "\(n) день"
    case 2...4 where !(11...14).contains(n % 100): return "\(n) дня"
    default: return "\(n) дней"
    }
}
```

---

## Supabase конфигурация

```swift
final class SupabaseService {
    static let shared = SupabaseService()
    let client: SupabaseClient

    private init() {
        let url  = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL")  as! String
        let key  = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
        client = SupabaseClient(supabaseURL: URL(string: url)!, supabaseKey: key)
    }
}
```

Ключи — в `.xcconfig`, подключить через Build Settings. `.xcconfig` добавить в `.gitignore`.

Auth state listener (в `SandarApp` или `AppEnvironment`):
```swift
Task {
    for await (event, _) in supabase.auth.authStateChanges {
        switch event {
        case .signedIn:
            await statsStore.reload()
            await gameStore.syncPendingSessions()
        case .signedOut:
            statsStore.clear()
            accountStore.clear()
        default: break
        }
    }
}
```

---

## XP и уровни

- XP начисляется сервером (DB trigger). Клиент только отображает.
- Локальный предварительный расчёт: `difficulty.xpMultiplier × correctAnswers` + `50` если `currentStreak % 5 == 0 && score == total`
- `level = totalXP / 1000 + 1`
- Прогресс к следующему уровню: `Double(totalXP % 1000) / 1000.0`

---

## Проверка реализации

1. Запустить на симуляторе iOS 18 и реальном устройстве
2. Пройти полный раунд — сессия появляется в API
3. Переключить на keyboard-режим → клавиатура не исчезает между вопросами
4. Закрыть приложение, открыть снова — keyboard-режим сохранился (`@AppStorage`)
5. Airplane Mode → раунд → pending сохранён → выключить → sync при открытии
6. Perfect score → конфетти + стрик
7. Разбор ошибок работает как отдельный раунд без записи на сервер
8. PhotosPicker → аватар обновился
9. Gemini API key → summary сгенерирован, кэширован
10. Share code → активировать с другого аккаунта → студент в списке родителя
11. Dark Mode → все цвета из Asset Catalog переключаются корректно
12. Переключить язык ru ↔ kk → все строки обновились
13. Нельзя свайпнуть GameView назад (`.interactiveDismissDisabled`)
14. Добавить новый режим игры: создать один Strategy-файл, зарегистрировать в реестре — убедиться что остальной код не затронут
