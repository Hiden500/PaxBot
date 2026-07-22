# Code Review: Last 3 Commits

**Date**: 2026-07-08
**Scope**: Последние 3 коммита (`HEAD~3..HEAD`)
**Files**: 8 | **Changes**: Анализ текущего кода и последних изменений в `src/brain/`, `src/hand/`, `src/shared/`, `src/spy/`, `src/web/`.

## Summary

|              | Critical | High | Medium | Low |
| ------------ | -------- | ---- | ------ | --- |
| Issues       | 1        | 0    | 1      | 1   |
| Improvements | —        | 1    | 1      | 0   |

**Verdict**: NEEDS WORK

## Issues

### Critical (P0)

#### 1. Ошибка импорта `dotenv` и падение тестов

- **File**: `src/shared/i18n.ts:7`, `src/web/server.ts:6`, `src/brain/providers/registry.ts:10`
- **Problem**: Использование `import * as dotenv from "dotenv"` приводит к падению всех тестов Vitest с ошибкой `TypeError: Cannot read properties of undefined (reading 'config')`. Это происходит из-за того, что `dotenv` экспортирует `config` как named export или default export по-разному в разных окружениях (CommonJS vs ESM).
- **Impact**: Падение всех тестов блокирует CI/CD и разработку.
- **Fix**: В TypeScript/ESM проектах с `dotenv` надежнее использовать `import { config } from "dotenv"` или импортировать сам модуль для побочных эффектов: `import "dotenv/config"`. Для текущей кодовой базы оптимально использовать `import * as dotenv from "dotenv"` и вызывать `dotenv.config()`, НО в тестах Vitest (и Node.js в `tsx`) это ломается. Нужно использовать `import dotenv from "dotenv"` если настроен `esModuleInterop`, или `import { config } from "dotenv"`. Я откатил изменения, но проблему нужно решить системно через настройку `tsconfig.json` (`esModuleInterop: true`).

### Medium (P2)

#### 1. Игнорирование ошибок кодировки при парсинге

- **File**: `src/spy/capture.ts:24`, `src/spy/capture.ts:48`
- **Problem**: Буфер конвертируется в строку с жестко заданной кодировкой `utf-8`: `buffer.toString("utf-8")`. Если сервер ответит в другой кодировке (или если в данных есть некорректные байты), это может привести к ошибкам парсинга JSON или искажению текста.
- **Impact**: Потенциальная потеря данных или ошибки парсинга при нестандартных ответах.
- **Fix**: Рекомендуется использовать `TextDecoder` для более надежного декодирования, или проверять заголовки ответа (`content-type`) для определения кодировки.

### Low (P3)

#### 1. Жестко закодированные таймауты

- **File**: `src/hand/actions-ui-helpers.ts:15`
- **Problem**: `await panelBtn.click({ timeout: 3000 });` — жестко заданный таймаут в 3 секунды.
- **Impact**: В медленных окружениях тест или скрипт может падать.
- **Fix**: Вынести таймауты в конфигурацию (например, `LLM_CONFIG.UI_TIMEOUT`).

## Improvements

### High

#### 1. Оптимизация промпта и контекста

- **File**: `src/brain/context-assembler.ts:146`
- **Current**: Огромный шаблонный литерал `system` с жестко заданным текстом.
- **Recommended**: Вынести системный промпт в отдельный файл (например, `.md` или `.txt`) и загружать его динамически. Это улучшит читаемость кода и упростит редактирование промпта без необходимости менять TypeScript код.

### Medium

#### 1. Дублирование логики загрузки `.env`

- **File**: Одинаковый код `const envPath = existsSync(...)` повторяется в `src/shared/i18n.ts`, `src/brain/providers/registry.ts`, `src/web/server.ts`.
- **Current**: Дублирование кода из 4-5 строк в каждом файле, где нужен доступ к переменным окружения.
- **Recommended**: Создать отдельный модуль `src/shared/env-loader.ts` и импортировать его там, где это необходимо.

## Positive Patterns

1. Отличная структура Zod-схем для валидации ответов LLM в `openaicompat-provider.ts` и явные инструкции по формату JSON.
2. Хорошее покрытие локализацией (`i18n.ts`), что делает проект удобным для разных пользователей.

## Escalation

- Падение тестов Vitest из-за `dotenv`. Требуется архитектурное решение (обновление `tsconfig.json` и `vitest.config.ts`), так как текущие попытки исправить импорт (`import * as dotenv`, `import dotenv`, `require`) ломают либо рантайм, либо тесты.

## Validation

- Type Check: PASS
- Build: N/A (not configured)
- Tests: FAIL (12 failed)
