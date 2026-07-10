# TODO

> **Легенда приоритетов:** P0 — Critical | P1 — High | P2 — Medium | P3 — Low | P4 — Future
>
> Подробный roadmap по версиям: [roadmap.md](roadmap.md)

---

## Версия 1.0 — Стабилизация (текущий спринт)

**Цель:** Привести текущий код к production-качеству, покрыть тестами, настроить CI.

### P0 — Critical

- [x] Настройка Vitest и написание unit-тестов для `shared/schemas.ts`
- [x] Написание unit-тестов для `spy/ownership-parser.ts`
- [x] Написание unit-тестов для `spy/state-writer.ts`
- [x] Написание unit-тестов для `brain/context-assembler.ts`
- [x] Написание unit-тестов для `brain/action-generator.ts` (ledger merge)

### P1 — High

- [x] Добавление retry-логики в `brain/llm-client.ts`
- [x] Добавление валидации env переменных при старте
- [x] Оптимизация game state (обрезка устаревшей event history)
- [x] Обновление War Room стратегии (Japan побеждена → Europe)
- [x] Настройка ESLint + Prettier pre-commit hook
- [x] Интеграционные тесты для полного cognitive loop

### P2 — Medium

- [x] Graceful shutdown с сохранением состояния
- [x] Добавить логирование в файл (winston/pino)
- [x] Метрики и мониторинг (количество токенов, время ответа)
- [x] Вынести константы в config

---

## Версия 2.0 — Гибкость провайдеров + Кампании (завершён)

- [x] **Phase 1 (P0):** LLM Provider Abstraction — `src/brain/providers/`
  - Интерфейс `LLMProvider`, реализации Gemini/Groq/OpenAI, фабрика Registry
  - Переключение провайдеров через `LLM_PROVIDER` env var
  - Провайдер-агностик `llm-client.ts` (полная обратная совместимость)
  - Поддержка `response_format: json_schema` для OpenAI и `json_object` для Groq
- [x] **Phase 2 (P0):** Campaign Engine — `war-room/campaigns/`, `src/campaign/`
  - Campaign types/loader/validator с полной валидацией
  - Первая кампания "New Russia 2075"
  - Интеграция в `context-assembler.ts` (campaign block в промпте)
  - Unit-тесты validator (12 тестов)
- [x] **Phase 3 (P1):** Campaign Builder — `src/campaign/builder.ts`
  - LLM-парсер стратегии на естественном языке
  - CLI entry point для standalone использования
  - Функция `suggestCampaignPivot` для смены стратегии mid-game
- [x] **Tests:** 96 тестов (все проходят)

Связанные задачи из бэклога:

- [x] Поддержка нескольких LLM провайдеров с fallback-механизмом (через registry)

---

## Версия 3.0 — Память и стратегия (завершён)

- [x] **Phase 4 (P1):** Strategic Memory — `war-room/memory/`, `src/memory/`
  - `types.ts` — StrategicSummary, RivalProfile, LearnedLesson
  - `loader.ts` — загрузка/сохранение/форматирование для промпта
  - `updater.ts` — автоматическое извлечение достижений/провалов из reasoning LLM
  - Модуль `memory/index.ts`, 7 unit-тестов
- [x] **Phase 5 (P1):** Strategic Phases — `war-room/strategy/`, `src/strategy/`
  - `types.ts` — StrategyPlan, StrategicPhase, PhaseAnalysis
  - `planner.ts` — загрузка плана, анализ фазы по exit-conditions (keyword matching)
  - Default план: Stabilization → Economic Expansion → Regional Dominance → Global Power (4 фазы)
  - Модуль `strategy/index.ts`, 9 unit-тестов
- [x] **Integration:** Memory и Strategy добавлены в `BrainContext` и `buildPrompt()`
- [x] **Cognitive Loop:** Phase 5 (Memory Update) после каждого turn в `src/index.ts`
- [x] **Tests:** 112 тестов (все проходят)

---

## Версия 3.1 — Изоляция сессий, Markdown Campaigns и Документация (завершён)

- [x] Переименование проекта в PaxBot
- [x] LLM Neutralization
- [x] Campaign Engine v2 с Markdown input форматом
- [x] Поддержка изолированных сессий (`war-room/sessions/`)
- [x] Добавлен скрипт `manual-test`
- [x] Создание документации (`api.md`, `database.md`, `deployment.md`, `security.md`, `testing.md`, `decisions.md`)
- [x] Обновление существующей документации

---

## Версия 3.2 — Session Integrity & War Room Cleanup

_Технический долг, выявленный при ревью `war-room/` и `src/` (27.06.2026)._

### P0 — Critical (баги)

- [x] **Bugfix: `next_advisor_query.txt` записывается в корень, а читается из сессии** — в `src/brain/action-generator.ts` путь `NEXT_ADVISOR_QUERY_PATH` захардкожен на `war-room/`, тогда как `src/index.ts` читает его из `getSessionDir()`. Результат: бот каждый ход игнорирует предыдущий LLM-вопрос и задаёт дефолтный.

