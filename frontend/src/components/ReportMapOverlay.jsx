import React, { useState, useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";

// 제보 타입별 설정
const REPORT_TYPES = {
  hot: { emoji: "🥵", label: "더워요", color: "#ff4466" },
  warm: { emoji: "😰", label: "따뜻해요", color: "#ff8844" },
  comfortable: { emoji: "😊", label: "쾌적해요", color: "#22d3a0" },
  cool: { emoji: "😌", label: "쌀쌀해요", color: "#6366f1" },
  cold: { emoji: "🥶", label: "추워요", color: "#3b82f6" },
  airQuality: { emoji: "😷", label: "공기 안좋아요", color: "#9ca3af" },
};

// 감정에 따른 타입 분류
const getReportType = (emoji, sentiment) => {
  if (emoji === "😷") return "airQuality";
  if (sentiment <= -2) return "hot";
  if (sentiment === -1) return "warm";
  if (sentiment === 0) return "comfortable";
  if (sentiment === 1) return "cool";
  return "cold";
};

// 커스텀 마커 아이콘 생성
const createReportIcon = (emoji, type, isRecent) => {
  const config = REPORT_TYPES[type] || REPORT_TYPES.comfortable;
  const size = isRecent ? 44 : 36;
  const pulseClass = isRecent ? "pulse-marker" : "";

  return L.divIcon({
    className: `report-map-marker ${pulseClass}`,
    html: `
      <div class="report-marker-pin" style="--marker-color: ${config.color}">
        <span class="marker-emoji">${emoji}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

function ReportMapOverlay({ visible, onReportClick }) {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showLegend, setShowLegend] = useState(false);
  const map = useMap();

  // 제보 데이터 로드
  useEffect(() => {
    if (visible) {
      loadReports();
      const interval = setInterval(loadReports, 30000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadReports = async () => {
    try {
      // 6시간 이내 제보만 표시
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const url = `${SUPABASE_URL}/rest/v1/user_reports?created_at=gte.${since}&order=created_at.desc&limit=50`;

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // 제보에 타입 추가
        const typedReports = data.map((report) => ({
          ...report,
          type: getReportType(report.emoji, report.sentiment_score),
          isRecent:
            Date.now() - new Date(report.created_at).getTime() < 30 * 60 * 1000, // 30분 이내
        }));

        setReports(typedReports);
      }
    } catch (error) {
      console.error("제보 로드 실패:", error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}시간 전`;
  };

  // 필터링된 제보
  const filteredReports =
    filter === "all" ? reports : reports.filter((r) => r.type === filter);

  // 타입별 카운트
  const typeCounts = reports.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  if (!visible) return null;

  return (
    <>
      {/* 제보 마커들 */}
      {filteredReports.map((report) => {
        // 같은 위치 제보가 겹치지 않도록 약간의 오프셋 추가
        const jitter = {
          lat: Math.sin(report.id * 12.34) * 0.003,
          lng: Math.cos(report.id * 56.78) * 0.005,
        };

        return (
          <Marker
            key={report.id}
            position={[
              parseFloat(report.lat) + jitter.lat,
              parseFloat(report.lng) + jitter.lng,
            ]}
            icon={createReportIcon(report.emoji, report.type, report.isRecent)}
            eventHandlers={{
              click: () => onReportClick && onReportClick(report),
            }}
          >
            <Popup className="report-detail-popup">
              <div className="report-popup-content">
                <div className="popup-top">
                  <span className="popup-emoji-large">{report.emoji}</span>
                  <div className="popup-info">
                    <span className="popup-region-name">{report.region}</span>
                    <span className="popup-time">
                      {formatTimeAgo(report.created_at)}
                    </span>
                  </div>
                </div>
                <p className="popup-comment-text">
                  "{report.comment || report.feeling_label}"
                </p>
                {report.temp_adjustment !== 0 && (
                  <div className="popup-temp-badge">
                    체감 {report.temp_adjustment > 0 ? "+" : ""}
                    {report.temp_adjustment}°C
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* 제보 필터 패널 */}
      <div className="report-filter-panel">
        <button
          className="filter-toggle-btn"
          onClick={() => setShowLegend(!showLegend)}
        >
          <span>💬</span>
          <span className="filter-count">{reports.length}</span>
        </button>

        {showLegend && (
          <div className="filter-legend">
            <div className="legend-title">실시간 제보</div>
            <button
              className={`filter-item ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <span>📍</span>
              <span>전체</span>
              <span className="item-count">{reports.length}</span>
            </button>
            {Object.entries(REPORT_TYPES).map(
              ([key, config]) =>
                typeCounts[key] > 0 && (
                  <button
                    key={key}
                    className={`filter-item ${filter === key ? "active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    <span>{config.emoji}</span>
                    <span>{config.label}</span>
                    <span className="item-count">{typeCounts[key]}</span>
                  </button>
                ),
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default ReportMapOverlay;
