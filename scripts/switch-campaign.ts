import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../src/shared/config";
import { setActiveCampaignName, getActiveCampaignName } from "../src/shared/session";

function main() {
  const campaignsDir = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR);

  if (!fs.existsSync(campaignsDir)) {
    console.error("No campaigns directory found.");
    process.exit(1);
  }

  const files = fs.readdirSync(campaignsDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error("No campaign JSON files found.");
    process.exit(1);
  }

  const active = getActiveCampaignName();
  console.log(`Current active campaign: ${active}\n`);

  console.log("Available campaigns:");
  const campaigns = files.map((f) => path.basename(f, ".json"));

  campaigns.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c}${c === active ? " (active)" : ""}`);
  });

  const target = process.argv[2];
  if (!target) {
    console.log("\nUsage: npm run switch-campaign <name_or_number>");
    process.exit(0);
  }

  let selected = target;
  if (/^\d+$/.test(target)) {
    const idx = parseInt(target, 10) - 1;
    if (idx >= 0 && idx < campaigns.length) {
      selected = campaigns[idx];
    } else {
      console.error("Invalid campaign number.");
      process.exit(1);
    }
  }

  if (!campaigns.includes(selected)) {
    console.error(`Campaign '${selected}' not found.`);
    process.exit(1);
  }

  setActiveCampaignName(selected);
  console.log(`\nSuccessfully switched to campaign: ${selected}`);
}

main();