### P1 — High (архитектурный долг)

- [x] **Strategy Plan не привязан к сессии** — `src/strategy/planner.ts` читает и пишет `war-room/strategy/strategy-plan.json` глобально. При переключении кампании прогресс фаз (`currentPhaseIndex`, `turnsInCurrentPhase`) смешивается между кампаниями.
- [x] **Memory не привязана к сессии** — `src/memory/loader.ts` читает из глобальной `war-room/memory/`. Достижения и профили соперников одной кампании не должны попадать в другую.
- [x] **Авто-генерация Strategy Plan при `init-campaign`** — сейчас при `init-campaign` бот создаёт только `Campaign` JSON, а при первом запуске когнитивного цикла получает захардкоженный 4-фазный дефолтный план. LLM должен генерировать кастомный Strategy Plan из кампании и сохранять его в сессию.

### P2 — Medium (улучшения)

- [x] **Удалить `constitution.md` и `crisis_handbook.txt`** — оба файла являются бесполезными заглушками (`"Goal."` и `"Tactics."`) которые каждый ход занимают место в system prompt. Вся нужная информация уже есть в Campaign JSON (`superGoal`, `priorities`, `constraints`). Необходимо удалить чтение этих файлов из `context-assembler.ts` и переработать промпт под Campaign как основной источник идентичности агента.
- [x] **Нормализация имён сессий (slugify)** — текущие имена папок сессий используют кириллицу (`Россия 2050`), что может вызывать проблемы с encoding на разных ОС. Нужно ввести функцию `slugify()` при создании папки сессии.
- [x] **Удалить сессию-сироту `default`** — папка `war-room/sessions/default/` содержит тестовые данные-заглушки и не относится ни к одной реальной кампании. Её нужно удалить, добавив в `.gitignore`.
- [x] **Удалить кампанию-сироту `new-rus-2075.json`** — создана вручную, не имеет парного `.md` файла, может случайно загрузиться загрузчиком кампаний. Либо добавить `.md`, либо удалить.
- [x] **Лимит на Memory в промпте** — с ростом числа ходов `achievements` и `lessonsLearned` могут раздуть контекст LLM. Нужно хранить только последние N уроков (или агрегировать).
- [x] **`war-room/.gitignore`** — добавить файл, который исключает из git все рантайм-данные (`sessions/`, `memory/`) но сохраняет `campaigns/TEMPLATE.md`.

---

## Версия 3.3 — Интерактивное меню и Улучшения CLI (завершён)

- [x] **Интерактивное стартовое меню**: Выбор кампаний, ввод GAME_URL, запуск по умолчанию.
- [x] **Умная обрезка текста в TUI**: Реализована функция `truncate` для предотвращения обрезки слов на полуслове.
- [x] **Campaign URL Persistence**: Изолированное хранение `GAME_URL` для каждой кампании в `war-room/sessions/`.
- [x] **Генерация кампаний из шаблона**: Меню создает `.md` шаблон, ждет редактирования пользователем, а затем генерирует JSON и Strategy Plan.
- [x] **Статус кампании в меню**: Вывод достижений, ошибок, уроков и активных задач.
- [x] **Сброс сессии**: Удаление файлов состояния и логов для переинициализации кампании.
- [x] **Флаг `--continue`**: Пропуск меню при запуске.
- [x] **Удаление устаревшей логики**: Удален автоматический выбор пресета (`openPresetAndSelectWW2`).

---

## Версия 3.4 — Локализация и Очистка здоровья кода (завершён)

- [x] **Локализация LLM**: Поддержка Agent Language (Russian/English) в промптах и ответах.
- [x] **Рефакторинг `index.ts`**: Вынесение CLI-меню в `src/campaign/menu.ts` и `PopupWatcher` в `src/hand/popup-watcher.ts`.
- [x] **Чистка зависимостей**: Удаление неиспользуемых `groq`, `@anthropic-ai/sdk` и `@typescript-eslint/eslint-plugin`.
- [x] **Тестирование**: Добавление 11 unit-тестов для `src/shared/config.ts` и `src/shared/session.ts`.

---

## Версия 3.5 — Веб-интерфейс, Архитектурный рефакторинг и Стабилизация Auth (текущий спринт - завершён)

**Цель:** Устранить технический долг, избавиться от консольного TUI, перенести запуск и управление в современный Web UI, решить проблему с Google Auth.

- [x] **Phase 1 (P1):** Универсализация провайдеров & OpenAI Compatible API
  - Создание базового класса `GenericOpenAIProvider`
  - Добавление `openaicompat` провайдера в `registry.ts`
  - Устранение дублирования JSON Schema конфигураций
