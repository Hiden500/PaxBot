import * as fs from "fs";
import * as path from "path";
import { select, input, confirm } from "@inquirer/prompts";
import { initializeCampaignFromMarkdown } from "./builder";
import { loadAllCampaigns } from "./loader";
import { PATHS } from "../shared/config";
import {
  getActiveCampaignName,
  setActiveCampaignName,
  getCampaignUrl,
  setCampaignUrl,
  getSessionDir,
} from "../shared/session";
import { loadMemory } from "../memory";

async function createNewCampaignFlow(): Promise<void> {
  const filename = await input({
    message: "Enter new campaign filename (e.g. 'my-campaign'):",
    validate: (val) => {
      if (!val.trim()) {
        return "Filename cannot be empty.";
      }
      if (/[^a-zA-Z0-9_-]/.test(val)) {
        return "Use only alphanumeric characters, dashes, or underscores.";
      }
      return true;
    },
  });

  const mdName = `${filename}.md`;
  const mdPath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, mdName);
  const templatePath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, "TEMPLATE.md");

  if (fs.existsSync(mdPath)) {
    console.log(`\n⚠️ File ${mdName} already exists.`);
    return;
  }

  // Copy template
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, mdPath);
  } else {
    fs.writeFileSync(mdPath, "# New Campaign\n\n## Country\n...\n", "utf-8");
  }

  console.log(`\n✨ Created template at: ${mdPath}`);
  console.log(
    "📝 Please open this file in your editor and describe the campaign parameters (country, goals, priorities, constraints)."
  );

  await input({
    message: "Press ENTER when you have finished editing the file to generate the JSON campaign...",
  });

  console.log("Generating campaign JSON using LLM...");
  try {
    const campaign = await initializeCampaignFromMarkdown(mdPath);
    console.log(`✅ Campaign "${campaign.name}" created and set as active.`);
  } catch (err) {
    console.error(`❌ Failed to create campaign: ${(err as Error).message}`);
  }
}

async function viewCampaignStatus(): Promise<void> {
  const activeCampaign = getActiveCampaignName();
  const currentUrl = getCampaignUrl() || process.env.GAME_URL || "None";
  const memory = loadMemory();

  console.log("\n==================================================");
  console.log(`📊 CAMPAIGN STATUS: ${activeCampaign}`);
  console.log(`🌐 GAME_URL: ${currentUrl}`);
  console.log("==================================================");

  // Strategic Summary
  console.log(`\n📜 Historical Context:`);
  console.log(`  ${memory.summary.historicalContext}`);

  // Achievements
  if (memory.summary.achievements.length > 0) {
    console.log(`\n🏆 Achievements (${memory.summary.achievements.length}):`);
    memory.summary.achievements.forEach((a) => {
      console.log(`  • [Turn ${a.turn}] ${a.description}`);
    });
  } else {
    console.log("\n🏆 Achievements: None yet");
  }

  // Failures
  if (memory.summary.failures.length > 0) {
    console.log(`\n❌ Failures (${memory.summary.failures.length}):`);
    memory.summary.failures.forEach((f) => {
      console.log(`  • [Turn ${f.turn}] ${f.description}`);
    });
  }

  // Lessons Learned
  if (memory.lessonsLearned.length > 0) {
    console.log(`\n💡 Lessons Learned (${memory.lessonsLearned.length}):`);
    memory.lessonsLearned.slice(-5).forEach((l) => {
      const typeIcon = l.type === "success" ? "✅" : "⚠️";
      console.log(`  ${typeIcon} [Turn ${l.turn}] ${l.lesson}`);
    });
  } else {
    console.log("\n💡 Lessons Learned: None yet");
  }

  // Active Operations from ledger
  const ledgerPath = path.join(getSessionDir(), PATHS.STRATEGIC_LEDGER);
  if (fs.existsSync(ledgerPath)) {
    try {
      const rawLedger = fs.readFileSync(ledgerPath, "utf-8");
      const ledger = JSON.parse(rawLedger);
      if (ledger.active_operations && ledger.active_operations.length > 0) {
        console.log(`\n⚔️ Active Operations (${ledger.active_operations.length}):`);
        ledger.active_operations.forEach((op: any) => {
          console.log(`  • [${op.operation_id}] ${op.goal}`);
        });
      } else {
        console.log("\n⚔️ Active Operations: None");
      }
    } catch {
      // ignore
    }
  }

  console.log("\n==================================================");
  await input({ message: "Press ENTER to return to menu..." });
}

async function resetCampaignSession(): Promise<void> {
  const activeCampaign = getActiveCampaignName();
  const confirmed = await confirm({
    message: `⚠️ Are you sure you want to reset all session progress for campaign "${activeCampaign}"? This will delete memory, active operations and logs.`,
    default: false,
  });

  if (confirmed) {
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
      console.log(`\n🧹 Session progress for campaign "${activeCampaign}" has been reset.`);
    }
  }
}

export async function runInteractiveMenu(): Promise<void> {
  if (process.argv.includes("--continue")) {
    return;
  }

  let activeCampaign = getActiveCampaignName();
  let currentUrl = getCampaignUrl() || process.env.GAME_URL || "";

  let exit = false;
  while (!exit) {
    const action = await select({
      message: "PaxBot Main Menu",
      choices: [
        { name: `🚀 Continue (${activeCampaign})`, value: "continue" },
        { name: "📁 Select Campaign", value: "select_campaign" },
        { name: "✨ Create New Campaign", value: "create_campaign" },
        { name: `🌐 Change GAME_URL (current: ${currentUrl || "None"})`, value: "change_url" },
        { name: "📊 View Campaign Status", value: "view_status" },
        { name: "🧹 Reset Campaign Session", value: "reset_session" },
        { name: "❌ Exit", value: "exit" },
      ],
    });

    if (action === "continue") {
      if (!currentUrl) {
        console.log("⚠️ GAME_URL is not set. Please set it first.");
        continue;
      }
      exit = true;
    } else if (action === "select_campaign") {
      const campaigns = loadAllCampaigns();
      if (campaigns.length === 0) {
        console.log("No campaigns found.");
        continue;
      }
      const selected = await select({
        message: "Select a campaign:",
        choices: campaigns.map((c) => ({ name: c.name, value: c.name })),
      });
      setActiveCampaignName(selected);
      activeCampaign = selected;
      currentUrl = getCampaignUrl() || process.env.GAME_URL || "";
    } else if (action === "create_campaign") {
      await createNewCampaignFlow();
      activeCampaign = getActiveCampaignName();
      currentUrl = getCampaignUrl() || process.env.GAME_URL || "";
    } else if (action === "change_url") {
      const newUrl = await input({
        message: "Enter GAME_URL:",
        default: currentUrl,
      });
      if (newUrl.trim()) {
        setCampaignUrl(newUrl.trim());
        currentUrl = newUrl.trim();
      }
    } else if (action === "view_status") {
      await viewCampaignStatus();
    } else if (action === "reset_session") {
      await resetCampaignSession();
    } else if (action === "exit") {
      process.exit(0);
    }
  }
}
