import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import AdminDashboard, { ADMIN_EMAIL } from "./AdminDashboard";

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

const TARGET_OPTIONS = [
  { value: "general", label: "일반 시민", emoji: "👤" },
  { value: "elderly", label: "노인", emoji: "👴" },
  { value: "child", label: "아동", emoji: "👶" },
  { value: "outdoor", label: "야외근로자", emoji: "👷" },
];

// AI 옷차림 추천용 옵션
const GENDER_OPTIONS = [
  { value: "male", label: "남성", emoji: "👨" },
  { value: "female", label: "여성", emoji: "👩" },
];

const AGE_OPTIONS = [
  { value: "teen", label: "10대", emoji: "🧒" },
  { value: "20s", label: "20대", emoji: "🧑" },
  { value: "30s", label: "30대", emoji: "👨‍💼" },
  { value: "40s", label: "40대", emoji: "👨‍💼" },
  { value: "50s", label: "50대", emoji: "👴" },
  { value: "60s", label: "60대", emoji: "👴" },
  { value: "70s", label: "70대 이상", emoji: "👴" },
];

const STYLE_OPTIONS = [
  { value: "casual", label: "캐주얼", emoji: "👕" },
  { value: "office", label: "오피스", emoji: "👔" },
  { value: "sporty", label: "스포티", emoji: "🏃" },
  { value: "minimal", label: "미니멀", emoji: "🎨" },
];

