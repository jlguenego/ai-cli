import { describe, it, expect } from "vitest";
import {
  getBackends,
  formatBackendsOutput,
  BACKENDS,
  Backend,
} from "../../src/commands/backends.js";

describe("backends command", () => {
  describe("getBackends", () => {
    it("should return list of 3 backends", () => {
      const backends = getBackends();
      expect(backends).toHaveLength(3);
    });

    it("should include copilot backend with id 'copilot'", () => {
      const backends = getBackends();
      const copilot = backends.find((b) => b.id === "copilot");
      expect(copilot).toBeDefined();
      expect(copilot?.name).toBe("GitHub Copilot CLI");
    });

    it("should include codex backend with id 'codex'", () => {
      const backends = getBackends();
      const codex = backends.find((b) => b.id === "codex");
      expect(codex).toBeDefined();
      expect(codex?.name).toBe("OpenAI Codex CLI");
    });

    it("should include claude backend with status 'planned'", () => {
      const backends = getBackends();
      const claude = backends.find((b) => b.id === "claude");
      expect(claude).toBeDefined();
      expect(claude?.status).toBe("planned");
    });
  });

  describe("formatBackendsOutput", () => {
    it("should format backends for human-readable output", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("Backends supportés:");
      expect(output).toContain("copilot");
      expect(output).toContain("codex");
      expect(output).toContain("claude");
    });

    it("should show planned icon for planned backends", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("📅");
    });

    it("should show unknown icon for unknown status backends", () => {
      const output = formatBackendsOutput(BACKENDS);
      expect(output).toContain("❓");
    });
  });
});
