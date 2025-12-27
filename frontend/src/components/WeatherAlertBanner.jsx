import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

// 경보 유형별 스타일 설정
const ALERT_STYLES = {
  danger: {
    backgroundColor: '#F44336',
    icon: '🚨',
    priority: 1,
  },
  warning: {
    backgroundColor: '#FF9800',
    icon: '⚠️',
    priority: 2,
  },
  watch: {
    backgroundColor: '#FFEB3B',
    textColor: '#333',
    icon: '👁️',
    priority: 3,
  },
  info: {
    backgroundColor: '#2196F3',
    icon: 'ℹ️',
    priority: 4,
  },
};

// 기본 경보 데이터 (Supabase 연결 실패 시 사용)
const DEFAULT_ALERTS = [
  {
    id: 1,
    type: 'warning',
    title: '폭염주의보',
    message: '경기 남부지역(화성시, 오산시, 평택시)에 폭염주의보가 발효 중입니다. 야외활동을 자제해 주세요.',
    region: '경기 남부',
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    type: 'info',
    title: '미세먼지 정보',
    message: '오늘 경기 북부지역 미세먼지 농도가 \'보통\' 수준입니다.',
    region: '경기 북부',
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    type: 'watch',
    title: '자외선 지수 높음',
    message: '오후 12시~15시 자외선 지수가 \'매우 높음\'으로 예상됩니다. 외출 시 자외선 차단제를 사용하세요.',
    region: '경기도 전역',
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
];

function WeatherAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  // 경보 데이터 로드
  useEffect(() => {
    loadAlerts();

    // 5분마다 경보 데이터 새로고침
    const refreshInterval = setInterval(loadAlerts, 5 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  // 자동 슬라이드
  useEffect(() => {
    if (alerts.length <= 1 || isPaused) return;

    const slideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, [alerts.length, isPaused]);

  const loadAlerts = async () => {
    try {
      // Supabase에서 활성 경보 조회
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('type', { ascending: true })
        .order('issued_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // 우선순위로 정렬
        const sortedAlerts = data.sort((a, b) => {
          const priorityA = ALERT_STYLES[a.type]?.priority || 99;
          const priorityB = ALERT_STYLES[b.type]?.priority || 99;
          return priorityA - priorityB;
        });
        setAlerts(sortedAlerts);
      } else {
        // 데이터 없으면 기본 경보 사용
        setAlerts(DEFAULT_ALERTS);
      }
    } catch (error) {
      console.error('경보 데이터 로드 실패:', error);
      setAlerts(DEFAULT_ALERTS);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % alerts.length);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  if (alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex];
  const style = ALERT_STYLES[currentAlert.type] || ALERT_STYLES.info;

  return (
    <div
      className="weather-alert-banner"
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor || '#fff',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="alert-container">
        {/* 경보 아이콘 */}
        <span className="alert-icon">{style.icon}</span>

        {/* 경보 내용 */}
        <div className="alert-content" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="alert-badge">{currentAlert.title}</span>
          <span className="alert-message">
            {isExpanded ? currentAlert.message : currentAlert.message.slice(0, 60) + (currentAlert.message.length > 60 ? '...' : '')}
          </span>
          {currentAlert.region && (
            <span className="alert-region">[{currentAlert.region}]</span>
          )}
        </div>

        {/* 시간 표시 */}
        <span className="alert-time">
          {formatTime(currentAlert.issued_at)}
        </span>

        {/* 네비게이션 버튼 */}
        {alerts.length > 1 && (
          <div className="alert-nav">
            <button className="nav-btn" onClick={handlePrevious}>‹</button>
            <span className="alert-counter">
              {currentIndex + 1} / {alerts.length}
            </span>
            <button className="nav-btn" onClick={handleNext}>›</button>
          </div>
        )}

        {/* 닫기/새로고침 버튼 */}
        <button className="refresh-btn" onClick={loadAlerts} title="새로고침">
          ↻
        </button>
      </div>

      {/* 확장된 상세 정보 */}
      {isExpanded && (
        <div className="alert-expanded">
          <p>{currentAlert.message}</p>
          <div className="alert-meta">
            <span>발효: {new Date(currentAlert.issued_at).toLocaleString('ko-KR')}</span>
            <span>만료: {new Date(currentAlert.expires_at).toLocaleString('ko-KR')}</span>
          </div>
        </div>
      )}

      {/* 자동 슬라이드 진행 표시 */}
      {alerts.length > 1 && !isPaused && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ animationDuration: '5s' }}
          />
        </div>
      )}
    </div>
  );
}

export default WeatherAlertBanner;
