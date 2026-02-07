# Auth setup (Google login for Pax Historia)

The game at [paxhistoria.co](https://www.paxhistoria.co) uses Google login. Automating the login form with Playwright usually triggers Google’s bot detection (“This browser or app may not be secure”). So we **don’t automate login**; we **log in once manually** and reuse the saved auth state.

---

## Demo: “login” with saved state (no password)

To see that the saved state works, run:

```bash
npm run demo-auth
```

That script **does not type a password or touch Google’s login form**. It:

1. Reads **`auth/auth_state.json`** (cookies + localStorage).
2. Starts a new Playwright browser and **injects** that state into it.
3. Opens **paxhistoria.co**. The site sees the same cookies/localStorage as when you logged in, so it treats the browser as already logged in.
4. You should see the game or your dashboard instead of a login page. The script prints the page URL and title, then closes after a few seconds.

So “logging in with the cookies” = **loading that JSON file into the browser before navigating**. No credentials are stored in code; they live only in `auth/auth_state.json` (and in the browser profile, see below).

---

## What is `auth/profile/`? What must **not** be pushed to GitHub?

| Item | What it is | Push to GitHub? |
|------|------------|-----------------|
| **`auth/auth_state.json`** | Snapshot of cookies + localStorage from one browser session. Used by the **game runner** and **demo** so they open already “logged in”. | **No.** Contains session tokens and identifiers. |
| **`auth/profile/`** | A **persistent browser profile** (like Chrome’s “user data” folder). Used **only by the capture script**. When you run `npm run capture-auth`, it opens this profile so you may already be logged in from last time; you only re-save when you want to refresh `auth_state.json`. | **No.** Contains cookies, cache, and other browser data. |
| **`auth_profile/`** (root) | Old location for the same kind of profile; ignored for new runs. | **No.** |

The repo’s **`.gitignore`** already has:

- **`auth/`** — ignores the whole directory (so `auth_state.json` and `profile/` never get committed).
- **`auth_profile/`** — ignores the legacy profile folder if it still exists.

So **none of these should be pushed to GitHub**. If you ever commit them by mistake, treat the session as compromised: log out everywhere, re-capture auth state, and remove the secrets from git history (e.g. with `git filter-branch` or BFG).

---

## What’s in `auth/auth_state.json`?

Playwright’s **storage state** saves everything needed to restore a logged-in session:

| Part | What it is |
|------|------------|
| **`cookies`** | Array of all cookies. Each has `name`, `value`, `domain`, `path`, **`expires`**, `httpOnly`, `secure`, `sameSite`. |
| **`origins`** | Per-origin **localStorage** (and sessionStorage if present). Sites like Pax Historia store tokens and app state here too. |

So you get **cookies + localStorage** in one file. No need to copy anything by hand.

### Where are the cookies?

At the **top level** of the JSON:

```json
{
  "cookies": [
    { "name": "SID", "value": "...", "domain": ".google.com", "path": "/", "expires": 1805061408.701884, ... },
    ...
  ],
  "origins": [
    { "origin": "https://www.paxhistoria.co", "localStorage": [ ... ] },
    ...
  ]
}
```

### What does `expires` mean?

**`expires`** is a **Unix timestamp in seconds** (decimal allowed). When that time passes, the cookie is no longer sent by the browser.

- **Example:** `1805061408` → **2027-03-13** (Google “Stay signed in”–style cookies often last ~1 year).
- **Session cookies:** Sometimes stored as `-1` or a past date; they last until the browser/tab is closed.
- **To check a value:** In JS: `new Date(1805061408 * 1000)` or in the shell: `date -r 1805061408` (macOS).

So yes: auth state saves **everything** (cookies + localStorage), the **cookies** are in the `cookies` array, and **expiration** is the `expires` number on each cookie.

---

## Recommended: Auth state (log in once, reuse)

### 1. Capture state (one-time or when it expires)

```bash
npx tsx scripts/capture-auth-state.ts
```

- A **real browser window** opens (persistent profile, not headless).
- Go to the game and log in with Google (including the popup).
- When you’re fully in the game, switch back to the terminal and **press Enter**.
- The script saves cookies + localStorage to **`auth/auth_state.json`** (directory `auth/` is gitignored).

### 2. Use it in your Playwright game runner

When starting the browser for the agent, load that file so the session is already logged in:

```ts
import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: "auth/auth_state.json",
});
const page = await context.newPage();
await page.goto("https://www.paxhistoria.co/game/...");
// You should already be logged in.
```

No need to look at the Network tab or copy cookies by hand; `storageState` captures everything Playwright needs.

---

## How long does it last?

- **Session cookies:** Until the browser session that created them would have closed (often hours).
- **Persistent cookies (e.g. “Stay signed in”):** Often weeks to months; Google and the game set their own expiry.
- **In practice:** Re-run the capture script whenever you get logged out or hit a login page again. The script uses a persistent profile (`auth/profile/`) so you can reopen and re-capture anytime.

---

## Optional: Match your real Chrome (if you copy from Chrome)

If you ever export cookies from **regular Chrome** and inject them into Playwright, the site may see a different **User-Agent** and treat the session as suspicious. To reduce that:

1. In Chrome DevTools → **Console** run: `navigator.userAgent` and copy the string.
2. When creating the Playwright context, set the same string:

   ```ts
   const context = await browser.newContext({
     storageState: "auth/auth_state.json",
     userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...", // paste from Chrome
   });
   ```

With the **capture script** (Playwright-only), the saved state already comes from a Playwright Chromium profile, so User-Agent usually matches and you don’t need this unless you hit issues.

---

## Finding cookies manually (only if you need to debug)

You don’t need this for the recommended flow. If you ever do:

- **User-Agent:** DevTools → **Console** → `navigator.userAgent`
- **Cookies:** DevTools → **Application** → **Storage** → **Cookies** → select `https://www.paxhistoria.co` (and `accounts.google.com` if needed). Each row is one cookie; a single request sends all of them in one `Cookie:` header, semicolon-separated. Prefer using `storageState` instead of copying these by hand.

---

## Summary

| Approach              | Use when                          |
|-----------------------|-----------------------------------|
| **Capture script**    | Normal setup: one-time manual login, then reuse `auth/auth_state.json`. |
| **Persistent profile**| Same script uses `auth/profile/` so you can reopen and re-capture anytime. |
| **Manual cookie copy**| Only for debugging or when you can’t run the capture script. |

Run `npm run capture-auth`, log in once, press Enter. State is saved under `auth/`. Use `storageState: 'auth/auth_state.json'` in your game runner.
