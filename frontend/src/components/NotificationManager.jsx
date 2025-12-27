import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

// 경기도 31개 지역
const GYEONGGI_REGIONS = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
  '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시',
  '군포시', '하남시', '오산시', '이천시', '안성시', '의왕시', '양주시', '포천시',
  '여주시', '동두천시', '과천시', '구리시', '연천군', '가평군', '양평군'
];

// 위험도 레벨
const RISK_LEVELS = [
  { value: 30, label: '주의 (30점 이상)', color: '#FFEB3B' },
  { value: 50, label: '경고 (50점 이상)', color: '#FF9800' },
  { value: 75, label: '위험 (75점 이상)', color: '#F44336' },
];

function NotificationManager({ climateData, isOpen, onClose }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [threshold, setThreshold] = useState(50);
  const [notifyTypes, setNotifyTypes] = useState({
    highTemp: true,
    dust: true,
    uv: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastAlertTime, setLastAlertTime] = useState(null);

  // 알림 권한 확인
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    checkSubscription();
    loadSavedSettings();
  }, [user]);

  // 저장된 설정 불러오기
  const loadSavedSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setSelectedRegions(data.regions || []);
        setThreshold(data.threshold || 50);
        setNotifyTypes(data.notify_types || { highTemp: true, dust: true, uv: true });
        setIsSubscribed(data.is_active);
      }
    } catch (error) {
      console.log('설정 로드:', error);
    }
  };

  // 구독 상태 확인
  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('구독 확인 오류:', error);
    }
  };

  // 알림 권한 요청
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      setMessage('이 브라우저는 알림을 지원하지 않습니다.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        setMessage('알림이 허용되었습니다!');
        await registerServiceWorker();
        return true;
      } else {
        setMessage('알림이 거부되었습니다. 브라우저 설정에서 허용해주세요.');
        return false;
      }
    } catch (error) {
      console.error('권한 요청 오류:', error);
      setMessage('알림 권한 요청 중 오류가 발생했습니다.');
      return false;
    }
  };

  // Service Worker 등록
  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 등록 성공:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker 등록 실패:', error);
      return null;
    }
  };

  // 알림 구독
  const subscribeToNotifications = async () => {
    setLoading(true);
    setMessage('');

    try {
      // 권한 확인/요청
      if (notificationPermission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return;
        }
      }

      // 선택된 지역 확인
      if (selectedRegions.length === 0) {
        setMessage('최소 1개 이상의 지역을 선택해주세요.');
        setLoading(false);
        return;
      }

      // 설정 저장 (Supabase)
      if (user) {
        const { error } = await supabase
          .from('notification_subscriptions')
          .upsert({
            user_id: user.id,
            regions: selectedRegions,
            threshold: threshold,
            notify_types: notifyTypes,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
      }

      // 로컬 스토리지에도 저장 (비로그인 사용자용)
      localStorage.setItem('notificationSettings', JSON.stringify({
        regions: selectedRegions,
        threshold,
        notifyTypes,
        isActive: true,
      }));

      setIsSubscribed(true);
      setMessage('알림 설정이 완료되었습니다!');

      // 테스트 알림 발송
      setTimeout(() => {
        showTestNotification();
      }, 1000);

    } catch (error) {
      console.error('구독 오류:', error);
      setMessage('알림 설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 알림 구독 해제
  const unsubscribeFromNotifications = async () => {
    setLoading(true);

    try {
      if (user) {
        await supabase
          .from('notification_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id);
      }

      localStorage.removeItem('notificationSettings');
      setIsSubscribed(false);
      setMessage('알림이 해제되었습니다.');
    } catch (error) {
      console.error('구독 해제 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 테스트 알림
  const showTestNotification = () => {
    if (Notification.permission === 'granted') {
      new Notification('경기 기후 체감 맵', {
        body: '알림 설정이 완료되었습니다. 위험 지역 발생 시 알려드릴게요!',
        icon: '/icon-192.png',
        tag: 'test-notification',
      });
    }
  };

  // 지역 토글
  const toggleRegion = (region) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  // 전체 선택/해제
  const toggleAllRegions = () => {
    if (selectedRegions.length === GYEONGGI_REGIONS.length) {
      setSelectedRegions([]);
    } else {
      setSelectedRegions([...GYEONGGI_REGIONS]);
    }
  };

  // 위험 지역 체크 및 알림 발송
  const checkAndNotify = useCallback(() => {
    if (!isSubscribed || !climateData || climateData.length === 0) return;

    const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
    if (!settings.isActive) return;

    const now = Date.now();
    // 5분 내 중복 알림 방지
    if (lastAlertTime && now - lastAlertTime < 5 * 60 * 1000) return;

    const dangerRegions = climateData.filter(region => {
      const isWatched = settings.regions?.includes(region.region);
      const score = region.adjusted_score || region.score;
      const isOverThreshold = score >= settings.threshold;

      return isWatched && isOverThreshold;
    });

    if (dangerRegions.length > 0 && Notification.permission === 'granted') {
      const topDanger = dangerRegions.sort((a, b) =>
        (b.adjusted_score || b.score) - (a.adjusted_score || a.score)
      )[0];

      const score = topDanger.adjusted_score || topDanger.score;
      let riskLabel = '주의';
      if (score >= 75) riskLabel = '위험';
      else if (score >= 50) riskLabel = '경고';

      new Notification(`${riskLabel}: ${topDanger.region}`, {
        body: `현재 기후 위험도 ${score}점\n체감온도 ${topDanger.climate_data?.apparent_temperature}°C, PM10 ${topDanger.climate_data?.pm10}㎍/㎥`,
        icon: '/icon-192.png',
        tag: `danger-${topDanger.region}`,
        requireInteraction: true,
      });

      setLastAlertTime(now);
    }
  }, [isSubscribed, climateData, lastAlertTime]);

  // 기후 데이터 변경 시 체크
  useEffect(() => {
    if (isSubscribed && climateData) {
      checkAndNotify();
    }
  }, [climateData, isSubscribed, checkAndNotify]);

  if (!isOpen) return null;

  return (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="notification-header">
          <h2>🔔 위험 지역 알림 설정</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* 내용 */}
        <div className="notification-content">
          {/* 알림 권한 상태 */}
          <div className="permission-status">
            {notificationPermission === 'granted' ? (
              <div className="status granted">
                <span className="status-icon">✅</span>
                <span>알림이 허용되었습니다</span>
              </div>
            ) : notificationPermission === 'denied' ? (
              <div className="status denied">
                <span className="status-icon">❌</span>
                <span>알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.</span>
              </div>
            ) : (
              <div className="status default">
                <span className="status-icon">🔔</span>
                <span>알림 권한을 허용하면 위험 지역 발생 시 알려드립니다.</span>
              </div>
            )}
          </div>

          {/* 구독 상태 */}
          {isSubscribed && (
            <div className="subscription-badge">
              <span>🔔 알림 활성화됨</span>
            </div>
          )}

          {/* 관심 지역 선택 */}
          <div className="region-selector">
            <div className="selector-header">
              <label>관심 지역 선택</label>
              <button className="select-all-btn" onClick={toggleAllRegions}>
                {selectedRegions.length === GYEONGGI_REGIONS.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
            <div className="region-grid">
              {GYEONGGI_REGIONS.map((region) => (
                <button
                  key={region}
                  className={`region-chip ${selectedRegions.includes(region) ? 'selected' : ''}`}
                  onClick={() => toggleRegion(region)}
                >
                  {region}
                </button>
              ))}
            </div>
            <p className="selected-count">
              {selectedRegions.length}개 지역 선택됨
            </p>
          </div>

          {/* 위험도 임계값 */}
          <div className="threshold-selector">
            <label>알림 받을 위험도</label>
            <div className="threshold-options">
              {RISK_LEVELS.map((level) => (
                <button
                  key={level.value}
                  className={`threshold-btn ${threshold === level.value ? 'selected' : ''}`}
                  style={{
                    borderColor: threshold === level.value ? level.color : '#ddd',
                    backgroundColor: threshold === level.value ? level.color : 'white',
                    color: threshold === level.value ? 'white' : '#333'
                  }}
                  onClick={() => setThreshold(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* 알림 유형 */}
          <div className="notify-types">
            <label>알림 유형</label>
            <div className="type-options">
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.highTemp}
                  onChange={(e) => setNotifyTypes({ ...notifyTypes, highTemp: e.target.checked })}
                />
                <span>🌡️ 고온/폭염</span>
              </label>
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.dust}
                  onChange={(e) => setNotifyTypes({ ...notifyTypes, dust: e.target.checked })}
                />
                <span>😷 미세먼지</span>
              </label>
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.uv}
                  onChange={(e) => setNotifyTypes({ ...notifyTypes, uv: e.target.checked })}
                />
                <span>☀️ 자외선</span>
              </label>
            </div>
          </div>

          {/* 메시지 */}
          {message && (
            <div className={`notification-message ${message.includes('완료') || message.includes('허용') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          {/* 버튼 */}
          <div className="notification-actions">
            {!isSubscribed ? (
              <button
                className="subscribe-btn"
                onClick={subscribeToNotifications}
                disabled={loading || selectedRegions.length === 0}
              >
                {loading ? '설정 중...' : '🔔 알림 받기'}
              </button>
            ) : (
              <>
                <button
                  className="update-btn"
                  onClick={subscribeToNotifications}
                  disabled={loading}
                >
                  {loading ? '저장 중...' : '설정 저장'}
                </button>
                <button
                  className="unsubscribe-btn"
                  onClick={unsubscribeFromNotifications}
                  disabled={loading}
                >
                  알림 해제
                </button>
              </>
            )}
          </div>

          {/* 현재 위험 지역 미리보기 */}
          {climateData && selectedRegions.length > 0 && (
            <div className="danger-preview">
              <h4>현재 위험 지역 ({threshold}점 이상)</h4>
              <div className="danger-list">
                {climateData
                  .filter(r => selectedRegions.includes(r.region) && (r.adjusted_score || r.score) >= threshold)
                  .sort((a, b) => (b.adjusted_score || b.score) - (a.adjusted_score || a.score))
                  .slice(0, 5)
                  .map(region => (
                    <div key={region.region} className="danger-item">
                      <span className="danger-name">{region.region}</span>
                      <span className="danger-score" style={{ color: region.risk_color }}>
                        {region.adjusted_score || region.score}점
                      </span>
                    </div>
                  ))
                }
                {climateData.filter(r => selectedRegions.includes(r.region) && (r.adjusted_score || r.score) >= threshold).length === 0 && (
                  <p className="no-danger">현재 위험 지역이 없습니다 👍</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationManager;
