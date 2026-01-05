import React, { useState, useEffect } from "react";

// 경기도 31개 시군 좌표
const GYEONGGI_COORDINATES = [
  { region: "수원시", lat: 37.2636, lng: 127.0286 },
  { region: "성남시", lat: 37.42, lng: 127.1267 },
  { region: "고양시", lat: 37.6584, lng: 126.832 },
  { region: "용인시", lat: 37.2411, lng: 127.1776 },
  { region: "부천시", lat: 37.5034, lng: 126.766 },
  { region: "안산시", lat: 37.3219, lng: 126.8309 },
  { region: "안양시", lat: 37.3943, lng: 126.9568 },
  { region: "남양주시", lat: 37.636, lng: 127.2165 },
  { region: "화성시", lat: 37.1995, lng: 126.8312 },
  { region: "평택시", lat: 36.9921, lng: 127.0857 },
  { region: "의정부시", lat: 37.7381, lng: 127.0337 },
  { region: "시흥시", lat: 37.38, lng: 126.8031 },
  { region: "파주시", lat: 37.7126, lng: 126.7618 },
  { region: "김포시", lat: 37.6153, lng: 126.7156 },
  { region: "광명시", lat: 37.4786, lng: 126.8644 },
  { region: "광주시", lat: 37.4095, lng: 127.255 },
  { region: "군포시", lat: 37.3617, lng: 126.9353 },
  { region: "하남시", lat: 37.5393, lng: 127.2148 },
  { region: "오산시", lat: 37.1499, lng: 127.0773 },
  { region: "이천시", lat: 37.2723, lng: 127.4348 },
  { region: "안성시", lat: 37.0078, lng: 127.2797 },
  { region: "의왕시", lat: 37.3449, lng: 126.9682 },
  { region: "양주시", lat: 37.7853, lng: 127.0456 },
  { region: "포천시", lat: 37.8949, lng: 127.2002 },
  { region: "여주시", lat: 37.2984, lng: 127.6363 },
  { region: "동두천시", lat: 37.9035, lng: 127.0606 },
  { region: "과천시", lat: 37.4292, lng: 126.9876 },
  { region: "구리시", lat: 37.5943, lng: 127.1295 },
  { region: "연천군", lat: 38.0966, lng: 127.0748 },
  { region: "가평군", lat: 37.8315, lng: 127.5095 },
  { region: "양평군", lat: 37.4917, lng: 127.4872 },
];

// 두 지점 사이의 거리 계산 (Haversine formula)
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // 지구 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 가장 가까운 지역 찾기
const findNearestRegion = (lat, lng) => {
  let nearest = null;
  let minDistance = Infinity;

  for (const region of GYEONGGI_COORDINATES) {
    const distance = getDistance(lat, lng, region.lat, region.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...region, distance };
    }
  }

  return nearest;
};

function LocationDetector({ onLocationDetected, regions, compact = false }) {
  const [status, setStatus] = useState("idle"); // idle, detecting, success, error, outside
  const [errorMessage, setErrorMessage] = useState("");
  const [detectedRegion, setDetectedRegion] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("위치 서비스를 지원하지 않는 브라우저입니다");
      return;
    }

    setStatus("detecting");
    setErrorMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestRegion(latitude, longitude);

        if (nearest) {
          // 50km 이내면 경기도 지역으로 인정
          if (nearest.distance <= 50) {
            setStatus("success");
            setDetectedRegion(nearest);

            // regions에서 해당 지역 데이터 찾기
            const regionData = regions?.find(
              (r) => r.region === nearest.region,
            );
            if (regionData && onLocationDetected) {
              onLocationDetected(regionData);
            } else if (onLocationDetected) {
              // 데이터가 없으면 기본 정보만 전달
              onLocationDetected({
                region: nearest.region,
                lat: nearest.lat,
                lng: nearest.lng,
              });
            }

            // 3초 후 상태 리셋
            setTimeout(() => {
              setStatus("idle");
              setDetectedRegion(null);
            }, 3000);
          } else {
            setStatus("outside");
            setErrorMessage(
              `현재 위치는 경기도에서 ${Math.round(nearest.distance)}km 떨어져 있습니다`,
            );
          }
        }
      },
      (error) => {
        setStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage("위치 권한이 거부되었습니다");
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage("위치 정보를 가져올 수 없습니다");
            break;
          case error.TIMEOUT:
            setErrorMessage("위치 요청 시간이 초과되었습니다");
            break;
          default:
            setErrorMessage("위치를 확인할 수 없습니다");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5분 캐시
      },
    );
  };

  // 컴팩트 모드 (모바일 헤더용)
  if (compact) {
    return (
      <button
        className={`location-btn-compact ${status}`}
        onClick={detectLocation}
        disabled={status === "detecting"}
      >
        {status === "detecting" ? (
          <span className="spinning">📍</span>
        ) : status === "success" ? (
          <span>✓</span>
        ) : (
          <span>📍</span>
        )}
      </button>
    );
  }

  return (
    <div className="location-detector">
      <button
        className={`location-btn ${status}`}
        onClick={detectLocation}
        disabled={status === "detecting"}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {status === "detecting" ? (
          <>
            <span className="btn-icon spinning">📍</span>
            <span className="btn-text">감지 중...</span>
          </>
        ) : status === "success" ? (
          <>
            <span className="btn-icon">✓</span>
            <span className="btn-text">{detectedRegion?.region}</span>
          </>
        ) : (
          <>
            <span className="btn-icon">📍</span>
            <span className="btn-text">내 위치</span>
          </>
        )}
      </button>

      {/* 툴팁 */}
      {showTooltip && status === "idle" && (
        <div className="location-tooltip">
          현재 위치에서 가장 가까운 지역을 자동으로 선택합니다
        </div>
      )}

      {/* 에러/상태 메시지 */}
      {(status === "error" || status === "outside") && (
        <div className="location-message error">
          <span>⚠️</span>
          <span>{errorMessage}</span>
          <button onClick={() => setStatus("idle")}>✕</button>
        </div>
      )}

      {status === "success" && detectedRegion && (
        <div className="location-message success">
          <span>📍</span>
          <span>
            {detectedRegion.region} ({Math.round(detectedRegion.distance)}km
            이내)
          </span>
        </div>
      )}
    </div>
  );
}

export default LocationDetector;
