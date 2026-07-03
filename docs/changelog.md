# Changelog

## [v3.4] — 2026-06-28: Локализация LLM

### Основные изменения

- **Поддержка других языков**: Добавлена возможность настраивать язык ответов LLM (рассуждения, директивы, вопросы советнику) через переменную окружения `AGENT_LANGUAGE` (например, `AGENT_LANGUAGE=Russian`).
- **Обновление промптов**: Схемы `gemini` и `openai` избавлены от хардкода английского языка, а `context-assembler.ts` динамически подставляет выбранный язык в системный промпт.
- **Очистка неиспользуемых зависимостей**: Удалены неиспользуемые зависимости `groq`, `@anthropic-ai/sdk` и `@typescript-eslint/eslint-plugin` для облегчения проекта.
- **Интервал продвижения хода**: Шаг автоматического завершения хода (Next Turn) в игре изменен с «1 недели» на «3 месяца».

---

## [v3.3] — 2026-06-27: Интерактивное меню и Улучшения CLI

### Основные изменения

- **Интерактивное стартовое меню**: Добавлена библиотека `@inquirer/prompts` для выбора активной кампании, ввода GAME_URL, создания новых кампаний и сброса сессий на старте.
- **Умная обрезка текста в TUI**: Реализована безопасная функция `truncate` в `TUIDashboard` (`src/shared/tui.ts`), которая обрезает строки по границам слов вместо разрыва слов на полуслове.
- **Связка GAME_URL с кампанией**: Теперь URL игры сохраняется в `game_url.txt` в папке сессии активной кампании (`war-room/sessions/<campaign>/game_url.txt`), изолируя адреса между партиями.
- **Пошаговое создание кампаний**: Опция создания новой кампании генерирует `.md` шаблон из `TEMPLATE.md`, ожидает редактирования пользователем в IDE и затем автоматически компилирует JSON и стартовую стратегию через LLM-парсер.
- **Отображение статуса кампании**: Добавлена опция просмотра текущих достижений, неудач, уроков и активных операций кампании в консоли.
- **Сброс сессии**: Добавлена функция очистки прогресса и логов выбранной кампании для старта с чистого листа.
- **Флаг `--continue`**: Запуск с флагом `npm start -- --continue` пропускает меню и сразу начинает партию с последними настройками.
- **Удаление автовыбора пресета**: Убран устаревший автовыбор пресета (`openPresetAndSelectWW2`), бот теперь сразу переходит к управлению игрой по сохраненному URL.

---

## [v3.1] — 2026-06-26: Реструктуризация и Изоляция сессий

### Основные изменения

- **Переименование проекта**: Проект переименован в PaxBot.
- **LLM Neutralization**: Обновлён слой работы с провайдерами, абстракция теперь полностью провайдер-агностик.
- **Campaign Engine v2**: Поддержка Markdown input формата для кампаний.
- **Изоляция сессий (ADR-005)**: War Room теперь поддерживает структуру `sessions/` для изолированного хранения состояния партий.
- **Рефакторинг**: Обновлён модуль `action-generator` для лучшей интеграции с сессиями.
- **Скрипт**: Добавлен скрипт `npm run manual-test` для тестирования логики LLM без открытия браузера.
- **Документация**: Созданы `api.md`, `database.md`, `deployment.md`, `security.md`, `testing.md`, `decisions.md`.

---

## [v3.0] — 2026-06-24: Память и стратегия

### Phase 4: Strategic Memory

- **Memory Types** (`src/memory/types.ts`):
  - `StrategicMemory`, `StrategicSummary`, `StrategicSummaryEntry`
  - `RivalProfile` с DiplomaticStance и ThreatLevel
  - `LearnedLesson` с маркировкой актуальности

- **Memory Loader** (`src/memory/loader.ts`):
  - Загрузка/сохранение 3 файлов: `strategic_summary.json`, `rival_profiles.json`, `lessons_learned.json`
  - Graceful fallback при отсутствии файлов
  - `formatMemoryForPrompt()` — компактное представление для LLM

- **Memory Updater** (`src/memory/updater.ts`):
  - `updateMemoryAfterTurn()` — извлечение достижений/провалов из reasoning LLM
  - Обновление rival profiles на основе nation names в actions
  - `archiveOldLessons()` — маркировка старых уроков как нерелевантных
  - 7 unit-тестов

### Phase 5: Strategic Phases

- **Strategy Types** (`src/strategy/types.ts`):
  - `StrategyPlan` с ordered phases и phase index
  - `StrategicPhase` с entry/exit conditions, focus areas, minTurns
  - `PhaseAnalysis` с рекомендацией по переходу