- [x] **Phase 2 (P1):** Декомпозиция `src/index.ts` (God file)
  - Выделение логики запуска браузера в `src/boot.ts`
  - Выделение когнитивного цикла в `src/loop.ts`
  - Оптимизация чтения из файловой системы (устранение IO-in-loop)
- [x] **Phase 3 (P2):** Рефакторинг `src/shared/tui.ts`
  - Разделение на `StateStore` и `TerminalRenderer`
  - Полное удаление консольного TUI и переход к трансляции по WebSockets
- [x] **Phase 4 (P2):** Упрощение сложных модулей
  - Рефакторинг больших функций в `src/hand/actions.ts` и `src/campaign/validator.ts`
- [x] **Phase 5 (P0):** Интеграция Web UI и Lobby
  - Реализация экрана Lobby (настройка `.env`, выбор кампаний, API ключей)
  - Добавление отладочной RAW JSON панели игры
  - Внедрение кнопок паузы/продолжения хода и выключения Playwright
- [x] **Phase 6 (P0):** Стабилизация Auth Google
  - Переход на постоянный профиль Chrome (Persistent Profile) в `boot.ts` для исключения блокировок Google при логине.
- [x] **Дополнительные исправления (Lobby + UI + Popups):**
  - Реализована кнопка «Скомпилировать кампанию из MD» в веб-интерфейсе для отправки Markdown шаблонов LLM-парсеру.
  - Добавлено динамическое подтягивание доступных моделей LLM с API серверов (OpenAI, Groq, Gemini) и их выбор в Lobby.
  - Повышена устойчивость `dismissGamePopups` (Escape, локализация кнопок, короткий тайм-аут на клики для защиты от зависаний).
  - Исправлена верстка правой колонки дашборда (JSON Debug больше не перекрывает системные логи).
  - Настроено переиспользование вкладок Chrome в Playwright для предотвращения их дублирования.
  - Исправлен автоматический краш при запуске `npm start` без заданных API ключей.
- Добавлена интеграция Repowise (установлен нативный post-commit хук `repowise hook install`).
- Добавлен автоматический запуск unit-тестов и typecheck перед push при помощи хуков Husky.
- Исправлено поведение `openaicompat` провайдера: восстановлено перенаправление вызова `buildOpenAICompatConfig` и обновлен fallback-список моделей-заглушек в веб-интерфейсе.
- Исправлена работа кнопки "Пауза" в цикле бота (теперь проверяется глобально в начале каждого хода).
- Убрано агрессивное нажатие клавиши `Escape` в функции `dismissGamePopups()` (предотвращает произвольное закрытие игровых панелей).

---

## Technical Debt & Code Review Issues (08.07.2026)

- [x] **Critical:** Исправить проблему импорта `dotenv` в тестах Vitest (переход на `esModuleInterop` или корректировка импортов).
- [ ] **Medium:** Заменить жестко закодированную кодировку `utf-8` при парсинге тела ответа в `src/spy/capture.ts` на использование `TextDecoder`.
- [x] **Medium:** Устранить дублирование логики загрузки `.env` путем создания отдельного модуля `src/shared/env-loader.ts`.
- [ ] **Low:** Вынести жестко закодированные таймауты (например, в `src/hand/actions-ui-helpers.ts` и `src/hand/navigate.ts`) в единый `BROWSER_CONFIG`.
- [x] **Improvement:** Вынести огромный системный промпт LLM из `src/brain/context-assembler.ts` в отдельный текстовый/markdown файл.

---

## Интернационализация (i18n)

- [ ] **Medium:** Внедрить библиотеку i18next и настроить автоматический экстрактор ключей для выявления непереведенных строк на этапе CI.
- [x] **Medium:** Локализовать статические элементы веб-интерфейса в `src/web/public/index.html`.
- [x] **Medium:** Заменить захардкоженные строки сообщений в `src/web/server.ts` на вызовы функций локализации.
- [x] **Low:** Перевести оставшиеся русскоязычные логи `tui.log` и `tui.setStatus` в файлах `src/loop.ts`, `src/brain/action-generator.ts` и `src/brain/response-parser.ts`.

---

## Версия 4.0 — Оценка и контроль

- [ ] **Phase 6 (P1):** KPI System
- [ ] **Phase 7 (P2):** Critic Module
- [ ] **Phase 8 (P2):** Risk Engine

---

## Версия 5.0 — Эволюция архитектуры

- [ ] **Phase 9 (P3):** Historical Knowledge Base
- [ ] **Phase 10 (P4):** Advanced Strategic Council

---

## Не распределено

_(Задачи, требующие уточнения)_

- [ ] **Improvement:** Ограничение и агрегация элементов Strategic Memory (achievements, lessonsLearned) для предотвращения token bloat (переполнения контекста LLM) с ростом числа ходов.
- [ ] **Testing:** Добавление сквозных E2E тестов с Playwright для проверки нового веб-интерфейса и Socket.IO интеграции.
