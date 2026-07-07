import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { updateEnvFile, getLobbyInfo } from "./server";

const tempCwd = path.join(__dirname, "../../test-results/temp-server-test");

describe("web/server configurations", () => {
  beforeEach(() => {
    vi.spyOn(process, "cwd").mockReturnValue(tempCwd);
    if (!fs.existsSync(tempCwd)) {
      fs.mkdirSync(tempCwd, { recursive: true });
    }
    // Create mocks for campaigns dir
    fs.mkdirSync(path.join(tempCwd, "war-room/campaigns"), { recursive: true });
    fs.mkdirSync(path.join(tempCwd, "war-room/sessions"), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempCwd)) {
      fs.rmSync(tempCwd, { recursive: true, force: true });
    }
  });

  it("updates and creates .env file correctly", () => {
    const envPath = path.join(tempCwd, ".env");
    
    // Initial update
    updateEnvFile({
      TEST_LLM_PROVIDER: "test-openai",
      TEST_AGENT_LANGUAGE: "Russian",
    });

    expect(fs.existsSync(envPath)).toBe(true);
    const content = fs.readFileSync(envPath, "utf-8");
    expect(content).toContain("TEST_LLM_PROVIDER=test-openai");
    expect(content).toContain("TEST_AGENT_LANGUAGE=Russian");
    expect(process.env.TEST_LLM_PROVIDER).toBe("test-openai");

    // Overwrite update
    updateEnvFile({
      TEST_LLM_PROVIDER: "test-gemini",
    });

    const content2 = fs.readFileSync(envPath, "utf-8");
    expect(content2).toContain("TEST_LLM_PROVIDER=test-gemini");
    expect(content2).not.toContain("TEST_LLM_PROVIDER=test-openai");
  });

  it("gathers correct lobby information", () => {
    // Write a dummy campaign file
    const campaignJsonPath = path.join(tempCwd, "war-room/campaigns/test-campaign.json");
    const dummyCampaign = {
      name: "Тестовая кампания",
      country: "Russia",
      superGoal: "Dominance",
      timeHorizon: 5,
      priorities: [],
      constraints: [],
      victoryConditions: []
    };
    fs.writeFileSync(campaignJsonPath, JSON.stringify(dummyCampaign, null, 2), "utf-8");

    // Set process.env to predict getLobbyInfo outputs
    process.env.LLM_PROVIDER = "groq";
    process.env.AGENT_LANGUAGE = "Russian";
    process.env.UI_LANGUAGE = "ru";

    const info = getLobbyInfo();
    expect(info.provider).toBe("groq");
    expect(info.agentLang).toBe("Russian");
    expect(info.uiLang).toBe("ru");
    expect(info.campaigns).toBeInstanceOf(Array);
    
    const hasTestCampaign = info.campaigns.some(c => c.filename === "test-campaign" && c.name === "Тестовая кампания");
    expect(hasTestCampaign).toBe(true);
  });
});
