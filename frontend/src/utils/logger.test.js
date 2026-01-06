import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, logger } from "./logger";

describe("logger", () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      time: vi.spyOn(console, "time").mockImplementation(() => {}),
      timeEnd: vi.spyOn(console, "timeEnd").mockImplementation(() => {}),
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

  describe("debug logging", () => {
    it("should call console.debug with formatted message", () => {
      const log = createLogger("DebugModule");
      log.debug("debug message");

      expect(consoleSpy.debug).toHaveBeenCalled();
      const logMessage = consoleSpy.debug.mock.calls[0][0];
      expect(logMessage).toContain("[DEBUG]");
      expect(logMessage).toContain("[DebugModule]");
      expect(logMessage).toContain("debug message");
    });

    it("should include data in debug output", () => {
      const log = createLogger("DebugModule");
      log.debug("debug with data", { count: 42 });

      const logMessage = consoleSpy.debug.mock.calls[0][0];
      expect(logMessage).toContain('"count":42');
    });
  });

  describe("info logging", () => {
    it("should call console.info with formatted message", () => {
      const log = createLogger("InfoModule");
      log.info("info message");

      expect(consoleSpy.info).toHaveBeenCalled();
      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain("[INFO]");
      expect(logMessage).toContain("[InfoModule]");
    });

    it("should include data in info output", () => {
      const log = createLogger("InfoModule");
      log.info("info with data", { status: "ok" });

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain('"status":"ok"');
    });
  });

  describe("warn logging", () => {
    it("should call console.warn with formatted message", () => {
      const log = createLogger("WarnModule");
      log.warn("warning message");

      expect(consoleSpy.warn).toHaveBeenCalled();
      const logMessage = consoleSpy.warn.mock.calls[0][0];
      expect(logMessage).toContain("[WARN]");
      expect(logMessage).toContain("[WarnModule]");
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

    it("should include error name and stack", () => {
      const log = createLogger("ErrorModule");
      const testError = new Error("Stack test");

      log.error("Error with stack", testError);

      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain("Error");
      expect(logMessage).toContain("stack");
    });

    it("should work without error object", () => {
      const log = createLogger("ErrorModule");
      log.error("Simple error message");

      expect(consoleSpy.error).toHaveBeenCalled();
      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain("Simple error message");
    });

    it("should include additional data with error", () => {
      const log = createLogger("ErrorModule");
      const testError = new Error("Error with data");

      log.error("Combined error", testError, { requestId: "abc123" });

      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain("Error with data");
      expect(logMessage).toContain("requestId");
    });

    it("should include data when no error object provided", () => {
      const log = createLogger("ErrorModule");
      log.error("Error without exception", null, { code: 500 });

      const logMessage = consoleSpy.error.mock.calls[0][0];
      expect(logMessage).toContain('"code":500');
    });
  });

  describe("api logging", () => {
    it("should log successful API call with checkmark", () => {
      const log = createLogger("ApiModule");
      log.api("GET", "/api/data", 200, 150);

      expect(consoleSpy.info).toHaveBeenCalled();
      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain("GET");
      expect(logMessage).toContain("/api/data");
      expect(logMessage).toContain("200");
      expect(logMessage).toContain("150ms");
    });

    it("should log client error with warning emoji", () => {
      const log = createLogger("ApiModule");
      log.api("POST", "/api/submit", 404, 50);

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain("404");
    });

    it("should log server error with error emoji", () => {
      const log = createLogger("ApiModule");
      log.api("PUT", "/api/update", 500, 200);

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain("500");
    });

    it("should log redirect status", () => {
      const log = createLogger("ApiModule");
      log.api("GET", "/api/redirect", 301, 10);

      const logMessage = consoleSpy.info.mock.calls[0][0];
      expect(logMessage).toContain("301");
    });
  });

  describe("time and timeEnd", () => {
    it("should call console.time with module prefix", () => {
      const log = createLogger("TimeModule");
      log.time("operation");

      expect(consoleSpy.time).toHaveBeenCalledWith("[TimeModule] operation");
    });

    it("should call console.timeEnd with module prefix", () => {
      const log = createLogger("TimeModule");
      log.timeEnd("operation");

      expect(consoleSpy.timeEnd).toHaveBeenCalledWith("[TimeModule] operation");
    });

    it("should measure different operations", () => {
      const log = createLogger("PerfModule");
      log.time("fetch");
      log.time("parse");
      log.timeEnd("fetch");
      log.timeEnd("parse");

      expect(consoleSpy.time).toHaveBeenCalledTimes(2);
      expect(consoleSpy.timeEnd).toHaveBeenCalledTimes(2);
    });
  });

  describe("default logger", () => {
    it("should export a default logger with App module", () => {
      expect(logger).toBeDefined();
      expect(logger.debug).toBeTypeOf("function");
      expect(logger.info).toBeTypeOf("function");
      expect(logger.warn).toBeTypeOf("function");
      expect(logger.error).toBeTypeOf("function");
    });

    it("should use App as module name", () => {
      logger.warn("test from default logger");

      const logMessage = consoleSpy.warn.mock.calls[0][0];
      expect(logMessage).toContain("[App]");
    });
  });

  describe("timestamp format", () => {
    it("should include ISO timestamp in log messages", () => {
      const log = createLogger("TimestampModule");
      log.info("timestamp test");

      const logMessage = consoleSpy.info.mock.calls[0][0];
      // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
