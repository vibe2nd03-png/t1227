import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GYEONGGI_STATIONS,
  NEARBY_STATIONS,
  getSurfaceData,
  getSurfaceDataPeriod,
  clearCache,
  getCacheStats,
} from "./kmaApi";

// Mock fetch globally
globalThis.fetch = vi.fn();

// Mock logger
vi.mock("../utils/logger", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe("kmaApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GYEONGGI_STATIONS", () => {
    it("should have 31 Gyeonggi regions", () => {
      expect(Object.keys(GYEONGGI_STATIONS).length).toBe(31);
    });

    it("should have station info for major cities", () => {
      expect(GYEONGGI_STATIONS["수원시"]).toEqual({ stn: 119, name: "수원" });
      expect(GYEONGGI_STATIONS["파주시"]).toEqual({ stn: 99, name: "파주" });
      expect(GYEONGGI_STATIONS["이천시"]).toEqual({ stn: 203, name: "이천" });
    });

    it("should have valid station codes", () => {
      Object.values(GYEONGGI_STATIONS).forEach((station) => {
        expect(station.stn).toBeTypeOf("number");
        expect(station.name).toBeTypeOf("string");
      });
    });
  });

  describe("NEARBY_STATIONS", () => {
    it("should have nearby city stations", () => {
      expect(NEARBY_STATIONS["서울"]).toBeDefined();
      expect(NEARBY_STATIONS["인천"]).toBeDefined();
      expect(NEARBY_STATIONS["춘천"]).toBeDefined();
    });

    it("should have coordinates for nearby stations", () => {
      Object.values(NEARBY_STATIONS).forEach((station) => {
        expect(station.lat).toBeTypeOf("number");
        expect(station.lng).toBeTypeOf("number");
        expect(station.stn).toBeTypeOf("number");
      });
    });

    it("should have Seoul station at correct code", () => {
      expect(NEARBY_STATIONS["서울"].stn).toBe(108);
    });
  });

  describe("getSurfaceData", () => {
    it("should return data on successful API call", async () => {
      const mockData = [
        { STN: 119, TA: 25.5, HM: 60, WS: 2.5 },
        { STN: 108, TA: 26.0, HM: 55, WS: 3.0 },
      ];

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const result = await getSurfaceData("202501061200", 0);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith("/api/kma?tm=202501061200&stn=0");
      expect(result).toEqual(mockData);
    });

    it("should return null on API error", async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: "API Error" }),
      });

      const result = await getSurfaceData("202501061200", 119);

      expect(result).toBeNull();
    });

    it("should return null on network error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getSurfaceData("202501061200", 119);

      expect(result).toBeNull();
    });

    it("should include station code in request", async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await getSurfaceData("202501061200", 119);

      expect(fetch).toHaveBeenCalledWith("/api/kma?tm=202501061200&stn=119");
    });
  });

  describe("getSurfaceDataPeriod", () => {
    it("should return data for period query", async () => {
      const mockData = [
        { STN: 119, TM: "202501061000", TA: 24.0 },
        { STN: 119, TM: "202501061100", TA: 25.0 },
      ];

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const result = await getSurfaceDataPeriod(
        "202501061000",
        "202501061200",
        119,
      );

      expect(fetch).toHaveBeenCalledWith(
        "/api/kma-period?tm1=202501061000&tm2=202501061200&stn=119",
      );
      expect(result).toEqual(mockData);
    });

    it("should return null on error", async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: "Error" }),
      });

      const result = await getSurfaceDataPeriod(
        "202501061000",
        "202501061200",
        119,
      );

      expect(result).toBeNull();
    });

    it("should handle network errors", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getSurfaceDataPeriod(
        "202501061000",
        "202501061200",
        119,
      );

      expect(result).toBeNull();
    });
  });

  describe("cache functions", () => {
    it("should clear cache", () => {
      clearCache();
      const stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it("should return cache stats", () => {
      const stats = getCacheStats();
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("keys");
      expect(Array.isArray(stats.keys)).toBe(true);
    });
  });
});
