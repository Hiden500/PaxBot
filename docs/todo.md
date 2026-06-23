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

## Версия 2.0 — Гибкость провайдеров + Кампании

- [ ] **Phase 1 (P0):** LLM Provider Abstraction — `src/brain/providers/`
- [ ] **Phase 2 (P0):** Campaign Engine — `war-room/campaigns/`, `src/campaign/`
- [ ] **Phase 3 (P1):** Campaign Builder — `src/campaign/builder.ts`

Связанные задачи из бэклога:

- [ ] Поддержка нескольких LLM провайдеров с fallback-механизмом

---

## Версия 3.0 — Память и стратегия

- [ ] **Phase 4 (P1):** Strategic Memory — `war-room/memory/`
- [ ] **Phase 5 (P1):** Strategic Phases — `war-room/strategy-plan.json`
- [ ] Web UI для мониторинга War Room

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
