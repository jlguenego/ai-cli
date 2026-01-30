import { describe, it, expect } from "vitest";
import {
  formatDuration,
  statusToHumanMessage,
  formatRunHumanSummary,
  formatLoopHumanSummary,
  formatRunJsonSummary,
  formatLoopJsonSummary,
} from "../../src/output/summary.js";
import type { RunResult } from "../../src/runner/types.js";
import type { LoopResult } from "../../src/runner/types.js";

describe("output/summary", () => {
  describe("formatDuration", () => {
    it("should format milliseconds for durations < 1s", () => {
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(0)).toBe("0ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format seconds for durations < 60s", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(30000)).toBe("30.0s");
      expect(formatDuration(59999)).toBe("60.0s");
    });

    it("should format minutes and seconds for durations >= 60s", () => {
      expect(formatDuration(60000)).toBe("1m");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(135000)).toBe("2m 15s");
      expect(formatDuration(3600000)).toBe("60m");
    });
  });

  describe("statusToHumanMessage", () => {
    it("should translate known statuses", () => {
      expect(statusToHumanMessage("success")).toBe("Succès");
      expect(statusToHumanMessage("done")).toBe("Terminé avec succès");
      expect(statusToHumanMessage("error")).toBe("Erreur");
      expect(statusToHumanMessage("backend-missing")).toBe(
        "Backend non trouvé",
      );
      expect(statusToHumanMessage("timeout")).toBe("Timeout dépassé");
      expect(statusToHumanMessage("max-iterations")).toBe(
        "Limite d'itérations atteinte",
      );
      expect(statusToHumanMessage("no-progress")).toBe("Aucun progrès détecté");
      expect(statusToHumanMessage("invalid-json")).toBe("JSON invalide");
    });

    it("should return original status for unknown statuses", () => {
      expect(statusToHumanMessage("unknown-status")).toBe("unknown-status");
    });
  });

  describe("formatRunHumanSummary", () => {
    it("should format a successful run result", () => {
      const result: RunResult = {
        exitCode: 0,
        text: "Hello World",
        backend: "copilot",
        status: "success",
        durationMs: 1500,
      };

      const lines = formatRunHumanSummary(result);

      expect(lines).toContain("Backend   : copilot");
      expect(lines).toContain("Statut    : Succès");
      expect(lines).toContain("Durée     : 1.5s");
      expect(lines.some((l) => l.includes("─"))).toBe(true);
    });

    it("should include details when present", () => {
      const result: RunResult = {
        exitCode: 2,
        text: "Error",
        backend: "copilot",
        status: "backend-missing",
        durationMs: 100,
        details: "copilot not found in PATH",
      };

      const lines = formatRunHumanSummary(result);

      expect(lines).toContain("Détails   : copilot not found in PATH");
    });
  });

  describe("formatLoopHumanSummary", () => {
    it("should format a successful loop result", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "codex",
        status: "done",
        iterations: 3,
        durationMs: 45000,
        transcript: [],
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Backend    : codex");
      expect(lines).toContain("Statut     : Terminé avec succès");
      expect(lines).toContain("Itérations : 3");
      expect(lines).toContain("Durée      : 45.0s");
    });

    it("should include summary when present", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 5000,
        transcript: [],
        summary: "Task completed successfully",
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Résumé     : Task completed successfully");
    });

    it("should include details when present", () => {
      const result: LoopResult = {
        exitCode: 4,
        text: "Last response",
        backend: "copilot",
        status: "max-iterations",
        iterations: 10,
        durationMs: 60000,
        transcript: [],
        details: "Limite de 10 itérations atteinte",
      };

      const lines = formatLoopHumanSummary(result);

      expect(lines).toContain("Détails    : Limite de 10 itérations atteinte");
    });
  });

  describe("formatRunJsonSummary", () => {
    it("should format a run result as JSON object", () => {
      const result: RunResult = {
        exitCode: 0,
        text: "Hello World",
        backend: "copilot",
        status: "success",
        durationMs: 1500,
      };

      const json = formatRunJsonSummary(result);

      expect(json).toEqual({
        backend: "copilot",
        status: "success",
        exitCode: 0,
        durationMs: 1500,
        text: "Hello World",
      });
    });

    it("should include details when present", () => {
      const result: RunResult = {
        exitCode: 2,
        text: "Error",
        backend: "copilot",
        status: "backend-missing",
        durationMs: 100,
        details: "copilot not found",
      };

      const json = formatRunJsonSummary(result);

      expect(json.details).toBe("copilot not found");
    });

    it("should produce valid JSON when stringified", () => {
      const result: RunResult = {
        exitCode: 0,
        text: 'Text with "quotes" and\nnewlines',
        backend: "copilot",
        status: "success",
        durationMs: 1000,
      };

      const json = formatRunJsonSummary(result);
      const stringified = JSON.stringify(json);
      const parsed = JSON.parse(stringified);

      expect(parsed).toEqual(json);
    });
  });

  describe("formatLoopJsonSummary", () => {
    it("should format a loop result as JSON object", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Final response",
        backend: "codex",
        status: "done",
        iterations: 5,
        durationMs: 30000,
        transcript: [],
      };

      const json = formatLoopJsonSummary(result);

      expect(json).toEqual({
        backend: "codex",
        status: "done",
        exitCode: 0,
        durationMs: 30000,
        iterations: 5,
        text: "Final response",
      });
    });

    it("should include summary when present", () => {
      const result: LoopResult = {
        exitCode: 0,
        text: "Done",
        backend: "copilot",
        status: "done",
        iterations: 2,
        durationMs: 5000,
        transcript: [],
        summary: "All tasks completed",
      };

      const json = formatLoopJsonSummary(result);

      expect(json.summary).toBe("All tasks completed");
    });

    it("should include details when present", () => {
      const result: LoopResult = {
        exitCode: 75,
        text: "Timeout",
        backend: "copilot",
        status: "timeout",
        iterations: 3,
        durationMs: 120000,
        transcript: [],
        details: "Timeout après 2 minutes",
      };

      const json = formatLoopJsonSummary(result);

      expect(json.details).toBe("Timeout après 2 minutes");
    });
  });
});
