import { describe, it, expect, vi, beforeEach } from "vitest";

const execaMock = vi.fn();

vi.mock("execa", () => ({
  execa: execaMock,
}));

describe("adapters/codex", () => {
  beforeEach(() => {
    execaMock.mockReset();
  });

  it("should return missing when codex is not found", async () => {
    execaMock.mockRejectedValueOnce(
      Object.assign(new Error("not found"), { code: "ENOENT" }),
    );

    const { CodexAdapter } = await import("../../src/adapters/codex.js");
    const adapter = new CodexAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "missing" }),
    );
  });

  it("should return unauthenticated when output indicates API key/login is required", async () => {
    execaMock.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "Missing OPENAI_API_KEY. Please login.",
    });

    const { CodexAdapter } = await import("../../src/adapters/codex.js");
    const adapter = new CodexAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "unauthenticated" }),
    );
  });

  it("should return available when codex --version exits 0", async () => {
    execaMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "1.2.3",
      stderr: "",
    });

    const { CodexAdapter } = await import("../../src/adapters/codex.js");
    const adapter = new CodexAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "available" }),
    );
  });

  it("should return missing when output looks like command-not-found", async () => {
    execaMock.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr:
        "'codex' is not recognized as an internal or external command, operable program or batch file.",
    });

    const { CodexAdapter } = await import("../../src/adapters/codex.js");
    const adapter = new CodexAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "missing" }),
    );
  });

  it("runOnce should pass cwd/timeout, merge env and use input", async () => {
    // detectAvailability(): codex --version
    execaMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: "1.2.3",
      stderr: "",
    });
    // runOnce(): codex (stdin)
    execaMock.mockResolvedValueOnce({ exitCode: 0, stdout: "ok", stderr: "" });

    const { CodexAdapter } = await import("../../src/adapters/codex.js");
    const adapter = new CodexAdapter();

    const result = await adapter.runOnce({
      prompt: "hello",
      cwd: "C:\\tmp",
      env: { FOO: "bar" },
      timeoutMs: 123,
    });

    expect(result.exitCode).toBe(0);

    expect(execaMock.mock.calls[0]?.[0]).toBe("codex");
    expect(execaMock.mock.calls[0]?.[1]).toEqual(["--version"]);

    const call = execaMock.mock.calls[1];
    expect(call?.[0]).toBe("codex");

    const options = call?.[2] as unknown as {
      env?: Record<string, string>;
      cwd?: string;
      timeout?: number;
      input?: string;
    };

    expect(options.cwd).toBe("C:\\tmp");
    expect(options.timeout).toBe(123);
    expect(options.env?.FOO).toBe("bar");
    expect(options.input).toBe("hello");
  });
});
