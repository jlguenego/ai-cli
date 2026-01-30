import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Mock du runner loop
vi.mock("../../src/runner/loop.js", () => ({
  runLoop: vi.fn(),
}));

// Mock de fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import {
  registerLoopCommand,
  loopAction,
  readPromptSource,
  PromptFileNotFoundError,
} from "../../src/commands/loop.js";
import { runLoop } from "../../src/runner/loop.js";
import { readFile } from "node:fs/promises";

describe("Loop Command", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("registerLoopCommand", () => {
    it("should register loop command on program", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      expect(loopCmd).toBeDefined();
      expect(loopCmd?.description()).toBe(
        "Exécute un prompt de manière itérative sur un backend IA",
      );
    });

    it("should accept --backend option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const backendOption = loopCmd?.options.find(
        (o) => o.long === "--backend",
      );
      expect(backendOption).toBeDefined();
      expect(backendOption?.short).toBe("-b");
    });

    it("should accept --max-iterations option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find(
        (o) => o.long === "--max-iterations",
      );
      expect(option).toBeDefined();
      expect(option?.short).toBe("-m");
    });

    it("should accept --timeout option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find((o) => o.long === "--timeout");
      expect(option).toBeDefined();
      expect(option?.short).toBe("-t");
    });

    it("should accept --completion-mode option", () => {
      const program = new Command();
      registerLoopCommand(program);

      const loopCmd = program.commands.find((c) => c.name() === "loop");
      const option = loopCmd?.options.find(
        (o) => o.long === "--completion-mode",
      );
      expect(option).toBeDefined();
    });
  });

  describe("readPromptSource", () => {
    it("should read content from file", async () => {
      vi.mocked(readFile).mockResolvedValue("  Prompt content from file  ");

      const result = await readPromptSource("./prompt.txt");

      expect(readFile).toHaveBeenCalledWith("./prompt.txt", "utf-8");
      expect(result).toBe("Prompt content from file");
    });

    it("should throw PromptFileNotFoundError when file not found", async () => {
      const enoentError = new Error("ENOENT") as Error & { code: string };
      enoentError.code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(enoentError);

      await expect(readPromptSource("./missing.txt")).rejects.toThrow(
        PromptFileNotFoundError,
      );
    });

    it("should rethrow other errors", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("Permission denied"));

      await expect(readPromptSource("./protected.txt")).rejects.toThrow(
        "Permission denied",
      );
    });
  });

  describe("loopAction", () => {
    it("should read prompt from file and call runLoop", async () => {
      vi.mocked(readFile).mockResolvedValue("Hello AI");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Task completed\nDONE",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 500,
        transcript: [],
      });

      await loopAction("./prompt.txt", { backend: "copilot" });

      expect(readFile).toHaveBeenCalledWith("./prompt.txt", "utf-8");
      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Hello AI",
          backend: "copilot",
        }),
      );
    });

    it("should pass maxIterations and timeout options", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Done",
        backend: "copilot",
        status: "done",
        iterations: 1,
        durationMs: 100,
        transcript: [],
      });

      await loopAction("./prompt.txt", {
        maxIterations: "5",
        timeout: "60000",
      });

      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          maxIterations: 5,
          timeoutMs: 60000,
        }),
      );
    });

    it("should pass completionMode option", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: '{"status":"done"}',
        backend: "copilot",
        status: "done",
        iterations: 1,
        durationMs: 100,
        transcript: [],
      });

      await loopAction("./prompt.txt", {
        completionMode: "json",
      });

      expect(runLoop).toHaveBeenCalledWith(
        expect.objectContaining({
          completionMode: "json",
        }),
      );
    });

    it("should output result text on success", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 0,
        text: "Final response",
        backend: "copilot",
        status: "done",
        iterations: 3,
        durationMs: 1000,
        transcript: [],
      });

      await loopAction("./prompt.txt", {});

      expect(consoleSpy).toHaveBeenCalledWith("Final response");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should exit with 66 when file not found", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(enoentError);

      await loopAction("./missing.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Fichier prompt introuvable : ./missing.txt",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
    });

    it("should exit with 66 when file is empty", async () => {
      vi.mocked(readFile).mockResolvedValue("   ");

      await loopAction("./empty.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Le fichier prompt est vide.",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
    });

    it("should exit with 4 on max-iterations status", async () => {
      vi.mocked(readFile).mockResolvedValue("Long task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 4,
        text: "Still running",
        backend: "copilot",
        status: "max-iterations",
        iterations: 10,
        durationMs: 5000,
        transcript: [],
        details: "Limite de 10 itérations atteinte",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(4);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("max-iterations"),
      );
    });

    it("should exit with 5 on no-progress status", async () => {
      vi.mocked(readFile).mockResolvedValue("Stuck task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 5,
        text: "Same response",
        backend: "copilot",
        status: "no-progress",
        iterations: 3,
        durationMs: 1500,
        transcript: [],
        details: "Arrêt après 3 réponses identiques",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(5);
    });

    it("should exit with 75 on timeout status", async () => {
      vi.mocked(readFile).mockResolvedValue("Slow task");
      vi.mocked(runLoop).mockResolvedValue({
        exitCode: 75,
        text: "Timeout",
        backend: "copilot",
        status: "timeout",
        iterations: 5,
        durationMs: 300000,
        transcript: [],
        details: "Timeout global atteint",
      });

      await loopAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(75);
    });

    it("should provide onIteration callback for progress display", async () => {
      vi.mocked(readFile).mockResolvedValue("Task");
      vi.mocked(runLoop).mockImplementation(async (options) => {
        // Simuler l'appel du callback
        if (options.onIteration) {
          options.onIteration({
            iteration: 1,
            startedAt: new Date().toISOString(),
            prompt: "Task",
            response: "Working on it...",
            durationMs: 250,
          });
        }
        return {
          exitCode: 0,
          text: "Done",
          backend: "copilot",
          status: "done",
          iterations: 1,
          durationMs: 250,
          transcript: [],
        };
      });

      await loopAction("./prompt.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[iter 1]"),
      );
    });
  });
});
