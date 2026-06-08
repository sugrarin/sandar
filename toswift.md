# Sandar — iOS SwiftUI: Техническое задание

## Цель
Реализовать iOS-приложение «Sandar — тренажёр счёта» на SwiftUI, полностью повторяющее функциональность веб-версии. Приложение предназначено для детей и их родителей. Язык UI — русский (по умолчанию) с поддержкой казахского.

---

## Стек и требования окружения

- **Язык:** Swift 5.9+
- **UI Framework:** SwiftUI (минимальный iOS 16)
- **Async:** Swift Concurrency (`async/await`, `Task`, `@MainActor`)
- **Хранилище:** `@AppStorage` для настроек, `UserDefaults` для кэша, `Keychain` для токенов
- **БД/Auth:** Supabase — использовать официальный SDK `supabase-swift` (пакет `Supabase/supabase-swift`)
- **Сеть:** URLSession через Supabase SDK + кастомный `APIClient` для REST-эндпоинтов
- **Графики:** `Charts` framework (iOS 16+)
- **Фото:** `PhotosUI` (`PhotosPicker`) для загрузки аватара
- **Clipboard:** `UIPasteboard.general.string`
- **Навигация:** `NavigationStack` (iOS 16+), не `NavigationView`
- **Конфетти:** реализовать через `UIViewRepresentable` с `CAEmitterLayer`
- **Dependency Injection:** `@EnvironmentObject` для глобальных store-ов
- **Хранение pending сессий:** `UserDefaults` с кодеком `Codable` (массив `PendingSession`, макс. 50)

### Важные iOS-специфичные правила
1. Никогда не вызывать UI-обновления вне `@MainActor` — все `@Published` свойства в `ObservableObject` должны обновляться на главном потоке.
2. Все сетевые вызовы делать в `Task { }` внутри `.task { }` модификатора или `.onAppear`.
3. Не использовать `DispatchQueue.main.async` — только `await MainActor.run { }` или `@MainActor`.
4. `NavigationStack` с `path: NavigationPath` — один стек на весь app, передавать через `@EnvironmentObject`.
5. Для Supabase Auth хранить сессию в Keychain через SDK (он делает это автоматически).
6. Поддержка Dark Mode обязательна — использовать семантические цвета через `Color` extension или Asset Catalog.
7. Safe area: использовать `.safeAreaInset` и `.ignoresSafeArea(.keyboard)` там, где нужно.
8. Keyboard avoidance для полей ввода — использовать `.scrollDismissesKeyboard(.interactively)`.
9. Для хаптик-фидбека при ответах: `UIImpactFeedbackGenerator` (correct → `.medium`, wrong → `.heavy`).
10. `ModeStats.id` — не хранить вычисляемый `UUID()` как `var`, это создаст новый UUID при каждом обращении. Сделать `id` через `"\(mode.rawValue)-\(difficulty.rawValue)"`.

---

## Цветовая схема

Реализовать как `extension Color` или через Asset Catalog:

```swift
// Light mode / Dark mode
Color.appBackground      // light: #F4F2EA, dark: #111318
Color.appElevated        // light: rgba(255,255,255,0.74), dark: rgba(24,27,35,0.76)
Color.appTextMain        // light: #161515, dark: #F2EFE8
Color.appTextSoft        // light: #161515 @ 66%, dark: #F2EFE8 @ 60%
Color.appAccent          // light: #1F8A70, dark: #56C0A1
Color.appAccentStrong    // light: #16745E, dark: #3DAA8A
Color.appAccentSoft      // appAccent @ 12% opacity
Color.appDanger          // #CC584C
Color.appWarning         // #E7B94E
Color.appSuccess         // = appAccent
```

Конфетти: `[#1F8A70, #F6C86A, #FF7F6A, #4C89FF, #FFFFFF]`

---

## Модели данных (Codable, Identifiable, Equatable)

