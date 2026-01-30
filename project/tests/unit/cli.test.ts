import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { VERSION, NAME, CLI_NAME } from "../../src/index.js";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json") as { version: string };

describe("CLI Module", () => {
  describe("Exports", () => {
    it("should export VERSION matching package.json", () => {
      expect(VERSION).toBe(pkg.version);
    });

    it("should export NAME as @jlguenego/ai-cli", () => {
      expect(NAME).toBe("@jlguenego/ai-cli");
    });

    it("should export CLI_NAME as jlgcli", () => {
      expect(CLI_NAME).toBe("jlgcli");
    });
  });
});
