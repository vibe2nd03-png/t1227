import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GYEONGGI_REGIONS = [
  '수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시',
  '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시',
  '군포시', '하남시', '오산시', '이천시', '안성시', '의왕시', '양주시', '포천시',
  '여주시', '동두천시', '과천시', '구리시', '연천군', '가평군', '양평군'
];

const TARGET_OPTIONS = [
  { value: 'general', label: '일반 시민', emoji: '👤' },
  { value: 'elderly', label: '노인', emoji: '👴' },
  { value: 'child', label: '아동', emoji: '👶' },
  { value: 'outdoor', label: '야외근로자', emoji: '👷' },
];

function UserProfile({ isOpen, onClose }) {
  const { user, profile, signOut, updateProfile, getFavoriteRegions, addFavoriteRegion, removeFavoriteRegion } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [favorites, setFavorites] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    preferred_region: '',
    preferred_target: 'general',
    notification_enabled: true,
    notification_threshold: 70,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 프로필 및 즐겨찾기 로드
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        preferred_region: profile.preferred_region || '',
        preferred_target: profile.preferred_target || 'general',
        notification_enabled: profile.notification_enabled ?? true,
        notification_threshold: profile.notification_threshold || 70,
      });
    }
    loadFavorites();
  }, [profile]);

  const loadFavorites = async () => {
    const favs = await getFavoriteRegions();
    setFavorites(favs);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile(formData);
    setSaving(false);

    if (result.success) {
      setMessage('프로필이 저장되었습니다');
      setEditMode(false);
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage(result.error || '저장에 실패했습니다');
    }
  };

  const handleToggleFavorite = async (region) => {
    if (favorites.includes(region)) {
      await removeFavoriteRegion(region);
    } else {
      await addFavoriteRegion(region);
    }
    loadFavorites();
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="프로필" />
            ) : (
              <span className="avatar-placeholder">
                {profile?.display_name?.charAt(0) || user.email?.charAt(0) || '👤'}
              </span>
            )}
          </div>
          <div className="profile-info">
            <h2>{profile?.display_name || '사용자'}</h2>
            <p>{user.email || user.phone}</p>
            <div className="profile-stats">
              <span>📝 제보 {profile?.total_reports || 0}건</span>
              <span>⭐ 평판 {profile?.reputation_score || 0}점</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* 탭 메뉴 */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            ⚙️ 설정
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ 즐겨찾기
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📋 내 제보
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="profile-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              {/* 닉네임 */}
              <div className="setting-item">
                <label>닉네임</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="닉네임을 입력하세요"
                  />
                ) : (
                  <span>{formData.display_name || '설정되지 않음'}</span>
                )}
              </div>

              {/* 관심 지역 */}
              <div className="setting-item">
                <label>관심 지역</label>
                {editMode ? (
                  <select
                    value={formData.preferred_region}
                    onChange={(e) => setFormData({ ...formData, preferred_region: e.target.value })}
                  >
                    <option value="">선택하세요</option>
                    {GYEONGGI_REGIONS.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                ) : (
                  <span>{formData.preferred_region || '설정되지 않음'}</span>
                )}
              </div>

              {/* 기본 대상 */}
              <div className="setting-item">
                <label>기본 대상</label>
                {editMode ? (
                  <div className="target-select">
                    {TARGET_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`target-option ${formData.preferred_target === option.value ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, preferred_target: option.value })}
                      >
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {TARGET_OPTIONS.find((t) => t.value === formData.preferred_target)?.emoji}{' '}
                    {TARGET_OPTIONS.find((t) => t.value === formData.preferred_target)?.label}
                  </span>
                )}
              </div>

              {/* 알림 설정 */}
              <div className="setting-item">
                <label>알림 설정</label>
                {editMode ? (
                  <div className="notification-settings">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={formData.notification_enabled}
                        onChange={(e) => setFormData({ ...formData, notification_enabled: e.target.checked })}
                      />
                      <span>위험 알림 받기</span>
                    </label>
                    <div className="threshold-setting">
                      <span>위험도 {formData.notification_threshold}점 이상 시 알림</span>
                      <input
                        type="range"
                        min="30"
                        max="90"
                        step="10"
                        value={formData.notification_threshold}
                        onChange={(e) => setFormData({ ...formData, notification_threshold: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                ) : (
                  <span>
                    {formData.notification_enabled
                      ? `${formData.notification_threshold}점 이상 알림`
                      : '알림 꺼짐'}
                  </span>
                )}
              </div>

              {/* 버튼 */}
              <div className="setting-actions">
                {editMode ? (
                  <>
                    <button className="save-btn" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? '저장 중...' : '저장하기'}
                    </button>
                    <button className="cancel-btn" onClick={() => setEditMode(false)}>
                      취소
                    </button>
                  </>
                ) : (
                  <button className="edit-btn" onClick={() => setEditMode(true)}>
                    ✏️ 프로필 수정
                  </button>
                )}
              </div>

              {message && (
                <div className={`setting-message ${message.includes('실패') ? 'error' : 'success'}`}>
                  {message}
                </div>
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="favorites-section">
              <p className="section-desc">자주 확인하는 지역을 즐겨찾기에 추가하세요</p>
              <div className="favorites-grid">
                {GYEONGGI_REGIONS.map((region) => (
                  <button
                    key={region}
                    className={`favorite-item ${favorites.includes(region) ? 'active' : ''}`}
                    onClick={() => handleToggleFavorite(region)}
                  >
                    <span className="star">{favorites.includes(region) ? '⭐' : '☆'}</span>
                    <span>{region}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="history-section">
              <p className="section-desc">최근 작성한 제보 목록</p>
              <div className="coming-soon">
                <span>🚧</span>
                <p>제보 내역 기능 준비 중</p>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="profile-footer">
          <button className="logout-btn" onClick={handleLogout}>
            🚪 로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
