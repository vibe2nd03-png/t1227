import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FloatingReports from './FloatingReports';
import RegionRanking from './RegionRanking';

// 커스텀 이징 함수들
const easingFunctions = {
  // 부드러운 감속 (ease-out-cubic)
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  // 부드러운 가속-감속 (ease-in-out-cubic)
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  // 탄성 효과 (elastic)
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  // 바운스 효과
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// 부드러운 줌 애니메이션 컨트롤러
function MapAnimationController({ selectedRegion, previousRegion }) {
  const map = useMap();
  const animationRef = useRef(null);

  // 커스텀 부드러운 줌 애니메이션
  const smoothZoomTo = useCallback((targetLat, targetLng, targetZoom, duration = 1200) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startCenter = map.getCenter();
    const startZoom = map.getZoom();
    const startTime = performance.now();

    const startLat = startCenter.lat;
    const startLng = startCenter.lng;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeInOutCubic 이징 적용
      const easedProgress = easingFunctions.easeInOutCubic(progress);

      // 현재 위치와 줌 계산
      const currentLat = startLat + (targetLat - startLat) * easedProgress;
      const currentLng = startLng + (targetLng - startLng) * easedProgress;
      const currentZoom = startZoom + (targetZoom - startZoom) * easedProgress;

      map.setView([currentLat, currentLng], currentZoom, { animate: false });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [map]);

  // 2단계 줌 애니메이션 (줌아웃 후 줌인)
  const twoStageZoom = useCallback((targetLat, targetLng, targetZoom) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startCenter = map.getCenter();
    const startZoom = map.getZoom();
    const startTime = performance.now();

    const startLat = startCenter.lat;
    const startLng = startCenter.lng;

    // 중간 줌 레벨 (살짝 줌아웃)
    const midZoom = Math.min(startZoom, targetZoom) - 0.5;
    const totalDuration = 1400;
    const phase1Duration = totalDuration * 0.4; // 40% 줌아웃
    const phase2Duration = totalDuration * 0.6; // 60% 줌인

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;

      if (elapsed < phase1Duration) {
        // Phase 1: 줌아웃하면서 중간 지점으로 이동
        const progress = elapsed / phase1Duration;
        const easedProgress = easingFunctions.easeOutCubic(progress);

        const midLat = startLat + (targetLat - startLat) * 0.5 * easedProgress;
        const midLng = startLng + (targetLng - startLng) * 0.5 * easedProgress;
        const currentZoom = startZoom + (midZoom - startZoom) * easedProgress;

        map.setView([midLat, midLng], currentZoom, { animate: false });
        animationRef.current = requestAnimationFrame(animate);
      } else if (elapsed < totalDuration) {
        // Phase 2: 목표 지점으로 줌인
        const progress = (elapsed - phase1Duration) / phase2Duration;
        const easedProgress = easingFunctions.easeOutCubic(progress);

        const midLat = startLat + (targetLat - startLat) * 0.5;
        const midLng = startLng + (targetLng - startLng) * 0.5;

        const currentLat = midLat + (targetLat - midLat) * easedProgress;
        const currentLng = midLng + (targetLng - midLng) * easedProgress;
        const currentZoom = midZoom + (targetZoom - midZoom) * easedProgress;

        map.setView([currentLat, currentLng], currentZoom, { animate: false });
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [map]);

  useEffect(() => {
    if (selectedRegion) {
      // 선택된 지역으로 부드럽게 줌
      twoStageZoom(selectedRegion.lat, selectedRegion.lng, 12);
    } else if (previousRegion && !selectedRegion) {
      // 전체 보기로 복귀
      smoothZoomTo(37.4138, 127.5183, 9, 800);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [selectedRegion, previousRegion, smoothZoomTo, twoStageZoom]);

  return null;
}

// 펄스 애니메이션 마커 컴포넌트
function AnimatedMarker({ region, isSelected, onSelect, getMarkerRadius }) {
  const [isHovered, setIsHovered] = useState(false);
  const [animatedRadius, setAnimatedRadius] = useState(null);
  const animationRef = useRef(null);
  const baseRadius = getMarkerRadius(region.risk_level);

  // 선택된 마커는 더 크게, 호버 시 약간 크게
  const targetRadius = isSelected ? baseRadius * 1.4 : isHovered ? baseRadius * 1.15 : baseRadius;

  // 마커 크기 애니메이션
  useEffect(() => {
    if (animatedRadius === null) {
      setAnimatedRadius(targetRadius);
      return;
    }

    const startRadius = animatedRadius;
    const startTime = performance.now();
    const duration = isSelected ? 400 : 200; // 선택 시 더 긴 애니메이션

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutBack 이징 (살짝 오버슈트 효과)
      const eased = isSelected
        ? 1 + 2.70158 * Math.pow(progress - 1, 3) + 1.70158 * Math.pow(progress - 1, 2)
        : 1 - Math.pow(1 - progress, 3); // easeOutCubic

      const currentRadius = startRadius + (targetRadius - startRadius) * eased;
      setAnimatedRadius(currentRadius);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetRadius, isSelected]);

  const radius = animatedRadius || targetRadius;

  return (
    <CircleMarker
      center={[region.lat, region.lng]}
      radius={radius}
      pathOptions={{
        fillColor: region.risk_color,
        fillOpacity: isSelected ? 1 : isHovered ? 0.9 : 0.75,
        color: isSelected ? '#1a1a2e' : isHovered ? '#333' : '#fff',
        weight: isSelected ? 4 : isHovered ? 3 : 2,
        className: isSelected ? 'selected-marker pulse-animation' : '',
      }}
      eventHandlers={{
        click: () => onSelect(region),
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false),
      }}
    >
      <Popup>
        <div style={{ textAlign: 'center', minWidth: '140px' }}>
          <strong style={{ fontSize: '15px', color: '#1a1a2e' }}>{region.region}</strong>
          <br />
          <span
            style={{
              display: 'inline-block',
              marginTop: '8px',
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: region.risk_color,
              color: region.risk_level === 'caution' ? '#333' : '#fff',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {region.risk_label} ({region.adjusted_score || region.score}점)
          </span>
          <br />
          <span style={{ fontSize: '13px', color: '#555', marginTop: '6px', display: 'block' }}>
            체감온도 {region.climate_data.apparent_temperature}°C
          </span>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function ClimateMap({ regions, selectedRegion, onRegionSelect }) {
  const [previousRegion, setPreviousRegion] = useState(null);
  const [showReports, setShowReports] = useState(true);
  const gyeonggiCenter = [37.4138, 127.5183];

  // 이전 선택 지역 추적
  useEffect(() => {
    return () => {
      setPreviousRegion(selectedRegion);
    };
  }, [selectedRegion]);

  // 위험 등급별 마커 크기
  const getMarkerRadius = (riskLevel) => {
    switch (riskLevel) {
      case 'danger': return 18;
      case 'warning': return 16;
      case 'caution': return 14;
      default: return 12;
    }
  };

  // 선택된 지역이 맨 위에 렌더링되도록 정렬
  const sortedRegions = [...regions].sort((a, b) => {
    if (a.region === selectedRegion?.region) return 1;
    if (b.region === selectedRegion?.region) return -1;
    return 0;
  });

  return (
    <div className="map-container">
      <MapContainer
        center={gyeonggiCenter}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        zoomAnimation={true}
        fadeAnimation={true}
        markerZoomAnimation={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAnimationController
          selectedRegion={selectedRegion}
          previousRegion={previousRegion}
        />

        {sortedRegions.map((region) => (
          <AnimatedMarker
            key={region.region}
            region={region}
            isSelected={selectedRegion?.region === region.region}
            onSelect={onRegionSelect}
            getMarkerRadius={getMarkerRadius}
          />
        ))}

        {/* 떠다니는 시민 제보 마커 */}
        <FloatingReports visible={showReports} />
      </MapContainer>

      {/* 선택된 지역 표시 */}
      {selectedRegion && (
        <div className="selected-region-badge">
          <span className="badge-dot" style={{ backgroundColor: selectedRegion.risk_color }}></span>
          {selectedRegion.region}
        </div>
      )}

      {/* 범례 */}
      <div className="map-legend">
        <h4>위험 등급</h4>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
          <span>안전 (0-29점)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFEB3B' }}></div>
          <span>주의 (30-49점)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
          <span>경고 (50-74점)</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
          <span>위험 (75-100점)</span>
        </div>

        {/* 제보 표시 토글 */}
        <div className="legend-divider"></div>
        <button
          className={`report-toggle ${showReports ? 'active' : ''}`}
          onClick={() => setShowReports(!showReports)}
        >
          {showReports ? '💬 제보 숨기기' : '💬 제보 보기'}
        </button>
      </div>

      {/* 지역별 랭킹 */}
      <RegionRanking regions={regions} onRegionClick={onRegionSelect} />
    </div>
  );
}

export default ClimateMap;
