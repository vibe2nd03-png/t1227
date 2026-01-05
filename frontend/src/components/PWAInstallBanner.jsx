import React, { useState, useEffect } from "react";

function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // iOS 체크
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // 이미 앱으로 실행 중인지 체크
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    // 이미 설치되어 있거나 최근에 닫은 경우 표시하지 않음
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // 7일 후 다시 표시
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Android/Chrome: beforeinstallprompt 이벤트 대기
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 3초 후에 배너 표시
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // iOS: Safari에서 실행 중이면 배너 표시
    if (isIOSDevice && !standalone) {
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent,
      );
      if (isSafari) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome 설치
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  // 이미 설치됨 or 표시하지 않음
  if (isStandalone || !showBanner) return null;

  return (
    <div className="pwa-install-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <span>🏠</span>
        </div>
        <div className="banner-text">
          <strong>홈 화면에 추가</strong>
          <p>바로가기로 더 빠르게 접속하세요</p>
        </div>
      </div>

      <div className="banner-actions">
        {isIOS ? (
          <div className="ios-instructions">
            <span className="share-icon">⬆️</span>
            <span>공유 버튼 → "홈 화면에 추가"</span>
          </div>
        ) : deferredPrompt ? (
          <button className="install-btn" onClick={handleInstall}>
            설치
          </button>
        ) : (
          <div className="manual-instructions">
            <span>브라우저 메뉴에서 "홈 화면에 추가"를 선택하세요</span>
          </div>
        )}
        <button className="dismiss-btn" onClick={handleDismiss}>
          나중에
        </button>
      </div>
    </div>
  );
}

export default PWAInstallBanner;
