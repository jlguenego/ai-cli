import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CONFIG_KEYS,
  PROJECT_CONFIG_FILENAME,
  USER_CONFIG_PATH,
} from "../../src/config/schema.js";
import { join } from "node:path";

class ConfigError extends Error {
  public readonly filePath: string;
  public readonly cause?: Error;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message);
    this.name = "ConfigError";
    this.filePath = filePath;
    this.cause = cause;
  }
}

const loaderMock = {
  ConfigError,
  getConfigValue: vi.fn(),
  resolveConfig: vi.fn(),
  findProjectRoot: vi.fn(),
  loadUserConfig: vi.fn(),
  saveUserConfig: vi.fn(),
};

vi.mock("../../src/config/loader.js", () => loaderMock);

describe("commands/config", () => {
  const originalExit = process.exit;

  beforeEach(() => {
    loaderMock.loadUserConfig.mockReset();
    loaderMock.saveUserConfig.mockReset();
    loaderMock.getConfigValue.mockReset();
    loaderMock.resolveConfig.mockReset();
    loaderMock.findProjectRoot.mockReset();
  });

  afterEach(() => {
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  describe("isValidConfigKey", () => {
    it("should return true for all valid config keys", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      for (const key of CONFIG_KEYS) {
        expect(isValidConfigKey(key)).toBe(true);
      }
    });

    it("should return true for 'backend'", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("backend")).toBe(true);
    });

    it("should return true for 'maxIterations'", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("maxIterations")).toBe(true);
    });

    it("should return true for 'timeoutMs'", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("timeoutMs")).toBe(true);
    });

    it("should return true for 'completionMode'", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("completionMode")).toBe(true);
    });

    it("should return true for 'noProgressLimit'", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("noProgressLimit")).toBe(true);
    });

    it("should return false for invalid keys", async () => {
      const { isValidConfigKey } = await import("../../src/commands/config.js");
      expect(isValidConfigKey("invalidKey")).toBe(false);
      expect(isValidConfigKey("")).toBe(false);
      expect(isValidConfigKey("Backend")).toBe(false); // case sensitive
      expect(isValidConfigKey("BACKEND")).toBe(false);
    });
  });

  describe("formatConfigValue", () => {
    it("should format string values as-is", async () => {
      const { formatConfigValue } =
        await import("../../src/commands/config.js");
      expect(formatConfigValue("copilot")).toBe("copilot");
      expect(formatConfigValue("marker")).toBe("marker");
      expect(formatConfigValue("codex")).toBe("codex");
    });

    it("should format number values as string", async () => {
      const { formatConfigValue } =
        await import("../../src/commands/config.js");
      expect(formatConfigValue(10)).toBe("10");
      expect(formatConfigValue(300000)).toBe("300000");
      expect(formatConfigValue(0)).toBe("0");
    });

    it("should format boolean values as JSON", async () => {
      const { formatConfigValue } =
        await import("../../src/commands/config.js");
      expect(formatConfigValue(true)).toBe("true");
      expect(formatConfigValue(false)).toBe("false");
    });

    it("should format object values as JSON", async () => {
      const { formatConfigValue } =
        await import("../../src/commands/config.js");
      expect(formatConfigValue({ key: "value" })).toBe('{"key":"value"}');
    });

    it("should format array values as JSON", async () => {
      const { formatConfigValue } =
        await import("../../src/commands/config.js");
      expect(formatConfigValue(["a", "b"])).toBe('["a","b"]');
    });
  });

  describe("parseConfigValue", () => {
    it("should accept valid backend values", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(parseConfigValue("backend", "copilot")).toBe("copilot");
      expect(parseConfigValue("backend", "codex")).toBe("codex");
    });

    it("should reject invalid backend values", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(() => parseConfigValue("backend", "claude")).toThrow();
      expect(() => parseConfigValue("backend", "")).toThrow();
    });

    it("should accept valid completionMode values", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(parseConfigValue("completionMode", "marker")).toBe("marker");
      expect(parseConfigValue("completionMode", "json")).toBe("json");
    });

    it("should reject invalid completionMode values", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(() => parseConfigValue("completionMode", "yaml")).toThrow();
      expect(() => parseConfigValue("completionMode", "")).toThrow();
    });

    it("should parse integer values for numeric keys", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(parseConfigValue("maxIterations", "20")).toBe(20);
      expect(parseConfigValue("timeoutMs", "120000")).toBe(120000);
      expect(parseConfigValue("noProgressLimit", "0")).toBe(0);
    });

    it("should reject non-integers for numeric keys", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(() => parseConfigValue("maxIterations", "12.5")).toThrow();
      expect(() => parseConfigValue("timeoutMs", "abc")).toThrow();
    });

    it("should enforce bounds for numeric keys", async () => {
      const { parseConfigValue } = await import("../../src/commands/config.js");
      expect(() => parseConfigValue("maxIterations", "0")).toThrow();
      expect(() => parseConfigValue("timeoutMs", "-1")).toThrow();
      expect(() => parseConfigValue("noProgressLimit", "-1")).toThrow();
    });
  });

  describe("handleConfigSet", () => {
    it("should persist updated user config and print OK", async () => {
      loaderMock.loadUserConfig.mockResolvedValue({});

      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      const { handleConfigSet } = await import("../../src/commands/config.js");

      await handleConfigSet("backend", "codex");

      expect(loaderMock.saveUserConfig).toHaveBeenCalledTimes(1);
      expect(loaderMock.saveUserConfig).toHaveBeenCalledWith({
        backend: "codex",
      });
      expect(consoleLogSpy).toHaveBeenCalledWith("OK");
    });

    it("should exit with code 1 on invalid key", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
        code?: number,
      ) => {
        throw new Error(`process.exit:${code}`);
      }) as never);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { handleConfigSet } = await import("../../src/commands/config.js");

      await expect(handleConfigSet("foo", "bar")).rejects.toThrow(
        "process.exit:1",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should exit with code 1 on invalid value", async () => {
      loaderMock.loadUserConfig.mockResolvedValue({});

      const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
        code?: number,
      ) => {
        throw new Error(`process.exit:${code}`);
      }) as never);

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const { handleConfigSet } = await import("../../src/commands/config.js");

      await expect(handleConfigSet("maxIterations", "-1")).rejects.toThrow(
        "process.exit:1",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("handleConfigShow", () => {
    it("should call resolveConfig and print pretty JSON", async () => {
      const resolvedConfig = {
        backend: "copilot",
        maxIterations: 10,
        timeoutMs: 300000,
        completionMode: "marker",
        noProgressLimit: 3,
      };
      loaderMock.resolveConfig.mockResolvedValue(resolvedConfig);

      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      const { handleConfigShow } = await import("../../src/commands/config.js");

      await handleConfigShow();

      expect(loaderMock.resolveConfig).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(resolvedConfig, null, 2),
      );
    });
  });

  describe("handleConfigPath", () => {
    it("should print user and project config paths when project root is found", async () => {
      const projectRoot = "C:/repo";
      loaderMock.findProjectRoot.mockReturnValue(projectRoot);

      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      const { handleConfigPath } = await import("../../src/commands/config.js");

      await handleConfigPath();

      expect(loaderMock.findProjectRoot).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            userConfigPath: USER_CONFIG_PATH,
            projectConfigPath: join(projectRoot, PROJECT_CONFIG_FILENAME),
          },
          null,
          2,
        ),
      );
    });

    it("should print projectConfigPath as null when no project root is found", async () => {
      loaderMock.findProjectRoot.mockReturnValue(null);

      const consoleLogSpy = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      const { handleConfigPath } = await import("../../src/commands/config.js");

      await handleConfigPath();

      expect(loaderMock.findProjectRoot).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify(
          {
            userConfigPath: USER_CONFIG_PATH,
            projectConfigPath: null,
          },
          null,
          2,
        ),
      );
    });
  });
});