```swift
enum GameMode: String, Codable, CaseIterable {
    case addition, subtraction, multiplication, division, table, mixed, review
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

struct GameTask: Identifiable, Codable, Equatable {
    let id: UUID
    var question: String
    var answer: Int
    var options: [Int]       // всегда 4 варианта
    var operation: GameMode
    var left: Int
    var right: Int
    var subtitle: String?
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
    var index: Int            // текущий вопрос (0-based)
    var total: Int            // всегда 12
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
    // Важно: не использовать вычисляемый UUID() — он создаёт новый id при каждом обращении
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
    var date: String         // "YYYY-MM-DD"
    var sessions: Int
    var questions: Int
    var correct: Int

    var level: Int {         // 0-4 для цвета ячейки heatmap
        switch sessions {
        case 0: return 0
        case 1: return 1
        case 2...3: return 2
        case 4...6: return 3
        default: return 4
        }
    }
}

struct Achievement: Identifiable, Codable {
    var id: String           // "first_session", "ten_sessions", etc.
    var unlockedAt: String?
    var progress: Int?

    // Статические данные (icon, title, description) — хранить в AchievementCatalog.swift
    var isUnlocked: Bool { unlockedAt != nil }
}

struct AccountUser: Codable {
    var id: String
    var email: String?
    var displayName: String?
    var avatarUrl: String?
    var geminiApiKey: String?
    var createdAt: String?

    var initials: String {
        let name = displayName ?? email ?? "?"
        return String(name.prefix(2)).uppercased()
    }
}

struct ShareCode: Codable {
    var id: String
    var code: String         // 8 символов, uppercase
    var createdAt: String
    var isActive: Bool
}

struct ShareAccessViewer: Identifiable, Codable {
    var id: String
    var viewerEmail: String
    var viewerDisplayName: String?
    var viewerAvatarUrl: String?
    var activatedAt: String
    var isActive: Bool
}

struct LinkedStudent: Identifiable, Codable {
    var id: String           // access_id
    var studentId: String
    var studentEmail: String
    var studentDisplayName: String?
    var studentAvatarUrl: String?
    var activatedAt: String
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
| easy | 1–10 | 1–10 × 1–10 | делимое = произведение двух чисел 1–10 |
| medium | 10–99 | 2–19 × 2–9 | делитель 2–9, результат 2–19 |
| hard | 100–999 | 10–50 × 2–15 | делитель 2–15, результат 10–50 |
| brain | 1000–9999 | 10–99 × 10–50 | делитель 10–50, результат 10–99 |

**Blending (hard/brain):** 80% задач генерировать из текущей сложности, 20% из предыдущей — для плавного прогрева.

### Алгоритм генерации вариантов ответа (4 штуки)
```
1. Добавить правильный ответ
2. answer ± 1
3. answer ± 10
4. Если answer имеет ≥2 цифры — транспозиция цифр (12 → 21, 123 → 213)
   Иначе — jitter ±20% от answer (минимум 1)
5. Убрать дубликаты и отрицательные числа
6. Если меньше 4 — добавить последовательно answer+n, пока не наберём 4
7. Перемешать через .shuffled()
```

### Режим `table` (таблица умножения)
- 12 задач: умножение числа от 1 до 12 на фиксированный множитель
- Множитель выбирается случайно из 2–9 в начале раунда
- Subtitle: "× {multiplier}"

### Режим `review`
- Входные данные: `session.mistakes` из предыдущей сессии
- Перемешать, взять первые 12 (или меньше если ошибок < 12)
- После прохождения: сессию НЕ сохранять на сервер

### Режим `mixed`
- Для каждой задачи случайно выбирать операцию из: addition, subtraction, multiplication, division

---

## Архитектура приложения

### Структура проекта
```
Sandar/
├── App/
│   ├── SandarApp.swift          // @main, создать store-ы, inject @EnvironmentObject
│   └── AppEnvironment.swift     // хранение и создание всех store-ов
├── Stores/
│   ├── GameStore.swift
│   ├── StatsStore.swift
│   ├── AccountStore.swift
│   └── AIStore.swift
├── Models/
│   └── Models.swift
├── Services/
│   ├── SupabaseService.swift    // singleton SupabaseClient
│   ├── APIClient.swift          // URLSession обёртка для /api/* эндпоинтов
│   └── TaskGenerator.swift
├── Views/
│   ├── Home/
│   │   ├── HomeView.swift
│   │   ├── DifficultyPickerView.swift
│   │   └── ModeCardView.swift
│   ├── Game/
│   │   ├── GameView.swift
│   │   ├── ProgressBarView.swift
│   │   ├── ProblemCardView.swift
│   │   └── AnswerGridView.swift
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
│       ├── SkeletonView.swift
│       └── AccentButtonStyle.swift
└── Extensions/
    ├── Color+App.swift
    ├── Date+Formatting.swift
    └── String+Pluralization.swift
