import React, { useState, useEffect, lazy, Suspense } from 'react';
import AirQualityNav from './AirQualityNav';
import { useAuth } from '../contexts/AuthContext';

// Lazy load heavy components (탭/모달별 분리)
const AuthModal = lazy(() => import('./AuthModal'));
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

function Sidebar({ selectedRegion, explanation, target, onTargetChange, loading, onReportSubmit, allRegions, onRegionSelect }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isNotificationSubscribed, setIsNotificationSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // 알림 구독 상태 확인
  useEffect(() => {
    const settings = localStorage.getItem('notificationSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setIsNotificationSubscribed(parsed.isActive || false);
    }
  }, [showNotificationModal]);

  return (
    <div className="sidebar">
      {/* 헤더 */}
      <div className="sidebar-header">
        <div className="header-top">
          <div className="header-title">
            <h1>경기 기후 체감 맵</h1>
          </div>

          {/* 사용자 버튼 */}
          <div className="user-section">
            {isAuthenticated ? (
              <button
                className="user-avatar-btn"
                onClick={() => setShowProfileModal(true)}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="프로필" />
                ) : (
                  <span>{profile?.display_name?.charAt(0) || user?.email?.charAt(0) || '👤'}</span>
                )}
              </button>
            ) : (
              <button
                className="login-btn"
                onClick={() => setShowAuthModal(true)}
              >
                로그인
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

      {/* 로그인 모달 */}
      {showAuthModal && (
        <Suspense fallback={<LoadingFallback />}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </Suspense>
      )}

      {/* 프로필 모달 */}
      {showProfileModal && (
        <Suspense fallback={<LoadingFallback />}>
          <UserProfile
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        </Suspense>
      )}

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
                <RegionCard region={selectedRegion} explanation={explanation} />
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

  // 가장 깨끗한 지역 찾기
  const cleanestRegion = climateData && climateData.length > 0
    ? [...climateData].sort((a, b) => {
        const aScore = (a.climate_data?.pm10 || 0) + (a.climate_data?.pm25 || 0) * 2;
        const bScore = (b.climate_data?.pm10 || 0) + (b.climate_data?.pm25 || 0) * 2;
        return aScore - bScore;
      })[0]
    : null;

  return (
    <>
      <button
        className="quick-action-btn"
        onClick={() => setIsOpen(true)}
      >
        <span>🌿</span>
        <span>청정지역</span>
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="air-quality-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌿 호흡기 안전 네비게이션</h3>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <AirQualityNav
                climateData={climateData}
                onRegionSelect={(region) => {
                  onRegionSelect(region);
                  setIsOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 인라인 OOTD 생성기 (탭 내 표시용)
function OotdGeneratorInline({ selectedRegion }) {
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('20s');
  const [style, setStyle] = useState('casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [outfitTips, setOutfitTips] = useState([]);
  const [error, setError] = useState(null);

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

  const generateImage = async () => {
    if (!selectedRegion?.climate_data) return;

    setIsGenerating(true);
    setError(null);

    const climate = selectedRegion.climate_data;
    const temp = climate.apparent_temperature || climate.temperature || 25;

    let temperatureOutfit = '';
    if (temp >= 33) temperatureOutfit = 'summer tank top shorts';
    else if (temp >= 28) temperatureOutfit = 'summer t-shirt';
    else if (temp >= 23) temperatureOutfit = 'spring long sleeve';
    else if (temp >= 17) temperatureOutfit = 'light jacket';
    else if (temp >= 12) temperatureOutfit = 'sweater hoodie';
    else temperatureOutfit = 'winter coat';

    const genderText = gender === 'male' ? 'man' : 'woman';
    const ageText = AGE_OPTIONS.find(a => a.value === age)?.label || '20s';

    // 간단한 프롬프트 사용
    const prompt = `${ageText} Korean ${genderText} wearing ${temperatureOutfit}, full body photo, white background`;

    // 팁 생성
    setOutfitTips(generateTips(climate));

    // 이미지 로드 함수 (재시도 포함)
    const loadImageWithRetry = async (retryCount = 0) => {
      const maxRetries = 2;
      const seed = Date.now() + retryCount;
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=600&seed=${seed}&nologo=true`;

      return new Promise((resolve, reject) => {
        const img = new Image();
        const timeout = setTimeout(() => {
          img.src = '';
          reject(new Error('timeout'));
        }, 30000); // 30초 타임아웃

        img.onload = () => {
          clearTimeout(timeout);
          resolve(imageUrl);
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('load_error'));
        };
        img.src = imageUrl;
      });
    };

    // 최대 3번 시도
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const imageUrl = await loadImageWithRetry(attempt);
        setGeneratedImage(imageUrl);
        setIsGenerating(false);
        return;
      } catch (err) {
        if (attempt === 2) {
          setError('이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
          setIsGenerating(false);
        }
        // 다음 시도 전 잠시 대기
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  return (
    <div className="ootd-inline">
      <div className="ootd-header-inline">
        <h3>👔 AI 오늘의 옷차림</h3>
        <p>{selectedRegion.region} 날씨에 맞는 스타일 추천</p>
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
        onClick={generateImage}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><span className="spinner"></span> AI가 생성 중... (10-20초)</>
        ) : (
          '✨ AI 옷차림 생성하기'
        )}
      </button>

      {error && <div className="error-msg">{error}</div>}

      {/* 결과 */}
      {generatedImage && (
        <div className="ootd-result-inline">
          <div className="result-image">
            <img src={generatedImage} alt="AI 생성 옷차림" />
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

          <button
            className="regenerate-btn-inline"
            onClick={generateImage}
            disabled={isGenerating}
          >
            🔄 다른 스타일 보기
          </button>
        </div>
      )}
    </div>
  );
}

// 인라인 제보 패널 (탭 내 표시용)
function UserReportPanelInline({ selectedRegion, onReportSubmit }) {
  const { isAuthenticated } = useAuth();
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

  // supabase import를 위한 동적 로드
  const loadRecentReports = async () => {
    try {
      const { supabase } = await import('../supabase');
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('region', selectedRegion.region)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
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

    try {
      const { supabase } = await import('../supabase');

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
      };

      const { data, error } = await supabase
        .from('user_reports')
        .insert([reportData])
        .select();

      if (error) throw new Error(error.message);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      setSelectedFeeling(null);
      setComment('');
      loadRecentReports();

      if (onReportSubmit) {
        onReportSubmit(data?.[0] || reportData);
      }
    } catch (error) {
      alert(`제보 실패: ${error.message}`);
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
        <label>한마디 (선택)</label>
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

function RegionCard({ region, explanation }) {
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
        <div className="score-badge">
          <span className="score">{score}</span>
          <span className="label">점</span>
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
