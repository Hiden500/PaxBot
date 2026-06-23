# Architecture — Pax-Automata

## 1. Общая архитектура

Pax-Automata построена по принципу **Cognitive Loop** (когнитивный цикл): агент воспринимает состояние игры, принимает стратегическое решение и выполняет действия через браузерную автоматизацию.

```
┌─────────────────────────────────────────────────────────┐
│                    Cognitive Loop                        │
│                                                          │
│  Spy (Восприятие)       Brain (Мышление)    Hand (Действие) │
│       │                       │                    │          │
│       ▼                       ▼                    ▼          │
│  current_state.json ──► LLM (Gemini) ──► Playwright          │
│       │                       │                    │          │
│       └─────── War Room ──────┘                    │          │
│               (Файловая память)                     │          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Слои приложения

### 2.1 Spy — Восприятие (Perception)

**Путь:** `src/spy/`

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

| Файл                      | Назначение                                      |
| ------------------------- | ----------------------------------------------- |
| `current_state.json`      | Текущее состояние игры (карта, армии, события)  |
| `constitution.md`         | Долгосрочные цели (неизменяемый документ)       |
| `crisis_handbook.txt`     | Тактические доктрины и процедуры                |
| `strategic_ledger.json`   | Долговременная память: активные планы, операции |
| `ownership_snapshot.json` | Снэпшот владения территориями                   |
| `next_advisor_query.txt`  | Очередной запрос к советнику                    |
| `advisor_response.txt`    | Ответ советника                                 |
| `current_state.json`      | Текущее полное состояние                        |

### 2.3 Brain — Мышление (LLM Logic)

**Путь:** `src/brain/`

**Назначение:** Сборка контекста, стратегическое мышление, генерация действий.

**Компоненты:**

| Компонент         | Файл         | Назначение                                                                                                                        |
| ----------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Context Assembler | `src/brain/` | Сборка `current_state.json`, `constitution.md`, `crisis_handbook.txt`, `strategic_ledger.json` и ответа советника в единый промпт |
| Action Generator  | `src/brain/` | Генерация JSON-списка действий на основе промпта                                                                                  |
| LLM Client        | `src/brain/` | Клиент для взаимодействия с LLM (Gemini)                                                                                          |

**Логика работы:**

1. Обновить статус существующих операций в `strategic_ledger.json`
2. Отфильтровать новые идеи через `constitution.md`
3. Выбрать тактики из `crisis_handbook.txt`
4. Сгенерировать **Batch of Actions** (JSON-список)
5. Сохранить обновлённый `strategic_ledger.json`

**Вход:** Файлы War Room
**Выход:** JSON-массив действий для Hand

### 2.4 Hand — Исполнение (Execution)

**Путь:** `src/hand/`

**Назначение:** Автоматизация браузера через Playwright.

**Компоненты:**

| Компонент       | Файл        | Назначение                                      |
| --------------- | ----------- | ----------------------------------------------- |
| Action Executor | `src/hand/` | Итерация по списку действий, ввод в UI и сабмит |

**Логика работы:**

1. Получить JSON-массив действий от Brain
2. Для каждого действия: найти `textarea[placeholder="Enter your action..."]`, ввести текст, нажать Submit
3. После выполнения всех действий — финальная запись в `strategic_ledger.json`

**Вход:** JSON-массив действий
**Выход:** Действия, выполненные в браузере

---

## 3. Модули и зависимости

### 3.1 Структура проекта

```
src/
├── index.ts              — Точка входа, инициализация когнитивного цикла
├── interactor.ts         — Network Interceptor (Spy)
├── brain/                — LLM-логика
│   └── ...               — context-assembler, action-generator, llm-client
├── hand/                 — Playwright автоматизация
├── shared/               — Общие типы и схемы
│   └── schemas.ts        — JSON-схемы для валидации
└── spy/                  — Парсинг данных
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
  │     └── shared/schemas.ts
  └── hand/ (Hand)
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
   ├── constitution.md
   ├── crisis_handbook.txt
   ├── strategic_ledger.json
   └── advisor_response.txt
       │
4. LLM генерирует JSON-действия                        [brain/action-generator.ts]
       │
5. Hand выполняет действия в браузере                  [hand/]
       │
6. Финальная запись в strategic_ledger.json
       │
7. Переход к следующему ходу (time-jump)
```

---

## 5. Используемые технологии

| Технология     | Назначение                                         |
| -------------- | -------------------------------------------------- |
| **TypeScript** | Основной язык разработки (strict mode, ES Modules) |
| **Node.js**    | Среда выполнения                                   |
| **Playwright** | Автоматизация браузера                             |
| **Gemini API** | LLM для стратегических решений                     |
| **Vitest**     | Тестирование                                       |
| **npm**        | Пакетный менеджер                                  |

---

## 6. Текущие ограничения архитектуры

- **Single-agent:** Весь цикл выполняется одним модулем Brain, нет разделения на Planner/Critic/Executor
- **Жёсткая привязка к Gemini:** Смена провайдера требует изменения кода
- **Стратегия в промптах:** `constitution.md` и `crisis_handbook.txt` — это промпты, а не структурированные данные
- **Память ограничена:** Только `strategic_ledger.json`; нет долговременной истории
- **Нет метрик:** Отсутствует система объективной оценки прогресса (KPI)

Эти ограничения будут адресованы в следующих версиях (см. [roadmap.md](roadmap.md)).

---

## 7. Планируемые изменения архитектуры

Для каждой версии roadmap указаны архитектурные изменения:

| Версия   | Архитектурные изменения                                                                             |
| -------- | --------------------------------------------------------------------------------------------------- |
| **v2.0** | Добавление `src/brain/providers/` (LLM Provider Abstraction) и `src/campaign/` (Campaign Engine)    |
| **v3.0** | Добавление `war-room/memory/` (Strategic Memory) и `war-room/strategy-plan.json` (Strategic Phases) |
| **v4.0** | Добавление модулей Critic и Risk Engine                                                             |
| **v5.0** | Переход к multi-agent архитектуре (Strategist → Planner → Critic → Executor)                        |
