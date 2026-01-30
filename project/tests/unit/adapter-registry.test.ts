import { describe, it, expect } from "vitest";
import {
  getAdapters,
  getAdapterById,
  tryGetAdapterById,
} from "../../src/adapters/registry.js";

describe("adapters/registry", () => {
  it("getAdapters should return stable list including copilot/codex/claude", () => {
    const adapters = getAdapters();
    expect(adapters.map((a) => a.id)).toEqual(["copilot", "codex", "claude"]);
  });

  it("getAdapterById('copilot') should return adapter with id 'copilot'", () => {
    const adapter = getAdapterById("copilot");
    expect(adapter.id).toBe("copilot");
  });

  it("getAdapterById('codex') should return adapter with id 'codex'", () => {
    const adapter = getAdapterById("codex");
    expect(adapter.id).toBe("codex");
  });

  it("getAdapterById('claude') should be unsupported", async () => {
    const adapter = getAdapterById("claude");
    expect(adapter.id).toBe("claude");

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "unsupported" }),
    );

    const result = await adapter.runOnce({
      prompt: "hello",
      cwd: "C:\\tmp",
    });

    expect(result.exitCode).toBe(64);
    expect(result.text).toMatch(/non\s+supporté/i);
  });

  it("tryGetAdapterById('unknown') should return null", () => {
    expect(tryGetAdapterById("unknown")).toBeNull();
  });
});
