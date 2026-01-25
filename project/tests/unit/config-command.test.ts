import { describe, it, expect } from "vitest";
import {
  isValidConfigKey,
  formatConfigValue,
} from "../../src/commands/config.js";
import { CONFIG_KEYS } from "../../src/config/schema.js";

describe("commands/config", () => {
  describe("isValidConfigKey", () => {
    it("should return true for all valid config keys", () => {
      for (const key of CONFIG_KEYS) {
        expect(isValidConfigKey(key)).toBe(true);
      }
    });

    it("should return true for 'backend'", () => {
      expect(isValidConfigKey("backend")).toBe(true);
    });

    it("should return true for 'maxIterations'", () => {
      expect(isValidConfigKey("maxIterations")).toBe(true);
    });

    it("should return true for 'timeoutMs'", () => {
      expect(isValidConfigKey("timeoutMs")).toBe(true);
    });

    it("should return true for 'completionMode'", () => {
      expect(isValidConfigKey("completionMode")).toBe(true);
    });

    it("should return true for 'noProgressLimit'", () => {
      expect(isValidConfigKey("noProgressLimit")).toBe(true);
    });

    it("should return false for invalid keys", () => {
      expect(isValidConfigKey("invalidKey")).toBe(false);
      expect(isValidConfigKey("")).toBe(false);
      expect(isValidConfigKey("Backend")).toBe(false); // case sensitive
      expect(isValidConfigKey("BACKEND")).toBe(false);
    });
  });

  describe("formatConfigValue", () => {
    it("should format string values as-is", () => {
      expect(formatConfigValue("copilot")).toBe("copilot");
      expect(formatConfigValue("marker")).toBe("marker");
      expect(formatConfigValue("codex")).toBe("codex");
    });

    it("should format number values as string", () => {
      expect(formatConfigValue(10)).toBe("10");
      expect(formatConfigValue(300000)).toBe("300000");
      expect(formatConfigValue(0)).toBe("0");
    });

    it("should format boolean values as JSON", () => {
      expect(formatConfigValue(true)).toBe("true");
      expect(formatConfigValue(false)).toBe("false");
    });

    it("should format object values as JSON", () => {
      expect(formatConfigValue({ key: "value" })).toBe('{"key":"value"}');
    });

    it("should format array values as JSON", () => {
      expect(formatConfigValue(["a", "b"])).toBe('["a","b"]');
    });
  });
});
