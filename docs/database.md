# База Данных (War Room)

В проекте отсутствует классическая СУБД. Вся информация хранится в файловой системе (в папке `war-room`), чтобы обеспечивать прозрачность для LLM и лёгкость отладки.

## Структура `war-room` (File-based Store)

Папка разделена на общие ресурсы и сессионные данные.

```text
war-room/
  campaigns/                  # Доступные кампании
  sessions/                   # Изолированные папки сессий
    <session_id>/
      current_state.json
      ownership_snapshot.json
      strategic_ledger.json
      memory/
      strategy/
```

## Схемы файлов

### `current_state.json`

Хранит текущее состояние мира (годы, события, армии, дипломатия).

- Схема: `GameState` (см. `shared/schemas.ts`).

### `ownership_snapshot.json`

Слепок владения территориями на текущий ход.

- Схема: `OwnershipSnapshot` (словарь `TerritoryID -> Owner`).

### `strategic_ledger.json`

Активные планы и операции.

- Схема: список `LedgerEntry` (планы, инициативы, ожидаемые результаты).

### `campaigns/*.json`

Структурированное определение кампании.

- Поля: `name`, `country`, `superGoal`, `priorities`, `constraints`, `victoryConditions`.

### `memory/` (Strategic Memory)

- `strategic_summary.json` — ключевые достижения и провалы.
- `rival_profiles.json` — дипломатические профили соперников.
- `lessons_learned.json` — извлечённые уроки.
