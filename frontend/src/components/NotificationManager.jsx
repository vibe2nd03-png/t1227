import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase";

// 경기도 31개 지역
const GYEONGGI_REGIONS = [
  "수원시",
  "성남시",
  "고양시",
  "용인시",
  "부천시",
  "안산시",
  "안양시",
  "남양주시",
  "화성시",
  "평택시",
  "의정부시",
  "시흥시",
  "파주시",
  "김포시",
  "광명시",
  "광주시",
  "군포시",
  "하남시",
  "오산시",
  "이천시",
  "안성시",
  "의왕시",
  "양주시",
  "포천시",
  "여주시",
  "동두천시",
  "과천시",
  "구리시",
  "연천군",
  "가평군",
  "양평군",
];

// 위험도 레벨
const RISK_LEVELS = [
  { value: 30, label: "주의 (30점 이상)", color: "#FFEB3B" },
  { value: 50, label: "경고 (50점 이상)", color: "#FF9800" },
  { value: 75, label: "위험 (75점 이상)", color: "#F44336" },
];

function NotificationManager({ climateData, isOpen, onClose }) {
  const { user } = useAuth();
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [threshold, setThreshold] = useState(50);
  const [notifyTypes, setNotifyTypes] = useState({
    highTemp: true,
    lowTemp: true,
    dust: true,
    uv: true,
  });

  const [message, setMessage] = useState("");
  const [lastAlertTime, setLastAlertTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 알림 권한 확인
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
    loadSavedSettings();
  }, [user]);

  // 저장된 설정 불러오기
  const loadSavedSettings = async () => {
    // 로컬 스토리지에서 먼저 로드
    const localSettings = localStorage.getItem("notificationSettings");
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        setSelectedRegions(parsed.regions || []);
        setThreshold(parsed.threshold || 50);
        setNotifyTypes(
          parsed.notifyTypes || {
            highTemp: true,
            lowTemp: true,
            dust: true,
            uv: true,
          },
        );
        setIsSubscribed(parsed.isActive || false);
      } catch (e) {
        console.log("로컬 설정 파싱 오류:", e);
      }
    }

    // 로그인 사용자는 DB에서도 로드
    if (user) {
      try {
        const { data, error } = await supabase
          .from("notification_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data && !error) {
          setSelectedRegions(data.regions || []);
          setThreshold(data.threshold || 50);
          setNotifyTypes(
            data.notify_types || {
              highTemp: true,
              lowTemp: true,
              dust: true,
              uv: true,
            },
          );
          setIsSubscribed(data.is_active);
        }
      } catch (error) {
        console.log("DB 설정 로드:", error);
      }
    }
  };

  // 알림 구독 (설정 저장) - 애니메이션 및 자동 종료
  const subscribeToNotifications = () => {
    if (selectedRegions.length === 0) {
      setMessage("최소 1개 이상의 지역을 선택해주세요.");
      return;
    }

    setIsSaving(true);

    localStorage.setItem(
      "notificationSettings",
      JSON.stringify({
        regions: selectedRegions,
        threshold,
        notifyTypes,
        isActive: true,
      }),
    );

    if (user) {
      supabase
        .from("notification_subscriptions")
        .upsert(
          {
            user_id: user.id,
            regions: selectedRegions,
            threshold: threshold,
            notify_types: notifyTypes,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .then(() => console.log("DB 저장 완료"))
        .catch((e) => console.error("DB 저장 실패:", e));
    }

    setIsSubscribed(true);
    setMessage("알림 설정이 완료되었습니다!");

    // 애니메이션 후 자동 종료
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 1200);
  };

  // 알림 구독 해제 - 동기 버전
  const unsubscribeFromNotifications = () => {
    if (user) {
      supabase
        .from("notification_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .then(() => console.log("DB 해제 완료"))
        .catch((e) => console.error("구독 해제 오류:", e));
    }

    localStorage.removeItem("notificationSettings");
    setIsSubscribed(false);
    setMessage("알림이 해제되었습니다.");
  };

  // 지역 토글
  const toggleRegion = (region) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region],
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

    const settings = JSON.parse(
      localStorage.getItem("notificationSettings") || "{}",
    );
    if (!settings.isActive) return;

    const now = Date.now();
    if (lastAlertTime && now - lastAlertTime < 5 * 60 * 1000) return;

    const dangerRegions = climateData.filter((region) => {
      const isWatched = settings.regions?.includes(region.region);
      const score = region.adjusted_score || region.score;
      return isWatched && score >= settings.threshold;
    });

    if (
      dangerRegions.length > 0 &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const topDanger = dangerRegions.sort(
        (a, b) => (b.adjusted_score || b.score) - (a.adjusted_score || a.score),
      )[0];

      const score = topDanger.adjusted_score || topDanger.score;
      let riskLabel = "주의";
      if (score >= 75) riskLabel = "위험";
      else if (score >= 50) riskLabel = "경고";

      new Notification(`${riskLabel}: ${topDanger.region}`, {
        body: `현재 기후 위험도 ${score}점`,
        icon: "/icon-192.png",
      });

      setLastAlertTime(now);
    }
  }, [isSubscribed, climateData, lastAlertTime]);

  useEffect(() => {
    if (isSubscribed && climateData) {
      checkAndNotify();
    }
  }, [climateData, isSubscribed, checkAndNotify]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="notification-modal-overlay" onClick={onClose}>
      <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h2>🔔 위험 지역 알림 설정</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="notification-content">
          <div className="permission-status">
            {notificationPermission === "granted" ? (
              <div className="status granted">
                <span className="status-icon">✅</span>
                <span>알림이 허용되었습니다</span>
              </div>
            ) : notificationPermission === "denied" ? (
              <div className="status denied">
                <span className="status-icon">❌</span>
                <span>
                  알림이 차단되었습니다. 브라우저 설정에서 허용해주세요.
                </span>
              </div>
            ) : (
              <div className="status default">
                <span className="status-icon">🔔</span>
                <span>
                  알림 권한을 허용하면 위험 지역 발생 시 알려드립니다.
                </span>
              </div>
            )}
          </div>

          {isSubscribed && (
            <div className="subscription-badge">
              <span>🔔 알림 활성화됨</span>
            </div>
          )}

          <div className="region-selector">
            <div className="selector-header">
              <label>관심 지역 선택</label>
              <button className="select-all-btn" onClick={toggleAllRegions}>
                {selectedRegions.length === GYEONGGI_REGIONS.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>
            <div className="region-grid">
              {GYEONGGI_REGIONS.map((region) => (
                <button
                  key={region}
                  className={`region-chip ${selectedRegions.includes(region) ? "selected" : ""}`}
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

          <div className="threshold-selector">
            <label>알림 받을 위험도</label>
            <div className="threshold-options">
              {RISK_LEVELS.map((level) => (
                <button
                  key={level.value}
                  className={`threshold-btn ${threshold === level.value ? "selected" : ""}`}
                  style={{
                    borderColor:
                      threshold === level.value ? level.color : "#ddd",
                    backgroundColor:
                      threshold === level.value ? level.color : "white",
                    color: threshold === level.value ? "white" : "#333",
                  }}
                  onClick={() => setThreshold(level.value)}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          <div className="notify-types">
            <label>알림 유형</label>
            <div className="type-options">
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.highTemp}
                  onChange={(e) =>
                    setNotifyTypes({
                      ...notifyTypes,
                      highTemp: e.target.checked,
                    })
                  }
                />
                <span>🌡️ 고온/폭염</span>
              </label>
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.lowTemp}
                  onChange={(e) =>
                    setNotifyTypes({
                      ...notifyTypes,
                      lowTemp: e.target.checked,
                    })
                  }
                />
                <span>❄️ 저온/한파</span>
              </label>
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.dust}
                  onChange={(e) =>
                    setNotifyTypes({ ...notifyTypes, dust: e.target.checked })
                  }
                />
                <span>😷 미세먼지</span>
              </label>
              <label className="type-checkbox">
                <input
                  type="checkbox"
                  checked={notifyTypes.uv}
                  onChange={(e) =>
                    setNotifyTypes({ ...notifyTypes, uv: e.target.checked })
                  }
                />
                <span>☀️ 자외선</span>
              </label>
            </div>
          </div>

          {message && (
            <div
              className={`notification-message ${message.includes("완료") ? "success" : "error"}`}
            >
              {message}
            </div>
          )}

          <div className="notification-actions">
            {!isSubscribed ? (
              <button
                className={"subscribe-btn" + (isSaving ? " saving" : "")}
                onClick={subscribeToNotifications}
                disabled={selectedRegions.length === 0 || isSaving}
              >
                {isSaving ? "✓ 저장 완료!" : "🔔 알림 받기"}
              </button>
            ) : (
              <>
                <button
                  className={"update-btn" + (isSaving ? " saving" : "")}
                  onClick={subscribeToNotifications}
                  disabled={isSaving}
                >
                  {isSaving ? "✓ 저장 완료!" : "설정 저장"}
                </button>
                <button
                  className="unsubscribe-btn"
                  onClick={unsubscribeFromNotifications}
                >
                  알림 해제
                </button>
              </>
            )}
          </div>

          {climateData && selectedRegions.length > 0 && (
            <div className="danger-preview">
              <h4>현재 위험 지역 ({threshold}점 이상)</h4>
              <div className="danger-list">
                {climateData
                  .filter(
                    (r) =>
                      selectedRegions.includes(r.region) &&
                      (r.adjusted_score || r.score) >= threshold,
                  )
                  .sort(
                    (a, b) =>
                      (b.adjusted_score || b.score) -
                      (a.adjusted_score || a.score),
                  )
                  .slice(0, 5)
                  .map((region) => (
                    <div key={region.region} className="danger-item">
                      <span className="danger-name">{region.region}</span>
                      <span
                        className="danger-score"
                        style={{ color: region.risk_color }}
                      >
                        {region.adjusted_score || region.score}점
                      </span>
                    </div>
                  ))}
                {climateData.filter(
                  (r) =>
                    selectedRegions.includes(r.region) &&
                    (r.adjusted_score || r.score) >= threshold,
                ).length === 0 && (
                  <p className="no-danger">현재 위험 지역이 없습니다 👍</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default NotificationManager;
