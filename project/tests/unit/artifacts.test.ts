import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  generateRunId,
  getArtifactsPath,
  writeArtifacts,
  EXIT_ARTIFACTS_WRITE,
  redactSecrets,
  redactObject,
} from "../../src/artifacts/index.js";
import type { LoopResult } from "../../src/runner/types.js";

describe("generateRunId", () => {
  it("génère un ID au format YYYYMMDD-HHMMSS-xxxx", () => {
    const id = generateRunId();

    // Format: 20260130-143025-a1b2
    expect(id).toMatch(/^\d{8}-\d{6}-[a-z0-9]{4}$/);
  });

  it("génère des IDs uniques", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRunId());
    }
    // Avec le random, on devrait avoir des IDs uniques
    expect(ids.size).toBeGreaterThan(90);
  });
});

describe("getArtifactsPath", () => {
  it("construit le chemin correct", () => {
    const path = getArtifactsPath("/home/user/project", "20260130-143025-a1b2");

    expect(path).toBe(
      join("/home/user/project", ".jlgcli", "runs", "20260130-143025-a1b2"),
    );
  });
});

describe("redactSecrets", () => {
  it("redacte les Bearer tokens", () => {
    const text = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const result = redactSecrets(text);

    expect(result).toBe("Authorization: [REDACTED]");
    expect(result).not.toContain("eyJ");
  });

  it("redacte les clés API sk-", () => {
    const text = "API key: sk-abc123def456ghi789jkl012mno345pqr678";
    const result = redactSecrets(text);

    expect(result).toBe("API key: [REDACTED]");
  });

  it("redacte les tokens JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const text = `Token: ${jwt}`;
    const result = redactSecrets(text);

    expect(result).toBe("Token: [REDACTED]");
  });

  it("redacte les variables *_TOKEN", () => {
    const text = "GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    const result = redactSecrets(text);

    expect(result).toContain("[REDACTED]");
  });

  it("redacte les variables *_API_KEY", () => {
    const text = "OPENAI_API_KEY: sk-proj-abc123";
    const result = redactSecrets(text);

    expect(result).toContain("[REDACTED]");
  });

  it("ne modifie pas les textes sans secrets", () => {
    const text = "Hello world, this is a normal message.";
    const result = redactSecrets(text);

    expect(result).toBe(text);
  });

  it("appelle le callback pour chaque redaction", () => {
    const callback = vi.fn();
    const text = "Bearer token123 and sk-abcdef12345678901234";

    redactSecrets(text, callback);

    expect(callback).toHaveBeenCalled();
  });
});

describe("redactObject", () => {
  it("redacte les valeurs string dans un objet", () => {
    const obj = {
      name: "test",
      secret: "Bearer mytoken123",
    };

    const result = redactObject(obj);

    expect(result.name).toBe("test");
    expect(result.secret).toBe("[REDACTED]");
  });

  it("redacte en profondeur dans les objets imbriqués", () => {
    const obj = {
      level1: {
        level2: {
          token: "sk-verysecretkey12345678901234567890",
        },
      },
    };

    const result = redactObject(obj);

    expect(result.level1.level2.token).toBe("[REDACTED]");
  });

  it("redacte les éléments de tableaux", () => {
    const arr = ["normal", "Bearer secret123", "also normal"];

    const result = redactObject(arr);

    expect(result[0]).toBe("normal");
    expect(result[1]).toBe("[REDACTED]");
    expect(result[2]).toBe("also normal");
  });
});

describe("writeArtifacts", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `jlgcli-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(tempDir)) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("crée les 3 fichiers attendus", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Done",
      backend: "copilot",
      status: "done",
      iterations: 1,
      durationMs: 1000,
      transcript: [
        {
          iteration: 1,
          startedAt: "2026-01-30T14:30:00.000Z",
          prompt: "Hello",
          response: "World",
          durationMs: 500,
        },
      ],
    };

    const writeResult = await writeArtifacts(result, {
      cwd: tempDir,
      command: "loop",
      prompt: "Hello",
      startedAt: "2026-01-30T14:30:00.000Z",
    });

    expect(writeResult.ok).toBe(true);
    expect(writeResult.path).toBeDefined();

    const artifactsPath = writeResult.path!;
    expect(existsSync(join(artifactsPath, "meta.json"))).toBe(true);
    expect(existsSync(join(artifactsPath, "transcript.ndjson"))).toBe(true);
    expect(existsSync(join(artifactsPath, "result.json"))).toBe(true);
  });

  it("retourne erreur avec code 73 si écriture impossible", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Done",
      backend: "copilot",
      status: "done",
      iterations: 0,
      durationMs: 100,
      transcript: [],
    };

    // Chemin invalide (caractères interdits sur Windows et Unix)
    const writeResult = await writeArtifacts(result, {
      cwd: 'Z:\\nonexistent\\path\\<>:"|?*',
      command: "loop",
      prompt: "test",
      startedAt: new Date().toISOString(),
    });

    expect(writeResult.ok).toBe(false);
    expect(writeResult.errorCode).toBe(EXIT_ARTIFACTS_WRITE);
    expect(writeResult.errorMessage).toContain("Échec d'écriture");
  });

  it("applique la redaction dans les fichiers", async () => {
    const result: LoopResult = {
      exitCode: 0,
      text: "Token: Bearer secret123",
      backend: "copilot",
      status: "done",
      iterations: 1,
      durationMs: 1000,
      transcript: [
        {
          iteration: 1,
          startedAt: "2026-01-30T14:30:00.000Z",
          prompt: "Use sk-myapikey12345678901234567890123456",
          response: "Done",
          durationMs: 500,
        },
      ],
    };

    const redactCallback = vi.fn();

    const writeResult = await writeArtifacts(result, {
      cwd: tempDir,
      command: "loop",
      prompt: "sk-myapikey12345678901234567890123456",
      startedAt: "2026-01-30T14:30:00.000Z",
      onRedact: redactCallback,
    });

    expect(writeResult.ok).toBe(true);
    expect(redactCallback).toHaveBeenCalled();
  });
});
