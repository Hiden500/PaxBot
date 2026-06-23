# Roadmap — Pax-Automata

## 1. Текущий статус

**Активный спринт:** Стабилизация и тестирование (Version 1.0)

Текущая архитектура:

```text
Spy (перехват network-трафика)
  ↓
current_state.json

Brain (LLM-логика)
  ↓
LLM (Gemini)

Hand (Playwright автоматизация)
  ↓
Pax Historia UI
```

**Ограничения текущей архитектуры:**

- Single-agent архитектура
- Стратегия вшита в промпты
- Нет абстракции кампании
- Ограниченная долговременная память
- Нет горизонта стратегического планирования
- Нет системы оценки объективных показателей (KPI)
- Жёсткая привязка к одному LLM-провайдеру (Gemini)

---

## 2. Легенда приоритетов

| Приоритет | Описание                              |
| --------- | ------------------------------------- |
| **P0**    | Critical — блокирует работу агента    |
| **P1**    | High — критично для следующего релиза |
| **P2**    | Medium — важно, но не блокирует       |
| **P3**    | Low — улучшения качества жизни        |
| **P4**    | Future — исследовательские задачи     |

---

## 3. Версия 1.0 — Стабилизация (текущий спринт)

**Цель:** Привести текущий код к production-качеству, покрыть тестами, настроить CI.

### Задачи

| Задача                                                             | Приоритет | Статус |
| ------------------------------------------------------------------ | --------- | ------ |
| Настройка Vitest и написание unit-тестов для shared/schemas.ts     | P0        |        |
| Написание unit-тестов для spy/ownership-parser.ts                  | P0        |        |
| Написание unit-тестов для spy/state-writer.ts                      | P0        |        |
| Написание unit-тестов для brain/context-assembler.ts               | P0        |        |
| Написание unit-тестов для brain/action-generator.ts (ledger merge) | P0        |        |
| Добавление retry-логики в brain/llm-client.ts                      | P1        |        |
| Добавление валидации env переменных при старте                     | P1        |        |
| Оптимизация game state (обрезка устаревшей event history)          | P1        |        |
| Обновление War Room стратегии (Japan побеждена → Europe)           | P1        |        |
| Настройка ESLint + Prettier pre-commit hook                        | P1        |        |
| Интеграционные тесты для полного cognitive loop                    | P1        |        |
| Graceful shutdown с сохранением состояния                          | P2        |        |
| Добавление логирования в файл (winston/pino)                       | P2        |        |
| Метрики и мониторинг (количество токенов, время ответа)            | P2        |        |

---

## 4. Версия 2.0 — Гибкость провайдеров + Кампании

**Цель:** Отвязать агента от конкретного LLM-провайдера и вынести стратегию из промптов в конфигурируемые кампании.

### Phase 1: LLM Provider Abstraction (P0)

Создать абстракцию провайдера LLM:

```text
src/brain/providers/
  provider.ts          — интерфейс LLMProvider
  gemini-provider.ts   — реализация для Gemini
  groq-provider.ts     — реализация для Groq
  openai-provider.ts   — реализация для OpenAI
```

Интерфейс:

```ts
interface LLMProvider {
  generate(prompt: string): Promise<string>;
}
```

**Критерии успеха:**

- Gemini, Groq и OpenAI переключаются через конфиг
- Нет provider-специфичной логики вне папки providers

### Phase 2: Campaign Engine (P0)

Вынести стратегию из промптов в структуру кампании:

```text
war-room/campaigns/
  new-rus-2075.md
  new-rus-2075.json
  belarus-world-conquest.md
  belarus-world-conquest.json
```

Схема кампании:

```ts
interface Campaign {
  name: string;
  country: string;
  superGoal: string;
  timeHorizon: number; // в годах
  priorities: string[];
  constraints: string[];
  victoryConditions: string[];
}
```

Новый модуль:

```text
src/campaign/
  index.ts              — Campaign Loader
  validator.ts          — валидация campaign.json
```

**Критерии успеха:**

- Смена кампании не требует изменения кода
- Поддерживается несколько кампаний одновременно

### Phase 3: Campaign Builder (P1)

Конвертация стратегии на естественном языке в структурированный JSON:

```text
src/campaign/
  builder.ts            — LLM-парсер стратегии
```

**Процесс:**

```text
Стратегия на естественном языке
  ↓
LLM Parser (builder.ts)
  ↓
campaign.json
  ↓
Ревью пользователя
  ↓
Сохранение
```

