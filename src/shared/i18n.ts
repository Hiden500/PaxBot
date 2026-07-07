/**
 * Localization strings for UI and Logs
 */

import { existsSync } from "fs";
import { resolve } from "path";
import dotenv from "dotenv";

const envPath = existsSync(resolve(process.cwd(), ".env"))
  ? resolve(process.cwd(), ".env")
  : resolve(process.cwd(), ".env.example");
dotenv.config({ path: envPath });

export const UI_LANGUAGE = (process.env.UI_LANGUAGE || "ru").toLowerCase();

type Dictionary = Record<string, string>;

const dictionaries: Record<string, Dictionary> = {
  en: {
    // Menu & Setup
    "menu.continue": "Continue (Auto-resume active campaign)",
    "menu.select": "Select Campaign",
    "menu.create": "Create New Campaign",
    "menu.set_url": "Set/Change GAME_URL for Active Campaign",
    "menu.status": "View Active Campaign Status",
    "menu.reset": "Reset Session (Clear State/Ledger)",
    "menu.exit": "Exit",

    // Dashboard
    "dash.title": "PaxBot Console v3.5",
    "dash.campaign": "Campaign",
    "dash.turn": "Turn",
    "dash.lessons": "Lessons Learned",
    "dash.ledger": "Strategic Ledger",
    "dash.no_ops": "No active operations.",
    "dash.reasoning": "AI Strategic Reasoning",
    "dash.awaiting": "Awaiting next reasoning phase...",
    "dash.milestones": "Campaign Milestones",
    "dash.no_milestones": "No milestones evaluated yet.",
    "dash.risks": "Immediate Risks",
    "dash.no_risks": "No immediate risks.",
    "dash.logs": "System Logs",
    "dash.actions": "Proposed Actions for Turn:",
    "dash.more_actions": "more actions.",

    // Boot & Loop logs
    "log.launching": "Launching browser with auth state...",
    "log.navigating_game": "Navigating to game",
    "log.navigating_base": "Navigating to Pax Historia...",
    "log.waiting_enter": "Waiting for user confirmation to start loop (Press ENTER in terminal)",
    "log.boot_ready": "[Boot] Game UI visible. Ready to start cognitive loop.",
    "log.boot_stuck": "[Boot] Action box not visible yet. Continuing — may need manual navigation.",
    "log.reset_session": "War Room session reset (ledger, state, advisor)",
    "log.using_chrome_profile": "[Boot] Using persistent Chrome profile folder. If prompted, please log in manually.",
    "log.waiting_game_ui": "Waiting for game UI to load...",
    "log.waiting_game_ui_log": "[Boot] Waiting for the game UI elements to become visible. Please log in if prompted in the browser.",
    "log.game_ui_detected": "[Boot] Game UI detected! Applying page scale...",

    // Phases
    "phase1.start": "Querying advisor & capturing state...",
    "phase1.advisor": "Advisor query",
    "phase1.advisor_says": "Advisor says",
    "phase2.start": "Running Brain (LLM reasoning)...",
    "phase4.submitting": "Submitting",
    "phase4.actions": "actions...",
    "phase4.done": "Done — actions submitted.",
    "phase4.skipped": "SKIPPED action",
    "phase5.memory": "Memory updated",
    "phase5.achievements": "achievements",
    "phase5.profiles": "profiles",
    "phase5.failed": "Memory update failed",

    // Hand
    "hand.popup": "Dismissed popup",
    "hand.action_stuck": "Action panel stuck — reloading game page to recover...",
    "hand.next_turn": "Clicked next turn",
    "hand.events": "events…",
    "hand.events_done": "Done dismissing events. Total:",

    // Errors
    "err.no_auth": "No auth state. Run: npm run capture-auth",
    "err.fatal": "Fatal loop error:",
    "err.skip": "ERROR — skipping to next turn:",
  },
  ru: {
    // Menu & Setup
    "menu.continue": "Продолжить (Авто-запуск активной кампании)",
    "menu.select": "Выбрать кампанию",
    "menu.create": "Создать новую кампанию",
    "menu.set_url": "Задать GAME_URL для кампании",
    "menu.status": "Статус кампании",
    "menu.reset": "Сбросить сессию (очистить историю ходов)",
    "menu.exit": "Выход",

    // Dashboard
    "dash.title": "PaxBot Панель Управления v4.0",
    "dash.campaign": "Кампания",
    "dash.turn": "Ход",
    "dash.lessons": "Изучено Уроков",
    "dash.ledger": "Журнал Операций",
    "dash.no_ops": "Нет активных операций.",
    "dash.reasoning": "Мышление ИИ",
    "dash.awaiting": "Ожидание следующей фазы...",
    "dash.milestones": "Цели Кампании",
    "dash.no_milestones": "Цели еще не оценивались.",
    "dash.risks": "Угрозы и Риски",
    "dash.no_risks": "Прямых угроз нет.",
    "dash.logs": "Системные Логи",
    "dash.actions": "Предложенные действия:",
    "dash.more_actions": "и еще действий.",

    // Boot & Loop logs
    "log.launching": "Запуск браузера (с авторизацией)...",
    "log.navigating_game": "Переход к игре",
    "log.navigating_base": "Переход на главную...",
    "log.waiting_enter": "Ожидание подтверждения (Нажмите ENTER в консоли сервера)",
    "log.boot_ready": "[Boot] Интерфейс готов. Начинаем цикл.",
    "log.boot_stuck":
      "[Boot] Поле ввода не найдено. Продолжаем (возможно, нужна ручная навигация).",
    "log.reset_session": "Сессия очищена (журнал, состояние, советы)",
    "log.using_chrome_profile": "[Boot] Использование постоянного профиля Chrome. Если потребуется, войдите в аккаунт вручную.",
    "log.waiting_game_ui": "Ожидание загрузки интерфейса игры...",
    "log.waiting_game_ui_log": "[Boot] Ожидание появления элементов интерфейса игры. Пожалуйста, войдите в аккаунт в браузере, если потребуется.",
    "log.game_ui_detected": "[Boot] Интерфейс игры обнаружен! Применение масштаба страницы...",

    // Phases
    "phase1.start": "Опрос советника и захват карты...",
    "phase1.advisor": "Вопрос ИИ",
    "phase1.advisor_says": "Советник отвечает",
    "phase2.start": "Генерация мыслей ИИ (LLM)...",
    "phase4.submitting": "Вставка",
    "phase4.actions": "действий в игру...",
    "phase4.done": "Готово — действия применены.",
    "phase4.skipped": "ПРОПУЩЕНО действие",
    "phase5.memory": "Память обновлена",
    "phase5.achievements": "достижений",
    "phase5.profiles": "досье",
    "phase5.failed": "Ошибка обновления памяти",

    // Hand
    "hand.popup": "Закрыто всплывающее окно",
    "hand.action_stuck": "Панель действий зависла — перезагрузка страницы...",
    "hand.next_turn": "Нажата кнопка 'Следующий ход'",
    "hand.events": "событий...",
    "hand.events_done": "Все события закрыты. Всего:",

    // Errors
    "err.no_auth": "Нет авторизации. Запустите: npm run capture-auth",
    "err.fatal": "Критическая ошибка:",
    "err.skip": "ОШИБКА — переходим к следующему ходу:",
  },
};

/**
 * Get localized string. Falls back to English if Russian string is missing.
 */
export function t(key: string): string {
  const dict = dictionaries[UI_LANGUAGE] || dictionaries["en"];
  return dict[key] || dictionaries["en"][key] || key;
}
