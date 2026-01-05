import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import ClimateMap from "./components/ClimateMap";
import Sidebar from "./components/Sidebar";
import WeatherAlertBanner from "./components/WeatherAlertBanner";
import LocationDetector from "./components/LocationDetector";
import RegionComments from "./components/RegionComments";
import PWAInstallBanner from "./components/PWAInstallBanner";
import MobileBottomNav from "./components/MobileBottomNav";
import MobileBottomSheet from "./components/MobileBottomSheet";
import { getGyeonggiRealtimeWeather } from "./services/kmaApi";
import { useAuth } from "./contexts/AuthContext";

// AuthModal 지연 로딩
const AuthModal = lazy(() => import("./components/AuthModal"));
import {
  TARGET_MULTIPLIERS,
  TARGET_LABELS,
  calculateRiskLevel,
  getTargetLabel,
} from "./constants/climate";
import { createLogger } from "./utils/logger";

const log = createLogger("App");

// 위험도에 따른 테마 결정
const getThemeFromRisk = (riskLevel, score) => {
  if (score <= 25) return "safe"; // 안전 - 하얀색/파란색
  if (score <= 40) return "good"; // 좋음 - 초록색
  if (score <= 60) return "caution"; // 주의 - 주황색
  if (score <= 75) return "warning"; // 경고 - 주황-빨간색
  return "danger"; // 위험 - 갈색/빨간색
};

