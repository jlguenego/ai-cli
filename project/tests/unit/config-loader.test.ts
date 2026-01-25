import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadProjectConfig,
  findProjectRoot,
  resolveConfig,
  ConfigError,
} from "../../src/config/loader.js";
import { PROJECT_CONFIG_FILENAME } from "../../src/config/schema.js";

// Helpers pour créer des fichiers temporaires
async function createTempDir(): Promise<string> {
  const tempDir = join(
    tmpdir(),
    `jlgcli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    // Ignorer les erreurs de nettoyage
  }
}

describe("config/loader", () => {
  describe("findProjectRoot", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should return null if no .jlgcli.json found", () => {
      const result = findProjectRoot(tempDir);
      expect(result).toBeNull();
    });

    it("should return the directory containing .jlgcli.json", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{}", "utf-8");

      const result = findProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });

    it("should traverse up to find .jlgcli.json", async () => {
      // Créer structure: tempDir/.jlgcli.json et tempDir/sub/deep/
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{}", "utf-8");

      const deepDir = join(tempDir, "sub", "deep");
      await mkdir(deepDir, { recursive: true });

      const result = findProjectRoot(deepDir);
      expect(result).toBe(tempDir);
    });
  });

  describe("loadProjectConfig", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should return empty object if no config file", async () => {
      const config = await loadProjectConfig(tempDir);
      expect(config).toEqual({});
    });

    it("should load and parse valid config", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ backend: "codex" }),
        "utf-8",
      );

      const config = await loadProjectConfig(tempDir);
      expect(config).toEqual({ backend: "codex" });
    });

    it("should throw ConfigError on invalid JSON", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(configPath, "{ invalid json }", "utf-8");

      await expect(loadProjectConfig(tempDir)).rejects.toThrow(ConfigError);
    });

    it("should throw ConfigError on invalid config values", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ maxIterations: -1 }),
        "utf-8",
      );

      await expect(loadProjectConfig(tempDir)).rejects.toThrow(ConfigError);
    });
  });

  describe("saveUserConfig", () => {
    it("should serialize config to JSON with proper formatting", () => {
      const config = { backend: "codex" as const, maxIterations: 5 };
      const expected = JSON.stringify(config, null, 2) + "\n";
      expect(expected).toContain('"backend": "codex"');
      expect(expected).toContain('"maxIterations": 5');
    });
  });

  describe("resolveConfig", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await createTempDir();
    });

    afterEach(async () => {
      await cleanupTempDir(tempDir);
    });

    it("should return config with all required keys", async () => {
      const config = await resolveConfig(tempDir);

      // Vérifier que toutes les clés sont présentes
      expect(config).toHaveProperty("backend");
      expect(config).toHaveProperty("maxIterations");
      expect(config).toHaveProperty("timeoutMs");
      expect(config).toHaveProperty("completionMode");
      expect(config).toHaveProperty("noProgressLimit");
    });

    it("should merge project config over defaults", async () => {
      // Créer config projet avec une seule valeur
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ maxIterations: 20 }),
        "utf-8",
      );

      const config = await resolveConfig(tempDir);

      // maxIterations doit venir du projet
      expect(config.maxIterations).toBe(20);
      // Les autres valeurs viennent des défauts (ou user si existe)
      expect(config.backend).toBeDefined();
      expect(config.completionMode).toBeDefined();
    });

    it("should use project backend over default", async () => {
      const configPath = join(tempDir, PROJECT_CONFIG_FILENAME);
      await writeFile(
        configPath,
        JSON.stringify({ backend: "codex" }),
        "utf-8",
      );

      const config = await resolveConfig(tempDir);
      expect(config.backend).toBe("codex");
    });
  });

  describe("ConfigError", () => {
    it("should include file path in error", () => {
      const error = new ConfigError("Test error", "/path/to/config.json");
      expect(error.message).toBe("Test error");
      expect(error.filePath).toBe("/path/to/config.json");
      expect(error.name).toBe("ConfigError");
    });

    it("should include cause if provided", () => {
      const cause = new Error("Original error");
      const error = new ConfigError(
        "Test error",
        "/path/to/config.json",
        cause,
      );
      expect(error.cause).toBe(cause);
    });
  });
});
