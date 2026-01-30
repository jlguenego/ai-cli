import { describe, it, expect } from "vitest";
import { parseJsonCompletion } from "../../src/completion/json.js";

describe("parseJsonCompletion", () => {
  describe("JSON valide minimal", () => {
    it("should return done when status is done", () => {
      const result = parseJsonCompletion('{"status":"done"}');
      expect(result).toEqual({ status: "done" });
    });

    it("should return continue when status is continue", () => {
      const result = parseJsonCompletion('{"status":"continue"}');
      expect(result).toEqual({ status: "continue" });
    });

    it("should return error when status is error", () => {
      const result = parseJsonCompletion('{"status":"error"}');
      expect(result).toEqual({ status: "error" });
    });
  });

  describe("JSON avec champs optionnels", () => {
    it("should include summary when present", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Task completed"}',
      );
      expect(result).toEqual({ status: "done", summary: "Task completed" });
    });

    it("should include next when present", () => {
      const result = parseJsonCompletion(
        '{"status":"continue","next":"Run tests"}',
      );
      expect(result).toEqual({ status: "continue", next: "Run tests" });
    });

    it("should include both summary and next when present", () => {
      const result = parseJsonCompletion(
        '{"status":"error","summary":"Failed","next":"Retry"}',
      );
      expect(result).toEqual({
        status: "error",
        summary: "Failed",
        next: "Retry",
      });
    });
  });

  describe("extraction du dernier JSON", () => {
    it("should extract JSON after text", () => {
      const result = parseJsonCompletion('Some logs...\n{"status":"done"}');
      expect(result).toEqual({ status: "done" });
    });

    it("should extract JSON before text", () => {
      const result = parseJsonCompletion('{"status":"done"}\nMore output');
      expect(result).toEqual({ status: "done" });
    });

    it("should use the last valid JSON when multiple present", () => {
      const result = parseJsonCompletion(
        '{"status":"continue"}\nsome text\n{"status":"done"}',
      );
      expect(result).toEqual({ status: "done" });
    });

    it("should extract JSON from code fence", () => {
      const result = parseJsonCompletion('```json\n{"status":"done"}\n```');
      expect(result).toEqual({ status: "done" });
    });

    it("should handle JSON embedded in explanation", () => {
      const text = `
I've completed the task. Here's the result:
{"status":"done","summary":"All tests pass"}
Let me know if you need anything else.
      `;
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done", summary: "All tests pass" });
    });
  });

  describe("gestion des erreurs", () => {
    it("should return error for malformed JSON", () => {
      const result = parseJsonCompletion("{status: done}");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when no JSON present", () => {
      const result = parseJsonCompletion("Just some text without JSON");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for invalid status value", () => {
      const result = parseJsonCompletion('{"status":"unknown"}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when status is missing", () => {
      const result = parseJsonCompletion('{"summary":"test"}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for empty string", () => {
      const result = parseJsonCompletion("");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error for whitespace only", () => {
      const result = parseJsonCompletion("   \n\t  ");
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when status is not a string", () => {
      const result = parseJsonCompletion('{"status":123}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when summary is not a string", () => {
      const result = parseJsonCompletion('{"status":"done","summary":123}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should return error when next is not a string", () => {
      const result = parseJsonCompletion('{"status":"done","next":true}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });
  });

  describe("cas limites", () => {
    it("should handle JSON with extra fields (ignore them)", () => {
      const result = parseJsonCompletion(
        '{"status":"done","extra":"ignored","summary":"ok"}',
      );
      expect(result).toEqual({ status: "done", summary: "ok" });
      expect(result).not.toHaveProperty("extra");
    });

    it("should handle nested JSON objects (use last valid)", () => {
      const text = '{"data":{"status":"continue"}}\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });

    it("should handle JSON with unicode characters", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Tâche terminée ✓"}',
      );
      expect(result).toEqual({ status: "done", summary: "Tâche terminée ✓" });
    });

    it("should handle JSON with escaped quotes", () => {
      const result = parseJsonCompletion(
        '{"status":"done","summary":"Said \\"hello\\""}',
      );
      expect(result).toEqual({ status: "done", summary: 'Said "hello"' });
    });

    it("should skip invalid JSON and use valid one", () => {
      const text = '{invalid}\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });

    it("should ignore JSON arrays", () => {
      const text = '[1,2,3]\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });

    it("should handle multiline JSON with indentation", () => {
      const json = `{
        "status": "done",
        "summary": "All good"
      }`;
      const result = parseJsonCompletion(json);
      expect(result).toEqual({ status: "done", summary: "All good" });
    });

    it("should handle JSON in different code fence types", () => {
      const text1 = '```\n{"status":"done"}\n```';
      expect(parseJsonCompletion(text1)).toEqual({ status: "done" });

      const text2 = '```javascript\nconst x = {"status":"continue"};\n```';
      expect(parseJsonCompletion(text2)).toEqual({ status: "continue" });
    });

    it("should return error when summary is null", () => {
      const result = parseJsonCompletion('{"status":"done","summary":null}');
      expect(result).toEqual({ status: "error", error: "invalid-json" });
    });

    it("should handle deeply nested JSON (last valid wins)", () => {
      const text = '{"a":{"b":{"status":"continue"}}}\n{"status":"done"}';
      const result = parseJsonCompletion(text);
      expect(result).toEqual({ status: "done" });
    });

    it("should handle JSON at end of very long text", () => {
      const longText = "x".repeat(10000) + '\n{"status":"done"}';
      const result = parseJsonCompletion(longText);
      expect(result).toEqual({ status: "done" });
    });
  });
});