function App() {
  const { user, profile } = useAuth();
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [target, setTarget] = useState("general");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("loading");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [mobileTab, setMobileTab] = useState("map");
  const [showMobileSheet, setShowMobileSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const preferredRegionApplied = useRef(false);

  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 테마 변경 효과 (선택된 지역 또는 평균 점수 기반)
  useEffect(() => {
    let theme = "safe"; // 기본 테마

    if (selectedRegion) {
      // 선택된 지역의 점수 기반
      const score = selectedRegion.adjusted_score || selectedRegion.score || 0;
      theme = getThemeFromRisk(selectedRegion.risk_level, score);
    } else if (regions.length > 0) {
      // 전체 지역 평균 점수 기반
      const avgScore =
        regions.reduce(
          (sum, r) => sum + (r.adjusted_score || r.score || 0),
          0,
        ) / regions.length;
      theme = getThemeFromRisk(null, avgScore);
    }

    document.documentElement.setAttribute("data-theme", theme);
    log.debug("테마 변경", { theme, selectedRegion: selectedRegion?.region });
  }, [selectedRegion, regions]);

  // 초기 데이터 로드
  useEffect(() => {
    loadAllRegions();
  }, [target]);

  // 로그인 시 관심지역 자동 선택
  useEffect(() => {
    // 사용자가 로그인하고, 프로필에 관심지역이 있고, 지역 데이터가 로드된 경우
    if (
      user &&
      profile?.preferred_region &&
      regions.length > 0 &&
      !preferredRegionApplied.current
    ) {
      const preferredRegion = regions.find(
        (r) => r.region === profile.preferred_region,
      );
      if (preferredRegion) {
        log.info("관심지역 자동 선택", { region: profile.preferred_region });
        handleRegionSelect(preferredRegion);
        preferredRegionApplied.current = true;
      }
    }
    // 로그아웃 시 리셋
    if (!user) {
      preferredRegionApplied.current = false;
    }
  }, [user, profile, regions]);

  // 데이터 로드 (기상청 API 우선, 10초 타임아웃)
  const loadAllRegions = async () => {
    setLoading(true);

    try {
      // 기상청 API 호출 (10초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const kmaData = await getGyeonggiRealtimeWeather();
      clearTimeout(timeoutId);

      log.debug("KMA API 응답 수신", {
        regions: kmaData?.regions?.length || 0,
      });

      if (kmaData && kmaData.regions && kmaData.regions.length > 0) {
        const formattedRegions = kmaData.regions.map((region) => {
          const baseScore = region.score || 0;
          const multiplier = TARGET_MULTIPLIERS[target] || 1.0;
          const adjustedScore = Math.min(
            100,
            Math.round(baseScore * multiplier),
          );
          const risk = calculateRiskLevel(adjustedScore);
          return {
            ...region,
            adjusted_score: adjustedScore,
            risk_level: risk.level,
            risk_label: risk.label,
            risk_color: risk.color,
          };
        });
        setRegions(formattedRegions);
        setDataSource("kma");
        setLastUpdated(kmaData.datetime);
        setLoading(false);
        log.info("기상청 데이터 로드 완료", {
          regionCount: formattedRegions.length,
        });
        return;
      }
    } catch (e) {
      log.warn("KMA API 실패", { error: e.message });
    }

    // 실패 시 즉시 Mock 데이터 표시
    log.info("Mock 데이터 사용");
    loadMockData();
    setDataSource("mock");
    setLoading(false);
  };

  // Mock 데이터 (겨울철 기준)
  const loadMockData = () => {
    const mockRegions = [
      {
        region: "수원시",
        lat: 37.2636,
        lng: 127.0286,
        score: 45,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -2,
          apparent_temperature: -6,
          humidity: 45,
          pm10: 65,
          pm25: 35,
          uv_index: 2,
          surface_temperature: -1,
        },
      },
      {
        region: "성남시",
        lat: 37.4449,
        lng: 127.1389,
        score: 35,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -4,
          humidity: 48,
          pm10: 55,
          pm25: 28,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "고양시",
        lat: 37.6584,
        lng: 126.832,
        score: 55,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -4,
          apparent_temperature: -9,
          humidity: 40,
          pm10: 85,
          pm25: 45,
          uv_index: 2,
          surface_temperature: -3,
        },
      },
      {
        region: "용인시",
        lat: 37.2411,
        lng: 127.1776,
        score: 40,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -5,
          humidity: 50,
          pm10: 58,
          pm25: 30,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "부천시",
        lat: 37.5034,
        lng: 126.766,
        score: 25,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: 1,
          apparent_temperature: -2,
          humidity: 52,
          pm10: 42,
          pm25: 20,
          uv_index: 2,
          surface_temperature: 2,
        },
      },
      {
        region: "안산시",
        lat: 37.3219,
        lng: 126.8309,
        score: 48,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -2,
          apparent_temperature: -7,
          humidity: 55,
          pm10: 72,
          pm25: 38,
          uv_index: 2,
          surface_temperature: -1,
        },
      },
      {
        region: "안양시",
        lat: 37.3943,
        lng: 126.9568,
        score: 32,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: 0,
          apparent_temperature: -3,
          humidity: 48,
          pm10: 50,
          pm25: 25,
          uv_index: 2,
          surface_temperature: 1,
        },
      },
      {
        region: "남양주시",
        lat: 37.636,
        lng: 127.2165,
        score: 42,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -3,
          apparent_temperature: -8,
          humidity: 42,
          pm10: 60,
          pm25: 32,
          uv_index: 2,
          surface_temperature: -2,
        },
      },
      {
        region: "화성시",
        lat: 37.1996,
        lng: 126.8312,
        score: 52,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -3,
          apparent_temperature: -8,
          humidity: 58,
          pm10: 78,
          pm25: 42,
          uv_index: 2,
          surface_temperature: -2,
        },
      },
      {
        region: "평택시",
        lat: 36.9921,
        lng: 127.1127,
        score: 38,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: 0,
          apparent_temperature: -4,
          humidity: 50,
          pm10: 55,
          pm25: 28,
          uv_index: 2,
          surface_temperature: 1,
        },
      },
      {
        region: "의정부시",
        lat: 37.7381,
        lng: 127.0337,
        score: 50,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -5,
          apparent_temperature: -11,
          humidity: 38,
          pm10: 70,
          pm25: 38,
          uv_index: 2,
          surface_temperature: -4,
        },
      },
      {
        region: "시흥시",
        lat: 37.38,
        lng: 126.8029,
        score: 44,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -5,
          humidity: 52,
          pm10: 62,
          pm25: 33,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "파주시",
        lat: 37.76,
        lng: 126.78,
        score: 58,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -6,
          apparent_temperature: -12,
          humidity: 35,
          pm10: 75,
          pm25: 40,
          uv_index: 2,
          surface_temperature: -5,
        },
      },
      {
        region: "김포시",
        lat: 37.6152,
        lng: 126.7156,
        score: 35,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -2,
          apparent_temperature: -6,
          humidity: 48,
          pm10: 52,
          pm25: 26,
          uv_index: 2,
          surface_temperature: -1,
        },
      },
      {
        region: "광명시",
        lat: 37.4786,
        lng: 126.8644,
        score: 22,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: 1,
          apparent_temperature: -1,
          humidity: 50,
          pm10: 38,
          pm25: 18,
          uv_index: 2,
          surface_temperature: 2,
        },
      },
      {
        region: "광주시",
        lat: 37.4095,
        lng: 127.255,
        score: 40,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -2,
          apparent_temperature: -6,
          humidity: 45,
          pm10: 58,
          pm25: 30,
          uv_index: 2,
          surface_temperature: -1,
        },
      },
      {
        region: "군포시",
        lat: 37.3617,
        lng: 126.9352,
        score: 28,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: 0,
          apparent_temperature: -2,
          humidity: 48,
          pm10: 45,
          pm25: 22,
          uv_index: 2,
          surface_temperature: 1,
        },
      },
      {
        region: "하남시",
        lat: 37.5393,
        lng: 127.2148,
        score: 38,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -5,
          humidity: 46,
          pm10: 55,
          pm25: 28,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "오산시",
        lat: 37.1498,
        lng: 127.0775,
        score: 42,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -5,
          humidity: 52,
          pm10: 60,
          pm25: 32,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "이천시",
        lat: 37.272,
        lng: 127.435,
        score: 45,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -4,
          apparent_temperature: -9,
          humidity: 40,
          pm10: 62,
          pm25: 33,
          uv_index: 2,
          surface_temperature: -3,
        },
      },
      {
        region: "안성시",
        lat: 37.008,
        lng: 127.2797,
        score: 35,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -1,
          apparent_temperature: -4,
          humidity: 48,
          pm10: 50,
          pm25: 25,
          uv_index: 2,
          surface_temperature: 0,
        },
      },
      {
        region: "의왕시",
        lat: 37.3449,
        lng: 126.9683,
        score: 20,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: 1,
          apparent_temperature: 0,
          humidity: 45,
          pm10: 35,
          pm25: 16,
          uv_index: 2,
          surface_temperature: 2,
        },
      },
      {
        region: "양주시",
        lat: 37.7853,
        lng: 127.0458,
        score: 55,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -6,
          apparent_temperature: -12,
          humidity: 36,
          pm10: 72,
          pm25: 38,
          uv_index: 2,
          surface_temperature: -5,
        },
      },
      {
        region: "포천시",
        lat: 37.8949,
        lng: 127.2002,
        score: 60,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -8,
          apparent_temperature: -15,
          humidity: 32,
          pm10: 68,
          pm25: 35,
          uv_index: 2,
          surface_temperature: -7,
        },
      },
      {
        region: "여주시",
        lat: 37.2983,
        lng: 127.6374,
        score: 48,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -5,
          apparent_temperature: -10,
          humidity: 38,
          pm10: 58,
          pm25: 30,
          uv_index: 2,
          surface_temperature: -4,
        },
      },
      {
        region: "동두천시",
        lat: 37.9035,
        lng: 127.0605,
        score: 62,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -9,
          apparent_temperature: -16,
          humidity: 30,
          pm10: 65,
          pm25: 34,
          uv_index: 2,
          surface_temperature: -8,
        },
      },
      {
        region: "과천시",
        lat: 37.4292,
        lng: 126.9876,
        score: 24,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: 0,
          apparent_temperature: -2,
          humidity: 48,
          pm10: 40,
          pm25: 19,
          uv_index: 2,
          surface_temperature: 1,
        },
      },
      {
        region: "구리시",
        lat: 37.5943,
        lng: 127.1295,
        score: 36,
        risk_level: "caution",
        risk_label: "주의",
        risk_color: "#FFEB3B",
        climate_data: {
          temperature: -2,
          apparent_temperature: -6,
          humidity: 44,
          pm10: 52,
          pm25: 26,
          uv_index: 2,
          surface_temperature: -1,
        },
      },
      {
        region: "연천군",
        lat: 38.0966,
        lng: 127.075,
        score: 68,
        risk_level: "warning",
        risk_label: "경고",
        risk_color: "#FF9800",
        climate_data: {
          temperature: -12,
          apparent_temperature: -20,
          humidity: 28,
          pm10: 55,
          pm25: 28,
          uv_index: 2,
          surface_temperature: -11,
        },
      },
      {
        region: "가평군",
        lat: 37.8315,
        lng: 127.5095,
        score: 15,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: -7,
          apparent_temperature: -12,
          humidity: 35,
          pm10: 25,
          pm25: 12,
          uv_index: 2,
          surface_temperature: -6,
        },
      },
      {
        region: "양평군",
        lat: 37.4917,
        lng: 127.4872,
        score: 18,
        risk_level: "safe",
        risk_label: "안전",
        risk_color: "#2196F3",
        climate_data: {
          temperature: -4,
          apparent_temperature: -8,
          humidity: 40,
          pm10: 30,
          pm25: 14,
          uv_index: 2,
          surface_temperature: -3,
        },
      },
    ];
    setRegions(mockRegions);
  };

  // 지역 선택 시
  const handleRegionSelect = (region) => {
    setSelectedRegion(region);
    setExplanation(generateMockExplanation(region, target));
    // 모바일에서 지역 선택 시 바텀시트 열기
    if (isMobile) {
      setMobileTab("info");
      setShowMobileSheet(true);
    }
  };

  // 모바일 탭 변경 핸들러
  const handleMobileTabChange = (tab) => {
    setMobileTab(tab);
    if (tab === "map") {
      setShowMobileSheet(false);
    } else if (tab === "more") {
      // 더보기 메뉴 처리
      setShowMobileSheet(true);
    } else {
      setShowMobileSheet(true);
    }
  };

  // Mock 설명 생성 (겨울철 기준)
  const generateMockExplanation = (region, targetType) => {
    const temp =
      region.climate_data?.apparent_temperature ??
      region.climate_data?.temperature ??
      0;
    let explanation = "";
    let guides = [];

    if (temp <= -15) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 매우 추운 날씨입니다. 외출을 자제하고 따뜻한 실내에서 생활하세요.`;
      guides = [
        "외출을 삼가세요",
        "난방 시설을 이용하세요",
        "따뜻한 음료를 드세요",
      ];
    } else if (temp <= -10) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 매우 추운 날씨입니다. 외출 시 방한용품을 꼭 착용하세요.`;
      guides = ["두꺼운 외투 필수", "장갑, 목도리 착용", "노출 부위 최소화"];
    } else if (temp <= -5) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 추운 날씨입니다. 따뜻하게 입고 외출하세요.`;
      guides = ["방한복 착용", "핫팩 사용 권장", "동상 주의"];
    } else if (temp <= 0) {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 쌀쌀한 날씨입니다. 겉옷을 챙기세요.`;
      guides = ["여분의 겉옷 준비", "따뜻한 음료 섭취", "빙판길 조심"];
    } else {
      explanation = `오늘 ${region.region}은 체감온도 ${temp}도로 비교적 따뜻한 날씨입니다.`;
      guides = ["야외 활동 가능", "적당한 옷차림", "일교차 주의"];
    }

    return {
      region: region.region,
      score: region.score,
      risk_level: region.risk_level,
      risk_label: region.risk_label,
      explanation,
      action_guides: guides,
      target: getTargetLabel(targetType),
    };
  };

  // 대상 변경 시
  const handleTargetChange = (newTarget) => {
    setTarget(newTarget);
    if (selectedRegion) {
      handleRegionSelect(selectedRegion);
    }
  };

  // 데이터 출처 포맷
  const formatDataSource = () => {
    if (dataSource === "kma") {
      const time = lastUpdated
        ? `${lastUpdated.slice(8, 10)}:${lastUpdated.slice(10, 12)}`
        : "";
      return `경기기후플랫폼+기상청실시간 (${time} 관측)`;
    } else if (dataSource === "supabase") {
      return "Supabase DB";
    }
    return "오프라인 데이터";
  };

  if (loading && regions.length === 0) {
    return (
      <div className="loading">
        기상청 API에서 실시간 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className={`app-container ${isMobile ? "mobile" : "desktop"}`}>
      <WeatherAlertBanner />

      {/* 모바일 상단 헤더 */}
      {isMobile && (
        <header className="mobile-header">
          <div className="mobile-header-left">
            <h1 className="mobile-title">경기 기후</h1>
            {selectedRegion && (
              <span className="mobile-region-badge">
                {selectedRegion.region}
              </span>
            )}
          </div>
          <div className="mobile-header-right">
            <LocationDetector
              onLocationDetected={handleRegionSelect}
              regions={regions}
              compact
            />
            {selectedRegion && (
              <button
                className="mobile-chat-btn"
                onClick={() => setShowComments(true)}
              >
                💬
              </button>
            )}
            <button
              className="mobile-user-btn"
              onClick={() => user ? null : setShowAuthModal(true)}
            >
              {user ? (profile?.display_name?.charAt(0) || "👤") : "✨"}
            </button>
          </div>
        </header>
      )}

      {/* 데스크톱 데이터 출처 배지 */}
      {!isMobile && (
        <div className="data-source-badge">
          <span className={`source-indicator ${dataSource}`}></span>
          {dataSource === "kma" ? (
            <a
              href="https://climate.gg.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              {formatDataSource()}
            </a>
          ) : (
            <span>{formatDataSource()}</span>
          )}
        </div>
      )}

      {/* 데스크톱 위치 감지 & 커뮤니티 버튼 */}
      {!isMobile && (
        <div className="top-action-bar">
          <LocationDetector
            onLocationDetected={handleRegionSelect}
            regions={regions}
          />
          {selectedRegion && (
            <button
              className="community-btn"
              onClick={() => setShowComments(true)}
            >
              <span>💬</span>
              <span>{selectedRegion.region} 대화방</span>
            </button>
          )}
        </div>
      )}

      <div className="main-content">
        {/* 데스크톱 사이드바 */}
        {!isMobile && (
          <Sidebar
            selectedRegion={selectedRegion}
            explanation={explanation}
            target={target}
            onTargetChange={handleTargetChange}
            loading={false}
            allRegions={regions}
            onRegionSelect={handleRegionSelect}
            onOpenAuthModal={() => setShowAuthModal(true)}
            isMobileCollapsed={isMobileCollapsed}
            setIsMobileCollapsed={setIsMobileCollapsed}
          />
        )}
        <ClimateMap
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionSelect={handleRegionSelect}
          onMapClick={() => {
            if (isMobile) {
              setShowMobileSheet(false);
              setMobileTab("map");
            } else {
              setIsMobileCollapsed(true);
            }
          }}
        />
      </div>

      {/* 모바일 바텀시트 */}
      {isMobile && (
        <MobileBottomSheet
          isOpen={showMobileSheet}
          onClose={() => {
            setShowMobileSheet(false);
            setMobileTab("map");
          }}
          title={selectedRegion?.region || "지역 선택"}
        >
          <Sidebar
            selectedRegion={selectedRegion}
            explanation={explanation}
            target={target}
            onTargetChange={handleTargetChange}
            loading={false}
            allRegions={regions}
            onRegionSelect={handleRegionSelect}
            onOpenAuthModal={() => setShowAuthModal(true)}
            isMobileCollapsed={false}
            setIsMobileCollapsed={() => {}}
            mobileActiveTab={mobileTab}
          />
        </MobileBottomSheet>
      )}

      {/* 모바일 하단 네비게이션 */}
      {isMobile && (
        <MobileBottomNav
          activeTab={mobileTab}
          onTabChange={handleMobileTabChange}
          selectedRegion={selectedRegion}
        />
      )}

      {/* 로그인 모달 */}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </Suspense>
      )}

      {/* 지역별 댓글 모달 */}
      <RegionComments
        region={selectedRegion?.region}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* PWA 설치 배너 */}
      <PWAInstallBanner />
    </div>
  );
}

export default App;