- **Strategy Planner** (`src/strategy/planner.ts`):
  - `loadStrategyPlan()` — загрузка или создание default плана
  - `analyzePhase()` — анализ exit conditions через keyword matching
  - `formatStrategyForPrompt()` — форматирование для промпта
  - Default план: Stabilization → Economic Expansion → Regional Dominance → Global Power
  - 9 unit-тестов

### Integration

- `BrainContext` расширен полями `memory: StrategicMemory` и `strategy: StrategyPlan`
- `buildPrompt()` — memory и strategy блоки в user-промпте перед game state
- Cognitive loop (`src/index.ts`): Phase 5 (Memory Update) после каждого turn
- `assembleContext()` загружает memory + strategy как необязательные (graceful fallback)

### Tests

- **112 тестов** (все проходят): +7 memory/updater + 9 strategy/planner
- Все 96 исходных тестов не сломаны

---

## [v2.0] — 2026-06-23: Гибкость провайдеров + Кампании

### Phase 1: LLM Provider Abstraction

- **LLM Provider Interface** (`src/brain/providers/provider.ts`):
  - Абстрактный интерфейс `LLMProvider` с методом `generate()`
  - `ProviderConfig` для универсальной конфигурации вызова
  - `ResponseSchema` для описания схемы JSON-ответа

- **Gemini Provider** (`src/brain/providers/gemini-provider.ts`):
  - Реализация через `@google/genai` SDK
  - `responseMimeType: "application/json"` с `responseSchema`
  - `buildGeminiConfig()` фабрика конфига

- **Groq Provider** (`src/brain/providers/groq-provider.ts`):
  - Реализация через OpenAI-совместимый API
  - Поддержка `response_format: json_object`
  - Настраиваемый `baseUrl` для разных эндпоинтов

- **OpenAI Provider** (`src/brain/providers/openai-provider.ts`):
  - Реализация через `/v1/chat/completions` API
  - Поддержка `response_format: json_schema` (strict mode)
  - JSON Schema-совместимая схема ответа

- **Provider Registry** (`src/brain/providers/registry.ts`):
  - Фабрика `createProvider(type)`
  - `callProviderWithRetry()` — retry-логика с экспоненциальной задержкой
  - `validateEnv()` — проверка API-ключей для выбранного провайдера

- **Refactoring**:
  - `llm-client.ts` переписан как провайдер-агностик (полная обратная совместимость)
  - `config.ts` — добавлены `DEFAULT_LLM_PROVIDER` и `PROVIDER_MODELS`
  - `brain/index.ts` — экспорт новых типов и ProviderType

### Phase 2: Campaign Engine

- **Campaign Types** (`src/campaign/types.ts`):
  - `Campaign` — структурированное определение кампании
  - `VictoryCondition`, `Priority`, `Constraint`
  - `ValidationResult` с errors/warnings

- **Campaign Validator** (`src/campaign/validator.ts`):
  - Полная валидация всех полей кампании
  - Тип-гард `isValidCampaign()`
  - 12 unit-тестов (покрытие: валидные/невалидные кампании, пустые массивы, пропущенные поля)

- **Campaign Loader** (`src/campaign/loader.ts`):
  - Загрузка всех `.json` файлов из `war-room/campaigns/`
  - Кэширование для производительности
  - `getPrimaryCampaign()`, `findCampaign()`, `formatCampaignForPrompt()`

- **Первая кампания** (`war-room/campaigns/new-rus-2075.json`):
  - New Russia 2075 — восстановление советской сферы влияния
  - 5 приоритетов, 4 ограничения, 4 условия победы

- **Интеграция**:
  - `context-assembler.ts` — добавлен `campaign` в `BrainContext`
  - `buildPrompt()` — кампания вставляется в user-промпт перед game state

### Phase 3: Campaign Builder

- **Builder** (`src/campaign/builder.ts`):
  - `buildCampaignFromDescription()` — LLM-парсер стратегии на естественном языке
  - `suggestCampaignPivot()` — смена стратегии mid-game на основе контекста
  - CLI entry point: `npx ts-node src/campaign/builder.ts "description"`

### Tests

- **96 тестов** (все проходят): +12 новых тестов для Campaign Validator
- Покрытие: schemas (27), action-generator (13), ownership-parser (12), state-writer (13), context-assembler (14), integration (5), campaign validator (12)

### Tech

- TypeScript strict mode
- ES Modules
- Все 84 исходных теста не сломаны
- Полная обратная совместимость API
