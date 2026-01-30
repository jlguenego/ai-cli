import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/adapters/registry.js", () => {
  return {
    getAdapters: () => [
      { id: "copilot", isAvailable: async () => ({ status: "available" }) },
      { id: "codex", isAvailable: async () => ({ status: "missing" }) },
      { id: "claude", isAvailable: async () => ({ status: "unsupported" }) },
    ],
  };
});

import {
  getBackends,
  formatBackendsOutput,
} from "../../src/commands/backends.js";

describe("backends command", () => {
  describe("getBackends", () => {
    it("should return list of 3 backends", async () => {
      const backends = await getBackends();
      expect(backends).toHaveLength(3);
    });

    it("should include copilot backend with id 'copilot'", async () => {
      const backends = await getBackends();
      const copilot = backends.find((b) => b.id === "copilot");
      expect(copilot).toBeDefined();
      expect(copilot?.name).toBe("GitHub Copilot CLI");
      expect(copilot?.status).toBe("available");
    });

    it("should include codex backend with id 'codex'", async () => {
      const backends = await getBackends();
      const codex = backends.find((b) => b.id === "codex");
      expect(codex).toBeDefined();
      expect(codex?.name).toBe("OpenAI Codex CLI");
      expect(codex?.status).toBe("missing");
    });

    it("should include claude backend with status 'unsupported'", async () => {
      const backends = await getBackends();
      const claude = backends.find((b) => b.id === "claude");
      expect(claude).toBeDefined();
      expect(claude?.status).toBe("unsupported");
    });
  });

  describe("formatBackendsOutput", () => {
    it("should format backends for human-readable output", () => {
      const output = formatBackendsOutput([
        { id: "copilot", name: "GitHub Copilot CLI", status: "available" },
        { id: "codex", name: "OpenAI Codex CLI", status: "missing" },
        { id: "claude", name: "Anthropic Claude CLI", status: "unsupported" },
      ]);
      expect(output).toContain("Backends supportés:");
      expect(output).toContain("copilot");
      expect(output).toContain("codex");
      expect(output).toContain("claude");
      expect(output).toContain("(available)");
      expect(output).toContain("(missing)");
      expect(output).toContain("(unsupported)");
    });

    it("should show icons for each backend status", () => {
      const output = formatBackendsOutput([
        { id: "copilot", name: "GitHub Copilot CLI", status: "available" },
        { id: "codex", name: "OpenAI Codex CLI", status: "missing" },
        { id: "claude", name: "Anthropic Claude CLI", status: "unsupported" },
      ]);
      expect(output).toContain("✅");
      expect(output).toContain("❌");
      expect(output).toContain("⛔");
    });
  });
});
