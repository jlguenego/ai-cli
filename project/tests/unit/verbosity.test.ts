import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createVerbosityConfig,
  log,
  logCost,
  logPrompt,
  logProgress,
  logTechnical,
  streamResponseChunk,
  type VerbosityConfig
} from "../../src/output/verbosity.js";

describe("verbosity", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
  });

  describe("createVerbosityConfig", () => {
    it("should create config with level 0 (silent)", () => {
      const config = createVerbosityConfig(0);

      expect(config.level).toBe(0);
      expect(config.showCost).toBe(true); // Toujours true (RG-018)
      expect(config.showPrompt).toBe(false);
      expect(config.streamResponse).toBe(false);
      expect(config.showTechnical).toBe(false);
      expect(config.showProgress).toBe(false);
    });

    it("should create config with level 1 (minimal)", () => {
      const config = createVerbosityConfig(1);

      expect(config.level).toBe(1);
      expect(config.showCost).toBe(true);
      expect(config.showPrompt).toBe(false);
      expect(config.streamResponse).toBe(false);
      expect(config.showTechnical).toBe(false);
      expect(config.showProgress).toBe(false);
    });

    it("should create config with level 2 (normal)", () => {
      const config = createVerbosityConfig(2);

      expect(config.level).toBe(2);
      expect(config.showCost).toBe(true);
      expect(config.showPrompt).toBe(false);
      expect(config.streamResponse).toBe(false);
      expect(config.showTechnical).toBe(false);
      expect(config.showProgress).toBe(true);
    });

    it("should create config with level 3 (debug)", () => {
      const config = createVerbosityConfig(3);

      expect(config.level).toBe(3);
      expect(config.showCost).toBe(true);
      expect(config.showPrompt).toBe(true);
      expect(config.streamResponse).toBe(true);
      expect(config.showTechnical).toBe(true);
      expect(config.showProgress).toBe(true);
    });
  });

  describe("log", () => {
    it("should display message when level is sufficient", () => {
      const config = createVerbosityConfig(2);

      log(config, 2, "Test message");

      expect(consoleErrorSpy).toHaveBeenCalledWith("Test message");
    });

    it("should NOT display message when level is insufficient", () => {
      const config = createVerbosityConfig(1);

      log(config, 2, "Test message");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("logCost", () => {
    it("should display cost with 2 decimals when level >= 1", () => {
      const config = createVerbosityConfig(1);

      logCost(config, 1.5);

      expect(consoleErrorSpy).toHaveBeenCalledWith("💰 Coût : 1.50 $");
    });

    it("should display zero cost when level >= 1 (RG-018)", () => {
      const config = createVerbosityConfig(1);

      logCost(config, 0);

      expect(consoleErrorSpy).toHaveBeenCalledWith("💰 Coût : 0.00 $");
    });

    it("should NOT display cost when level < 1", () => {
      const config = createVerbosityConfig(0);

      logCost(config, 1.5);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("logPrompt", () => {
    it("should display prompt when level >= 3", () => {
      const config = createVerbosityConfig(3);

      logPrompt(config, "Test prompt content");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const allCalls = consoleErrorSpy.mock.calls.flat().join("\n");
      expect(allCalls).toContain("📝 Prompt envoyé :");
      expect(allCalls).toContain("Test prompt content");
      expect(allCalls).toContain("─".repeat(40));
    });

    it("should NOT display prompt when level < 3", () => {
      const config = createVerbosityConfig(2);

      logPrompt(config, "Test prompt content");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should NOT display prompt when level = 0", () => {
      const config = createVerbosityConfig(0);

      logPrompt(config, "Test prompt content");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should NOT display prompt when level = 1", () => {
      const config = createVerbosityConfig(1);

      logPrompt(config, "Test prompt content");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("logProgress", () => {
    it("should display progress when level >= 2", () => {
      const config = createVerbosityConfig(2);

      logProgress(config, 3, 10);

      expect(consoleErrorSpy).toHaveBeenCalledWith("⏳ Itération 3/10...");
    });

    it("should display progress without max when not provided", () => {
      const config = createVerbosityConfig(3);

      logProgress(config, 5);

      expect(consoleErrorSpy).toHaveBeenCalledWith("⏳ Itération 5...");
    });

    it("should NOT display progress when level < 2", () => {
      const config = createVerbosityConfig(1);

      logProgress(config, 1, 10);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("logTechnical", () => {
    it("should display technical info when level >= 3", () => {
      const config = createVerbosityConfig(3);

      logTechnical(config, "Backend initialized");

      expect(consoleErrorSpy).toHaveBeenCalledWith("🔧 Backend initialized");
    });

    it("should NOT display technical info when level < 3", () => {
      const config = createVerbosityConfig(2);

      logTechnical(config, "Backend initialized");

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("streamResponseChunk", () => {
    it("should write chunk to stdout when level >= 3", () => {
      const config = createVerbosityConfig(3);

      streamResponseChunk(config, "Hello ");
      streamResponseChunk(config, "World");

      expect(stdoutWriteSpy).toHaveBeenCalledWith("Hello ");
      expect(stdoutWriteSpy).toHaveBeenCalledWith("World");
    });

    it("should NOT write chunk when level < 3", () => {
      const config = createVerbosityConfig(2);

      streamResponseChunk(config, "Hello World");

      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });
});
