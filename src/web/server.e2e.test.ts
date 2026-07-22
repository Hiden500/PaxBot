import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { chromium, Browser, Page } from "playwright";

// Mock the 'open' module so it doesn't open a real OS browser window
vi.mock("open", () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

// Set dynamic port for E2E testing before importing the server
const TEST_PORT = 3005;
process.env.WEB_PORT = String(TEST_PORT);

// Create temp directory path
const tempCwd = path.join(__dirname, "../../test-results/temp-server-e2e-test");

// Spy process.cwd before importing components that might use it
vi.spyOn(process, "cwd").mockReturnValue(tempCwd);

let startWebServer: () => Promise<void>;
let stopWebServer: () => void;
let getLobbyInfo: () => any;

describe("Web UI E2E tests (Playwright)", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    // Re-spy CWD just in case before loading server
    vi.spyOn(process, "cwd").mockReturnValue(tempCwd);
    const serverModule = await import("./server.js");
    startWebServer = serverModule.startWebServer;
    stopWebServer = serverModule.stopWebServer;
    getLobbyInfo = serverModule.getLobbyInfo;
  });

  beforeEach(async () => {
    // Re-spy CWD just in case
    vi.spyOn(process, "cwd").mockReturnValue(tempCwd);

    // Setup temp directory structure
    if (!fs.existsSync(tempCwd)) {
      fs.mkdirSync(tempCwd, { recursive: true });
    }
    fs.mkdirSync(path.join(tempCwd, "war-room/campaigns"), { recursive: true });
    fs.mkdirSync(path.join(tempCwd, "war-room/sessions"), { recursive: true });

    // Write a mock campaign
    const campaignJsonPath = path.join(tempCwd, "war-room/campaigns/e2e-test-campaign.json");
    const dummyCampaign = {
      name: "E2E Test Campaign",
      country: "Russia",
      superGoal: "Dominance",
      timeHorizon: 5,
      priorities: [],
      constraints: [],
      victoryConditions: [],
    };
    fs.writeFileSync(campaignJsonPath, JSON.stringify(dummyCampaign, null, 2), "utf-8");

    // Write active campaign
    fs.writeFileSync(
      path.join(tempCwd, "war-room/active-campaign.txt"),
      "e2e-test-campaign",
      "utf-8"
    );

    // Start Express + Socket.io Server
    await startWebServer();

    // Launch Playwright Browser
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterEach(async () => {
    // Close browser
    if (browser) {
      await browser.close();
    }
    // Stop Web Server
    stopWebServer();

    // Clean up directory
    if (fs.existsSync(tempCwd)) {
      fs.rmSync(tempCwd, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it("should load the web dashboard and perform setup tasks", async () => {
    // Go to the local test server
    await page.goto(`http://localhost:${TEST_PORT}`);

    // Wait for the lobby screen to load
    await page.waitForSelector("#lobby-screen", { timeout: 5000 });

    // 1. Verify standard UI Elements (in Russian by default)
    const pageTitle = await page.textContent("h1");
    expect(pageTitle).toContain("PaxBot");

    // Campaign option check
    const campaignSelect = page.locator("#lobby-campaign-select");
    expect(await campaignSelect.isVisible()).toBe(true);

    // Check that our mock campaign is listed and selected
    const selectedCampaignText = await campaignSelect.inputValue();
    expect(selectedCampaignText).toBe("e2e-test-campaign");

    // 2. Test localization language switching (RU -> EN -> RU)
    const uiLangSelect = page.locator("#lobby-ui-lang");
    expect(await uiLangSelect.isVisible()).toBe(true);

    // Switch to English
    await uiLangSelect.selectOption("en");

    // Give it a tiny moment to apply translation selectors in client JS
    await page.waitForTimeout(500);

    // Verify UI has changed to English
    const headerTitleText = await page.locator("h2").first().textContent();
    // In index.html the setup section header translates to "📁 Campaign and game" or similar
    expect(headerTitleText?.toLowerCase()).toContain("campaign");

    // Switch back to Russian
    await uiLangSelect.selectOption("ru");
    await page.waitForTimeout(500);

    const headerTitleTextRu = await page.locator("h2").first().textContent();
    expect(headerTitleTextRu?.toLowerCase()).toContain("кампания");

    // 3. Test changing a configuration value (saves automatically on change/blur)
    const providerSelect = page.locator("#lobby-provider-select");
    await providerSelect.selectOption("groq");
    // Trigger the change event explicitly since selectOption does it, but we wait a moment
    await page.waitForTimeout(300);

    const apiInput = page.locator("#lobby-api-key");
    await apiInput.fill("mock-groq-api-key");
    // Click outside to trigger the 'change' / 'blur' event
    await page.click("h1");

    // Verify config updates in active environment and .env through getLobbyInfo
    await page.waitForTimeout(800);
    const lobbyInfo = getLobbyInfo();
    expect(lobbyInfo.provider).toBe("groq");

    // Read written env file to make sure it was serialized
    const envPath = path.join(tempCwd, ".env");
    expect(fs.existsSync(envPath)).toBe(true);
    const envContent = fs.readFileSync(envPath, "utf-8");
    expect(envContent).toContain("LLM_PROVIDER=groq");
  }, 20000);
});
