import { describe, it, expect, vi } from "vitest";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type {
  Adapter,
  AdapterRunOnceOptions,
} from "../../src/adapters/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MOCK_BACKEND_PATH = join(__dirname, "../fixtures/mock-backend.js");

/**
 * Crée un adaptateur qui exécute le mock-backend avec les options spécifiées.
 * Maintient un compteur d'appels interne pour suivre les itérations.
 */
function createMockBackendAdapter(
  mode: string,
  options: { iterations?: number; delay?: number; summary?: string } = {},
): Adapter {
  let callCount = 0;

  return {
    id: "copilot", // On utilise un ID valide pour bypasser la validation

    async isAvailable() {
      return { status: "available" };
    },

    async runOnce(runOptions: AdapterRunOnceOptions) {
      callCount++;
      const currentIteration = callCount;

      return new Promise((resolve) => {
        const args = [MOCK_BACKEND_PATH, mode];
        if (options.iterations) args.push(`--iterations=${options.iterations}`);
        if (options.delay) args.push(`--delay=${options.delay}`);
        if (options.summary) args.push(`--summary=${options.summary}`);

        const child = spawn("node", args, {
          cwd: runOptions.cwd,
          env: { ...process.env, ...runOptions.env },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        // Envoyer le prompt avec le numéro d'itération sur stdin
        const promptWithIteration = `${runOptions.prompt} iteration:${currentIteration}`;
        child.stdin.write(promptWithIteration);
        child.stdin.end();

        // Gérer le timeout
        let timeoutId: NodeJS.Timeout | undefined;
        if (runOptions.timeoutMs) {
          timeoutId = setTimeout(() => {
            child.kill("SIGTERM");
          }, runOptions.timeoutMs);
        }

        child.on("close", (code) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            exitCode: code ?? 0,
            text: stdout || stderr,
          });
        });

        child.on("error", (err) => {
          if (timeoutId) clearTimeout(timeoutId);
          resolve({
            exitCode: 1,
            text: err.message,
          });
        });
      });
    },
  };
}

// Variable pour stocker l'adaptateur mock actif
let mockAdapter: Adapter | null = null;

// Mock du registry pour utiliser notre adaptateur mock
vi.mock("../../src/adapters/registry.js", () => ({
  tryGetAdapterById: vi.fn((id: string) => {
    if (id === "mock" || id === "copilot") {
      return mockAdapter;
    }
    return null;
  }),
}));

vi.mock("../../src/config/loader.js", () => ({
  resolveConfig: vi.fn().mockResolvedValue({
    backend: "copilot",
    maxIterations: 10,
    timeoutMs: 30000,
    completionMode: "marker",
    noProgressLimit: 3,
  }),
}));

// Import après les mocks
import { runLoop } from "../../src/runner/loop.js";

describe("Runner Loop Integration Tests", () => {
  describe("INT-003: Arrêt sur marker DONE", () => {
    it("should stop when backend outputs DONE marker", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 2 });

      const result = await runLoop({
        prompt: "Start task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(2);
      expect(result.text).toContain("DONE");
    });

    it("should detect DONE on first iteration if present", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 1 });

      const result = await runLoop({
        prompt: "Quick task iteration:1",
        backend: "copilot",
        completionMode: "marker",
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(1);
    });
  });

  describe("INT-004: Arrêt sur JSON status done", () => {
    it("should stop when backend outputs {status: done}", async () => {
      mockAdapter = createMockBackendAdapter("json-done", {
        iterations: 2,
        summary: "Integration test completed",
      });

      const result = await runLoop({
        prompt: "Start JSON task iteration:1",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.summary).toBe("Integration test completed");
    });

    it("should follow next prompts in JSON continue mode", async () => {
      mockAdapter = createMockBackendAdapter("json-continue", {
        iterations: 3,
      });

      const result = await runLoop({
        prompt: "Multi-step task iteration:1",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("done");
      expect(result.iterations).toBe(3);
    });
  });

  describe("INT-005: Timeout global", () => {
    it("should return exit code 75 when timeout is reached", async () => {
      mockAdapter = createMockBackendAdapter("slow", { delay: 200 });

      const result = await runLoop({
        prompt: "Slow task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
        timeoutMs: 50, // Timeout très court
      });

      expect(result.exitCode).toBe(75);
      expect(result.status).toBe("timeout");
    });
  });

  describe("INT-006: maxIterations atteint", () => {
    it("should return exit code 4 when maxIterations is reached", async () => {
      mockAdapter = createMockBackendAdapter("infinite");

      const result = await runLoop({
        prompt: "Infinite task iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 3,
        timeoutMs: 10000,
      });

      expect(result.exitCode).toBe(4);
      expect(result.status).toBe("max-iterations");
      expect(result.iterations).toBe(3);
    });
  });

  describe("INT-006b: No progress detected", () => {
    it("should return exit code 5 when no progress is detected", async () => {
      mockAdapter = createMockBackendAdapter("no-progress");

      const result = await runLoop({
        prompt: "No progress task",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
        noProgressLimit: 3,
      });

      expect(result.exitCode).toBe(5);
      expect(result.status).toBe("no-progress");
      expect(result.iterations).toBeLessThanOrEqual(3);
    });
  });

  describe("INT-006c: Invalid JSON in json mode", () => {
    it("should return exit code 65 when JSON is invalid", async () => {
      mockAdapter = createMockBackendAdapter("invalid-json");

      const result = await runLoop({
        prompt: "Invalid JSON task",
        backend: "copilot",
        completionMode: "json",
        maxIterations: 10,
      });

      expect(result.exitCode).toBe(65);
      expect(result.status).toBe("invalid-json");
    });
  });

  describe("Transcript validation", () => {
    it("should record all iterations in transcript with correct structure", async () => {
      mockAdapter = createMockBackendAdapter("marker-done", { iterations: 3 });

      const result = await runLoop({
        prompt: "Transcript test iteration:1",
        backend: "copilot",
        completionMode: "marker",
        maxIterations: 10,
      });

      expect(result.transcript).toHaveLength(3);

      for (let i = 0; i < result.transcript.length; i++) {
        const entry = result.transcript[i];
        expect(entry).toBeDefined();
        expect(entry!.iteration).toBe(i + 1);
        expect(entry!.prompt).toBeTruthy();
        expect(entry!.response).toBeTruthy();
        expect(entry!.durationMs).toBeGreaterThanOrEqual(0);
        expect(entry!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      }
    });
  });
});
