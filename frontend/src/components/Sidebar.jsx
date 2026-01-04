import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import HourlyForecast from './HourlyForecast';
import FavoriteRegions from './FavoriteRegions';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { supabase } from '../supabase';
import {
  getWeatherType,
  getRandomMessage,
  getStyleTip,
  getEmojiSet,
  getWeatherEmoji,
  CLOTHING_MESSAGES
} from '../data/clothingRecommendations';

// Lazy load heavy components (탭/모달별 분리)
const UserProfile = lazy(() => import('./UserProfile'));
const NotificationManager = lazy(() => import('./NotificationManager'));
const WeatherComparisonChart = lazy(() => import('./WeatherComparisonChart'));

// 로딩 폴백 컴포넌트
const LoadingFallback = () => (
  <div className="lazy-loading">로딩 중...</div>
);

const TARGET_OPTIONS = [
  { value: 'general', label: '일반', icon: '👤' },
  { value: 'elderly', label: '노인', icon: '👴' },
  { value: 'child', label: '아동', icon: '👶' },
  { value: 'outdoor', label: '야외', icon: '👷' },
];

// 메인 탭 옵션
const MAIN_TABS = [
  { id: 'info', label: '기후정보', icon: '🌡️' },
  { id: 'chart', label: '10년비교', icon: '📊' },
  { id: 'ootd', label: '옷차림', icon: '👔' },
  { id: 'report', label: '체감제보', icon: '📢' },
];

