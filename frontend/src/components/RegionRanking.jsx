import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

function RegionRanking({ regions, onRegionClick }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reportStats, setReportStats] = useState({});
  const [activeTab, setActiveTab] = useState('hot'); // hot, cool, reports

  // 제보 통계 로드
  useEffect(() => {
    loadReportStats();
    const interval = setInterval(loadReportStats, 60000); // 1분마다 새로고침
    return () => clearInterval(interval);
  }, []);

  const loadReportStats = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('region, sentiment_score, temp_adjustment, emoji')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

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
          acc[report.region].totalTempAdj += parseFloat(report.temp_adjustment) || 0;
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
      console.error('통계 로드 실패:', error);
    }
  };

  const getMostFrequent = (arr) => {
    const counts = arr.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '🌡️';
  };

  // 가장 더운 지역 (점수 높은 순)
  const hottestRegions = [...regions]
    .map((r) => ({
      ...r,
      adjustedScore: r.score + (reportStats[r.region]?.avgTempAdj || 0) * 2,
      reportCount: reportStats[r.region]?.count || 0,
      topEmoji: reportStats[r.region]?.topEmoji || null,
    }))
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
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
  const mostReportedRegions = [...regions]
    .map((r) => ({
      ...r,
      reportCount: reportStats[r.region]?.count || 0,
      topEmoji: reportStats[r.region]?.topEmoji || null,
      avgSentiment: reportStats[r.region]?.avgSentiment || 0,
    }))
    .filter((r) => r.reportCount > 0)
    .sort((a, b) => b.reportCount - a.reportCount)
    .slice(0, 5);

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
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
            </span>
            <div className="rank-info">
              <span className="rank-region">{region.region}</span>
              {region.topEmoji && (
                <span className="rank-emoji">{region.topEmoji}</span>
              )}
            </div>
            <div className="rank-stats">
              {type === 'hot' && (
                <>
                  <span className="rank-score" style={{ color: region.risk_color }}>
                    {Math.round(region.adjustedScore)}점
                  </span>
                  <span className="rank-temp">
                    {region.climate_data?.apparent_temperature}°C
                  </span>
                </>
              )}
              {type === 'cool' && (
                <>
                  <span className="rank-score" style={{ color: region.risk_color }}>
                    {Math.round(region.adjustedScore)}점
                  </span>
                  <span className="rank-temp">
                    {region.climate_data?.apparent_temperature}°C
                  </span>
                </>
              )}
              {type === 'reports' && (
                <>
                  <span className="rank-count">{region.reportCount}건</span>
                  <span className="rank-sentiment">
                    {region.avgSentiment < -1 ? '🔥 더움' : region.avgSentiment > 1 ? '❄️ 쌀쌀' : '😊 보통'}
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
    <div className={`region-ranking ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="ranking-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-icon">🏆</span>
        <span>체감 랭킹</span>
        <span className="toggle-arrow">{isExpanded ? '▼' : '▲'}</span>
      </button>

      {isExpanded && (
        <div className="ranking-content">
          {/* 탭 메뉴 */}
          <div className="ranking-tabs">
            <button
              className={`tab-btn ${activeTab === 'hot' ? 'active' : ''}`}
              onClick={() => setActiveTab('hot')}
            >
              🥵 더운 동네
            </button>
            <button
              className={`tab-btn ${activeTab === 'cool' ? 'active' : ''}`}
              onClick={() => setActiveTab('cool')}
            >
              😎 쾌적한 동네
            </button>
            <button
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              📢 제보 핫플
            </button>
          </div>

          {/* 랭킹 리스트 */}
          <div className="ranking-list-container">
            {activeTab === 'hot' && renderRankList(hottestRegions, 'hot')}
            {activeTab === 'cool' && renderRankList(coolestRegions, 'cool')}
            {activeTab === 'reports' && renderRankList(mostReportedRegions, 'reports')}
          </div>

          {/* 보정 체감 온도 설명 */}
          <div className="ranking-footer">
            <p className="adjust-note">
              * 점수는 시민 제보를 반영한 보정 체감지수입니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegionRanking;
