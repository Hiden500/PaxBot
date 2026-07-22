# Architecture — PaxBot

## 1. Общая архитектура

PaxBot построена по принципу **Cognitive Loop** (когнитивный цикл): агент воспринимает состояние игры, принимает стратегическое решение и выполняет действия через браузерную автоматизацию.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Cognitive Loop                             │
│                                                                   │
│  Spy (Восприятие)       Brain (Мышление)         Hand (Действие) │
│       │                       │                         │        │
│       ▼                       ▼                         ▼        │
│  Network Traffic ──► LLM (Gemini/Groq/OpenAI) ──► Playwright    │
│       │                       │                         │        │
│       └─────── War Room ──────┘                         │        │
│         (Файловая память: state, ledger, campaign,       │        │
│          memory, strategy)                               │        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Слои приложения

### 2.1 Spy — Восприятие (Perception)

**Путь:** `src/spy/`, `src/interactor.ts`

**Назначение:** Перехват и парсинг игровых данных из сети.

**Компоненты:**

| Компонент           | Файл                | Назначение                                              |
| ------------------- | ------------------- | ------------------------------------------------------- |
| Network Interceptor | `src/interactor.ts` | Перехват ответов от `/api/simple-chat` через Playwright |
| Ownership Parser    | `src/spy/`          | Парсинг JSON-данных о владении территориями             |
| State Writer        | `src/spy/`          | Запись спарсенного состояния в `current_state.json`     |

**Вход:** HTTP-ответ от `/api/simple-chat`
**Выход:** `war-room/current_state.json`

### 2.2 War Room — Локальная память (Local Memory)

**Путь:** `war-room/`

**Назначение:** Персистентное хранение состояния игры, стратегии и памяти.

**Файлы:**

| Файл/Папка                                  | Назначение                                         | Статус       |
| ------------------------------------------- | -------------------------------------------------- | ------------ |
| `active-campaign.txt`                       | Имя активной кампании                              | ✅ Актуально |
| `campaigns/*.json`                          | Структурированные кампании (Campaign JSON)         | ✅ Актуально |
| `campaigns/*.md`                            | Markdown-описание кампаний (человекочитаемый ввод) | ✅ Актуально |
| `sessions/<id>/current_state.json`          | Текущее состояние игры (карта, армии, события)     | ✅ Актуально |
| `sessions/<id>/strategic_ledger.json`       | Долговременная память: активные планы, операции    | ✅ Актуально |
| `sessions/<id>/ownership_snapshot.json`     | Снэпшот владения территориями                      | ✅ Актуально |
| `sessions/<id>/advisor_response.txt`        | Ответ советника (перезаписывается каждый ход)      | ✅ Актуально |
| `sessions/<id>/strategy/strategy-plan.json` | Стратегические фазы (изолированы)                  | ✅ Актуально |
| `sessions/<id>/memory/`                     | Стратегическая память (изолирована)                | ✅ Актуально |
| `sessions/<id>/next_advisor_query.txt`      | Очередной запрос к советнику                       | ✅ Актуально |
| `next_advisor_query.txt`                    | Очередной запрос к советнику                       | ✅ Актуально |

### 2.3 Brain — Мышление (LLM Logic)

**Путь:** `src/brain/`

**Назначение:** Сборка контекста, стратегическое мышление, генерация действий.

**Компоненты:**

| Компонент         | Файл                   | Назначение                                                                                                           |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Context Assembler | `src/brain/`           | Сборка всех файлов War Room (state, ledger, campaign, memory, strategy) в единый промпт                              |
| Action Generator  | `src/brain/`           | Генерация JSON-списка действий на основе промпта, обновление strategic_ledger.json                                   |
| LLM Client        | `src/brain/`           | Провайдер-агностик клиент для взаимодействия с LLM (Gemini/Groq/OpenAI)                                              |
| Providers         | `src/brain/providers/` | Абстракция LLM-провайдеров: интерфейс `LLMProvider`, реализации Gemini/Groq/OpenAI, фабрика Registry с retry-логикой |

**Логика работы:**

1. Загрузить текущий game state, constitution, handbook, ledger
2. Загрузить активную кампанию (если есть)
3. Загрузить стратегическую память (достижения, профайлы, уроки)
4. Загрузить стратегический план (текущая фаза)
5. Провайдер-агностик клиент отправляет единый промпт в LLM
6. LLM возвращает JSON: reasoning + actions + ledger_updates + next_advisor_query
7. Обновить strategic_ledger.json (слияние с существующими операциями)
8. Сохранить динамический advisor query для следующего хода