function Sidebar({ selectedRegion, explanation, target, onTargetChange, loading, onReportSubmit, allRegions, onRegionSelect, onOpenAuthModal, isMobileCollapsed, setIsMobileCollapsed }) {
  const { user, profile, isAuthenticated, refreshReportStats } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isNotificationSubscribed, setIsNotificationSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // 모바일 사이드바 토글 (헤더 클릭 시 펼치기)
  const toggleMobileSidebar = () => {
    setIsMobileCollapsed(false);
  };

  // 제목 클릭 시 맨 위로 스크롤 + 전체화면
  const handleTitleClick = (e) => {
    e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileCollapsed(false);
  };

  // 지역 선택 시 사이드바 확장
  useEffect(() => {
    if (selectedRegion) {
      setIsMobileCollapsed(false);
    }
  }, [selectedRegion]);

  // 알림 구독 상태 확인
  useEffect(() => {
    const settings = localStorage.getItem('notificationSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setIsNotificationSubscribed(parsed.isActive || false);
    }
  }, [showNotificationModal]);

  return (
    <div className={`sidebar ${isMobileCollapsed ? 'collapsed' : ''}`}>
      {/* 헤더 */}
      <div className="sidebar-header" onClick={toggleMobileSidebar}>
        <div className="header-top">
          <div className="header-title">
            <h1 onClick={handleTitleClick} style={{ cursor: 'pointer' }}>경기 기후 체감 맵</h1>
          </div>

          {/* 사용자 버튼 */}
          <div className="user-section">
            {isAuthenticated ? (
              <button
                className="user-avatar-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowProfileModal(true);
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="프로필" />
                ) : (
                  <span>{profile?.display_name?.charAt(0) || user?.email?.charAt(0) || '👤'}</span>
                )}
              </button>
            ) : (
              <button
                className="login-floating-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAuthModal && onOpenAuthModal();
                }}
              >
                <span className="login-icon">✨</span>
                <span className="login-text">로그인</span>
              </button>
            )}
          </div>
        </div>

        {/* 대상 선택 - 컴팩트 버전 */}
        <div className="target-selector-compact">
          {TARGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`target-chip ${target === option.value ? 'active' : ''}`}
              onClick={() => onTargetChange(option.value)}
              title={option.label}
            >
              <span>{option.icon}</span>
              <span className="chip-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 프로필 모달 */}
      {showProfileModal && (
        <Suspense fallback={<LoadingFallback />}>
          <UserProfile
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        </Suspense>
      )}

      {/* 즐겨찾기 지역 */}
      <FavoriteRegions
        allRegions={allRegions}
        onRegionSelect={onRegionSelect}
        selectedRegion={selectedRegion}
      />

      {/* 퀵 액션 바 */}
      <div className="quick-actions">
        <button
          className={`quick-action-btn ${isNotificationSubscribed ? 'active' : ''}`}
          onClick={() => setShowNotificationModal(true)}
        >
          <span>🔔</span>
          <span>알림</span>
        </button>
        <AirQualityNavButton
          climateData={allRegions}
          onRegionSelect={onRegionSelect}
        />
      </div>

      {/* 알림 설정 모달 */}
      {showNotificationModal && (
        <Suspense fallback={<LoadingFallback />}>
          <NotificationManager
            climateData={allRegions}
            isOpen={showNotificationModal}
            onClose={() => setShowNotificationModal(false)}
          />
        </Suspense>
      )}

      {/* 메인 탭 네비게이션 */}
      <div className="main-tabs">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`main-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="tab-content-area">
        {!selectedRegion ? (
          <div className="no-selection">
            <div className="no-selection-icon">🗺️</div>
            <h3>지도에서 지역을 선택하세요</h3>
            <p>경기도 31개 시군의 기후 체감 정보를 확인할 수 있습니다</p>
          </div>
        ) : loading ? (
          <div className="loading">정보를 불러오는 중...</div>
        ) : (
          <>
            {/* 기후정보 탭 */}
            {activeTab === 'info' && (
              <div className="tab-panel">
                <RegionCard
                  region={selectedRegion}
                  explanation={explanation}
                  isFavorite={isFavorite(selectedRegion.region)}
                  onToggleFavorite={() => toggleFavorite(selectedRegion.region)}
                />
              </div>
            )}

            {/* 10년 비교 차트 탭 */}
            {activeTab === 'chart' && (
              <div className="tab-panel">
                <Suspense fallback={<LoadingFallback />}>
                  <WeatherComparisonChart
                    region={selectedRegion.region}
                    climateData={selectedRegion.climate_data}
                  />
                </Suspense>
              </div>
            )}

            {/* 옷차림 탭 */}
            {activeTab === 'ootd' && (
              <div className="tab-panel">
                <OotdGeneratorInline selectedRegion={selectedRegion} />
              </div>
            )}

            {/* 체감제보 탭 */}
            {activeTab === 'report' && (
              <div className="tab-panel">
                <UserReportPanelInline
                  selectedRegion={selectedRegion}
                  onReportSubmit={onReportSubmit}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 호흡기 안전 네비게이션 버튼 (모달 형태)
function AirQualityNavButton({ climateData, onRegionSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  // 미세먼지 등급 판정
  const getAirGrade = (pm10, pm25) => {
    const p10 = pm10 || 50;
    const p25 = pm25 || 25;
    if (p10 <= 30 && p25 <= 15) return 'good';
    if (p10 <= 50 && p25 <= 25) return 'normal';
    if (p10 <= 100 && p25 <= 50) return 'bad';
    return 'veryBad';
  };

  const gradeInfo = {
    good: { label: '좋음', emoji: '😊', color: '#22c55e' },
    normal: { label: '보통', emoji: '😐', color: '#fbbf24' },
    bad: { label: '나쁨', emoji: '😷', color: '#f97316' },
    veryBad: { label: '매우나쁨', emoji: '🤢', color: '#ef4444' },
  };

  // 청정 구역 랭킹 계산
  const cleanZoneRanking = useMemo(() => {
    if (!climateData || !Array.isArray(climateData) || climateData.length === 0) {
      return [];
    }

    try {
      return climateData
        .map((region) => {
          const pm10 = region.climate_data?.pm10 || 50;
          const pm25 = region.climate_data?.pm25 || 25;
          return {
            ...region,
            airScore: pm10 + pm25 * 2,
            grade: getAirGrade(pm10, pm25),
          };
        })
        .sort((a, b) => a.airScore - b.airScore);
    } catch (e) {
      return [];
    }
  }, [climateData]);

  const hasData = cleanZoneRanking.length > 0;

  // 모달 컨텐츠
  const modalContent = isOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, #22c55e20, #10b98110)',
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>🌿 청정 지역 TOP 5</h3>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              fontSize: '1.2rem',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* 본문 */}
        <div style={{ padding: '16px', overflowY: 'auto', maxHeight: '60vh' }}>
          {!hasData ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌬️</div>
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : (
            <>
              {/* 1위 하이라이트 */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))',
                border: '2px solid rgba(34,197,94,0.4)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
                cursor: 'pointer',
              }}
              onClick={() => {
                onRegionSelect(cleanZoneRanking[0]);
                setIsOpen(false);
              }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '2.5rem' }}>🏆</span>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>가장 깨끗한 곳</p>
                    <h3 style={{ margin: '4px 0', fontSize: '1.3rem', color: '#22c55e', fontWeight: 700 }}>
                      {cleanZoneRanking[0].region}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1' }}>
                      PM10: {cleanZoneRanking[0].climate_data?.pm10 || '-'} · PM2.5: {cleanZoneRanking[0].climate_data?.pm25 || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TOP 5 목록 */}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 600 }}>🌳 청정 구역 순위</h4>
              {cleanZoneRanking.slice(0, 5).map((zone, idx) => (
                <div
                  key={zone.region}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    borderLeft: `4px solid ${gradeInfo[zone.grade]?.color || '#888'}`,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onClick={() => {
                    onRegionSelect(zone);
                    setIsOpen(false);
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: '#3b82f6', minWidth: '32px', fontSize: '1.1rem' }}>#{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '0.95rem' }}>{zone.region}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      PM10: {zone.climate_data?.pm10 || '-'} · PM2.5: {zone.climate_data?.pm25 || '-'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '5px 10px',
                    borderRadius: '12px',
                    background: `${gradeInfo[zone.grade]?.color}25`,
                    color: gradeInfo[zone.grade]?.color,
                    fontWeight: 600,
                  }}>
                    {gradeInfo[zone.grade]?.emoji} {gradeInfo[zone.grade]?.label}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        className="quick-action-btn"
        onClick={handleOpen}
      >
        <span>🌿</span>
        <span>청정지역</span>
      </button>

      {/* Portal을 사용하여 body에 직접 렌더링 */}
      {modalContent && createPortal(modalContent, document.body)}
    </>
  );
}

// 인라인 OOTD 생성기 (탭 내 표시용)
function OotdGeneratorInline({ selectedRegion }) {
  const { user, profile } = useAuth();
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('20s');
  const [style, setStyle] = useState('casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [outfitTips, setOutfitTips] = useState([]);
  const [error, setError] = useState(null);
  const [profileApplied, setProfileApplied] = useState(false);

  // 로그인 시 프로필 정보로 기본값 설정
  useEffect(() => {
    if (user && profile && !profileApplied) {
      if (profile.gender) setGender(profile.gender);
      if (profile.age_group) setAge(profile.age_group);
      if (profile.style_preference) setStyle(profile.style_preference);
      setProfileApplied(true);
    }
    // 로그아웃 시 리셋
    if (!user) {
      setProfileApplied(false);
    }
  }, [user, profile, profileApplied]);

  const GENDER_OPTIONS = [
    { value: 'male', label: '남성', emoji: '👨' },
    { value: 'female', label: '여성', emoji: '👩' },
  ];

  const AGE_OPTIONS = [
    { value: 'teen', label: '10대' },
    { value: '20s', label: '20대' },
    { value: '30s', label: '30대' },
    { value: '40s', label: '40대' },
    { value: '50s', label: '50대' },
    { value: '60s', label: '60대' },
    { value: '70s', label: '70대' },
  ];

  const STYLE_OPTIONS = [
    { value: 'casual', label: '캐주얼', emoji: '👕' },
    { value: 'office', label: '오피스', emoji: '👔' },
    { value: 'sporty', label: '스포티', emoji: '🏃' },
    { value: 'minimal', label: '미니멀', emoji: '🖤' },
  ];

  // 옷차림 팁 생성
  const generateTips = (climate) => {
    const temp = climate.apparent_temperature || climate.temperature || 25;
    const humidity = climate.humidity || 50;
    const pm10 = climate.pm10 || 30;
    const uvIndex = climate.uv_index || 5;

    let tips = [];

    if (temp >= 33) tips.push('🌡️ 폭염! 최대한 시원하게');
    else if (temp >= 28) tips.push('☀️ 반팔/반바지 추천');
    else if (temp >= 23) tips.push('🌤️ 가벼운 옷차림');
    else if (temp >= 17) tips.push('🍃 얇은 겉옷 준비');
    else if (temp >= 12) tips.push('🍂 자켓/가디건 필수');
    else tips.push('❄️ 따뜻한 외투 필수');

    if (humidity >= 70) tips.push('💧 통기성 좋은 소재');
    if (pm10 >= 80) tips.push('😷 마스크 필수!');
    else if (pm10 >= 50) tips.push('😐 마스크 권장');
    if (uvIndex >= 8) tips.push('🕶️ 선글라스/모자');
    else if (uvIndex >= 6) tips.push('🧢 자외선 주의');

    return tips;
  };

  // 온도별 옷차림 데이터
  const getOutfitData = (temp, styleValue) => {
    const outfits = {
      hot: { // 33도 이상
        casual: { top: '🎽', bottom: '🩳', outer: '', shoes: '🩴', desc: '민소매 + 반바지' },
        office: { top: '👔', bottom: '👖', outer: '', shoes: '👞', desc: '반팔 셔츠 + 면바지' },
        sporty: { top: '🎽', bottom: '🩳', outer: '', shoes: '👟', desc: '운동복 + 반바지' },
        minimal: { top: '👕', bottom: '🩳', outer: '', shoes: '👟', desc: '무지 티셔츠 + 반바지' },
      },
      warm: { // 28-32도
        casual: { top: '👕', bottom: '🩳', outer: '', shoes: '👟', desc: '반팔 티 + 반바지' },
        office: { top: '👔', bottom: '👖', outer: '', shoes: '👞', desc: '반팔 셔츠 + 슬랙스' },
        sporty: { top: '👕', bottom: '🩳', outer: '', shoes: '👟', desc: '기능성 티셔츠 + 반바지' },
        minimal: { top: '👕', bottom: '👖', outer: '', shoes: '👟', desc: '무지 티셔츠 + 면바지' },
      },
      mild: { // 23-27도
        casual: { top: '👕', bottom: '👖', outer: '', shoes: '👟', desc: '긴팔 티셔츠 + 청바지' },
        office: { top: '👔', bottom: '👖', outer: '', shoes: '👞', desc: '셔츠 + 슬랙스' },
        sporty: { top: '👕', bottom: '👖', outer: '', shoes: '👟', desc: '트레이닝복' },
        minimal: { top: '👕', bottom: '👖', outer: '', shoes: '👟', desc: '기본 긴팔 + 바지' },
      },
      cool: { // 17-22도
        casual: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '긴팔 + 얇은 자켓' },
        office: { top: '👔', bottom: '👖', outer: '🧥', shoes: '👞', desc: '셔츠 + 가벼운 자켓' },
        sporty: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '바람막이 + 운동복' },
        minimal: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '기본 레이어드' },
      },
      chilly: { // 12-16도
        casual: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '니트/맨투맨 + 자켓' },
        office: { top: '👔', bottom: '👖', outer: '🧥', shoes: '👞', desc: '셔츠 + 가디건/자켓' },
        sporty: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '후드집업 + 트레이닝' },
        minimal: { top: '🧥', bottom: '👖', outer: '', shoes: '👟', desc: '심플 니트 + 코트' },
      },
      cold: { // 12도 미만
        casual: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👢', desc: '패딩/코트 + 니트' },
        office: { top: '👔', bottom: '👖', outer: '🧥', shoes: '👞', desc: '코트 + 정장' },
        sporty: { top: '👕', bottom: '👖', outer: '🧥', shoes: '👟', desc: '패딩 + 기모 운동복' },
        minimal: { top: '🧥', bottom: '👖', outer: '', shoes: '👢', desc: '롱코트 + 터틀넥' },
      },
    };

    let tempCategory;
    if (temp >= 33) tempCategory = 'hot';
    else if (temp >= 28) tempCategory = 'warm';
    else if (temp >= 23) tempCategory = 'mild';
    else if (temp >= 17) tempCategory = 'cool';
    else if (temp >= 12) tempCategory = 'chilly';
    else tempCategory = 'cold';

    return outfits[tempCategory][styleValue] || outfits[tempCategory].casual;
  };

  const generateOutfit = () => {
    if (!selectedRegion?.climate_data) return;

    setIsGenerating(true);
    setError(null);

    const climate = selectedRegion.climate_data;
    const temp = climate.apparent_temperature || climate.temperature || 25;

    // 날씨 타입 및 맞춤 메시지 가져오기
    const weatherType = getWeatherType(temp);
    const personalMessage = getRandomMessage(weatherType, gender, age);
    const styleTip = getStyleTip(style, gender);

    // 동적 이모티콘 가져오기
    const emojis = getEmojiSet(gender, age, style);
    const weatherEmoji = getWeatherEmoji(weatherType);

    // 팁 생성
    const tips = generateTips(climate);
    if (personalMessage) {
      tips.unshift(emojis.mood + ' ' + personalMessage);
    }
    if (styleTip) {
      tips.push(emojis.style + ' ' + styleTip);
    }
    setOutfitTips(tips);

    // 옷차림 데이터 생성 (동적 이모티콘 사용)
    const outfit = getOutfitData(temp, style);
    outfit.top = emojis.tops;
    outfit.bottom = emojis.bottoms;
    outfit.shoes = emojis.shoes;
    outfit.outer = temp < 17 ? emojis.accessories : '';

    // 성별/연령/날씨/스타일별 맞춤 설명 생성
    const generatePersonalizedDesc = (genderVal, ageVal, weatherVal, styleVal) => {
      // 성별별 아이템
      const genderItems = {
        male: {
          top: { hot: '반팔 셔츠', warm: '옥스포드 셔츠', cold: '니트/맨투맨' },
          bottom: { hot: '반바지/면바지', warm: '청바지/슬랙스', cold: '기모 팬츠' },
          outer: { mild: '자켓', cool: '코트/자켓', cold: '패딩/코트' }
        },
        female: {
          top: { hot: '블라우스/크롭탑', warm: '니트/블라우스', cold: '터틀넥/니트' },
          bottom: { hot: '반바지/스커트', warm: '청바지/롱스커트', cold: '기모 레깅스/울스커트' },
          outer: { mild: '가디건', cool: '트렌치코트', cold: '롱패딩/코트' }
        }
      };

      // 연령별 스타일 키워드
      const ageStyle = {
        teen: { prefix: '트렌디한', items: '오버핏', vibe: '힙한' },
        '20s': { prefix: '세련된', items: '스타일리시한', vibe: '감각적인' },
        '30s': { prefix: '깔끔한', items: '모던한', vibe: '세련된' },
        '40s': { prefix: '단정한', items: '클래식한', vibe: '품격있는' },
        '50s': { prefix: '편안한', items: '실용적인', vibe: '고급스러운' },
        '60s': { prefix: '따뜻한', items: '편안한', vibe: '여유로운' },
        '70s': { prefix: '보온성 좋은', items: '부드러운', vibe: '편안한' }
      };

      // 스타일별 추가 설명
      const styleDesc = {
        casual: '데일리룩',
        office: '출근룩',
        sporty: '액티브웨어',
        minimal: '심플룩'
      };

      const g = genderItems[genderVal] || genderItems.male;
      const a = ageStyle[ageVal] || ageStyle['20s'];
      const s = styleDesc[styleVal] || '데일리룩';

      // 날씨별 조합 생성
      let topItem, bottomItem, outerItem = '';

      if (['extremeHeat', 'veryHot', 'hot'].includes(weatherVal)) {
        topItem = g.top.hot;
        bottomItem = g.bottom.hot;
      } else if (['warm', 'mild'].includes(weatherVal)) {
        topItem = g.top.warm;
        bottomItem = g.bottom.warm;
        if (weatherVal === 'mild') outerItem = ' + ' + g.outer.mild;
      } else if (['cool'].includes(weatherVal)) {
        topItem = g.top.warm;
        bottomItem = g.bottom.warm;
        outerItem = ' + ' + g.outer.cool;
      } else {
        topItem = g.top.cold;
        bottomItem = g.bottom.cold;
        outerItem = ' + ' + g.outer.cold;
      }

      return a.prefix + ' ' + topItem + ' + ' + bottomItem + outerItem + ' (' + s + ')';
    };

    outfit.desc = generatePersonalizedDesc(gender, age, weatherType, style);

    setGeneratedImage(outfit);
    setIsGenerating(false);
  };

  return (
    <div className="ootd-inline">
      <div className="ootd-header-inline">
        <h3>👔 AI 오늘의 옷차림</h3>
        <p>{selectedRegion.region} 날씨에 맞는 스타일 추천</p>
        {user && profile && (profile.gender || profile.age_group || profile.style_preference) && (
          <span className="profile-badge">✓ 프로필 설정 적용됨</span>
        )}
      </div>

      {/* 현재 날씨 요약 */}
      <div className="weather-badge-row">
        <span className="weather-badge">🌡️ {selectedRegion.climate_data?.apparent_temperature}°C</span>
        <span className="weather-badge">💧 {selectedRegion.climate_data?.humidity}%</span>
        <span className="weather-badge">🌫️ PM {selectedRegion.climate_data?.pm10}</span>
      </div>

      {/* 옵션 선택 */}
      <div className="ootd-options-inline">
        <div className="option-row">
          <label>성별</label>
          <div className="option-chips">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${gender === opt.value ? 'selected' : ''}`}
                onClick={() => setGender(opt.value)}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="option-row">
          <label>연령</label>
          <div className="option-chips">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip small ${age === opt.value ? 'selected' : ''}`}
                onClick={() => setAge(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="option-row">
          <label>스타일</label>
          <div className="option-chips">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${style === opt.value ? 'selected' : ''}`}
                onClick={() => setStyle(opt.value)}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 생성 버튼 */}
      <button
        className="generate-btn-large"
        onClick={generateOutfit}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><span className="spinner"></span> 생성 중...</>
        ) : (
          '👔 옷차림 추천받기'
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {/* 결과 */}
      {generatedImage && (
        <div className="ootd-result-inline">
          <div className="outfit-visual">
            <div className="outfit-icons">
              {generatedImage.outer && <span className="outfit-item outer">{generatedImage.outer}</span>}
              <span className="outfit-item top">{generatedImage.top}</span>
              <span className="outfit-item bottom">{generatedImage.bottom}</span>
              <span className="outfit-item shoes">{generatedImage.shoes}</span>
            </div>
            <div className="outfit-desc">
              <strong>추천 옷차림</strong>
              <p>{generatedImage.desc}</p>
            </div>
          </div>

          {outfitTips.length > 0 && (
            <div className="tips-box">
              <h4>💡 오늘의 옷차림 팁</h4>
              <div className="tips-list">
                {outfitTips.map((tip, idx) => (
                  <span key={idx} className="tip-badge">{tip}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 인라인 제보 패널 (탭 내 표시용)
function UserReportPanelInline({ selectedRegion, onReportSubmit }) {
  const { isAuthenticated, user, profile, refreshReportStats } = useAuth();
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recentReports, setRecentReports] = useState([]);

  const FEELING_OPTIONS = [
    { emoji: '🥵', label: '너무 더워요', sentiment: -3, tempAdjust: 5 },
    { emoji: '😰', label: '더워요', sentiment: -2, tempAdjust: 3 },
    { emoji: '😅', label: '조금 더워요', sentiment: -1, tempAdjust: 1 },
    { emoji: '😊', label: '쾌적해요', sentiment: 0, tempAdjust: 0 },
    { emoji: '😌', label: '쌀쌀해요', sentiment: 1, tempAdjust: -1 },
    { emoji: '🥶', label: '추워요', sentiment: 2, tempAdjust: -3 },
    { emoji: '😷', label: '공기 나빠요', sentiment: -2, tempAdjust: 0, airQuality: true },
  ];

  const QUICK_COMMENTS = [
    '살려줘요 🆘', '녹아내리는 중 🫠', '에어컨 필수!',
    '그늘도 더워요', '날씨 좋아요 ✨', '미세먼지 심해요'
  ];

  // 최근 제보 로드 (직접 fetch 사용)
  const loadRecentReports = async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?region=eq.${encodeURIComponent(selectedRegion.region)}&created_at=gte.${since}&order=created_at.desc&limit=5`;

      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecentReports(data);
      }
    } catch (error) {
      console.error('제보 로드 실패:', error);
    }
  };

  useEffect(() => {
    if (selectedRegion) {
      loadRecentReports();
    }
  }, [selectedRegion]);

  const handleSubmit = async () => {
    if (!selectedFeeling || !selectedRegion) return;

    setIsSubmitting(true);
    console.log('제보 시작:', selectedRegion.region, selectedFeeling.label);

    const reportData = {
      region: selectedRegion.region,
      lat: selectedRegion.lat,
      lng: selectedRegion.lng,
      emoji: selectedFeeling.emoji,
      feeling_label: selectedFeeling.label,
      sentiment_score: selectedFeeling.sentiment,
      temp_adjustment: selectedFeeling.tempAdjust,
      comment: comment || selectedFeeling.label,
      is_air_quality: selectedFeeling.airQuality || false,
      user_id: user?.id || null,
    };

    try {
      console.log('Supabase insert 시작:', reportData);
      console.log('Supabase 클라이언트 확인:', supabase);
      console.log('Supabase URL:', supabase?.supabaseUrl);

      // fetch로 직접 요청
      const response = await fetch('https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(reportData)
      });

      console.log('fetch 응답 상태:', response.status);
      const result = await response.json();
      console.log('fetch 응답 데이터:', result);

      if (!response.ok) {
        throw new Error(result.message || '저장 실패');
      }

      const insertedData = Array.isArray(result) ? result[0] : result;
      const error = null;

      console.log('Supabase insert 결과:', { insertedData, error });

      if (error) {
        console.error('Insert 오류 상세:', error);
        throw new Error(error.message);
      }

      if (!insertedData) {
        console.error('Insert 실패: 데이터가 반환되지 않음');
        throw new Error('저장 실패 - 권한을 확인해주세요');
      }

      console.log('제보 저장 성공! ID:', insertedData.id);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // 프로필의 제보 통계 갱신 (DB에서 실제 값 조회)
      if (user) {
        refreshReportStats();
      }

      setSelectedFeeling(null);
      setComment('');
      loadRecentReports();

      if (onReportSubmit) {
        onReportSubmit(reportData);
      }
    } catch (error) {
      console.error('제보 오류:', error);
      alert('제보 실패: ' + (error?.message || '네트워크 오류'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return '방금';
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${Math.floor(diffHours / 24)}일 전`;
  };

  return (
    <div className="report-inline">
      <div className="report-header-inline">
        <h3>📢 체감 짤 대항전</h3>
        <p>{selectedRegion.region}에서 느끼는 실제 날씨는?</p>
      </div>

      {/* 감정 선택 그리드 */}
      <div className="feeling-grid-inline">
        {FEELING_OPTIONS.map((option) => (
          <button
            key={option.emoji}
            className={`feeling-btn-inline ${selectedFeeling?.emoji === option.emoji ? 'selected' : ''}`}
            onClick={() => setSelectedFeeling(option)}
          >
            <span className="emoji">{option.emoji}</span>
            <span className="label">{option.label}</span>
          </button>
        ))}
      </div>

      {/* 빠른 코멘트 */}
      <div className="quick-comments">
        <label htmlFor="report-comment">한마디 (선택)</label>
        <div className="comment-chips">
          {QUICK_COMMENTS.map((c) => (
            <button
              key={c}
              className={`comment-chip ${comment === c ? 'selected' : ''}`}
              onClick={() => setComment(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          id="report-comment"
          name="report-comment"
          className="comment-input-inline"
          placeholder="직접 입력..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={50}
        />
      </div>

      {/* 제출 버튼 */}
      <button
        className={`submit-btn-large ${showSuccess ? 'success' : ''}`}
        onClick={handleSubmit}
        disabled={!selectedFeeling || isSubmitting}
      >
        {showSuccess ? '✓ 제보 완료!' : isSubmitting ? '제출 중...' : '🚀 제보하기'}
      </button>

      {!isAuthenticated && (
        <p className="login-hint">💡 로그인하면 제보 기록이 저장됩니다</p>
      )}

      {/* 최근 제보 */}
      {recentReports.length > 0 && (
        <div className="recent-reports-inline">
          <h4>📍 최근 제보</h4>
          <div className="reports-list">
            {recentReports.map((report, idx) => (
              <div key={idx} className="report-item-inline">
                <span className="emoji">{report.emoji}</span>
                <span className="comment">{report.comment}</span>
                <span className="time">{formatTimeAgo(report.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RegionCard({ region, explanation, isFavorite, onToggleFavorite }) {
  const score = region.adjusted_score || region.score;

  return (
    <div className="region-card-compact">
      {/* 지역 헤더 */}
      <div
        className="region-header-compact"
        style={{ backgroundColor: region.risk_color }}
      >
        <div className="region-title">
          <h2>{region.region}</h2>
          <span className="risk-badge">{region.risk_label}</span>
        </div>
        <div className="header-actions">
          <button
            className={`favorite-toggle-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            {isFavorite ? '★' : '☆'}
          </button>
          <div className="score-badge">
            <span className="score">{score}</span>
            <span className="label">점</span>
          </div>
        </div>
      </div>

      {/* 기후 데이터 그리드 */}
      <div className="climate-grid-compact">
        <div className="climate-item">
          <span className="icon">🌡️</span>
          <span className="value">{region.climate_data.apparent_temperature}°C</span>
          <span className="label">체감</span>
        </div>
        <div className="climate-item">
          <span className="icon">💧</span>
          <span className="value">{region.climate_data.humidity}%</span>
          <span className="label">습도</span>
        </div>
        <div className="climate-item">
          <span className="icon">🌫️</span>
          <span className="value">{region.climate_data.pm10}</span>
          <span className="label">PM10</span>
        </div>
        <div className="climate-item">
          <span className="icon">☀️</span>
          <span className="value">{region.climate_data.uv_index}</span>
          <span className="label">UV</span>
        </div>
      </div>

      {/* 시간대별 예보 */}
      <HourlyForecast region={region.region} />

      {/* AI 설명 */}
      {explanation && (
        <div className="ai-section">
          <div className="ai-explanation-compact">
            <h4>🤖 AI 분석 ({explanation.target})</h4>
            <p>{explanation.explanation}</p>
          </div>

          {/* 행동 가이드 */}
          <div className="guides-compact">
            {explanation.action_guides.map((guide, index) => (
              <span key={index} className="guide-chip">✓ {guide}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
