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

— нет