function UserProfile({ isOpen, onClose }) {
  const {
    user,
    profile,
    signOut,
    updateProfile,
    getFavoriteRegions,
    addFavoriteRegion,
    removeFavoriteRegion,
    getMyReports,
    deleteMyReport,
  } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [favorites, setFavorites] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    display_name: "",
    preferred_region: "",
    preferred_target: "general",
    gender: "",
    age_group: "",
    style_preference: "",
    notification_enabled: true,
    notification_threshold: 70,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [togglingRegion, setTogglingRegion] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [deletingReport, setDeletingReport] = useState(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // 관리자 권한 확인
  const isAdmin = user?.email === ADMIN_EMAIL;

  // 프로필 및 즐겨찾기 로드
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        preferred_region: profile.preferred_region || "",
        preferred_target: profile.preferred_target || "general",
        gender: profile.gender || "",
        age_group: profile.age_group || "",
        style_preference: profile.style_preference || "",
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

  const loadMyReports = async () => {
    setLoadingReports(true);
    const reports = await getMyReports();
    setMyReports(reports);
    setLoadingReports(false);
  };

  const handleDeleteReport = async (reportId) => {
    if (deletingReport) return;

    if (!window.confirm("이 제보를 삭제하시겠습니까?")) return;

    setDeletingReport(reportId);
    const result = await deleteMyReport(reportId);

    if (result.success) {
      setMyReports(myReports.filter((r) => r.id !== reportId));
      setMessage("제보가 삭제되었습니다");
      setTimeout(() => setMessage(""), 2000);
    } else {
      setMessage(result.error || "삭제에 실패했습니다");
      setTimeout(() => setMessage(""), 3000);
    }
    setDeletingReport(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  };

  // 탭 변경 시 내 제보 로드
  useEffect(() => {
    if (activeTab === "history" && myReports.length === 0) {
      loadMyReports();
    }
  }, [activeTab]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateProfile(formData);
    setSaving(false);

    if (result.success) {
      setMessage("프로필이 저장되었습니다");
      setEditMode(false);
      setTimeout(() => setMessage(""), 2000);
    } else {
      setMessage(result.error || "저장에 실패했습니다");
    }
  };

  const handleToggleFavorite = async (region) => {
    if (togglingRegion) return; // 중복 클릭 방지

    setTogglingRegion(region);
    setMessage("");

    try {
      let result;
      if (favorites.includes(region)) {
        result = await removeFavoriteRegion(region);
      } else {
        result = await addFavoriteRegion(region);
      }

      if (!result.success) {
        setMessage(result.error || "즐겨찾기 변경에 실패했습니다");
        setTimeout(() => setMessage(""), 3000);
      } else {
        await loadFavorites();
      }
    } catch (_error) {
      setMessage("즐겨찾기 변경 중 오류가 발생했습니다");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setTogglingRegion(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
  };

  if (!isOpen || !user) return null;

  const modalContent = (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="프로필" />
            ) : (
              <span className="avatar-placeholder">
                {profile?.display_name?.charAt(0) ||
                  user.email?.charAt(0) ||
                  "👤"}
              </span>
            )}
          </div>
          <div className="profile-info">
            <h2>{profile?.display_name || "사용자"}</h2>
            <p>{user.email || user.phone}</p>
            <div className="profile-stats">
              <span>📝 제보 {profile?.total_reports || 0}건</span>
              <span>⭐ 평판 {profile?.reputation_score || 0}점</span>
            </div>
            {isAdmin && (
              <button
                className="admin-access-btn"
                onClick={() => setShowAdminDashboard(true)}
              >
                🛡️ 관리자
              </button>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            ⚙️ 설정
          </button>
          <button
            className={`tab-btn ${activeTab === "favorites" ? "active" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            ⭐ 즐겨찾기
          </button>
          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            📋 내 제보
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="profile-content">
          {activeTab === "profile" && (
            <div className="settings-section">
              {/* 닉네임 */}
              <div className="setting-item">
                <label htmlFor="profile-nickname">닉네임</label>
                {editMode ? (
                  <input
                    type="text"
                    id="profile-nickname"
                    name="display_name"
                    value={formData.display_name}
                    onChange={(e) =>
                      setFormData({ ...formData, display_name: e.target.value })
                    }
                    placeholder="닉네임을 입력하세요"
                  />
                ) : (
                  <span>{formData.display_name || "설정되지 않음"}</span>
                )}
              </div>

              {/* 관심 지역 */}
              <div className="setting-item">
                <label htmlFor="profile-region">관심 지역</label>
                {editMode ? (
                  <select
                    id="profile-region"
                    name="preferred_region"
                    value={formData.preferred_region}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_region: e.target.value,
                      })
                    }
                  >
                    <option value="">선택하세요</option>
                    {GYEONGGI_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>{formData.preferred_region || "설정되지 않음"}</span>
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
                        className={`target-option ${formData.preferred_target === option.value ? "selected" : ""}`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            preferred_target: option.value,
                          })
                        }
                      >
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {
                      TARGET_OPTIONS.find(
                        (t) => t.value === formData.preferred_target,
                      )?.emoji
                    }{" "}
                    {
                      TARGET_OPTIONS.find(
                        (t) => t.value === formData.preferred_target,
                      )?.label
                    }
                  </span>
                )}
              </div>

              {/* AI 옷차림 추천 설정 */}
              <div className="setting-divider">
                <span>AI 옷차림 추천 기본값</span>
              </div>

              {/* 성별 */}
              <div className="setting-item">
                <label>성별</label>
                {editMode ? (
                  <div className="target-select">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`target-option ${formData.gender === option.value ? "selected" : ""}`}
                        onClick={() =>
                          setFormData({ ...formData, gender: option.value })
                        }
                      >
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {formData.gender
                      ? `${GENDER_OPTIONS.find((g) => g.value === formData.gender)?.emoji} ${GENDER_OPTIONS.find((g) => g.value === formData.gender)?.label}`
                      : "설정되지 않음"}
                  </span>
                )}
              </div>

              {/* 연령 */}
              <div className="setting-item">
                <label>연령대</label>
                {editMode ? (
                  <div className="target-select age-select">
                    {AGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`target-option ${formData.age_group === option.value ? "selected" : ""}`}
                        onClick={() =>
                          setFormData({ ...formData, age_group: option.value })
                        }
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {formData.age_group
                      ? AGE_OPTIONS.find((a) => a.value === formData.age_group)
                          ?.label
                      : "설정되지 않음"}
                  </span>
                )}
              </div>

              {/* 스타일 */}
              <div className="setting-item">
                <label>선호 스타일</label>
                {editMode ? (
                  <div className="target-select">
                    {STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`target-option ${formData.style_preference === option.value ? "selected" : ""}`}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            style_preference: option.value,
                          })
                        }
                      >
                        <span>{option.emoji}</span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <span>
                    {formData.style_preference
                      ? `${STYLE_OPTIONS.find((s) => s.value === formData.style_preference)?.emoji} ${STYLE_OPTIONS.find((s) => s.value === formData.style_preference)?.label}`
                      : "설정되지 않음"}
                  </span>
                )}
              </div>

              {/* 알림 설정 */}
              <div className="setting-item">
                <label id="notification-label">알림 설정</label>
                {editMode ? (
                  <div
                    className="notification-settings"
                    aria-labelledby="notification-label"
                  >
                    <label
                      className="toggle-label"
                      htmlFor="notification-enabled"
                    >
                      <input
                        type="checkbox"
                        id="notification-enabled"
                        name="notification_enabled"
                        checked={formData.notification_enabled}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notification_enabled: e.target.checked,
                          })
                        }
                      />
                      <span>위험 알림 받기</span>
                    </label>
                    <div className="threshold-setting">
                      <label htmlFor="notification-threshold">
                        위험도 {formData.notification_threshold}점 이상 시 알림
                      </label>
                      <input
                        type="range"
                        id="notification-threshold"
                        name="notification_threshold"
                        min="30"
                        max="90"
                        step="10"
                        value={formData.notification_threshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notification_threshold: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <span>
                    {formData.notification_enabled
                      ? `${formData.notification_threshold}점 이상 알림`
                      : "알림 꺼짐"}
                  </span>
                )}
              </div>

              {/* 버튼 */}
              <div className="setting-actions">
                {editMode ? (
                  <>
                    <button
                      className="save-btn"
                      onClick={handleSaveProfile}
                      disabled={saving}
                    >
                      {saving ? "저장 중..." : "저장하기"}
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => setEditMode(false)}
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <button
                    className="edit-btn"
                    onClick={() => setEditMode(true)}
                  >
                    ✏️ 프로필 수정
                  </button>
                )}
              </div>

              {message && (
                <div
                  className={`setting-message ${message.includes("실패") ? "error" : "success"}`}
                >
                  {message}
                </div>
              )}
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="favorites-section">
              <p className="section-desc">
                자주 확인하는 지역을 즐겨찾기에 추가하세요
              </p>
              {message && (
                <div
                  className={`setting-message ${message.includes("실패") || message.includes("오류") ? "error" : "success"}`}
                >
                  {message}
                </div>
              )}
              <div className="favorites-grid">
                {GYEONGGI_REGIONS.map((region) => (
                  <button
                    key={region}
                    className={`favorite-item ${favorites.includes(region) ? "active" : ""} ${togglingRegion === region ? "loading" : ""}`}
                    onClick={() => handleToggleFavorite(region)}
                    disabled={togglingRegion !== null}
                  >
                    <span className="star">
                      {togglingRegion === region
                        ? "..."
                        : favorites.includes(region)
                          ? "⭐"
                          : "☆"}
                    </span>
                    <span>{region}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="history-section">
              <p className="section-desc">최근 작성한 제보 목록 (최대 20개)</p>
              {message && (
                <div
                  className={`setting-message ${message.includes("실패") || message.includes("오류") ? "error" : "success"}`}
                >
                  {message}
                </div>
              )}
              {loadingReports ? (
                <div className="loading-reports">
                  <span>⏳</span>
                  <p>제보 목록을 불러오는 중...</p>
                </div>
              ) : myReports.length === 0 ? (
                <div className="empty-reports">
                  <span>📝</span>
                  <p>작성한 제보가 없습니다</p>
                  <p className="hint">지도에서 체감 날씨를 제보해보세요!</p>
                </div>
              ) : (
                <div className="reports-list">
                  {myReports.map((report) => (
                    <div key={report.id} className="report-item">
                      <div className="report-header">
                        <span className="report-emoji">{report.emoji}</span>
                        <span className="report-region">{report.region}</span>
                        <span className="report-date">
                          {formatDate(report.created_at)}
                        </span>
                      </div>
                      <div className="report-content">
                        {report.feeling_label && (
                          <span className="report-feeling">
                            {report.feeling_label}
                          </span>
                        )}
                        {report.comment && (
                          <p className="report-comment">{report.comment}</p>
                        )}
                      </div>
                      <div className="report-footer">
                        <span className="report-likes">
                          ❤️ {report.likes || 0}
                        </span>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteReport(report.id)}
                          disabled={deletingReport === report.id}
                        >
                          {deletingReport === report.id
                            ? "삭제 중..."
                            : "🗑️ 삭제"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

  return (
    <>
      {createPortal(modalContent, document.body)}
      <AdminDashboard
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
      />
    </>
  );
}

export default UserProfile;
