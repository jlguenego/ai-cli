import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  Adapter,
  AdapterAvailability,
  AdapterRunOnceResult,
} from "../../src/adapters/types.js";

// Mock des modules
vi.mock("../../src/adapters/registry.js", () => ({
  tryGetAdapterById: vi.fn(),
}));

vi.mock("../../src/config/loader.js", () => ({
  resolveConfig: vi.fn(),
}));

import { runLoop } from "../../src/runner/loop.js";
import { tryGetAdapterById } from "../../src/adapters/registry.js";
import { resolveConfig } from "../../src/config/loader.js";

function createMockAdapter(
  id: string,
  availability: AdapterAvailability,
  runResults?: AdapterRunOnceResult[],
): Adapter {
  let callIndex = 0;
  return {
    id: id as "copilot" | "codex" | "claude",
    isAvailable: vi.fn().mockResolvedValue(availability),
    runOnce: vi.fn().mockImplementation(() => {
      const result = runResults?.[callIndex] ?? { exitCode: 0, text: "ok" };
      callIndex++;
      return Promise.resolve(result);
    }),
  };
}

describe("Runner Loop", () => {
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

  describe("runLoop - mode marker", () => {
    it("should stop on DONE marker after 2 iterations", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Step 1 in progress" },
          { exitCode: 0, text: "Step 2 completed\nDONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Do the task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.transcript).toHaveLength(2);
    });

    it("should continue when DONE not present", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Still working..." },
          { exitCode: 0, text: "More work..." },
          { exitCode: 0, text: "DONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 5,
      });

      expect(result.status).toBe("done");
      expect(result.iterations).toBe(3);
    });
  });

  describe("runLoop - mode json", () => {
    it("should stop on status done in JSON", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: '{"status":"continue","next":"step2"}' },
          { exitCode: 0, text: '{"status":"done","summary":"Task completed"}' },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Start task",
        backend: "copilot",
        completionMode: "json",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.summary).toBe("Task completed");
    });

    it("should use next prompt from JSON response", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: '{"status":"continue","next":"Do step 2"}' },
          { exitCode: 0, text: '{"status":"done"}' },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Start",
        backend: "copilot",
        completionMode: "json",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledTimes(2);
      expect(mockAdapter.runOnce).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ prompt: "Do step 2" }),
      );
    });

    it("should return invalid-json error when no valid JSON found", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "This is not JSON at all" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "json",
      });

      expect(result.exitCode).toBe(65);
      expect(result.status).toBe("invalid-json");
    });
  });

  describe("runLoop - garde-fous", () => {
    it("should stop at maxIterations with exit code 4", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Working 1" },
          { exitCode: 0, text: "Working 2" },
          { exitCode: 0, text: "Working 3" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 3,
      });

      expect(result.exitCode).toBe(4);
      expect(result.status).toBe("max-iterations");
      expect(result.iterations).toBe(3);
    });

    it("should stop on timeout with exit code 75", async () => {
      // Simuler un backend lent
      const mockAdapter: Adapter = {
        id: "copilot",
        isAvailable: vi.fn().mockResolvedValue({ status: "available" }),
        runOnce: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return { exitCode: 0, text: "Still working" };
        }),
      };
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 100,
        timeoutMs: 50, // Timeout très court
      });

      expect(result.exitCode).toBe(75);
      expect(result.status).toBe("timeout");
    });
  });

  describe("runLoop - erreurs backend", () => {
    it("should return exit 64 for unknown backend", async () => {
      vi.mocked(tryGetAdapterById).mockReturnValue(null);

      const result = await runLoop({
        prompt: "Task",
        backend: "unknown",
      });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unknown");
    });

    it("should return exit 2 for missing backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "missing",
        details: "Commande introuvable: copilot",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({ prompt: "Task", backend: "copilot" });

      expect(result.exitCode).toBe(2);
      expect(result.status).toBe("backend-missing");
    });

    it("should return exit 6 for unauthenticated backend", async () => {
      const mockAdapter = createMockAdapter("copilot", {
        status: "unauthenticated",
        details: "Login required",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({ prompt: "Task", backend: "copilot" });

      expect(result.exitCode).toBe(6);
      expect(result.status).toBe("backend-unauthenticated");
    });

    it("should return exit 64 for unsupported backend", async () => {
      const mockAdapter = createMockAdapter("claude", {
        status: "unsupported",
        details: "Backend claude hors MVP",
      });
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({ prompt: "Task", backend: "claude" });

      expect(result.exitCode).toBe(64);
      expect(result.status).toBe("backend-unsupported");
    });

    it("should propagate backend error exit code", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 1, text: "Backend error occurred" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(1);
      expect(result.status).toBe("error");
    });
  });

  describe("runLoop - transcript", () => {
    it("should record all iterations in transcript", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Response 1" },
          { exitCode: 0, text: "Response 2\nDONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Initial prompt",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.transcript).toHaveLength(2);
      expect(result.transcript[0]?.iteration).toBe(1);
      expect(result.transcript[0]?.prompt).toBe("Initial prompt");
      expect(result.transcript[0]?.response).toBe("Response 1");
      expect(result.transcript[1]?.iteration).toBe(2);
    });

    it("should call onIteration callback for each iteration", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Step 1" },
          { exitCode: 0, text: "DONE" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const onIteration = vi.fn();

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
        onIteration,
      });

      expect(onIteration).toHaveBeenCalledTimes(2);
      expect(onIteration).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ iteration: 1 }),
      );
    });

    it("should include durationMs in transcript entries", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.transcript[0]?.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.transcript[0]?.startedAt).toBe("string");
    });
  });

  describe("runLoop - options passthrough", () => {
    it("should pass cwd to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        cwd: "/custom/path",
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ cwd: "/custom/path" }),
      );
    });

    it("should pass env to adapter", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({
        prompt: "Task",
        backend: "copilot",
        env: { MY_VAR: "value" },
      });

      expect(mockAdapter.runOnce).toHaveBeenCalledWith(
        expect.objectContaining({ env: { MY_VAR: "value" } }),
      );
    });

    it("should use default backend from config when not specified", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        backend: "codex",
        maxIterations: 10,
        timeoutMs: 300000,
        completionMode: "marker",
        noProgressLimit: 3,
      });
      const mockAdapter = createMockAdapter("codex", { status: "available" }, [
        { exitCode: 0, text: "DONE" },
      ]);
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      await runLoop({ prompt: "Task" });

      expect(vi.mocked(tryGetAdapterById)).toHaveBeenCalledWith("codex");
    });

    it("should use default maxIterations from config", async () => {
      vi.mocked(resolveConfig).mockResolvedValue({
        backend: "copilot",
        maxIterations: 2,
        timeoutMs: 300000,
        completionMode: "marker",
        noProgressLimit: 3,
      });
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [
          { exitCode: 0, text: "Working 1" },
          { exitCode: 0, text: "Working 2" },
        ],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(4);
      expect(result.status).toBe("max-iterations");
      expect(result.iterations).toBe(2);
    });
  });

  describe("runLoop - durationMs", () => {
    it("should include total durationMs in result", async () => {
      const mockAdapter = createMockAdapter(
        "copilot",
        { status: "available" },
        [{ exitCode: 0, text: "DONE" }],
      );
      vi.mocked(tryGetAdapterById).mockReturnValue(mockAdapter);

      const result = await runLoop({
        prompt: "Task",
        backend: "copilot",
      });

      expect(typeof result.durationMs).toBe("number");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
