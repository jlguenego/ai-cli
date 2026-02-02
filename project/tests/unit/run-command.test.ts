import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";

// Mock du runner
vi.mock("../../src/runner/run.js", () => ({
  runOnce: vi.fn(),
}));

// Mock de fs/promises
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

import {
  registerRunCommand,
  runAction,
  readPromptSource,
  PromptFileNotFoundError,
} from "../../src/commands/run.js";
import { runOnce } from "../../src/runner/run.js";
import { readFile } from "node:fs/promises";

describe("Run Command", () => {
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

  describe("registerRunCommand", () => {
    it("should register run command on program", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      expect(runCmd).toBeDefined();
      expect(runCmd?.description()).toBe(
        "Exécute un prompt (fichier) sur un backend IA",
      );
    });

    it("should accept --backend option", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      const backendOption = runCmd?.options.find((o) => o.long === "--backend");
      expect(backendOption).toBeDefined();
      expect(backendOption?.short).toBe("-b");
    });

    it("should accept --verbosity option with short form -V", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      const verbosityOption = runCmd?.options.find(
        (o) => o.long === "--verbosity",
      );
      expect(verbosityOption).toBeDefined();
      expect(verbosityOption?.short).toBe("-V");
    });

    it("should have default verbosity value of 3", () => {
      const program = new Command();
      registerRunCommand(program);

      const runCmd = program.commands.find((c) => c.name() === "run");
      const verbosityOption = runCmd?.options.find(
        (o) => o.long === "--verbosity",
      );
      expect(verbosityOption?.defaultValue).toBe("3");
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

  describe("runAction", () => {
    it("should read prompt from file and call runOnce", async () => {
      vi.mocked(readFile).mockResolvedValue("Hello AI");
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "AI response",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("./prompt.txt", { backend: "copilot" });

      expect(readFile).toHaveBeenCalledWith("./prompt.txt", "utf-8");
      expect(runOnce).toHaveBeenCalledWith({
        prompt: "Hello AI",
        backend: "copilot",
        verbosity: 3,
      });
    });

    it("should output result text on success", async () => {
      vi.mocked(readFile).mockResolvedValue("Test prompt");
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "Response text",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("./prompt.txt", {});

      expect(consoleSpy).toHaveBeenCalledWith("Response text");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it("should exit with 66 when file not found", async () => {
      const enoentError = Object.assign(new Error("ENOENT"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(enoentError);

      await runAction("./missing.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Fichier prompt introuvable : ./missing.txt",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
    });

    it("should exit with 66 when file is empty", async () => {
      vi.mocked(readFile).mockResolvedValue("   ");
      // runOnce ne doit pas être appelé si le fichier est vide

      await runAction("./empty.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Le fichier prompt est vide.",
      );
      expect(processExitSpy).toHaveBeenCalledWith(66);
      expect(runOnce).not.toHaveBeenCalled();
    });

    it("should output error on stderr on failure", async () => {
      vi.mocked(readFile).mockResolvedValue("Test");
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 2,
        text: "Backend not found",
        backend: "unknown",
        status: "backend-missing",
        durationMs: 50,
        details: "Install the backend first",
      });

      await runAction("./prompt.txt", {});

      expect(consoleErrorSpy).toHaveBeenCalledWith("Backend not found");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Install the backend first");
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it("should exit with backend exit code", async () => {
      vi.mocked(readFile).mockResolvedValue("Test");
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 6,
        text: "Unauthenticated",
        backend: "copilot",
        status: "backend-unauthenticated",
        durationMs: 10,
      });

      await runAction("./prompt.txt", {});

      expect(processExitSpy).toHaveBeenCalledWith(6);
    });

    it("should work without backend option", async () => {
      vi.mocked(readFile).mockResolvedValue("Prompt");
      vi.mocked(runOnce).mockResolvedValue({
        exitCode: 0,
        text: "OK",
        backend: "copilot",
        status: "success",
        durationMs: 100,
      });

      await runAction("./prompt.txt", {});

      expect(runOnce).toHaveBeenCalledWith({
        prompt: "Prompt",
        backend: undefined,
        verbosity: 3,
      });
    });
  });
});