```

### GameStore
```swift
@MainActor
final class GameStore: ObservableObject {
    @Published var session: GameSession?
    @Published var isLoading = false
    @AppStorage("difficulty") var difficulty: Difficulty = .easy

    func startGame(mode: GameMode)
    func submitAnswer(_ answer: Int)   // обновляет session синхронно + запускает Task для auto-advance
    func advance()
    func completeSession() async       // сохранить на сервер или в pending

    // Pending sessions (офлайн)
    func savePendingSession(_ s: PendingSession)
    func syncPendingSessions() async
    private func loadPendingSessions() -> [PendingSession]
    private func clearPendingSessions()
}
```

Логика `submitAnswer`:
1. Записать `SessionAnswer` в `session.answers`
2. Если правильно → `score += 1`, haptic `.medium`, `session.allowAdvance = true`
3. Если неправильно → добавить в `session.mistakes`, haptic `.heavy`, `session.allowAdvance = true`
4. Подсветить ответы — через 200ms `Task { try await Task.sleep(for: .milliseconds(200)); advance() }` только если correct

### StatsStore
```swift
@MainActor
final class StatsStore: ObservableObject {
    @Published var profile: AccountUser?
    @Published var userStats: UserStats?
    @Published var modeStats: [ModeStats] = []
    @Published var activityDays: [ActivityDay] = []
    @Published var achievements: [Achievement] = []
    @Published var newAchievements: [Achievement] = []  // очередь для toast
    @Published var isLoading = false
    @Published var error: String?

    private var lastFetchedAt: Date?
    private let cacheTTL: TimeInterval = 60

    func loadIfNeeded() async          // пропустить если TTL не истёк
    func reload() async                // принудительное обновление
    func updateProfile(displayName: String?, avatarUrl: String?, geminiApiKey: String?) async throws
    func dismissAchievement(_ id: String)
}
```

### AccountStore
```swift
@MainActor
final class AccountStore: ObservableObject {
    @Published var shareCode: ShareCode?
    @Published var viewers: [ShareAccessViewer] = []
    @Published var students: [LinkedStudent] = []
    @Published var studentStatCache: [String: StudentStatBundle] = [:]
    @Published var isLoading = false

    func loadShareData() async
    func activateCode(_ code: String) async throws
    func revokeViewer(accessId: String) async throws
    func unlinkStudent(accessId: String) async throws
    func prefetchStudentStats(studentId: String) async
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

@MainActor
final class Router: ObservableObject {
    @Published var path = NavigationPath()
    @Published var activeGame: GameSession? = nil    // fullScreenCover для игры
    @Published var showResult = false

