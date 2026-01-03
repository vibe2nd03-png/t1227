import React, { useState, useEffect, useRef } from 'react';

/**
 * 시간대별 날씨 예보 컴포넌트
 */
function HourlyForecast({ region }) {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [baseTime, setBaseTime] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (region) {
      loadForecast(region);
    }
  }, [region]);

  const loadForecast = async (regionName) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kma-forecast?region=${encodeURIComponent(regionName)}`);
      const data = await response.json();

      if (data.success && data.forecasts) {
        setForecasts(data.forecasts);
        setBaseTime(`${data.baseDate.slice(4, 6)}/${data.baseDate.slice(6, 8)} ${data.baseTime.slice(0, 2)}시 발표`);
      } else {
        throw new Error(data.error || '예보 데이터를 가져올 수 없습니다');
      }
    } catch (err) {
      console.error('예보 로드 실패:', err);
      setError(err.message);
      // 실패 시 Mock 데이터 사용
      setForecasts(generateMockForecast());
      setBaseTime('오프라인 예보');
    } finally {
      setLoading(false);
    }
  };

  // Mock 예보 데이터 생성
  const generateMockForecast = () => {
    const now = new Date();
    const forecasts = [];
    const icons = ['☀️', '⛅', '☁️', '🌧️', '❄️'];
    const conditions = ['맑음', '구름많음', '흐림', '비', '눈'];

    for (let i = 0; i < 24; i++) {
      const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = forecastTime.getHours();
      const isNight = hour >= 19 || hour < 6;

      // 시간대별 온도 변화 시뮬레이션
      let baseTemp;
      if (hour >= 13 && hour <= 15) baseTemp = 5; // 오후 최고
      else if (hour >= 5 && hour <= 7) baseTemp = -5; // 새벽 최저
      else if (hour >= 8 && hour <= 12) baseTemp = 0 + (hour - 8); // 오전 상승
      else if (hour >= 16 && hour <= 18) baseTemp = 3 - (hour - 16); // 오후 하강
      else baseTemp = -3;

      const randomTemp = baseTemp + Math.floor(Math.random() * 3) - 1;
      const randomCondition = Math.floor(Math.random() * 3);

      forecasts.push({
        date: `${forecastTime.getFullYear()}${String(forecastTime.getMonth() + 1).padStart(2, '0')}${String(forecastTime.getDate()).padStart(2, '0')}`,
        time: `${String(hour).padStart(2, '0')}00`,
        hour,
        temperature: randomTemp,
        icon: isNight && randomCondition === 0 ? '🌙' : icons[randomCondition],
        condition: conditions[randomCondition],
        pop: Math.floor(Math.random() * 30),
        humidity: 40 + Math.floor(Math.random() * 30),
        windSpeed: 1 + Math.floor(Math.random() * 5),
      });
    }

    return forecasts;
  };

  // 시간 포맷
  const formatHour = (hour) => {
    if (hour === 0) return '자정';
    if (hour === 12) return '정오';
    return hour < 12 ? `${hour}시` : `${hour}시`;
  };

  // 날짜 변경 체크
  const isNewDay = (forecast, index) => {
    if (index === 0) return false;
    return forecast.date !== forecasts[index - 1]?.date;
  };

  // 현재 시간 체크
  const isCurrentHour = (forecast) => {
    const now = new Date();
    const currentHour = now.getHours();
    const forecastHour = parseInt(forecast.time?.substring(0, 2) || forecast.hour);
    const today = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return forecast.date === today && forecastHour === currentHour;
  };

  // 스크롤 핸들러
  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="hourly-forecast loading">
        <div className="forecast-loading">
          <span className="spinner-small"></span>
          <span>예보 불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hourly-forecast">
      <div className="forecast-header">
        <h4>⏰ 시간대별 예보</h4>
        <span className="forecast-base-time">{baseTime}</span>
      </div>

      {error && (
        <div className="forecast-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="forecast-container">
        <button className="scroll-btn left" onClick={scrollLeft}>‹</button>

        <div className="forecast-scroll" ref={scrollRef}>
          {forecasts.map((forecast, index) => (
            <React.Fragment key={`${forecast.date}-${forecast.time}`}>
              {isNewDay(forecast, index) && (
                <div className="day-divider">
                  <span>{forecast.date.slice(4, 6)}/{forecast.date.slice(6, 8)}</span>
                </div>
              )}
              <div className={`forecast-item ${isCurrentHour(forecast) ? 'current' : ''}`}>
                <div className="forecast-time">
                  {isCurrentHour(forecast) ? '지금' : formatHour(forecast.hour)}
                </div>
                <div className="forecast-icon">{forecast.icon}</div>
                <div className="forecast-temp">{forecast.temperature}°</div>
                {forecast.pop > 0 && (
                  <div className="forecast-pop">💧{forecast.pop}%</div>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        <button className="scroll-btn right" onClick={scrollRight}>›</button>
      </div>

      {/* 요약 정보 */}
      {forecasts.length > 0 && (
        <div className="forecast-summary">
          <div className="summary-item">
            <span className="summary-label">최고</span>
            <span className="summary-value high">
              {Math.max(...forecasts.map(f => f.temperature))}°
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">최저</span>
            <span className="summary-value low">
              {Math.min(...forecasts.map(f => f.temperature))}°
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">강수확률</span>
            <span className="summary-value">
              {Math.max(...forecasts.map(f => f.pop || 0))}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default HourlyForecast;
