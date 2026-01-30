import { describe, it, expect } from "vitest";
import { parseCompletion } from "../../src/completion/index.js";

describe("parseCompletion dispatcher", () => {
  describe("mode marker", () => {
    it("should return done when DONE marker is present", () => {
      const result = parseCompletion("Hello\nDONE", "marker");
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue when no DONE marker", () => {
      const result = parseCompletion("Hello world", "marker");
      expect(result).toEqual({ status: "continue" });
    });

    it("should return continue when DONE is not last line", () => {
      const result = parseCompletion("DONE\nMore text", "marker");
      expect(result).toEqual({ status: "continue" });
    });
  });

  describe("mode json", () => {
    it("should return parsed result when valid JSON", () => {
      const result = parseCompletion('{"status":"done"}', "json");
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue with optional fields", () => {
      const result = parseCompletion(
        '{"status":"continue","next":"step2"}',
        "json",
      );
      expect(result).toEqual({ status: "continue", next: "step2" });
    });

    it("should return error when no valid JSON found", () => {
      const result = parseCompletion("no json here", "json");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should extract last valid JSON from mixed content", () => {
      const result = parseCompletion(
        'logs...\n{"status":"done","summary":"All good"}',
        "json",
      );
      expect(result).toEqual({ status: "done", summary: "All good" });
    });
  });

  describe("dispatcher behavior", () => {
    it("should be a pure function (same input = same output)", () => {
      const text = "Test\nDONE";
      const result1 = parseCompletion(text, "marker");
      const result2 = parseCompletion(text, "marker");
      expect(result1).toEqual(result2);
    });

    it("should handle empty text in marker mode", () => {
      const result = parseCompletion("", "marker");
      expect(result).toEqual({ status: "continue" });
    });

    it("should handle empty text in json mode", () => {
      const result = parseCompletion("", "json");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });
  });
});
