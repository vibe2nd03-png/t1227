import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger";

describe("logger", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createLogger", () => {
    it("should create a logger with all methods", () => {
      const log = createLogger("TestModule");

      expect(log).toHaveProperty("debug");
      expect(log).toHaveProperty("info");
      expect(log).toHaveProperty("warn");
      expect(log).toHaveProperty("error");
      expect(log).toHaveProperty("api");
      expect(log).toHaveProperty("time");
      expect(log).toHaveProperty("timeEnd");
    });

    it("should include module name in log output", () => {
      const log = createLogger("TestModule");
      log.warn("test message");

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logMessage = consoleSpy.warn.mock.calls[0][0];
      expect(logMessage).toContain("[TestModule]");
      expect(logMessage).toContain("test message");
    });

    it("should include data in log output when provided", () => {
      const log = createLogger("TestModule");
      log.warn("test message", { key: "value" });

      const logMessage = consoleSpy.warn.mock.calls[0][0];
      expect(logMessage).toContain('"key":"value"');
    });
  });

  describe("error logging", () => {
    it("should include error details when error object is provided", () => {
      const log = createLogger("TestModule");
      const testError = new Error("Test error message");

      log.error("An error occurred", testError);

      expect(consoleSpy.error).toHaveBeenCalled();
      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain("Test error message");
    });
  });
});
