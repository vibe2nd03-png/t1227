import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// 첫 인사 메시지
const GREETING_MESSAGE = { type: 'greeting', message: '안녕하세요! 저는 AI반디예요 🐝' };

// 봉공이 안내 메시지 (겨울철)
const GUIDE_MESSAGES = [
  { type: 'cold', message: '오늘 많이 춥네요! 따뜻하게 입고 외출하세요~ ❄️' },
  { type: 'wind', message: '바람이 불면 체감온도가 더 낮아져요! 방한용품 챙기세요~ 🌬️' },
  { type: 'pm', message: '미세먼지가 높은 지역이 있어요. 마스크 잊지 마세요! 😷' },
  { type: 'safe', message: '이 지역은 비교적 쾌적해요! 산책하기 좋은 날씨~ 🌤️' },
  { type: 'danger', message: '이 지역은 주의가 필요해요! 외출 시 조심하세요~ ⚠️' },
  { type: 'tip1', message: '지도에서 지역을 클릭하면 상세 정보를 볼 수 있어요! 👆' },
  { type: 'tip2', message: '대상별(일반/노인/아동/야외) 맞춤 정보도 확인해보세요! 👨‍👩‍👧‍👦' },
  { type: 'tip3', message: '오른쪽 랭킹에서 가장 쾌적한 지역을 찾아보세요! 🏆' },
  { type: 'winter', message: '동상 조심! 손발이 시리면 바로 따뜻하게 해주세요~ 🧤' },
];

// 경기도 주요 지점 (봉공이 이동 경로)
const PATROL_POINTS = [
  { lat: 37.2636, lng: 127.0286, name: '수원시' },
  { lat: 37.6584, lng: 126.8320, name: '고양시' },
  { lat: 37.4449, lng: 127.1389, name: '성남시' },
  { lat: 37.7381, lng: 127.0337, name: '의정부시' },
  { lat: 37.1996, lng: 126.8312, name: '화성시' },
  { lat: 37.5034, lng: 126.7660, name: '부천시' },
  { lat: 37.8949, lng: 127.2002, name: '포천시' },
  { lat: 37.4138, lng: 127.5183, name: '경기도 중앙' },
];

