import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  GYEONGGI_STATIONS,
  NEARBY_STATIONS,
  getSurfaceData,
  getSurfaceDataPeriod,
  getDailyData,
  getMonthlyData,
  getGyeonggiRealtimeWeather,
  getNearbyRealtimeWeather,
  getObservationData,
  getHistorical10YearAverage,
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

    it("should map cities to nearby stations with notes", () => {
      expect(GYEONGGI_STATIONS["성남시"].note).toBe("수원 관측소 사용");
      expect(GYEONGGI_STATIONS["부천시"].note).toBe("인천 관측소 사용");
    });

    it("should have direct stations for some cities", () => {
      expect(GYEONGGI_STATIONS["수원시"].note).toBeUndefined();
      expect(GYEONGGI_STATIONS["동두천시"].note).toBeUndefined();
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

    it("should have 7 nearby stations", () => {
      expect(Object.keys(NEARBY_STATIONS).length).toBe(7);
    });

    it("should include all major nearby cities", () => {
      const cities = Object.keys(NEARBY_STATIONS);
      expect(cities).toContain("서울");
      expect(cities).toContain("인천");
      expect(cities).toContain("춘천");
      expect(cities).toContain("원주");
      expect(cities).toContain("충주");
      expect(cities).toContain("천안");
      expect(cities).toContain("세종");
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

    it("should use default station 0 when not specified", async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      await getSurfaceData("202501061200");

      expect(fetch).toHaveBeenCalledWith("/api/kma?tm=202501061200&stn=0");
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

  describe("getDailyData", () => {
    it("should fetch daily data and parse response", async () => {
      const mockText = `20250101 119 25.5 30.0 1400 20.0 0600 60 40 0800 3.5 10.0 1200 180 15.0 1400 270 0.0 0.0 0 0.0 0 0.0 0 0.0 0 0.0 0 8.5 300 20.0 500 1200 25.0 28.0 1400 22.0 0600 24.0 26.0 1300 22.0 0700 5.0 3.0 5 3
END7777`;

      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockText),
      });

      const result = await getDailyData("20250101", "20250101", 119);

      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return null on error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getDailyData("20250101", "20250101", 119);

      expect(result).toBeNull();
    });

    it("should filter out comment lines and END marker", async () => {
      const mockText = `# Comment line
20250101 119 25.5 30.0 1400 20.0 0600 60 40 0800 3.5 10.0 1200 180 15.0 1400 270 0.0 0.0 0 0.0 0 0.0 0 0.0 0 0.0 0 8.5 300 20.0 500 1200 25.0 28.0 1400 22.0 0600 24.0 26.0 1300 22.0 0700 5.0 3.0 5 3
END7777`;

      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockText),
      });

      const result = await getDailyData("20250101", "20250101", 119);

      expect(result.length).toBe(1);
    });
  });

  describe("getMonthlyData", () => {
    it("should fetch monthly data", async () => {
      const mockText = `202501 119 25.5 28.0 23.0 32.0 15 18.0 25 55 4.5 12.0 10 270 100.0 50.0 5 20.0 8 10.0 3 15.0 5 180.0 2500 4 2
END7777`;

      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockText),
      });

      const result = await getMonthlyData("202501", 119);

      expect(fetch).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should return null on error", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getMonthlyData("202501", 119);

      expect(result).toBeNull();
    });

    it("should use cache for repeated requests", async () => {
      const mockText = `202501 119 25.5 28.0 23.0 32.0 15 18.0 25 55 4.5 12.0 10 270 100.0 50.0 5 20.0 8 10.0 3 15.0 5 180.0 2500 4 2
END7777`;

      fetch.mockResolvedValue({
        text: () => Promise.resolve(mockText),
      });

      await getMonthlyData("202501", 119);
      await getMonthlyData("202501", 119);

      // Should only fetch once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getGyeonggiRealtimeWeather", () => {
    it("should return null when API fails", async () => {
      fetch.mockResolvedValue({
        json: () => Promise.resolve({ success: false }),
      });

      const result = await getGyeonggiRealtimeWeather();

      expect(result).toBeNull();
    });

    it("should retry with earlier time on first failure", async () => {
      fetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false }),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ success: false }),
        });

      await getGyeonggiRealtimeWeather();

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should process data when API returns valid response", async () => {
      const mockData = [
        { STN: 119, TA: 25, HM: 60, WS: 3, VS: 2000, PS: 1013 },
        { STN: 108, TA: 26, HM: 55, WS: 2, VS: 1500, PS: 1012 },
      ];

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const result = await getGyeonggiRealtimeWeather();

      expect(result).not.toBeNull();
      expect(result.regions).toBeDefined();
      expect(result.source).toBe("기상청 API 허브");
    });
  });

  describe("getNearbyRealtimeWeather", () => {
    it("should return empty array when API fails", async () => {
      fetch.mockResolvedValue({
        json: () => Promise.resolve({ success: false }),
      });

      const result = await getNearbyRealtimeWeather();

      expect(result).toEqual([]);
    });

    it("should process nearby cities data", async () => {
      const mockData = [
        { STN: 108, TA: 26, HM: 55, WS: 2, VS: 1500, PS: 1012 },
        { STN: 112, TA: 24, HM: 65, WS: 4, VS: 1800, PS: 1011 },
      ];

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const result = await getNearbyRealtimeWeather();

      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle network errors gracefully", async () => {
      fetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await getNearbyRealtimeWeather();

      expect(result).toEqual([]);
    });
  });

  describe("getObservationData", () => {
    it("should return null for unknown region", async () => {
      const result = await getObservationData("알수없는지역");

      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should fetch observation data for valid region", async () => {
      const mockData = [
        { STN: 119, TM: "202501061200", TA: 25, HM: 60, WS: 3 },
      ];

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockData }),
      });

      const result = await getObservationData("수원시");

      expect(result).not.toBeNull();
      expect(result.region).toBe("수원시");
      expect(result.station).toBe("수원");
    });

    it("should return null when no data returned", async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const result = await getObservationData("수원시");

      expect(result).toBeNull();
    });
  });

  describe("getHistorical10YearAverage", () => {
    it("should return null for unknown region", async () => {
      const result = await getHistorical10YearAverage("알수없는지역", 1);

      expect(result).toBeNull();
    });

    it("should calculate averages from historical data", async () => {
      const mockText = `202401 119 25.5 28.0 23.0 32.0 15 18.0 25 55 4.5 12.0 10 270 100.0 50.0 5 20.0 8 10.0 3 15.0 5 180.0 2500 4 2
END7777`;

      // Mock 10 years of data
      for (let i = 0; i < 10; i++) {
        fetch.mockResolvedValueOnce({
          text: () => Promise.resolve(mockText),
        });
      }

      const result = await getHistorical10YearAverage("수원시", 1);

      expect(result).not.toBeNull();
      expect(result.region).toBe("수원시");
      expect(result.month).toBe(1);
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

    it("should track cached entries", async () => {
      const mockText = `202501 119 25.5 28.0 23.0 32.0 15 18.0 25 55 4.5 12.0 10 270 100.0 50.0 5 20.0 8 10.0 3 15.0 5 180.0 2500 4 2
END7777`;

      fetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockText),
      });

      await getMonthlyData("202501", 119);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain("monthly_202501_119");
    });
  });
});
