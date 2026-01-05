import { describe, it, expect } from "vitest";
import {
  RISK_THRESHOLDS,
  RISK_LEVELS,
  TARGET_MULTIPLIERS,
  calculateRiskLevel,
  adjustScoreForTarget,
  getTargetLabel,
} from "./climate";

describe("climate constants", () => {
  describe("RISK_THRESHOLDS", () => {
    it("should have correct threshold values", () => {
      expect(RISK_THRESHOLDS.DANGER).toBe(75);
      expect(RISK_THRESHOLDS.WARNING).toBe(50);
      expect(RISK_THRESHOLDS.CAUTION).toBe(30);
      expect(RISK_THRESHOLDS.SAFE).toBe(0);
    });
  });

  describe("TARGET_MULTIPLIERS", () => {
    it("should have correct multiplier values", () => {
      expect(TARGET_MULTIPLIERS.elderly).toBe(1.3);
      expect(TARGET_MULTIPLIERS.child).toBe(1.25);
      expect(TARGET_MULTIPLIERS.outdoor).toBe(1.2);
      expect(TARGET_MULTIPLIERS.general).toBe(1.0);
    });
  });
});

describe("calculateRiskLevel", () => {
  it("should return danger for score >= 75", () => {
    expect(calculateRiskLevel(75)).toEqual(RISK_LEVELS.danger);
    expect(calculateRiskLevel(100)).toEqual(RISK_LEVELS.danger);
    expect(calculateRiskLevel(85)).toEqual(RISK_LEVELS.danger);
  });

  it("should return warning for score 50-74", () => {
    expect(calculateRiskLevel(50)).toEqual(RISK_LEVELS.warning);
    expect(calculateRiskLevel(74)).toEqual(RISK_LEVELS.warning);
    expect(calculateRiskLevel(60)).toEqual(RISK_LEVELS.warning);
  });

  it("should return caution for score 30-49", () => {
    expect(calculateRiskLevel(30)).toEqual(RISK_LEVELS.caution);
    expect(calculateRiskLevel(49)).toEqual(RISK_LEVELS.caution);
    expect(calculateRiskLevel(40)).toEqual(RISK_LEVELS.caution);
  });

  it("should return safe for score < 30", () => {
    expect(calculateRiskLevel(0)).toEqual(RISK_LEVELS.safe);
    expect(calculateRiskLevel(29)).toEqual(RISK_LEVELS.safe);
    expect(calculateRiskLevel(15)).toEqual(RISK_LEVELS.safe);
  });
});

describe("adjustScoreForTarget", () => {
  it("should not change score for general target", () => {
    expect(adjustScoreForTarget(50, "general")).toBe(50);
    expect(adjustScoreForTarget(100, "general")).toBe(100);
  });

  it("should increase score by 30% for elderly", () => {
    expect(adjustScoreForTarget(50, "elderly")).toBe(65);
    expect(adjustScoreForTarget(70, "elderly")).toBe(91);
  });

  it("should increase score by 25% for child", () => {
    expect(adjustScoreForTarget(40, "child")).toBe(50);
    expect(adjustScoreForTarget(80, "child")).toBe(100);
  });

  it("should increase score by 20% for outdoor", () => {
    expect(adjustScoreForTarget(50, "outdoor")).toBe(60);
  });

  it("should cap score at 100", () => {
    expect(adjustScoreForTarget(90, "elderly")).toBe(100);
    expect(adjustScoreForTarget(100, "child")).toBe(100);
  });

  it("should use default multiplier for unknown target", () => {
    expect(adjustScoreForTarget(50, "unknown")).toBe(50);
    expect(adjustScoreForTarget(50)).toBe(50);
  });
});

describe("getTargetLabel", () => {
  it("should return correct labels for each target", () => {
    expect(getTargetLabel("general")).toBe("일반 시민");
    expect(getTargetLabel("elderly")).toBe("노인");
    expect(getTargetLabel("child")).toBe("아동");
    expect(getTargetLabel("outdoor")).toBe("야외근로자");
  });

  it("should return default label for unknown target", () => {
    expect(getTargetLabel("unknown")).toBe("일반 시민");
    expect(getTargetLabel(null)).toBe("일반 시민");
    expect(getTargetLabel(undefined)).toBe("일반 시민");
  });
});