**Критерии успеха:**

- Пользователь никогда не редактирует JSON вручную
- Кампании генерируются автоматически

---

## 5. Версия 3.0 — Память и стратегия

**Цель:** Улучшить долговременную согласованность действий агента.

### Phase 4: Strategic Memory (P1)

Структура памяти:

```text
war-room/memory/
  strategic_summary.json    — достижения, провалы, приоритеты
  rival_profiles.json       — дипломатическая история, угрозы
  lessons_learned.json      — извлечённые уроки
```

**Strategic Summary** хранит:

- Ключевые достижения
- Провалившиеся инициативы
- Текущие приоритеты
- Исторический контекст

**Rival Profiles** хранит:

- Дипломатическая история с каждой страной
- Оценка угрозы
- Надёжность союзников

**Критерии успеха:**

- Агент помнит действия через сотни ходов

### Phase 5: Strategic Phases (P1)

Предотвратить иррациональное долгосрочное планирование:

```text
war-room/strategy-plan.json
```

Пример фаз:

```text
Phase 1: Stabilization
Phase 2: Economic Expansion
Phase 3: Regional Dominance
Phase 4: Global Power Projection
```

Brain должен знать:

- Текущая фаза
- Условия входа
- Условия выхода

**Критерии успеха:**

- Стратегия эволюционирует логически с течением времени

---

## 6. Версия 4.0 — Оценка и контроль

**Цель:** Объективно измерять прогресс и ввести самопроверку.

### Phase 6: KPI System (P1)

Измерение прогресса по числовым метрикам:

```json
{
  "gdp_rank": 3,
  "population": 250000000,
  "military_rank": 3
}
```

Кампании определяют измеримые цели.

**Критерии успеха:**

- Прогресс отслеживается объективно
- Стратегические решения опираются на данные

### Phase 7: Critic Module (P2)

Самопроверка перед выполнением действий:

```text
Planner
  ↓
Proposed Actions

Critic
  ↓
Risk Analysis

Final Actions
```

Critic проверяет:

- Стратегическая согласованность
- Экономическая целесообразность
- Военный риск
- Дипломатический риск

**Критерии успеха:**

- Снижение числа иррациональных решений

### Phase 8: Risk Engine (P2)

Формализованные квартальные аудиты:

Категории рисков:

- Military
- Economic
- Demographic
- Technological
- Governance
- Reputation

Формат отчёта:

```json
{
  "riskLevel": "medium",
  "category": "economic",
  "description": "..."
}
```

**Критерии успеха:**

- Раннее обнаружение угроз
- Улучшение долгосрочного планирования

---

## 7. Версия 5.0 — Эволюция архитектуры

**Цель:** Переход к multi-agent архитектуре с исторической базой знаний.

### Phase 9: Historical Knowledge Base (P3)

Стратегическое распознавание паттернов:

Примеры:

- German Unification
- Rise of China
- British Empire Expansion
- Soviet Collapse

**Назначение:** Аналогии и уроки для планирования.

### Phase 10: Advanced Strategic Council (P4)

Multi-agent архитектура:

```text
Strategist
  ↓
Planner
  ↓
Critic
  ↓
Executor
```

> ⚠️ **Важно:** Не реализовывать до завершения Phase 1–9. Текущий проект слишком рано для полной multi-agent архитектуры.

---

## 8. Технический долг

| Задача                                          | Приоритет | Связанная версия |
| ----------------------------------------------- | --------- | ---------------- |
| Вынести константы в config                      | P2        | 1.0              |
| Абстракция LLM-провайдера с fallback-механизмом | P1        | 2.0              |
| Web UI для мониторинга War Room                 | P3        | 3.0              |

---

## 9. История завершённых этапов

| Версия | Статус | Дата                         |
| ------ | ------ | ---------------------------- |
| —      | —      | Проект в активной разработке |

---

## 10. Дорожная карта релизов

| Версия   | Ключевые возможности                                    | Приоритет |
| -------- | ------------------------------------------------------- | --------- |
| **v1.0** | Тесты, CI, стабилизация, логирование, graceful shutdown | P0-P1     |
| **v2.0** | Multi-provider LLM, Campaign Engine, Campaign Builder   | P0-P1     |
| **v3.0** | Strategic Memory, Strategic Phases                      | P1        |
| **v4.0** | KPI System, Critic Module, Risk Engine                  | P1-P2     |
| **v5.0** | Historical Knowledge Base, Strategic Council            | P3-P4     |
