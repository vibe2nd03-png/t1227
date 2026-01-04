import React from 'react';
import { useFavorites } from '../hooks/useFavorites';
import { useAuth } from '../contexts/AuthContext';

/**
 * 즐겨찾기 지역 빠른 접근 컴포넌트
 */
function FavoriteRegions({ allRegions, onRegionSelect, selectedRegion }) {
  const { favorites, loading, removeFavorite } = useFavorites();
  const { user } = useAuth();

  // 로그인하지 않은 경우 표시 안 함
  if (!user) {
    return null;
  }

  if (loading) {
    return null;
  }

  // 즐겨찾기가 없으면 표시 안 함
  if (favorites.length === 0) {
    return null;
  }

  // 즐겨찾기 지역의 전체 데이터 찾기
  const favoriteRegions = favorites
    .map(regionName => allRegions.find(r => r.region === regionName))
    .filter(Boolean);

  return (
    <div className="favorite-regions">
      <div className="favorite-header">
        <span className="favorite-title">⭐ 즐겨찾기</span>
        <span className="favorite-count">{favorites.length}개</span>
      </div>
      <div className="favorite-list">
        {favoriteRegions.map((region) => {
          const riskColor = region.risk_color || '#22c55e';
          return (
            <div
              key={region.region}
              className={`favorite-item ${selectedRegion?.region === region.region ? 'selected' : ''}`}
              onClick={() => onRegionSelect(region)}
            >
              <div className="favorite-info">
                <span className="favorite-name">{region.region}</span>
                <span
                  className="favorite-temp"
                  style={{ color: riskColor }}
                >
                  {region.climate_data?.apparent_temperature ?? '-'}°
                </span>
              </div>
              <div className="favorite-status">
                <span
                  className="favorite-risk"
                  style={{ backgroundColor: riskColor }}
                >
                  {region.risk_label || '안전'}
                </span>
                <button
                  className="favorite-remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(region.region);
                  }}
                  title="즐겨찾기 해제"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FavoriteRegions;
