import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONFIG,
  USER_CONFIG_PATH,
  PROJECT_CONFIG_FILENAME,
  isValidConfig,
  VALID_BACKENDS,
  VALID_COMPLETION_MODES,
  VALID_VERBOSITY_LEVELS,
  CONFIG_KEYS,
  type ResolvedConfig,
} from "../../src/config/schema.js";

describe("config/schema", () => {
  describe("DEFAULT_CONFIG", () => {
    it("should contain all required keys", () => {
      const requiredKeys: (keyof ResolvedConfig)[] = [
        "backend",
        "maxIterations",
        "timeoutMs",
        "completionMode",
        "noProgressLimit",
        "verbosity",
      ];

      for (const key of requiredKeys) {
        expect(DEFAULT_CONFIG).toHaveProperty(key);
      }
    });

    it("should have maxIterations > 0", () => {
      expect(DEFAULT_CONFIG.maxIterations).toBeGreaterThan(0);
    });

    it("should have timeoutMs > 0", () => {
      expect(DEFAULT_CONFIG.timeoutMs).toBeGreaterThan(0);
    });

    it("should have noProgressLimit >= 0", () => {
      expect(DEFAULT_CONFIG.noProgressLimit).toBeGreaterThanOrEqual(0);
    });

    it("should have a valid completionMode", () => {
      expect(["marker", "json"]).toContain(DEFAULT_CONFIG.completionMode);
    });

    it("should have a valid backend", () => {
      expect(VALID_BACKENDS).toContain(DEFAULT_CONFIG.backend);
    });

    it("should have verbosity equal to 3 (debug mode)", () => {
      expect(DEFAULT_CONFIG.verbosity).toBe(3);
    });

    it("should have verbosity in valid range [0-3]", () => {
      expect(DEFAULT_CONFIG.verbosity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_CONFIG.verbosity).toBeLessThanOrEqual(3);
    });
  });

  describe("Constants", () => {
    it("should define USER_CONFIG_PATH as a non-empty string", () => {
      expect(typeof USER_CONFIG_PATH).toBe("string");
      expect(USER_CONFIG_PATH.length).toBeGreaterThan(0);
      expect(USER_CONFIG_PATH).toContain(".jlgcli.json");
    });

    it("should define PROJECT_CONFIG_FILENAME", () => {
      expect(PROJECT_CONFIG_FILENAME).toBe(".jlgcli.json");
    });

    it("should define VALID_BACKENDS", () => {
      expect(VALID_BACKENDS).toContain("copilot");
      expect(VALID_BACKENDS).toContain("codex");
    });

    it("should define VALID_COMPLETION_MODES", () => {
      expect(VALID_COMPLETION_MODES).toContain("marker");
      expect(VALID_COMPLETION_MODES).toContain("json");
    });

    it("should define CONFIG_KEYS", () => {
      expect(CONFIG_KEYS).toContain("backend");
      expect(CONFIG_KEYS).toContain("maxIterations");
      expect(CONFIG_KEYS).toContain("timeoutMs");
      expect(CONFIG_KEYS).toContain("completionMode");
      expect(CONFIG_KEYS).toContain("noProgressLimit");
      expect(CONFIG_KEYS).toContain("verbosity");
    });

    it("should define VALID_VERBOSITY_LEVELS", () => {
      expect(VALID_VERBOSITY_LEVELS).toContain(0);
      expect(VALID_VERBOSITY_LEVELS).toContain(1);
      expect(VALID_VERBOSITY_LEVELS).toContain(2);
      expect(VALID_VERBOSITY_LEVELS).toContain(3);
      expect(VALID_VERBOSITY_LEVELS).toHaveLength(4);
    });
  });

  describe("isValidConfig", () => {
    it("should return true for a valid complete config", () => {
      const config: ResolvedConfig = {
        backend: "copilot",
        maxIterations: 10,
        timeoutMs: 60000,
        completionMode: "marker",
        noProgressLimit: 3,
        verbosity: 3,
      };
      expect(isValidConfig(config)).toBe(true);
    });

    it("should return true for a valid partial config", () => {
      expect(isValidConfig({ backend: "codex" })).toBe(true);
      expect(isValidConfig({ maxIterations: 5 })).toBe(true);
      expect(isValidConfig({ completionMode: "json" })).toBe(true);
      expect(isValidConfig({ verbosity: 2 })).toBe(true);
    });

    it("should return true for an empty object", () => {
      expect(isValidConfig({})).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValidConfig(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidConfig(undefined)).toBe(false);
    });

    it("should return false for non-object types", () => {
      expect(isValidConfig("string")).toBe(false);
      expect(isValidConfig(123)).toBe(false);
      expect(isValidConfig(true)).toBe(false);
    });

    it("should return false for invalid backend", () => {
      expect(isValidConfig({ backend: "invalid" })).toBe(false);
      expect(isValidConfig({ backend: 123 })).toBe(false);
    });

    it("should return false for maxIterations <= 0", () => {
      expect(isValidConfig({ maxIterations: 0 })).toBe(false);
      expect(isValidConfig({ maxIterations: -1 })).toBe(false);
    });

    it("should return false for timeoutMs <= 0", () => {
      expect(isValidConfig({ timeoutMs: 0 })).toBe(false);
      expect(isValidConfig({ timeoutMs: -100 })).toBe(false);
    });

    it("should return false for invalid completionMode", () => {
      expect(isValidConfig({ completionMode: "invalid" })).toBe(false);
      expect(isValidConfig({ completionMode: 123 })).toBe(false);
    });

    it("should return false for noProgressLimit < 0", () => {
      expect(isValidConfig({ noProgressLimit: -1 })).toBe(false);
    });

    it("should return true for noProgressLimit = 0", () => {
      expect(isValidConfig({ noProgressLimit: 0 })).toBe(true);
    });

    it("should return true for valid verbosity values", () => {
      expect(isValidConfig({ verbosity: 0 })).toBe(true);
      expect(isValidConfig({ verbosity: 1 })).toBe(true);
      expect(isValidConfig({ verbosity: 2 })).toBe(true);
      expect(isValidConfig({ verbosity: 3 })).toBe(true);
    });

    it("should return false for invalid verbosity values", () => {
      expect(isValidConfig({ verbosity: -1 })).toBe(false);
      expect(isValidConfig({ verbosity: 4 })).toBe(false);
      expect(isValidConfig({ verbosity: "high" })).toBe(false);
      expect(isValidConfig({ verbosity: null })).toBe(false);
    });
  });
});
