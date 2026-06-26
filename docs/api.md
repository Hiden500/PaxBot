# Внутренний API — PaxBot

Этот документ описывает основные внутренние модули и их API.

## 1. Spy (Модуль Восприятия)

Отвечает за перехват сетевого трафика и извлечение игрового состояния.

- `captureState(page: Page): Promise<void>` — настраивает перехватчик сети в Playwright.
- `OwnershipParser.parse(data: any): OwnershipSnapshot` — преобразует сырые данные владения территориями в структурированный вид.
- `StateWriter.write(state: GameState): void` — сохраняет состояние в `war-room/sessions/<session_id>/current_state.json`.

## 2. Brain (Модуль Мышления)

Центральный модуль логики, обращающийся к LLM.

- `ContextAssembler.assemble(sessionId: string): BrainContext` — собирает текущее состояние игры, кампанию, память и стратегию в единый контекст.
- `ActionGenerator.generate(context: BrainContext): Promise<GeneratedActions>` — вызывает LLM-провайдера и генерирует набор действий.
- `LLMProvider` — абстракция для Gemini, Groq, OpenAI.
  - `generate(prompt: string): Promise<string>` — отправляет запрос к модели.

## 3. Hand (Модуль Исполнения)

Выполняет действия в браузере.

- `ActionExecutor.execute(page: Page, actions: Action[]): Promise<void>` — выполняет клики и ввод текста согласно списку сгенерированных действий.

## 4. Campaign (Модуль Кампаний)

Управление стратегическими целями.

- `CampaignLoader.load(campaignId: string): Campaign` — загружает кампанию из markdown/json.
- `CampaignValidator.validate(campaign: Campaign): ValidationResult` — проверяет структуру кампании.

## 5. Memory (Стратегическая Память)

Долговременная память для сессий.

- `MemoryLoader.load(sessionId: string): StrategicMemory` — загружает файлы памяти.
- `MemoryUpdater.updateAfterTurn(memory: StrategicMemory, lastActions: Action[]): StrategicMemory` — обновляет память по итогам хода.

## 6. Strategy (Стратегические Фазы)

- `StrategyPlanner.analyzePhase(state: GameState, plan: StrategyPlan): PhaseAnalysis` — оценивает условия перехода в новую стратегическую фазу.
