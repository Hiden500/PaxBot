/**
 * Unit tests for Spy: ownership-parser.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseOwnershipFromStateText, writeOwnershipSnapshot } from "./ownership-parser";
import { getSessionDir } from "../shared/session";

// ---------------------------------------------------------------------------
// parseOwnershipFromStateText
// ---------------------------------------------------------------------------

describe("parseOwnershipFromStateText", () => {
  it("parses our nation and regions from a valid state text", () => {
    const text = [
      "**Status of USA:** The United States of America...",
      "- All Regions Owned: Alaska, Hawaii, Texas, California",
      "- Military Units: 5 battalions",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.our_nation).toBe("USA");
    expect(result!.regions_we_own).toEqual(["Alaska", "Hawaii", "Texas", "California"]);
  });

  it("handles quoted region names", () => {
    const text = [
      "**Status of Republic of China:** ...",
      '- All Regions Owned: "Taiwan", "Fujian", Taiwan Strait',
      "- Military Units:",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.our_nation).toBe("Republic of China");
    expect(result!.regions_we_own).toEqual(["Taiwan", "Fujian", "Taiwan Strait"]);
  });

  it("handles regions with multi-word names", () => {
    const text = [
      "**Status of Russia:** ...",
      "- All Regions Owned: Moscow Oblast, Leningrad Oblast, Sakhalin Island, Kamchatka Krai",
      "- Military Units:",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.regions_we_own).toHaveLength(4);
  });

  it("returns null when **Status of X:** is missing", () => {
    const text = "Some random text without a status header";
    expect(parseOwnershipFromStateText(text)).toBeNull();
  });

  it("returns null when - All Regions Owned: is missing", () => {
    const text = "**Status of USA:** Something\n- Military Units: 5";
    expect(parseOwnershipFromStateText(text)).toBeNull();
  });

  it("returns empty regions array when no regions listed", () => {
    const text = [
      "**Status of Atlantean Empire:** ...",
      "- All Regions Owned: ",
      "- Some Other Section:",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.our_nation).toBe("Atlantean Empire");
    expect(result!.regions_we_own).toEqual([]);
  });

  it("handles newlines within the regions list", () => {
    const text = [
      "**Status of UK:** ...",
      "- All Regions Owned: England, Scotland,",
      "Wales, Northern Ireland",
      "- Military Units:",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.regions_we_own).toContain("Wales");
    expect(result!.regions_we_own).toContain("Northern Ireland");
  });

  it("trims whitespace from region names", () => {
    const text = [
      "**Status of Canada:** ...",
      "- All Regions Owned:  Ontario ,  Quebec , British Columbia ",
      "- Military Units:",
    ].join("\n");

    const result = parseOwnershipFromStateText(text);
    expect(result).not.toBeNull();
    expect(result!.regions_we_own).toEqual(["Ontario", "Quebec", "British Columbia"]);
  });
});

// ---------------------------------------------------------------------------
// writeOwnershipSnapshot
// ---------------------------------------------------------------------------

describe("writeOwnershipSnapshot", () => {
  const TEST_DIR = getSessionDir();
  const TEST_PATH = path.join(TEST_DIR, "ownership_snapshot.json");

  beforeEach(() => {
    if (fs.existsSync(TEST_PATH)) {
      fs.unlinkSync(TEST_PATH);
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_PATH)) {
      fs.unlinkSync(TEST_PATH);
    }
  });

  it("writes a valid snapshot to disk", () => {
    writeOwnershipSnapshot({ our_nation: "USA", regions_we_own: ["Alaska", "Texas"] });

    expect(fs.existsSync(TEST_PATH)).toBe(true);
    const content = JSON.parse(fs.readFileSync(TEST_PATH, "utf-8"));
    expect(content).toEqual({
      our_nation: "USA",
      regions_we_own: ["Alaska", "Texas"],
    });
  });

  it("creates the directory if it does not exist", () => {
    const tempDir = path.join(process.cwd(), "war-room-temp-test");
    const tempPath = path.join(tempDir, "ownership_snapshot.json");

    try {
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(
        tempPath,
        JSON.stringify({ our_nation: "Test", regions_we_own: ["A"] }),
        "utf-8"
      );
      expect(fs.existsSync(tempPath)).toBe(true);
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir);
      }
    }
  });

  it("overwrites existing file", () => {
    writeOwnershipSnapshot({ our_nation: "USA", regions_we_own: ["Alaska"] });
    writeOwnershipSnapshot({ our_nation: "Russia", regions_we_own: ["Moscow", "Siberia"] });

    const content = JSON.parse(fs.readFileSync(TEST_PATH, "utf-8"));
    expect(content.our_nation).toBe("Russia");
    expect(content.regions_we_own).toEqual(["Moscow", "Siberia"]);
  });

  it("writes snapshot with empty regions array", () => {
    writeOwnershipSnapshot({ our_nation: "Atlantis", regions_we_own: [] });

    const content = JSON.parse(fs.readFileSync(TEST_PATH, "utf-8"));
    expect(content.regions_we_own).toEqual([]);
  });
});