    func push(_ route: AppRoute) { path.append(route) }
    func pop() { guard !path.isEmpty else { return }; path.removeLast() }
    func popToRoot() { path.removeLast(path.count) }
}
```

В `SandarApp.swift`:
```swift
NavigationStack(path: $router.path) {
    HomeView()
        .navigationDestination(for: AppRoute.self) { route in
            switch route {
            case .profile: ProfileView()
            case .profileEdit: ProfileEditView()
            case .shareAccess: SharedAccessView()
            case .studentStats(let id, let date): StudentStatsView(studentId: id, activatedAt: date)
            }
        }
}
.fullScreenCover(isPresented: $router.showGame) { GameView() }
.environmentObject(router)
.environmentObject(gameStore)
.environmentObject(statsStore)
.environmentObject(accountStore)
```

**Важно:** GameView и ResultView показывать через `fullScreenCover`, а не push — чтобы нельзя было свайпнуть назад во время игры. `.interactiveDismissDisabled(true)` для GameView.

---

## Экраны — детальное описание

### 1. HomeView
- Заголовок "SANDAR" (`.textCase(.uppercase)`, small caps эффект), subtitle "Тренажёр счёта"
- `DifficultyPickerView` — 4 кнопки в `HStack` с emoji и подписью. Активная кнопка — `.appAccentSoft` фон, `.appAccent` текст. Остальные — `.appElevated` фон.
- `LazyVGrid(columns: [.init(), .init(), .init()])` из 6 `ModeCardView`:
  - Сложение (SF: `plus`), Вычитание (SF: `minus`), Умножение (SF: `multiply`), Деление (SF: `divide`), Таблица (SF: `tablecells`), Всё подряд (SF: `shuffle`)
- Нажатие на карточку → `gameStore.startGame(mode:)`, `router.showGame = true`
- В `.toolbar`: кнопка профиля справа (аватар или `person.circle`) → `router.push(.profile)`; выбор языка слева

### 2. GameView (fullScreenCover)
- `.interactiveDismissDisabled(true)` — нельзя закрыть свайпом
- Кастомный navbar: слева — название режима, справа — "X / 12", кнопка × с `confirmationDialog("Прервать игру?")` → `router.showGame = false`
- `ProgressBarView` — `GeometryReader` для ширины, анимация `.animation(.easeInOut, value: progress)`
- `ProblemCardView`: subtitle мелким шрифтом, вопрос `font(.system(size: 48, weight: .bold, design: .rounded))`
- `AnswerGridView` — `LazyVGrid(columns: [.init(), .init()])` из 4 кнопок:
  - Состояния: `.normal`, `.correct` (`.appSuccess` фон), `.wrong` (`.appDanger` фон), `.locked` (opacity 0.4, disabled)
  - После выбора: заблокировать все кнопки, показать цвета, через 200ms вызвать `gameStore.advance()`
- Когда `session.index >= session.total` → закрыть fullScreenCover, показать ResultView

### 3. ResultView (fullScreenCover)
- `ConfettiView()` поверх всего через `ZStack` — показывать только если `score == total`
  - `CAEmitterLayer`: 90 частиц, 5 цветов, duration 2.6с, затем `emitter.birthRate = 0`
- Заголовок "Готово!", subtitle "Результаты", большой счёт "score / total" в `font(.system(size: 72, weight: .bold))`
- Кнопка "Разбор ошибок" — `.disabled(session.mistakes.isEmpty)` → `gameStore.startGame(mode: .review)`, `router.showResult = false`, `router.showGame = true`
- Кнопка "Ещё раунд" → `gameStore.startGame(mode: session.sourceMode)`, replace covers
- Сетка режимов (те же 6 карточек что на Home) для быстрого нового раунда

### 4. ProfileView
- **Авторизован:**
  - `AsyncImage(url: URL(string: profile.avatarUrl))` в круглой маске 60pt, fallback — инициалы на `.appAccentSoft` фоне
  - Имя/email, дата регистрации через `Date+Formatting`
  - Кнопка pencil → `router.push(.profileEdit)`
  - `BadgeRowView`: 🔥 N дней, ⚡ N XP — горизонтальный `HStack` с капсулами
  - `StatGridView` — `LazyVGrid(columns: [.init(), .init(), .init()])` 2 строки: сессии, вопросы, точность %, правильных, серия, рекорд
  - `AISummaryPanel` (если `profile.geminiApiKey != nil`)
  - `ActivityHeatmapView`
  - `WeeklyAccuracyChartView`
  - `ModeStatsListView` с `Picker("", selection: $filterDifficulty) { ... }.pickerStyle(.segmented)`
  - `AchievementsView`
  - Карточка-кнопка "Поделиться" → `router.push(.shareAccess)`
  - Кнопка "Выход" → `supabase.auth.signOut()`, очистить store-ы, pop to root
- **Не авторизован:** кнопка "Войти" → `.sheet(isPresented:) { AuthView() }`
- Skeleton через `redacted(reason: .placeholder)` пока `isLoading`

### 5. ProfileEditView
- `PhotosPicker(selection: $photoItem, matching: .images)` → конвертировать в `Data` (JPEG, compressionQuality: 0.8), проверить ≤ 2MB
- `TextField("Имя", text: $displayName).onChange { if displayName.count > 50 { displayName = String(displayName.prefix(50)) } }`
- Email — `Text(profile.email ?? "")` (не редактируемый)
- Кнопка "Сохранить" — `@State var isSaving = false`, `.disabled(isSaving)`
- Загрузка: `supabase.storage.from("avatars").upload(path: "\(userId).jpg", file: imageData, options: .init(contentType: "image/jpeg", upsert: true))` → `supabase.storage.from("avatars").getPublicURL(path:)` → обновить профиль

### 6. AuthView (sheet)
- `@State var step: AuthStep = .email` (enum: `.email`, `.code`)
- **Шаг email:** `TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)` + кнопка "Отправить код" → `supabase.auth.signInWithOTP(email: email)`
- **Шаг code:** `SecureField("Код", text: $code).keyboardType(.numberPad)` + кнопка "Войти" → `supabase.auth.verifyOTP(email: email, token: code, type: .email)` + кнопка "Назад"
- После успешного логина: dismiss sheet, `statsStore.reload()`, `gameStore.syncPendingSessions()`
- Ошибки показывать через `@State var errorMessage: String?` под кнопкой

### 7. SharedAccessView
- `Picker("", selection: $tab) { Text("Родитель").tag(0); Text("Студент").tag(1) }.pickerStyle(.segmented)`
- **Вкладка "Родитель":**
  - `TextField("Код доступа", text: $codeInput).textInputAutocapitalization(.characters).disableAutocorrection(true).onChange { codeInput = String(codeInput.prefix(8)) }`
  - Кнопка "Добавить" → `accountStore.activateCode(codeInput)`
  - `List(accountStore.students)` — каждый LinkedStudent с `AvatarView`, именем, датой, `chevron.right` → `router.push(.studentStats(...))`
- **Вкладка "Студент":**
  - Код в `Text(shareCode.code).font(.system(.title, design: .monospaced).bold())`
  - Кнопка "Копировать" → `UIPasteboard.general.string = "https://sandar.kz/share?code=\(code)"` → через `Task.sleep(.seconds(2))` вернуть label обратно
  - `List(accountStore.viewers)` — каждый viewer с аватаром, именем, датой и кнопкой × с `confirmationDialog` → `accountStore.revokeViewer(accessId:)`

### 8. StudentStatsView
- Профиль студента read-only: `AvatarView`, имя, email, "Доступ с \(activatedAt)"
- `BadgeRowView`, `StatGridView`, `ActivityHeatmapView`, `WeeklyAccuracyChartView`, `ModeStatsListView`
- Данные из `accountStore.studentStatCache[studentId]`
- `.toolbar { Button("Отвязать") { showUnlink = true } }.confirmationDialog(...)` → `accountStore.unlinkStudent(accessId:)` → `router.pop()`
- В `.task { await accountStore.prefetchStudentStats(studentId: studentId) }`

### 9. ActivityHeatmapView
- 26 недель × 7 дней = 182 ячейки
- `LazyHGrid(rows: Array(repeating: .init(.fixed(14)), count: 7), spacing: 3)` — колонки = недели слева направо
- Каждая ячейка: `RoundedRectangle(cornerRadius: 2).fill(colorForLevel(day.level))` 14×14pt
- Цвет уровней: 0 → `.appElevated`, 1–4 → `appAccent.opacity(0.2 * Double(level) + 0.1)`
- Тап по ячейке → `.popover` или `.overlay` с датой и кол-вом сессий

### 10. WeeklyAccuracyChartView
- Агрегировать `activityDays` по ISO неделям: для каждой недели вычислить `sum(correct) / sum(questions)`
- `Chart { ForEach(weeklyData) { BarMark(x: .value("Неделя", $0.weekLabel), y: .value("Точность", $0.accuracy * 100)) .foregroundStyle(Color.appAccent) } }.chartYScale(domain: 0...100)`
- Минимальная высота 150pt

---

## API Layer

Все запросы через `APIClient`. Auth-заголовок получать перед каждым запросом:

```swift
actor APIClient {
    static let shared = APIClient()
    private let baseURL: URL   // из Info.plist ключ "API_BASE_URL"

    private func authHeader() async throws -> [String: String] {
        let token = try await SupabaseService.shared.client.auth.session.accessToken
        return ["Authorization": "Bearer \(token)"]
    }

    func getStats() async throws -> StatsResponse
    func getActivity() async throws -> ActivityResponse
    func saveSession(_ payload: CompletedSessionPayload) async throws
    func getSessions() async throws -> [ServerSession]

    // Share
    func getShareCode() async throws -> ShareCode
    func getViewers() async throws -> [ShareAccessViewer]
    func activateCode(_ code: String) async throws -> ActivateCodeResponse
    func getLinkedStudents() async throws -> [LinkedStudent]
    func unlinkStudent(accessId: String) async throws
    func revokeViewer(accessId: String) async throws

    // Student data (для родителя)
    func getStudentProfile(studentId: String) async throws -> AccountUser
    func getStudentStats(studentId: String) async throws -> UserStats
    func getStudentModeStats(studentId: String) async throws -> [ModeStats]
    func getStudentActivity(studentId: String) async throws -> [ActivityDay]
}
```

Payload для сохранения сессии:
```swift
struct CompletedSessionPayload: Encodable {
    var mode: String
    var difficulty: String
    var totalQuestions: Int
    var correctAnswers: Int
    var wrongAnswers: Int
    var durationSeconds: Int
    var answers: [SessionAnswer]
}
```

Обработка ошибок:
```swift
enum APIError: Error, LocalizedError {
    case unauthorized
    case notFound
    case serverError(Int)
    case decodingError(Error)
    case networkError(Error)
}
// HTTP 401 → .unauthorized → показать AuthView
// HTTP 404 → .notFound
// HTTP 429 → обработать отдельно для Gemini (rate limit)
```

---

## AI Summary (Gemini)

```swift
@MainActor
final class AIStore: ObservableObject {
    @Published var summary: String?
    @Published var isLoading = false
    @Published var error: AIError?

