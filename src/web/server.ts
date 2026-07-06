import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import * as fs from "fs";
import dotenv from "dotenv";
import { 
  tui, 
  getActiveCampaignName, 
  setActiveCampaignName, 
  getCampaignUrl, 
  setCampaignUrl,
  getSessionDir,
  PATHS 
} from "../shared";
import { loadAllCampaigns } from "../campaign/loader";
import { initializeCampaignFromMarkdown } from "../campaign/builder";
import { bootBrowser } from "../boot";
import { runCognitiveLoop } from "../loop";
import { startPopupWatcher, stopPopupWatcher } from "../hand";
import open from "open";
import type { BrowserContext } from "playwright";

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer);

const PORT = process.env.WEB_PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

let activeBrowser: BrowserContext | null = null;
let isBotRunning = false;
let loopPromise: Promise<void> | null = null;

// Read helper to get config state
function getLobbyInfo() {
  const campaignsList = loadAllCampaigns().map(c => c.name);
  // Scan war-room/campaigns for markdown files if they are template MDs
  const campaignsDir = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR);
  if (fs.existsSync(campaignsDir)) {
    const files = fs.readdirSync(campaignsDir);
    for (const f of files) {
      if (f.endsWith(".json")) {
        const name = f.replace(".json", "");
        if (!campaignsList.includes(name)) {
          campaignsList.push(name);
        }
      }
    }
  }

  const provider = process.env.LLM_PROVIDER || "gemini";
  
  return {
    campaigns: campaignsList,
    activeCampaign: getActiveCampaignName(),
    gameUrl: getCampaignUrl() || process.env.GAME_URL || "",
    provider: provider,
    agentLang: process.env.AGENT_LANGUAGE || "Russian",
    uiLang: process.env.UI_LANGUAGE || "ru",
    baseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL || "",
    isRunning: isBotRunning,
  };
}

// Function to dynamically update/write .env file
function updateEnvFile(config: Record<string, string>) {
  const envPath = path.join(process.cwd(), ".env");
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n");
  const configKeys = Object.keys(config);
  
  for (const key of configKeys) {
    const index = lines.findIndex(line => line.trim().startsWith(`${key}=`));
    if (index !== -1) {
      lines[index] = `${key}=${config[key]}`;
    } else {
      lines.push(`${key}=${config[key]}`);
    }
  }

  fs.writeFileSync(envPath, lines.join("\n").trim() + "\n", "utf-8");

  // Re-inject environment variables in current process
  for (const key of configKeys) {
    process.env[key] = config[key];
  }
}

io.on("connection", (socket) => {
  console.log("[Web] Client connected to dashboard");
  
  socket.emit("state", tui.getState());

  // Lobby queries
  socket.on("setup:get_info", () => {
    socket.emit("setup:info", getLobbyInfo());
  });

  socket.on("setup:create_campaign", async (name: string) => {
    try {
      const filename = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
      const mdName = `${filename}.md`;
      const mdPath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, mdName);
      const templatePath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, "TEMPLATE.md");

      if (fs.existsSync(mdPath)) {
        socket.emit("setup:error", `Кампания с именем ${mdName} уже существует.`);
        return;
      }

      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, mdPath);
      } else {
        fs.writeFileSync(mdPath, "# New Campaign\n\n## Country\n...\n", "utf-8");
      }

      socket.emit("setup:campaign_created", filename);
    } catch (e) {
      socket.emit("setup:error", `Ошибка создания кампании: ${(e as Error).message}`);
    }
  });

  socket.on("setup:reset_session", () => {
    const activeCampaign = getActiveCampaignName();
    const sessionDir = getSessionDir();
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        const filePath = path.join(sessionDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
      socket.emit("setup:session_reset_done");
    }
  });

  // Start Autopilot Bot
  socket.on("setup:start_bot", async (config) => {
    if (isBotRunning) {
      return;
    }

    try {
      console.log("[Web] Starting bot autopilot cycle...");
      
      // 1. Update config
      setActiveCampaignName(config.campaign);
      setCampaignUrl(config.gameUrl);
      
      const envUpdates: Record<string, string> = {
        LLM_PROVIDER: config.provider,
        AGENT_LANGUAGE: config.agentLang,
        UI_LANGUAGE: config.uiLang,
      };

      if (config.apiKey) {
        if (config.provider === "gemini") {
          envUpdates.GOOGLE_API_KEY = config.apiKey;
        } else if (config.provider === "groq") {
          envUpdates.GROQ_API_KEY = config.apiKey;
        } else if (config.provider === "openai") {
          envUpdates.OPENAI_API_KEY = config.apiKey;
        } else if (config.provider === "openaicompat") {
          envUpdates.OPENAI_COMPATIBLE_API_KEY = config.apiKey;
        }
      }
      
      if (config.baseUrl) {
        envUpdates.OPENAI_COMPATIBLE_BASE_URL = config.baseUrl;
      }

      updateEnvFile(envUpdates);

      // 2. Clear state settings
      tui.setStopping(false);
      tui.setPaused(false);
      
      // 3. Launch browser
      const { browser, page } = await bootBrowser();
      activeBrowser = browser;
      isBotRunning = true;

      startPopupWatcher(page);

      // 4. Start loop
      loopPromise = runCognitiveLoop(page).then(() => {
        console.log("[Web] Autopilot loop finished.");
      }).catch(err => {
        console.error("[Web] Autopilot loop error:", err);
      }).finally(async () => {
        stopPopupWatcher();
        if (activeBrowser) {
          await activeBrowser.close();
          activeBrowser = null;
        }
        isBotRunning = false;
        tui.setPaused(false);
        tui.setStopping(false);
        io.emit("setup:info", getLobbyInfo());
      });

    } catch (err) {
      console.error("[Web] Start bot error:", err);
      socket.emit("setup:error", `Ошибка запуска: ${(err as Error).message}`);
    }
  });

  // Handle Control Panel Commands
  socket.on("command:toggle_pause", () => {
    const state = tui.getState();
    tui.setPaused(!state.isPaused);
    console.log(`[Web] Toggle pause state to: ${tui.getState().isPaused}`);
  });

  socket.on("command:toggle_semiauto", (enabled: boolean) => {
    console.log(`[Web] Received command: Semi-Auto Mode = ${enabled}`);
    tui.setSemiAuto(enabled);
  });

  socket.on("command:next_turn", () => {
    console.log("[Web] Received command: Next Turn");
    if (tui.getState().isPaused) {
      tui.setPaused(false);
    }
  });

  socket.on("command:stop_bot", async () => {
    console.log("[Web] Shutting down bot browser...");
    tui.setStopping(true);
    tui.setPaused(false); // Unblock if waiting
  });
});

/**
 * Start the web server and hook up TUIStateStore to broadcast updates.
 */
export async function startWebServer(): Promise<void> {
  httpServer.listen(PORT, async () => {
    console.log(`[Web] Dashboard running at http://localhost:${PORT}`);
    
    // Auto-open browser
    try {
      await open(`http://localhost:${PORT}`);
    } catch (e) {
      console.log("[Web] Could not auto-open browser tab.");
    }
  });

  tui.addRenderListener(() => {
    io.emit("state", tui.getState());
  });
}

export function stopWebServer(): void {
  io.close();
  httpServer.close();
}