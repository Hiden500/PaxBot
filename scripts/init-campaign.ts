import * as fs from "fs";
import * as path from "path";
import { callLLM } from "../src/brain/llm-client";
import { validateCampaign } from "../src/campaign/validator";
import type { Campaign } from "../src/campaign/types";
import { setActiveCampaignName, getSessionDir } from "../src/shared/session";
import { PATHS } from "../src/shared/config";

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

  const content = fs.readFileSync(filePath, "utf-8");
  console.log(`Analyzing campaign description from ${path.basename(filePath)}...`);

  const systemPrompt = `You are a strategic AI parser. Parse the user's natural language campaign description into a strict JSON object that matches the Campaign schema.
The JSON must have:
- name: string (generate a cool unique name if none is explicitly provided, e.g. 'Project Vanguard')
- country: string
- superGoal: string
- timeHorizon: number
- priorities: array of { area: string, weight: 1-5, description: string }
- constraints: array of { rule: string, severity: "hard"|"soft" }
- victoryConditions: array of { description: string, target?: number, current?: number }

Return ONLY valid JSON without any markdown formatting like \`\`\`json.`;

  const rawResponse = await callLLM(systemPrompt, content);

  let parsed: any;
  try {
    parsed = JSON.parse(rawResponse.replace(/```json\n?|```/g, "").trim());
  } catch (err) {
    console.error("Failed to parse LLM response as JSON:");
    console.error(rawResponse);
    process.exit(1);
  }

  const validation = validateCampaign(parsed);
  if (validation.errors.length > 0) {
    console.error("Validation failed:");
    validation.errors.forEach((e) => console.error(`- ${e}`));
    process.exit(1);
  }

  const campaign = parsed as Campaign;

  // Save the generated JSON
  const jsonName = path.basename(filePath, ".md") + ".json";
  const jsonPath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, jsonName);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(campaign, null, 2), "utf-8");
  console.log(`Campaign created successfully: ${jsonPath}`);

  // Set as active campaign and initialize session
  setActiveCampaignName(campaign.name);
  console.log(`Set as active campaign: ${campaign.name}`);

  const sessionDir = getSessionDir();
  console.log(`Initialized session directory: ${sessionDir}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