    // Кэш
    @AppStorage("aiSummary") private var cachedSummary: String = ""
    @AppStorage("aiSummaryStatsHash") private var cachedHash: String = ""

    func generateSummary(stats: UserStats, modeStats: [ModeStats]) async
    func validateAndSave(apiKey: String) async throws  // проверить через тестовый запрос
    func clearSummary()

    private func statsHash(_ stats: UserStats, _ modeStats: [ModeStats]) -> String
    // Простой хэш: "\(stats.totalCorrect)-\(stats.totalSessions)-\(stats.currentStreak)"
}
```

Вызов Gemini:
- URL: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=\(apiKey)`
- Метод: POST, Content-Type: application/json
- Валидация ключа: `NSPredicate(format: "SELF MATCHES %@", "AIza[0-9A-Za-z_-]{35}").evaluate(with: key)`
- Ошибки: HTTP 400/403 → `.invalidKey`, 429 → `.rateLimit`
- Регенерировать только если `statsHash != cachedHash`

---

## Offline режим

```swift
// UserDefaults key: "pendingSessions"
// Тип: Data (JSONEncoder/JSONDecoder на [PendingSession])
// Макс: 50 сессий (при превышении удалять самые старые)

// GameStore.completeSession():
func completeSession() async {
    let payload = buildPayload()
    do {
        guard await isLoggedIn() else {
            savePendingSession(payload)
            return
        }
        try await APIClient.shared.saveSession(payload)
        await statsStore.reload()
        checkAchievements()
    } catch {
        savePendingSession(payload)  // сохранить локально при любой ошибке
    }
}

// При логине вызывать:
func syncPendingSessions() async {
    let pending = loadPendingSessions()
    guard !pending.isEmpty else { return }
    for session in pending {
        try? await APIClient.shared.saveSession(session)
    }
    clearPendingSessions()
    await statsStore.reload()
}
```

