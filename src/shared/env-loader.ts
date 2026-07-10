import { existsSync } from "fs";
import { resolve } from "path";
import { logger } from "./logger";
import dotenv from "dotenv";

/**
 * Загружает переменные окружения из .env (или .env.example, если .env не найден)
 * Централизованный загрузчик для предотвращения дублирования и проблем с импортами в тестах.
 */
export function loadEnv(): void {
  const envPath = existsSync(resolve(process.cwd(), ".env"))
    ? resolve(process.cwd(), ".env")
    : resolve(process.cwd(), ".env.example");

  try {
    dotenv.config({ path: envPath });
  } catch (e) {
    // В некоторых тестовых окружениях `config` может быть не определен
    // из-за проблем с импортами ESM/CJS, игнорируем, если не удалось загрузить.
  }
  logger.debug(`[EnvLoader] Загружены переменные окружения из: ${envPath}`);
}
