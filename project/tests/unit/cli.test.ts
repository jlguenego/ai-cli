import { describe, it, expect } from "vitest";
import { VERSION, NAME, CLI_NAME } from "../../src/index.js";

describe("CLI Module", () => {
  describe("Exports", () => {
    it("should export VERSION matching package.json", () => {
      expect(VERSION).toBe("0.1.0");
    });

    it("should export NAME as @jlguenego/ai-cli", () => {
      expect(NAME).toBe("@jlguenego/ai-cli");
    });

    it("should export CLI_NAME as jlgcli", () => {
      expect(CLI_NAME).toBe("jlgcli");
    });
  });
});
