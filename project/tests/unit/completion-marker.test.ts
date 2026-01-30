import { describe, it, expect } from "vitest";
import { parseMarkerCompletion } from "../../src/completion/marker.js";

describe("parseMarkerCompletion", () => {
  describe("should return 'continue'", () => {
    it("when text is empty", () => {
      expect(parseMarkerCompletion("")).toEqual({ status: "continue" });
    });

    it("when text contains only whitespace", () => {
      expect(parseMarkerCompletion("   ")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("\n\n")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("  \n  \n  ")).toEqual({
        status: "continue",
      });
    });

    it("when DONE is not in the last line", () => {
      expect(parseMarkerCompletion("DONE\nMore text")).toEqual({
        status: "continue",
      });
      expect(parseMarkerCompletion("First\nDONE\nLast")).toEqual({
        status: "continue",
      });
    });

    it("when done is lowercase", () => {
      expect(parseMarkerCompletion("done")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("Done")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("dOnE")).toEqual({ status: "continue" });
    });

    it("when DONE has additional characters", () => {
      expect(parseMarkerCompletion("DONE!")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONE.")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("NOT DONE")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONE:")).toEqual({ status: "continue" });
    });

    it("when DONE is part of a word", () => {
      expect(parseMarkerCompletion("UNDONE")).toEqual({ status: "continue" });
      expect(parseMarkerCompletion("DONENESS")).toEqual({ status: "continue" });
    });
  });

  describe("should return 'done'", () => {
    it("when text is exactly DONE", () => {
      expect(parseMarkerCompletion("DONE")).toEqual({ status: "done" });
    });

    it("when DONE is on the last line with leading/trailing spaces", () => {
      expect(parseMarkerCompletion("  DONE  ")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("\tDONE\t")).toEqual({ status: "done" });
    });

    it("when DONE is on the last line with trailing newline", () => {
      expect(parseMarkerCompletion("DONE\n")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("DONE\r\n")).toEqual({ status: "done" });
      expect(parseMarkerCompletion("DONE\n\n")).toEqual({ status: "done" });
    });

    it("when DONE is on the last non-empty line after content", () => {
      expect(parseMarkerCompletion("Some output\nDONE")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Line 1\nLine 2\nLine 3\nDONE")).toEqual({
        status: "done",
      });
    });

    it("when DONE follows content with trailing empty lines", () => {
      expect(parseMarkerCompletion("Output\nDONE\n")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Output\nDONE\n\n\n")).toEqual({
        status: "done",
      });
      expect(parseMarkerCompletion("Output\n  DONE  \n  \n")).toEqual({
        status: "done",
      });
    });
  });
});
