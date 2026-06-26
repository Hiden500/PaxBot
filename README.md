# PaxBot 🤖🌍

**Автономный ИИ-агент для браузерной стратегии Pax Historia.**

Агент самостоятельно:

1. **Воспринимает** состояние игры (перехват network-трафика)
2. **Анализирует** стратегическую ситуацию через LLM
3. **Выполняет** действия в браузере через Playwright
4. **Запоминает** результаты в долговременную память

---

## Возможности

- ✅ Полный когнитивный цикл: Spy → Brain → Hand
- ✅ Поддержка нескольких LLM-провайдеров: Gemini, Groq, OpenAI
- ✅ Структурированные кампании (определение стратегии в JSON)
- ✅ Стратегическая память (достижения, профайлы соперников, уроки)
- ✅ Стратегические фазы (Stabilization → Expansion → Dominance → Global Power)
- ✅ Graceful shutdown с сохранением состояния
- ✅ 112 unit/integration тестов
- ✅ Retry-логика при ошибках LLM

---

## Архитектура

```
┌──────────────────────────────────────────────────────────────┐
│                      Cognitive Loop                           │
│                                                               │
│  Spy (Восприятие)     Brain (Мышление)       Hand (Действие) │
│       │                     │                       │        │
│       ▼                     ▼                       ▼        │
│  Network Traffic ──► LLM (Groq/Gemini/OpenAI) ──► Playwright │
│       │                     │                       │        │
│       └─────── War Room ────┘                       │        │
│         (state, ledger, campaign, memory, strategy)  │        │
└──────────────────────────────────────────────────────────────┘
```

Подробнее: [docs/architecture.md](docs/architecture.md)

---

## Требования

- **Node.js** 18+ (LTS рекомендуется)
- **npm** 9+
- **Windows 11** (основная платформа, но работает на любой ОС)
- Аккаунт на [paxhistoria.co](https://www.paxhistoria.co)
- API-ключ хотя бы одного LLM-провайдера

---

## Установка

```powershell
# Клонировать репозиторий
git clone https://github.com/Hiden500/PaxBot.git
cd PaxBot

# Установить зависимости
npm install

# Установить браузеры Playwright
npx playwright install chromium
```

---

## Настройка

### 1. Создать `.env` файл

Скопируйте `.env.example` в `.env`:

```powershell
Copy-Item .env.example .env
```

### 2. Указать API-ключи

Откройте `.env` и укажите ключ хотя бы одного провайдера:

```env
GROQ_API_KEY=gsk_your_key_here    # Рекомендуется (быстро, дёшево)
# GOOGLE_API_KEY=your_key_here    # Альтернатива
# OPENAI_API_KEY=sk-your_key_here # Альтернатива
```

### 3. Выбрать LLM-провайдера

По умолчанию используется **Gemini**. Чтобы переключить:

```powershell
$env:LLM_PROVIDER="groq"    # Для текущей сессии
```

Для постоянного переключения — добавьте в `.env`:

```env
LLM_PROVIDER=groq
```

Поддерживаемые провайдеры:

| Провайдер | Значение `LLM_PROVIDER` | Модель по умолчанию       |
| --------- | ----------------------- | ------------------------- |
| Gemini    | `gemini` (по умолчанию) | `gemini-2.5-flash`        |
| Groq      | `groq`                  | `llama-3.3-70b-versatile` |
| OpenAI    | `openai`                | `gpt-4o-mini`             |

### 4. Захватить состояние аутентификации

```powershell
npm run capture-auth
```

Эта команда откроет браузер — войдите в Pax Historia. После входа состояние сохранится в `auth/auth_state.json`.

---

## Запуск

```powershell
npm start
```

Агент автоматически:

1. Загрузит сохранённую аутентификацию
2. Откроет браузер с игрой
3. Начнёт когнитивный цикл: запрос к советнику → анализ → действия → следующий ход

### Опции

```powershell
# Прямой URL игры (пропускает выбор пресета)
$env:GAME_URL="https://www.paxhistoria.co/game/..." ; npm start

# Переключить провайдера
$env:LLM_PROVIDER="openai" ; npm start
```

---

## Структура проекта

```
PaxBot/
├── src/                          # Исходный код
│   ├── index.ts                  # Точка входа, когнитивный цикл
│   ├── interactor.ts             # Network Interceptor (Spy)
│   ├── brain/                    # LLM-логика
│   │   ├── context-assembler.ts  # Сборка контекста
│   │   ├── action-generator.ts   # Генерация действий
│   │   ├── llm-client.ts         # Провайдер-агностик клиент
│   │   └── providers/            # Абстракция LLM-провайдеров
│   ├── campaign/                 # Кампании (v2.0)
│   ├── memory/                   # Стратегическая память (v3.0)
│   ├── strategy/                 # Стратегические фазы (v3.0)
│   ├── hand/                     # Playwright автоматизация
│   ├── shared/                   # Общие типы и схемы
│   └── spy/                      # Парсинг данных
├── war-room/                     # Файловая память
│   ├── campaigns/                # Определения кампаний (MD/JSON)
│   └── sessions/                 # Изолированные сессии
│       └── <session_id>/
│           ├── current_state.json        # Текущее состояние игры
│           ├── strategic_ledger.json     # Активные операции
│           ├── memory/                   # Стратегическая память
│           └── strategy/                 # Стратегические фазы
├── auth/                         # Состояние аутентификации
├── docs/                         # Документация
└── scripts/                      # Вспомогательные скрипты
```

---

## Тестирование

```powershell
npm test                          # Запуск всех тестов
npx vitest run src/brain/         # Только brain
npx vitest run src/campaign/      # Только campaign
npx vitest run src/memory/        # Только memory
npx vitest run src/strategy/      # Только strategy
```

**Текущее покрытие:** 112 тестов (все проходят)

---

## Команды npm

| Команда                   | Описание                                  |
| ------------------------- | ----------------------------------------- |
| `npm start`               | Запуск когнитивного цикла                 |
| `npm test`                | Запуск всех тестов                        |
| `npm run capture-auth`    | Захват состояния аутентификации           |
| `npm run manual-test`     | Ручное тестирование промптов без браузера |
| `npm run init-campaign`   | Инициализация новой кампании из Markdown  |
| `npm run switch-campaign` | Переключение активной кампании            |
| `npm run lint`            | Проверка линтером                         |
| `npm run typecheck`       | Проверка типов TypeScript                 |

---

## Roadmap

| Версия | Статус      | Ключевые возможности                                  |
| ------ | ----------- | ----------------------------------------------------- |
| v1.0   | ✅ Завершён | Тесты, CI, стабилизация, graceful shutdown            |
| v2.0   | ✅ Завершён | Multi-provider LLM, Campaign Engine, Campaign Builder |
| v3.0   | ✅ Завершён | Strategic Memory, Strategic Phases                    |
| v4.0   | 🔜 План     | KPI System, Critic Module, Risk Engine                |
| v5.0   | 📋 План     | Multi-agent, Historical Knowledge Base                |

Подробнее: [docs/roadmap.md](docs/roadmap.md)

---

## Документация

- [Архитектура](docs/architecture.md)
- [PRD](docs/PRD.md)
- [Roadmap](docs/roadmap.md)
- [TODO](docs/todo.md)
- [Changelog](docs/changelog.md)
- [Pax Historia Research](docs/pax-historia-research.md)

---

## Лицензия

MIT
