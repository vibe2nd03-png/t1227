import React, { useState } from 'react';
import UserReportPanel from './UserReportPanel';
import OotdGenerator from './OotdGenerator';
import AuthModal from './AuthModal';
import UserProfile from './UserProfile';
import { useAuth } from '../contexts/AuthContext';

const TARGET_OPTIONS = [
  { value: 'general', label: '일반 시민' },
  { value: 'elderly', label: '노인' },
  { value: 'child', label: '아동' },
  { value: 'outdoor', label: '야외근로자' },
];

function Sidebar({ selectedRegion, explanation, target, onTargetChange, loading, onReportSubmit }) {
  const { user, profile, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <div className="sidebar">
      {/* 헤더 */}
      <div className="sidebar-header">
        <div className="header-top">
          <div className="header-title">
            <h1>경기 기후 체감 맵</h1>
            <p>경기도 기후 체감 지수 및 AI 설명 서비스</p>
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
      </div>

      {/* 로그인 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 프로필 모달 */}
      <UserProfile
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* 대상 선택 */}
      <div className="target-selector">
        <label>대상 선택</label>
        <div className="target-buttons">
          {TARGET_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`target-btn ${target === option.value ? 'active' : ''}`}
              onClick={() => onTargetChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 지역 정보 */}
      <div className="region-info">
        {!selectedRegion ? (
          <div className="no-selection">
            <p>🗺️ 지도에서 지역을 선택하세요</p>
            <p style={{ fontSize: '0.85rem' }}>
              경기도 31개 시군의 기후 체감 정보를 확인할 수 있습니다
            </p>
          </div>
        ) : loading ? (
          <div className="loading">정보를 불러오는 중...</div>
        ) : (
          <>
            <RegionCard region={selectedRegion} explanation={explanation} />
            {/* AI OOTD 생성기 */}
            <OotdGenerator selectedRegion={selectedRegion} />
            {/* 시민 제보 패널 */}
            <UserReportPanel
              selectedRegion={selectedRegion}
              onReportSubmit={onReportSubmit}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RegionCard({ region, explanation }) {
  const score = region.adjusted_score || region.score;

  return (
    <div className="region-card">
      {/* 지역 헤더 */}
      <div
        className="region-header"
        style={{ backgroundColor: region.risk_color }}
      >
        <h2>{region.region}</h2>
        <span className="risk-badge">{region.risk_label}</span>
      </div>

      {/* 점수 표시 */}
      <div className="score-display">
        <div
          className="score-circle"
          style={{ backgroundColor: region.risk_color }}
        >
          <span className="score">{score}</span>
          <span className="label">점</span>
        </div>
        <p className="score-desc">
          체감 기후 점수 (100점 만점, 높을수록 위험)
        </p>
      </div>

      {/* 기후 데이터 */}
      <div className="climate-data">
        <h3>현재 기후 정보</h3>
        <div className="data-grid">
          <div className="data-item">
            <span className="label">체감온도</span>
            <span className="value">{region.climate_data.apparent_temperature}°C</span>
          </div>
          <div className="data-item">
            <span className="label">기온</span>
            <span className="value">{region.climate_data.temperature}°C</span>
          </div>
          <div className="data-item">
            <span className="label">습도</span>
            <span className="value">{region.climate_data.humidity}%</span>
          </div>
          <div className="data-item">
            <span className="label">미세먼지</span>
            <span className="value">{region.climate_data.pm10} μg/m³</span>
          </div>
          <div className="data-item">
            <span className="label">초미세먼지</span>
            <span className="value">{region.climate_data.pm25} μg/m³</span>
          </div>
          <div className="data-item">
            <span className="label">자외선</span>
            <span className="value">{region.climate_data.uv_index}</span>
          </div>
        </div>
      </div>

      {/* AI 설명 */}
      {explanation && (
        <>
          <div className="ai-explanation">
            <h3>AI 기후 설명 ({explanation.target})</h3>
            <div className="explanation-text">
              {explanation.explanation}
            </div>
          </div>

          {/* 행동 가이드 */}
          <div className="action-guides">
            <h3>행동 가이드</h3>
            <ul className="guide-list">
              {explanation.action_guides.map((guide, index) => (
                <li key={index}>{guide}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;
