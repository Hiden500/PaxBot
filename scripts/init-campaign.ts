import * as path from "path";
import * as fs from "fs";
import { initializeCampaignFromMarkdown } from "../src/campaign/builder";

async function main() {
  const mdFile = process.argv[2];
  if (!mdFile) {
    console.error("Usage: npm run init-campaign <path/to/campaign.md>");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), mdFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  await initializeCampaignFromMarkdown(filePath);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