**Вход:** Файлы War Room
**Выход:** JSON-массив действий для Hand

### 2.4 Campaign — Кампании (Strategy)

**Путь:** `src/campaign/`

**Назначение:** Структурированные кампании, управление стратегией.

**Компоненты:**

| Компонент          | Файл                        | Назначение                                                          |
| ------------------ | --------------------------- | ------------------------------------------------------------------- |
| Campaign Loader    | `src/campaign/loader.ts`    | Загрузка и кэширование кампаний из `war-room/campaigns/`            |
| Campaign Validator | `src/campaign/validator.ts` | Валидация campaign.json файлов (12 unit-тестов)                     |
| Campaign Builder   | `src/campaign/builder.ts`   | LLM-парсер стратегии на естественном языке в структурированный JSON |
| Campaign CLI Menu  | `src/campaign/menu.ts`      | CLI интерактивное меню (выбор кампании, создание, сброс)            |

**Вход:** `war-room/campaigns/*.json`, `war-room/campaigns/*.md`
**Выход:** Структурированная кампания в контексте Brain

### 2.5 Hand — Исполнение (Execution)

**Путь:** `src/hand/`

**Назначение:** Автоматизация браузера через Playwright.

**Компоненты:**

| Компонент       | Файл                        | Назначение                                            |
| --------------- | --------------------------- | ----------------------------------------------------- |
| Action Executor | `src/hand/actions.ts`       | Итерация по списку действий, ввод в UI и сабмит       |
| Popup Watcher   | `src/hand/popup-watcher.ts` | Фоновое отслеживание и закрытие всплывающих окон игры |

**Логика работы:**

1. Получить JSON-массив действий от Brain
2. Для каждого действия: найти `textarea[placeholder="Enter your action..."]`, ввести текст, нажать Submit
3. После выполнения всех действий — финальная запись в `strategic_ledger.json`

**Вход:** JSON-массив действий
**Выход:** Действия, выполненные в браузере

### 2.6 Memory — Стратегическая память (v3.0)

**Путь:** `src/memory/`

**Назначение:** Долговременная память для сохранения контекста через сотни ходов.

**Компоненты:**

| Компонент      | Файл          | Назначение                                                    |
| -------------- | ------------- | ------------------------------------------------------------- |
| Memory Loader  | `src/memory/` | Загрузка/сохранение memory-файлов, форматирование для промпта |
| Memory Updater | `src/memory/` | Авто-извлечение достижений/провалов из reasoning LLM          |

**Файлы:** `war-room/sessions/<id>/memory/strategic_summary.json`, `rival_profiles.json`, `lessons_learned.json`

### 2.7 Strategy — Стратегические фазы (v3.0)

**Путь:** `src/strategy/`

**Назначение:** Предотвращение иррационального долгосрочного планирования.

**Компоненты:**

| Компонент        | Файл            | Назначение                                                |
| ---------------- | --------------- | --------------------------------------------------------- |
| Strategy Planner | `src/strategy/` | Загрузка плана, анализ exit conditions, управление фазами |

**Файлы:** `war-room/sessions/<id>/strategy/strategy-plan.json`

**Фазы по умолчанию:** Stabilization → Economic Expansion → Regional Dominance → Global Power

---

## 3. Модули и зависимости

### 3.1 Структура проекта

```
src/
├── index.ts                        — Точка входа, когнитивный цикл
├── interactor.ts                   — Network Interceptor (Spy)
├── brain/                          — LLM-логика
│   ├── index.ts                    — Экспорты
│   ├── context-assembler.ts        — Сборка контекста
│   ├── action-generator.ts         — Генерация действий
│   ├── llm-client.ts               — Провайдер-агностик клиент
│   └── providers/                  — Абстракция LLM-провайдеров
│       ├── provider.ts             — Интерфейс LLMProvider
│       ├── gemini-provider.ts      — Gemini
│       ├── groq-provider.ts        — Groq
│       ├── openai-provider.ts      — OpenAI
│       └── registry.ts             — Фабрика + retry
├── campaign/                       — Кампании (v2.0)
│   ├── index.ts
│   ├── types.ts
│   ├── loader.ts
│   ├── validator.ts
│   └── builder.ts                  — LLM-парсер стратегии
├── memory/                         — Стратегическая память (v3.0)
│   ├── index.ts
│   ├── types.ts
│   ├── loader.ts
│   └── updater.ts
├── strategy/                       — Стратегические фазы (v3.0)
│   ├── index.ts
│   ├── types.ts
│   └── planner.ts
├── hand/                           — Playwright автоматизация
│   ├── index.ts
│   ├── actions.ts
│   ├── navigate.ts
│   └── selectors.ts
├── shared/                         — Общие типы и схемы
│   ├── index.ts
│   ├── config.ts                   — Централизованный конфиг
│   ├── logger.ts
│   └── schemas.ts
└── spy/                            — Парсинг данных
    ├── index.ts
    ├── capture.ts
    ├── ownership-parser.ts
    └── state-writer.ts
```

