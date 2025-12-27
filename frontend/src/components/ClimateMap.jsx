import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// 지도 중심 이동 컴포넌트
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 11, { animate: true });
    }
  }, [center, map]);
  return null;
}

function ClimateMap({ regions, selectedRegion, onRegionSelect }) {
  // 경기도 중심 좌표
  const gyeonggiCenter = [37.4138, 127.5183];

  // 선택된 지역 중심
  const mapCenter = selectedRegion
    ? [selectedRegion.lat, selectedRegion.lng]
    : null;

  // 위험 등급별 마커 크기
  const getMarkerRadius = (riskLevel) => {
    switch (riskLevel) {
      case 'danger': return 18;
      case 'warning': return 16;
      case 'caution': return 14;
      default: return 12;
    }
  };

  return (
    <div className="map-container">
      <MapContainer
        center={gyeonggiCenter}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapCenter && <MapCenterController center={mapCenter} />}

        {regions.map((region) => (
          <CircleMarker
            key={region.region}
            center={[region.lat, region.lng]}
            radius={getMarkerRadius(region.risk_level)}
            pathOptions={{
              fillColor: region.risk_color,
              fillOpacity: 0.8,
              color: selectedRegion?.region === region.region ? '#333' : '#fff',
              weight: selectedRegion?.region === region.region ? 3 : 2,
            }}
            eventHandlers={{
              click: () => onRegionSelect(region),
            }}
          >
            <Popup>
              <div style={{ textAlign: 'center', minWidth: '120px' }}>
                <strong style={{ fontSize: '14px' }}>{region.region}</strong>
                <br />
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '5px',
                    padding: '3px 10px',
                    borderRadius: '10px',
                    backgroundColor: region.risk_color,
                    color: region.risk_level === 'caution' ? '#333' : '#fff',
                    fontSize: '12px',
                  }}
                >
                  {region.risk_label} ({region.adjusted_score || region.score}점)
                </span>
                <br />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  체감 {region.climate_data.apparent_temperature}°C
                </span>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

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
      </div>
    </div>
  );
}

export default ClimateMap;
