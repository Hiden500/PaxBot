# Развертывание и Запуск

## Требования

- **Node.js** 18+
- **npm** 9+
- ОС: Windows, macOS или Linux (работает везде, но Playwright может требовать зависимости на Linux).

## Установка

1. Клонировать репозиторий:
   ```bash
   git clone https://github.com/Hiden500/PaxBot.git
   cd PaxBot
   ```
2. Установить зависимости:
   ```bash
   npm install
   ```
3. Установить браузеры Playwright:
   ```bash
   npx playwright install chromium
   ```

## Настройка `.env`

Создайте `.env` файл из шаблона `.env.example`:

```env
# Выбор провайдера (gemini, groq, openai)
LLM_PROVIDER=gemini

# API Ключи
GROQ_API_KEY=gsk_...
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...

# Стартовый URL игры
GAME_URL=https://www.paxhistoria.co/...
```

## Авторизация (Auth Capture)

Чтобы агент мог взаимодействовать с игрой, необходимо сохранить состояние сессии.

```bash
npm run capture-auth
```

Откроется окно браузера. Войдите в свой аккаунт на Pax Historia. После входа закройте браузер или скрипт сам сохранит состояние в `auth/auth_state.json`.

## Запуск

Запустить автоматизацию можно командой:

```bash
npm start
```

Для ручного тестирования промптов (без браузера):

```bash
npm run manual-test
```
