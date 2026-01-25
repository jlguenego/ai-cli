import { describe, it, expect, vi, beforeEach } from "vitest";

const execaMock = vi.fn();

vi.mock("execa", () => ({
  execa: execaMock,
}));

describe("adapters/copilot", () => {
  beforeEach(() => {
    execaMock.mockReset();
  });

  it("should return missing when gh and copilot are not found", async () => {
    execaMock
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { code: "ENOENT" }))
      .mockRejectedValueOnce(Object.assign(new Error("not found"), { code: "ENOENT" }));

    const { CopilotAdapter } = await import("../../src/adapters/copilot.js");
    const adapter = new CopilotAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "missing" }),
    );
  });

  it("should return missing when gh exists but 'copilot' command is unknown", async () => {
    execaMock
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: "",
        stderr: "unknown command 'copilot'",
      })
      .mockRejectedValueOnce(
        Object.assign(new Error("not found"), { code: "ENOENT" }),
      );

    const { CopilotAdapter } = await import("../../src/adapters/copilot.js");
    const adapter = new CopilotAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "missing" }),
    );
  });

  it("should return unauthenticated when gh indicates login is required", async () => {
    execaMock.mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "Please run: gh auth login",
    });

    const { CopilotAdapter } = await import("../../src/adapters/copilot.js");
    const adapter = new CopilotAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "unauthenticated" }),
    );
  });

  it("should return available when gh copilot --version exits 0", async () => {
    execaMock.mockResolvedValueOnce({ exitCode: 0, stdout: "1.2.3", stderr: "" });

    const { CopilotAdapter } = await import("../../src/adapters/copilot.js");
    const adapter = new CopilotAdapter();

    await expect(adapter.isAvailable()).resolves.toEqual(
      expect.objectContaining({ status: "available" }),
    );
  });

  it("runOnce should pass cwd/timeout and merge env", async () => {
    // detectBackend(): gh copilot --version
    execaMock.mockResolvedValueOnce({ exitCode: 0, stdout: "1.2.3", stderr: "" });
    // runOnce(): gh copilot suggest ...
    execaMock.mockResolvedValueOnce({ exitCode: 0, stdout: "ok", stderr: "" });

    const { CopilotAdapter } = await import("../../src/adapters/copilot.js");
    const adapter = new CopilotAdapter();

    const result = await adapter.runOnce({
      prompt: "hello",
      cwd: "C:\\tmp",
      env: { FOO: "bar" },
      timeoutMs: 123,
    });

    expect(result.exitCode).toBe(0);

    expect(execaMock.mock.calls[0]?.[0]).toBe("gh");
    expect(execaMock.mock.calls[0]?.[1]).toEqual(["copilot", "--version"]);

    const call = execaMock.mock.calls[1];
    expect(call?.[0]).toBe("gh");

    const options = call?.[2] as unknown as {
      env?: Record<string, string>;
      cwd?: string;
      timeout?: number;
    };
    expect(options.cwd).toBe("C:\\tmp");
    expect(options.timeout).toBe(123);
    expect(options.env?.FOO).toBe("bar");
  });
});
