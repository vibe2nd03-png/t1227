import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import FloatingReports from './FloatingReports';
import RegionRanking from './RegionRanking';
import BonggongiGuide from './BonggongiGuide';
import { getNearbyRealtimeWeather } from '../services/kmaApi';

// 경기도 31개 시군 목록
const GYEONGGI_REGIONS = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
  '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시',
  '군포시', '하남시', '오산시', '이천시', '안성시', '의왕시', '양주시', '포천시',
  '여주시', '동두천시', '과천시', '구리시', '연천군', '가평군', '양평군'
];

// 경기도 외 주변 지역 (서울, 인천, 강원, 충북, 충남)
const NEARBY_REGIONS = [
  { region: '서울', lat: 37.5665, lng: 126.9780, isGyeonggi: false },
  { region: '인천', lat: 37.4563, lng: 126.7052, isGyeonggi: false },
  { region: '춘천', lat: 37.8813, lng: 127.7300, isGyeonggi: false },
  { region: '원주', lat: 37.3422, lng: 127.9202, isGyeonggi: false },
  { region: '충주', lat: 36.9910, lng: 127.9259, isGyeonggi: false },
  { region: '천안', lat: 36.8151, lng: 127.1139, isGyeonggi: false },
  { region: '세종', lat: 36.4800, lng: 127.2890, isGyeonggi: false },
];

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

// 온도 표시 헬퍼 함수
const formatTemperature = (climateData) => {
  if (!climateData) return '데이터 없음';

  const apparent = climateData.apparent_temperature;
  const temp = climateData.temperature;

  // apparent_temperature 체크
  if (apparent !== null && apparent !== undefined && !isNaN(apparent) && apparent !== 'null') {
    return `${apparent}°C`;
  }

  // temperature 체크
  if (temp !== null && temp !== undefined && !isNaN(temp) && temp !== 'null') {
    return `${temp}°C`;
  }

  return '데이터 없음';
};