// 봉공이 캐릭터 아이콘 (SVG) - 큰 사이즈
const createBonggongiIcon = () => {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <!-- 몸통 (노란색 타원) -->
      <ellipse cx="50" cy="55" rx="28" ry="32" fill="#FFD93D" stroke="#E8A317" stroke-width="2"/>
      <!-- 줄무늬 -->
      <ellipse cx="50" cy="48" rx="24" ry="6" fill="#1A1A2E" opacity="0.8"/>
      <ellipse cx="50" cy="62" rx="22" ry="5" fill="#1A1A2E" opacity="0.8"/>
      <!-- 얼굴 -->
      <circle cx="50" cy="35" r="22" fill="#FFE066" stroke="#E8A317" stroke-width="2"/>
      <!-- 눈 -->
      <ellipse cx="42" cy="32" rx="5" ry="6" fill="#1A1A2E"/>
      <ellipse cx="58" cy="32" rx="5" ry="6" fill="#1A1A2E"/>
      <!-- 눈 반짝임 -->
      <circle cx="44" cy="30" r="2" fill="white"/>
      <circle cx="60" cy="30" r="2" fill="white"/>
      <!-- 볼 터치 -->
      <ellipse cx="35" cy="38" rx="5" ry="3" fill="#FF9999" opacity="0.6"/>
      <ellipse cx="65" cy="38" rx="5" ry="3" fill="#FF9999" opacity="0.6"/>
      <!-- 입 (미소) -->
      <path d="M 42 42 Q 50 50 58 42" stroke="#1A1A2E" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- 더듬이 -->
      <line x1="40" y1="15" x2="35" y2="5" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round"/>
      <line x1="60" y1="15" x2="65" y2="5" stroke="#1A1A2E" stroke-width="2" stroke-linecap="round"/>
      <circle cx="35" cy="5" r="4" fill="#FFD93D" stroke="#E8A317" stroke-width="1"/>
      <circle cx="65" cy="5" r="4" fill="#FFD93D" stroke="#E8A317" stroke-width="1"/>
      <!-- 날개 -->
      <ellipse cx="22" cy="45" rx="12" ry="18" fill="rgba(200, 230, 255, 0.7)" stroke="#87CEEB" stroke-width="1">
        <animate attributeName="ry" values="18;20;18" dur="0.3s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="78" cy="45" rx="12" ry="18" fill="rgba(200, 230, 255, 0.7)" stroke="#87CEEB" stroke-width="1">
        <animate attributeName="ry" values="18;20;18" dur="0.3s" repeatCount="indefinite"/>
      </ellipse>
      <!-- 경기도 마크 (가슴) -->
      <text x="50" y="58" text-anchor="middle" font-size="10" font-weight="bold" fill="#1A1A2E">경기</text>
    </svg>
  `;

  return L.divIcon({
    html: `<div class="bonggongi-container">${svgIcon}</div>`,
    className: 'bonggongi-icon',
    iconSize: [100, 100],
    iconAnchor: [50, 100],
    popupAnchor: [0, -90],
  });
};

function BonggongiGuide({ regions, selectedRegion }) {
  const map = useMap();
  const markerRef = useRef(null);
  const [position, setPosition] = useState(PATROL_POINTS[0]);
  const [currentMessage, setCurrentMessage] = useState(GREETING_MESSAGE);
  const [isVisible, setIsVisible] = useState(true);
  const [patrolIndex, setPatrolIndex] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);

  // 말풍선 자동 열기
  useEffect(() => {
    if (markerRef.current && isVisible) {
      setTimeout(() => {
        markerRef.current.openPopup();
      }, 500);
    }
  }, [position, currentMessage, isVisible]);

  // 지역 상태에 따른 메시지 선택
  const getContextualMessage = useCallback((pos) => {
    const nearbyRegion = regions.find(r =>
      Math.abs(r.lat - pos.lat) < 0.1 && Math.abs(r.lng - pos.lng) < 0.1
    );

    if (nearbyRegion) {
      const temp = nearbyRegion.climate_data?.apparent_temperature;
      const pm10 = nearbyRegion.climate_data?.pm10;

      if (temp !== null && temp <= -10) {
        return GUIDE_MESSAGES.find(m => m.type === 'cold');
      }
      if (pm10 && pm10 >= 80) {
        return GUIDE_MESSAGES.find(m => m.type === 'pm');
      }
      if (nearbyRegion.risk_level === 'danger' || nearbyRegion.risk_level === 'warning') {
        return GUIDE_MESSAGES.find(m => m.type === 'danger');
      }
      if (nearbyRegion.risk_level === 'safe') {
        return GUIDE_MESSAGES.find(m => m.type === 'safe');
      }
    }

    // 랜덤 팁 메시지
    const tips = GUIDE_MESSAGES.filter(m => m.type.startsWith('tip') || m.type === 'winter' || m.type === 'wind');
    return tips[Math.floor(Math.random() * tips.length)];
  }, [regions]);

  // 첫 인사 후 날씨 정보로 전환
  useEffect(() => {
    if (!hasGreeted) {
      const greetingTimer = setTimeout(() => {
        setHasGreeted(true);
        // 현재 위치의 날씨 정보로 전환
        setCurrentMessage(getContextualMessage(position));
      }, 4000); // 4초 후 날씨 정보로 전환

      return () => clearTimeout(greetingTimer);
    }
  }, [hasGreeted, getContextualMessage, position]);

  // 순찰 이동 (인사 후에만 시작)
  useEffect(() => {
    if (!hasGreeted) return; // 인사 전에는 순찰 안함

    const moveInterval = setInterval(() => {
      setPatrolIndex(prev => {
        const nextIndex = (prev + 1) % PATROL_POINTS.length;
        const nextPos = PATROL_POINTS[nextIndex];
        setPosition(nextPos);
        setCurrentMessage(getContextualMessage(nextPos));
        return nextIndex;
      });
    }, 8000); // 8초마다 이동

    return () => clearInterval(moveInterval);
  }, [hasGreeted, getContextualMessage]);

  // 선택된 지역으로 이동
  useEffect(() => {
    if (selectedRegion) {
      setPosition({
        lat: selectedRegion.lat + 0.05, // 약간 위에 위치
        lng: selectedRegion.lng,
        name: selectedRegion.region,
      });

      // 선택된 지역에 맞는 메시지
      const temp = selectedRegion.climate_data?.apparent_temperature;
      if (temp !== null && temp <= -15) {
        setCurrentMessage({ type: 'cold', message: `${selectedRegion.region}은 체감온도 ${temp}°C! 정말 추우니 조심하세요! 🥶` });
      } else if (temp !== null && temp <= -5) {
        setCurrentMessage({ type: 'cold', message: `${selectedRegion.region}의 체감온도는 ${temp}°C예요. 따뜻하게 입으세요~ ❄️` });
      } else if (selectedRegion.risk_level === 'danger') {
        setCurrentMessage({ type: 'danger', message: `${selectedRegion.region}은 주의가 필요한 지역이에요! ⚠️` });
      } else if (selectedRegion.risk_level === 'safe') {
        setCurrentMessage({ type: 'safe', message: `${selectedRegion.region}은 비교적 쾌적한 지역이에요! 🌟` });
      } else {
        setCurrentMessage({ type: 'info', message: `${selectedRegion.region}의 기후 정보를 확인해보세요! 📊` });
      }
    }
  }, [selectedRegion]);

  if (!isVisible) return null;

  return (
    <>
      <Marker
        ref={markerRef}
        position={[position.lat, position.lng]}
        icon={createBonggongiIcon()}
        eventHandlers={{
          click: () => {
            // 클릭 시 새로운 팁 표시
            const tips = GUIDE_MESSAGES.filter(m => m.type.startsWith('tip'));
            setCurrentMessage(tips[Math.floor(Math.random() * tips.length)]);
          },
        }}
      >
        <Popup className="bonggongi-popup" autoPan={false}>
          <div className="bonggongi-speech">
            <div className="speech-header">
              <span className="bonggongi-name">🐝 AI반디</span>
              <button
                className="close-guide-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
              >
                ✕
              </button>
            </div>
            <p className="speech-text">{currentMessage.message}</p>
          </div>
        </Popup>
      </Marker>

      {/* 봉공이 토글 버튼 (숨겼을 때 다시 표시) */}
      {!isVisible && (
        <div
          className="bonggongi-toggle"
          onClick={() => setIsVisible(true)}
        >
          🐝 AI반디 부르기
        </div>
      )}
    </>
  );
}

export default BonggongiGuide;
