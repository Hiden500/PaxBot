/**
 * Temporary script to build strategy plan from campaign JSON directly.
 * Usage: npx tsx scripts/build-strategy.ts <path-to-campaign-json>
 *
 * This reads a campaign JSON file, sets it as active, and generates
 * a strategy plan using the LLM.
 */
import * as fs from "fs";
import * as path from "path";
import { buildStrategyPlanFromCampaign } from "../src/strategy/builder";
import { validateCampaign } from "../src/campaign/validator";
import { setActiveCampaignName, getSessionDir } from "../src/shared/session";
import { PATHS } from "../src/shared/config";

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: npx tsx scripts/build-strategy.ts <path-to-campaign-json>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), jsonPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  let campaign: any;
  try {
    campaign = JSON.parse(raw);
  } catch {
    console.error("Invalid JSON in campaign file");
    process.exit(1);
  }

  // Validate
  const validation = validateCampaign(campaign);
  if (validation.errors.length > 0) {
    console.error(`Campaign validation failed: ${validation.errors.join("; ")}`);
    process.exit(1);
  }

  console.log(`[BuildStrategy] Campaign: "${campaign.name}" (${campaign.country})`);
  console.log(
    `[BuildStrategy] ${campaign.priorities.length} priorities, ${campaign.constraints.length} constraints`
  );

  // Set active campaign so strategy saves to correct session dir
  setActiveCampaignName(campaign.name);
  getSessionDir(); // ensure session dir exists

  const plan = await buildStrategyPlanFromCampaign(campaign);

  if (!plan) {
    console.error("[BuildStrategy] Failed to generate strategy plan");
    process.exit(1);
  }

  console.log(`[BuildStrategy] Plan generated: "${plan.name}"`);
  console.log(`[BuildStrategy] ${plan.phases.length} phases`);

  // Show coverage: list all priorities and flag any not mapped
  const coveredAreas = new Set(plan.phases.flatMap((p) => p.focusAreas));
  const missing = campaign.priorities.filter((p: any) => !coveredAreas.has(p.area));
  if (missing.length > 0) {
    console.warn(`[BuildStrategy] WARNING: ${missing.length} priority(ies) NOT covered:`);
    for (const m of missing) {
      console.warn(`  - "${m.area}" (weight ${m.weight})`);
    }
  } else {
    console.log(`[BuildStrategy] All ${campaign.priorities.length} priorities covered ✓`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