### 3.2 Диаграмма зависимостей

```
index.ts
  ├── interactor.ts (Spy)
  │     └── spy/ownership-parser.ts
  │     └── spy/state-writer.ts
  ├── brain/ (Brain)
  │     ├── providers/ (Gemini/Groq/OpenAI)
  │     └── shared/schemas.ts
  ├── campaign/ (Campaign Engine)
  ├── memory/ (Strategic Memory)
  ├── strategy/ (Strategic Phases)
  └── hand/ (Hand — Playwright)
```

---

## 4. Data Flow (поток данных)

```
1. Spy перехватывает ответ /api/simple-chat          [interactor.ts]
       │
2. Парсинг JSON → current_state.json                  [spy/*.ts]
       │
3. Brain собирает контекст:                            [brain/context-assembler.ts]
   ├── current_state.json
   ├── strategic_ledger.json
   ├── advisor_response.txt
   ├── campaign (war-room/campaigns/)              — v2.0 (основной источник идентичности)
   ├── memory (sessions/<id>/memory/)              — v3.0 (Стратегическая память)
   └── strategy (sessions/<id>/strategy/)          — v3.0 (Стратегический план)
       │
4. LLM генерирует JSON-действия                      [brain/action-generator.ts]
   (Gemini / Groq / OpenAI — переключаемо)
       │
5. Hand выполняет действия в браузере                [hand/]
       │
6. Memory Update — извлечение достижений/провалов    [memory/updater.ts]
   из reasoning LLM в strategic memory
       │
7. Финальная запись в strategic_ledger.json
       │
8. Переход к следующему ходу (time-jump)
```

---

## 5. Используемые технологии

| Технология     | Назначение                                                  |
| -------------- | ----------------------------------------------------------- |
| **TypeScript** | Основной язык разработки (strict mode, ES Modules)          |
| **Node.js**    | Среда выполнения                                            |
| **Playwright** | Автоматизация браузера                                      |
| **LLM**        | Gemini / Groq / OpenAI — переключается через `LLM_PROVIDER` |
| **Vitest**     | Тестирование (112 тестов)                                   |
| **npm**        | Пакетный менеджер                                           |

---

## 6. Решённые ограничения

| Ограничение                      | Решено в | Статус                        |
| -------------------------------- | -------- | ----------------------------- |
| Жёсткая привязка к Gemini        | v2.0     | ✅ Абстракция провайдеров     |
| Стратегия только в промптах      | v2.0     | ✅ Структурированные кампании |
| Нет долговременной памяти        | v3.0     | ✅ Strategic Memory           |
| Нет стратегического планирования | v3.0     | ✅ Strategic Phases           |

## 7. Текущие ограничения архитектуры

### Архитектурный долг (tech debt)

| Проблема                                            | Где                | Severity | Версия фикса |
| --------------------------------------------------- | ------------------ | -------- | ------------ |
| Memory в промпте не лимитирована — риск token bloat | `memory/loader.ts` | 🟢 P3    | v4.0         |

### Single-agent ограничения

- **Single-agent:** Весь цикл выполняется одним модулем Brain, нет разделения на Planner/Critic/Executor
- **Нет метрик:** Отсутствует система объективной оценки прогресса (KPI)
- **Нет Critic модуля:** Нет самопроверки действий перед выполнением
- **Нет Risk Engine:** Нет формализованных аудитов рисков
- **Нет Web UI:** Мониторинг только через консоль

Эти ограничения будут адресованы в следующих версиях (см. [roadmap.md](roadmap.md)).

---

## 8. Планируемые изменения архитектуры

| Версия   | Архитектурные изменения                                                                             |
| -------- | --------------------------------------------------------------------------------------------------- |
| **v2.0** | `src/brain/providers/` (LLM Provider Abstraction), `src/campaign/` (Campaign Engine) ✅ реализовано |
| **v3.0** | `war-room/memory/` (Strategic Memory), `war-room/strategy/` (Strategic Phases) ✅ реализовано       |
| **v4.0** | KPI System, Critic Module, Risk Engine                                                              |
| **v5.0** | Multi-agent архитектура (Strategist → Planner → Critic → Executor)                                  |