---

## Достижения

11 достижений, описание хранить в `AchievementCatalog.swift` как статический словарь. Проверять после каждой сохранённой сессии:

| ID | Условие |
|---|---|
| `first_session` | totalSessions >= 1 |
| `ten_sessions` | totalSessions >= 10 |
| `hundred_sessions` | totalSessions >= 100 |
| `hundred_questions` | totalQuestions >= 100 |
| `thousand_questions` | totalQuestions >= 1000 |
| `perfect_streak_5` | currentStreak >= 5 |
| `perfect_streak_10` | currentStreak >= 10 |
| `all_modes` | попробованы все 6 режимов (хранить Set в UserDefaults) |
| `multiplication_master` | accuracy >= 0.9 && questionsCount >= 50 для multiplication |
| `division_master` | accuracy >= 0.9 && questionsCount >= 50 для division |
| `sharp_shooter` | accuracy >= 0.95 && totalQuestions >= 100 |

**Toast:** `AchievementToastView` в корневом `ZStack` через `@EnvironmentObject` StatsStore. Показывать через `.transition(.move(edge: .bottom).combined(with: .opacity))`, `withAnimation`. Скрывать через `Task.sleep(.seconds(3))`. Хранить множество показанных в `UserDefaults("seenAchievements")`.

---

