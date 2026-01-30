import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceResult,
} from "../../src/adapters/types.js";

// Mock des modules
vi.mock("../../src/adapters/registry.js", () => ({
  tryGetAdapterById: vi.fn(),
  getAdapterById: vi.fn(),
}));

vi.mock("../../src/config/loader.js", () => ({
  resolveConfig: vi.fn(),
}));

import { runOnce } from "../../src/runner/run.js";
import { tryGetAdapterById } from "../../src/adapters/registry.js";
import { resolveConfig } from "../../src/config/loader.js";

function createMockAdapter(
  id: string,
  availability: AdapterAvailability,
  runResult?: AdapterRunOnceResult,
): Adapter {
  return {
    id: id as "copilot" | "codex" | "claude",
    isAvailable: vi.fn().mockResolvedValue(availability),
    runOnce: vi
      .fn()
      .mockResolvedValue(runResult ?? { exitCode: 0, text: "ok" }),
  };
}

describe("Runner", () => {
  beforeEach(() => {
    vi.mocked(resolveConfig).mockResolvedValue({
      backend: "copilot",
      maxIterations: 10,
      timeoutMs: 300000,
      completionMode: "marker",
      noProgressLimit: 3,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("runOnce", () => {
    it("should execute prompt on available backend", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "Response from AI" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(0);
      expect(result.text).toBe("Response from AI");
      expect(result.backend).toBe("copilot");
      expect(result.status).toBe("success");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should use configured backend when not specified", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        backend: "codex",
        maxIterations: 10,
        timeoutMs: 300000,
        completionMode: "marker",
        noProgressLimit: 3,
      });
      const mockAdapter = createMockAdapter(
        "codex",
        { status: "available" },
        { exitCode: 0, text: "Codex response" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello" });

      expect(vi.mocked(tryGetAdapterById)).toHaveBeenCalledWith("codex");
      expect(result.backend).toBe("codex");
    });

    it("should default to copilot when no backend configured", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        backend: "copilot",
        maxIterations: 10,
        timeoutMs: 300000,
        completionMode: "marker",
        noProgressLimit: 3,
      });
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello" });

      expect(vi.mocked(tryGetAdapterById)).toHaveBeenCalledWith("copilot");
    });

    it("should return exit 64 for unknown backend id", async () => {
      vi.mocked(tryGetAdapterById).mockReturnValue(null);

      const result = await runOnce({ prompt: "Hello", backend: "unknown" });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unknown");
      expect(result.backend).toBe("unknown");
    });

    it("should return exit 2 for missing backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "missing",
        details: "Commande introuvable: copilot",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(2);
      expect(result.status).toBe("backend-missing");
    });

    it("should return exit 6 for unauthenticated backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "unauthenticated",
        details: "Login required",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(6);
      expect(result.status).toBe("backend-unauthenticated");
    });

    it("should return exit 64 for unsupported backend", async () => {
      const mockAdapter = createMockAdapter("claude", {
        status: "unsupported",
        details: "Backend claude hors MVP",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "claude" });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unsupported");
    });

    it("should include duration in result", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should pass timeout to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runOnce({ prompt: "Hello", backend: "copilot", timeoutMs: 5000 });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 5000 }),
      );
    });

    it("should pass cwd to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 0, text: "ok" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runOnce({
        prompt: "Hello",
        backend: "copilot",
        cwd: "/custom/path",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: "/custom/path" }),
      );
    });

    it("should return error status when adapter returns non-zero exit code", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        { exitCode: 1, text: "Something went wrong" },
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runOnce({ prompt: "Hello", backend: "copilot" });

      expect(result.exitCode).toBe(1);
      expect(result.status).toBe("error");
    });
  });
});
