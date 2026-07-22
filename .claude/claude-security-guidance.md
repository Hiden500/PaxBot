# PaxBot Security Rules

Project-specific security rules for the `security-guidance` plugin.
These rules extend the built-in vulnerability detection with PaxBot-specific constraints.

---

## Credentials & Secrets

- Playwright browser credentials (username, password, cookies, session tokens) MUST NEVER be logged,
  written to files, or included in any object passed to an LLM provider.
- API keys from `.env` (GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY) must not appear in
  any response object, log line, or error message. Use `[REDACTED]` if referencing them in errors.
- Never commit `.env` or any file containing real credentials. Use `.env.example` for templates.

## LLM Prompt Injection

- User-controlled data that feeds into LLM prompts (game state, player names, territory names)
  must be sanitized or clearly delimited with XML-style tags to prevent prompt injection.
- Do not construct prompts by concatenating raw game state strings without clear structural delimiters.

## War Room Data Isolation

- Data in `war-room/sessions/` contains runtime agent state and must not be exported or transmitted
  to any external endpoint (HTTP, WebSocket, etc.).
- `war-room/campaigns/` JSON files must not include credentials or API keys — they are intended
  to be committed to version control.

## Browser Automation

- Playwright `page.evaluate()` calls must not inject user-controlled strings as executable code.
- Screenshots captured by Playwright may contain sensitive game data — do not log their base64
  content at INFO or DEBUG level.
- Never call `page.goto()` with a URL constructed from unvalidated external input.

## Network Requests

- All HTTP requests from `src/spy/` to game servers should use read-only methods (GET/HEAD).
  Write operations go through `src/hand/` only.
- Do not follow redirects to domains not in the allowlist (the game's own domain).