## Локализация

Поддерживать два языка: `ru` (по умолчанию), `kk`. Хранить выбор в `@AppStorage("appLocale")`. Применять через кастомный `LocaleManager`:

```swift
final class LocaleManager: ObservableObject {
    @AppStorage("appLocale") var locale: String = "ru"
    func string(_ key: String) -> String { /* lookup в словаре */ }
}
```

Файлы `Localizable.strings` (ru) и `Localizable.strings` (kk) — добавить через Add Files в Xcode с выбором локализации.

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

Склонение дней для стрика — отдельная функция:
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
// SupabaseService.swift
import Supabase

final class SupabaseService {
    static let shared = SupabaseService()
    let client: SupabaseClient

    private init() {
        // Читать из Info.plist
        let url = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
        let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
        client = SupabaseClient(supabaseURL: URL(string: url)!, supabaseKey: key)
    }
}
```

В `Info.plist` добавить ключи `SUPABASE_URL` и `SUPABASE_ANON_KEY` — читать из `.xcconfig` файла (не хардкодить в коде). Добавить `.xcconfig` в `.gitignore`.

Слушать изменения auth состояния:
```swift
// В SandarApp или AppEnvironment:
Task {
    for await (event, session) in supabase.auth.authStateChanges {
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

- XP начисляется сервером (DB trigger), клиент только отображает
- Локальный расчёт для предварительного показа:
  - easy: 1 × correctAnswers
  - medium: 2 × correctAnswers
  - hard: 3 × correctAnswers
  - brain: 5 × correctAnswers
  - Бонус +50 XP каждые 5 perfect-сессий подряд (`currentStreak % 5 == 0 && score == total`)
- `level = totalXP / 1000 + 1`
- Прогресс до следующего уровня: `Double(totalXP % 1000) / 1000.0`

---

## Проверка реализации

1. Запустить на симуляторе iOS 16+ (iPhone 15 Pro) и реальном устройстве
2. Пройти полную игровую сессию → сессия должна появиться в `/api/sessions`
3. Открыть Profile → stats, heatmap, chart обновились
4. Включить Airplane Mode → пройти сессию → pending сохранён → выключить → зайти в профиль → sync произошёл
5. Набрать perfect score → конфетти 2.6с, haptic, стрик увеличился
6. Попробовать режим review после ошибок
7. Загрузить аватар (PhotosPicker) → отображается в профиле
8. Добавить Gemini API key → сгенерировать summary
9. Создать share code → ввести с другого аккаунта → студент появляется в списке родителя
10. Открыть studentStats → все данные загружены
11. Dark Mode: Settings → Display & Brightness → все цвета корректны
12. Переключить язык ru ↔ kk → все UI-строки обновились
13. Проверить `.interactiveDismissDisabled` — нельзя случайно закрыть GameView
14. Повернуть устройство — layout не ломается