// 마커 컴포넌트 (간소화 - 떨림 방지)
function AnimatedMarker({ region, isSelected, onSelect, getMarkerRadius, isGyeonggi = true }) {
  // 경기도 외 지역은 50% 작게 표시
  const sizeMultiplier = isGyeonggi ? 1 : 0.5;
  const baseRadius = getMarkerRadius(region.risk_level) * sizeMultiplier;

  // 선택된 마커만 크게 (호버 애니메이션 제거로 떨림 방지)
  const radius = isSelected ? baseRadius * 1.3 : baseRadius;

  return (
    <CircleMarker
      center={[region.lat, region.lng]}
      radius={radius}
      pathOptions={{
        fillColor: region.risk_color,
        fillOpacity: isSelected ? 1 : 0.8,
        color: isSelected ? '#1a1a2e' : '#fff',
        weight: isSelected ? 4 : 2,
        className: isSelected ? 'selected-marker' : '',
      }}
      eventHandlers={{
        click: () => onSelect(region),
      }}
    >
      <Tooltip
        direction="top"
        offset={[0, -10]}
        opacity={0.95}
        className="city-tooltip"
      >
        <div style={{ textAlign: 'center', minWidth: '120px', padding: '4px' }}>
          <div style={{
            fontSize: '15px',
            fontWeight: '700',
            marginBottom: '6px',
          }}>
            {region.region}
            {!isGyeonggi && <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>(주변)</span>}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: region.risk_color,
              color: region.risk_level === 'caution' ? '#333' : '#fff',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            {region.risk_level === 'danger' ? '🔴' :
             region.risk_level === 'warning' ? '🟠' :
             region.risk_level === 'caution' ? '🟡' : '🔵'}
            {region.risk_label} {region.adjusted_score || region.score}점
          </div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            🌡️ 체감 {formatTemperature(region.climate_data)}
          </div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}

function ClimateMap({ regions, selectedRegion, onRegionSelect, onMapClick }) {
  const [previousRegion, setPreviousRegion] = useState(null);
  const [showReports, setShowReports] = useState(true);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [nearbyRegions, setNearbyRegions] = useState([]);
  // 구리시 중심, 동두천시(상단)~오산시(하단) 모두 표시
  const gyeonggiCenter = [37.52, 127.05];

  // 이전 선택 지역 추적
  useEffect(() => {
    return () => {
      setPreviousRegion(selectedRegion);
    };
  }, [selectedRegion]);

  // 주변 도시 실시간 데이터 조회
  useEffect(() => {
    const fetchNearbyData = async () => {
      try {
        const data = await getNearbyRealtimeWeather();
        if (data && data.length > 0) {
          setNearbyRegions(data);
        }
      } catch (error) {
        console.error('주변 도시 데이터 조회 실패:', error);
      }
    };

    fetchNearbyData();
    // 10분마다 갱신
    const interval = setInterval(fetchNearbyData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 위험 등급별 마커 크기
  const getMarkerRadius = (riskLevel) => {
    switch (riskLevel) {
      case 'danger': return 18;
      case 'warning': return 16;
      case 'caution': return 14;
      default: return 12;
    }
  };

  // 경기도 지역과 주변 지역 분류
  const gyeonggiRegions = regions.filter(r => GYEONGGI_REGIONS.includes(r.region));

  // 주변 지역 데이터 (실시간 API 데이터 사용, 없으면 fallback)
  const fallbackNearbyData = NEARBY_REGIONS.map(r => ({
    ...r,
    isGyeonggi: false,
    score: 30,
    risk_level: 'safe',
    risk_label: '안전',
    risk_color: '#2196F3',
    adjusted_score: 30,
    climate_data: { temperature: null, apparent_temperature: null, humidity: null },
  }));

  const nearbyRegionsWithData = nearbyRegions.length > 0 ? nearbyRegions : fallbackNearbyData;

  // 선택된 지역이 맨 위에 렌더링되도록 정렬
  const sortedGyeonggiRegions = [...gyeonggiRegions].sort((a, b) => {
    if (a.region === selectedRegion?.region) return 1;
    if (b.region === selectedRegion?.region) return -1;
    return 0;
  });

  // 모바일에서 지도 클릭 시 사이드바 접기
  const handleMapClick = () => {
    if (onMapClick && window.innerWidth <= 768) {
      onMapClick();
    }
  };

  return (
    <div className="map-container" onClick={handleMapClick}>
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

        {/* 주변 지역 마커 (50% 작게, 클릭 가능) */}
        {nearbyRegionsWithData.map((region) => (
          <AnimatedMarker
            key={region.region}
            region={region}
            isSelected={selectedRegion?.region === region.region}
            onSelect={onRegionSelect}
            getMarkerRadius={getMarkerRadius}
            isGyeonggi={false}
          />
        ))}

        {/* 경기도 지역 마커 (정상 크기) */}
        {sortedGyeonggiRegions.map((region) => (
          <AnimatedMarker
            key={region.region}
            region={region}
            isSelected={selectedRegion?.region === region.region}
            onSelect={onRegionSelect}
            getMarkerRadius={getMarkerRadius}
            isGyeonggi={true}
          />
        ))}

        {/* 떠다니는 시민 제보 마커 */}
        <FloatingReports visible={showReports} />

        {/* AI 도우미 봉공이 */}
        <BonggongiGuide regions={regions} selectedRegion={selectedRegion} />
      </MapContainer>

      {/* 선택된 지역 표시 */}
      {selectedRegion && (
        <div className="selected-region-badge">
          <span className="badge-dot" style={{ backgroundColor: selectedRegion.risk_color }}></span>
          {selectedRegion.region}
        </div>
      )}

      {/* 범례 - 축소 가능 */}
      <div className={`map-legend ${legendCollapsed ? 'collapsed' : ''}`}>
        <div className="legend-header" onClick={() => setLegendCollapsed(!legendCollapsed)}>
          <h4>{legendCollapsed ? '📊' : '위험 등급'}</h4>
          <span className="legend-toggle">{legendCollapsed ? '▲' : '▼'}</span>
        </div>
        {!legendCollapsed && (
          <>
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
            <div className="legend-divider"></div>
            <button
              className={`report-toggle ${showReports ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowReports(!showReports); }}
            >
              {showReports ? '💬 제보 숨기기' : '💬 제보 보기'}
            </button>
          </>
        )}
      </div>

      {/* 지역별 랭킹 */}
      <RegionRanking regions={regions} onRegionClick={onRegionSelect} />
    </div>
  );
}

export default ClimateMap;
