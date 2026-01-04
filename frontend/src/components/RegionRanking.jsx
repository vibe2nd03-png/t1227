import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

function RegionRanking({ regions, onRegionClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportStats, setReportStats] = useState({});
  const [activeTab, setActiveTab] = useState("best"); // best, cool, reports
  const [isRiskLevelVisible, setIsRiskLevelVisible] = useState(false);

  // 제보 통계 로드
  useEffect(() => {
    loadReportStats();
    const interval = setInterval(loadReportStats, 60000); // 1분마다 새로고침
    return () => clearInterval(interval);
  }, []);

  const loadReportStats = async () => {
    try {
      const { data, error } = await supabase
        .from("user_reports")
        .select("region, sentiment_score, temp_adjustment, emoji")
        .gte(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      if (!error && data) {
        const stats = data.reduce((acc, report) => {
          if (!acc[report.region]) {
            acc[report.region] = {
              count: 0,
              totalSentiment: 0,
              totalTempAdj: 0,
              emojis: [],
            };
          }
          acc[report.region].count++;
          acc[report.region].totalSentiment += report.sentiment_score;
          acc[report.region].totalTempAdj +=
            parseFloat(report.temp_adjustment) || 0;
          acc[report.region].emojis.push(report.emoji);
          return acc;
        }, {});

        // 평균 계산 및 가장 많은 이모지 찾기
        Object.keys(stats).forEach((region) => {
          const s = stats[region];
          s.avgSentiment = s.totalSentiment / s.count;
          s.avgTempAdj = s.totalTempAdj / s.count;
          s.topEmoji = getMostFrequent(s.emojis);
        });

        setReportStats(stats);
      }
    } catch (error) {
      console.error("통계 로드 실패:", error);
    }
  };

  const getMostFrequent = (arr) => {
    const counts = arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "🌡️";
  };

  // 현재 월 기준으로 계절 판단 (6~10월: 여름/가을, 11~5월: 겨울/봄)
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isSummerSeason = currentMonth >= 6 && currentMonth <= 10;

  // 최고 동네: 여름(6~10월)은 가장 더운 곳, 겨울(11~5월)은 가장 추운 곳
  const bestRegions = [...regions]
    .map((r) => ({
      ...r,
      temperature: r.climate_data?.apparent_temperature || 0,
      adjustedScore: r.score + (reportStats[r.region]?.avgTempAdj || 0) * 2,
      reportCount: reportStats[r.region]?.count || 0,
      topEmoji: reportStats[r.region]?.topEmoji || null,
    }))
    .sort(
      (a, b) =>
        isSummerSeason
          ? b.temperature - a.temperature // 여름: 높은 온도순 (가장 더운)
          : a.temperature - b.temperature, // 겨울: 낮은 온도순 (가장 추운)
    )
    .slice(0, 5);

  // 가장 쾌적한 지역 (점수 낮은 순)
  const coolestRegions = [...regions]
    .map((r) => ({
      ...r,
      adjustedScore: r.score + (reportStats[r.region]?.avgTempAdj || 0) * 2,
      reportCount: reportStats[r.region]?.count || 0,
      topEmoji: reportStats[r.region]?.topEmoji || null,
    }))
    .sort((a, b) => a.adjustedScore - b.adjustedScore)
    .slice(0, 5);

  // 제보 많은 지역
  // reportStats에서 직접 데이터 생성 (regions prop에 의존하지 않음)
  const mostReportedRegions = Object.entries(reportStats)
    .filter(([_, stats]) => stats.count > 0)
    .map(([regionName, stats]) => {
      // regions에서 해당 지역 정보 찾기
      const regionData = regions.find((r) => r.region === regionName) || {};
      return {
        region: regionName,
        ...regionData,
        reportCount: stats.count,
        topEmoji: stats.topEmoji,
        avgSentiment: stats.avgSentiment,
      };
    })
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 5);

  // 위험 등급별 지역 분류
  const riskLevelOrder = { danger: 0, warning: 1, caution: 2, safe: 3 };
  const riskLevelLabels = {
    danger: { label: "위험", icon: "🔴", color: "#ef4444" },
    warning: { label: "경고", icon: "🟠", color: "#f97316" },
    caution: { label: "주의", icon: "🟡", color: "#eab308" },
    safe: { label: "안전", icon: "🟢", color: "#22c55e" },
  };

  const regionsByRisk = regions.reduce((acc, r) => {
    const level = r.risk_level || "safe";
    if (!acc[level]) acc[level] = [];
    acc[level].push(r);
    return acc;
  }, {});

  const renderRankList = (list, type) => {
    if (list.length === 0) {
      return <p className="no-data">아직 데이터가 없습니다</p>;
    }

    return (
      <div className="rank-list">
        {list.map((region, idx) => (
          <div
            key={region.region}
            className={`rank-item rank-${idx + 1}`}
            onClick={() => onRegionClick && onRegionClick(region)}
          >
            <span className="rank-number">
              {idx === 0
                ? "🥇"
                : idx === 1
                  ? "🥈"
                  : idx === 2
                    ? "🥉"
                    : `${idx + 1}`}
            </span>
            <div className="rank-info">
              <span className="rank-region">{region.region}</span>
              {region.topEmoji && (
                <span className="rank-emoji">{region.topEmoji}</span>
              )}
            </div>
            <div className="rank-stats">
              {(type === "best" || type === "cool") && (
                <>
                  <span
                    className="rank-score"
                    style={{ color: region.risk_color }}
                  >
                    {Math.round(region.adjustedScore)}점
                  </span>
                  <span className="rank-temp">
                    {region.climate_data?.apparent_temperature}°C
                  </span>
                </>
              )}
              {type === "reports" && (
                <>
                  <span className="rank-count">{region.reportCount}건</span>
                  <span className="rank-sentiment">
                    {region.avgSentiment < -1
                      ? "🔥 더움"
                      : region.avgSentiment > 1
                        ? "❄️ 쌀쌀"
                        : "😊 보통"}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`region-ranking ${isExpanded ? "expanded" : ""}`}>
      <button
        className="ranking-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-icon">🏆</span>
        <span>체감 랭킹</span>
        <span className="toggle-arrow">{isExpanded ? "▼" : "▲"}</span>
      </button>

      {isExpanded && (
        <div className="ranking-content">
          {/* 탭 메뉴 */}
          <div className="ranking-tabs">
            <button
              className={`tab-btn ${activeTab === "best" ? "active" : ""}`}
              onClick={() => setActiveTab("best")}
            >
              {isSummerSeason ? "🥵 최고 더운" : "🥶 최고 추운"}
            </button>
            <button
              className={`tab-btn ${activeTab === "cool" ? "active" : ""}`}
              onClick={() => setActiveTab("cool")}
            >
              😎 쾌적한 동네
            </button>
            <button
              className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
              onClick={() => setActiveTab("reports")}
            >
              📢 제보 핫플
            </button>
          </div>

          {/* 랭킹 리스트 */}
          <div className="ranking-list-container">
            {activeTab === "best" && renderRankList(bestRegions, "best")}
            {activeTab === "cool" && renderRankList(coolestRegions, "cool")}
            {activeTab === "reports" &&
              renderRankList(mostReportedRegions, "reports")}
          </div>

          {/* 보정 체감 온도 설명 */}
          <div className="ranking-footer">
            <p className="adjust-note">
              * 점수는 시민 제보를 반영한 보정 체감지수입니다
            </p>
          </div>
        </div>
      )}

      {/* 위험 등급 현황 - 항상 표시 */}
      {isRiskLevelVisible && (
        <div className="risk-level-section always-visible">
          <div className="risk-level-header">
            <span>⚠️ 위험 등급 현황</span>
            <button
              className="risk-level-close-btn"
              onClick={() => setIsRiskLevelVisible(false)}
              title="닫기"
            >
              ✕
            </button>
          </div>
          <div className="risk-level-grid">
            {["danger", "warning", "caution", "safe"].map((level) => {
              const info = riskLevelLabels[level];
              const count = regionsByRisk[level]?.length || 0;
              return (
                <div
                  key={level}
                  className={`risk-level-item ${level}`}
                  style={{ borderColor: info.color }}
                >
                  <span className="risk-icon">{info.icon}</span>
                  <span className="risk-label">{info.label}</span>
                  <span className="risk-count" style={{ color: info.color }}>
                    {count}개
                  </span>
                </div>
              );
            })}
          </div>
          {regionsByRisk.danger?.length > 0 && (
            <div className="danger-regions">
              <span className="danger-title">🔴 위험 지역:</span>
              <span className="danger-list">
                {regionsByRisk.danger.map((r) => r.region).join(", ")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 위험 등급 다시 표시 버튼 */}
      {!isRiskLevelVisible && (
        <button
          className="risk-level-show-btn"
          onClick={() => setIsRiskLevelVisible(true)}
        >
          ⚠️ 위험등급
        </button>
      )}
    </div>
  );
}

export default RegionRanking;
