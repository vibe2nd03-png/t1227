import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// 체감 이모지 옵션
const FEELING_OPTIONS = [
  { emoji: '🥵', label: '너무 더워요', sentiment: -3, tempAdjust: 5 },
  { emoji: '😰', label: '더워요', sentiment: -2, tempAdjust: 3 },
  { emoji: '😅', label: '조금 더워요', sentiment: -1, tempAdjust: 1 },
  { emoji: '😊', label: '쾌적해요', sentiment: 0, tempAdjust: 0 },
  { emoji: '😌', label: '조금 쌀쌀해요', sentiment: 1, tempAdjust: -1 },
  { emoji: '🥶', label: '추워요', sentiment: 2, tempAdjust: -3 },
  { emoji: '😷', label: '공기 안좋아요', sentiment: -2, tempAdjust: 0, airQuality: true },
];

// 밈 코멘트 프리셋
const MEME_PRESETS = [
  '살려줘요 🆘',
  '녹아내리는 중 🫠',
  '여긴 사우나인가요?',
  '에어컨 없이는 못 살아',
  '햇빛이 칼이야 🔪☀️',
  '습해서 빨래가 안 말라요',
  '그늘도 더워요',
  '아스팔트에서 계란 익겠다',
  '미세먼지 폭탄 💣',
  '숨쉬기 힘들어요',
  '날씨 완전 좋아요! ✨',
  '산책하기 딱 좋은 날',
];

// 로컬 스토리지 키
const REPORTS_STORAGE_KEY = 'climate_user_reports';

// 로컬 스토리지에서 제보 가져오기
const getLocalReports = () => {
  try {
    const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// 로컬 스토리지에 제보 저장
const saveLocalReport = (report) => {
  try {
    const reports = getLocalReports();
    reports.unshift(report);
    // 최대 100개까지만 저장
    const trimmed = reports.slice(0, 100);
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
};

function UserReportPanel({ selectedRegion, onReportSubmit }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // 최근 제보 로드 (Supabase 우선, 실패시 로컬)
  useEffect(() => {
    if (selectedRegion) {
      loadRecentReports(selectedRegion.region);
    }
  }, [selectedRegion]);

  const loadRecentReports = async (regionName) => {
    try {
      // Supabase에서 24시간 이내 제보 조회
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('region', regionName)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentReports(data);
        return;
      }
    } catch (err) {
      console.warn('Supabase 조회 실패, 로컬 사용:', err);
    }

    // Supabase 실패시 로컬 스토리지 사용
    const allReports = getLocalReports();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = allReports.filter(r =>
      r.region === regionName && new Date(r.created_at).getTime() > dayAgo
    );
    setRecentReports(filtered.slice(0, 10));
  };

  const handleSubmit = async () => {
    if (!selectedFeeling || !selectedRegion) return;

    setIsSubmitting(true);

    try {
      // 제보 데이터 생성
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

      // Supabase에 저장 시도
      const { data, error } = await supabase
        .from('user_reports')
        .insert([reportData])
        .select();

      if (error) {
        console.warn('Supabase 저장 실패, 로컬 저장:', error);
        // 로컬 스토리지에 백업 저장
        saveLocalReport({ ...reportData, id: Date.now(), created_at: new Date().toISOString() });
      }

      // 성공 표시
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // 폼 초기화
      setSelectedFeeling(null);
      setComment('');

      // 부모 컴포넌트에 알림
      if (onReportSubmit) {
        onReportSubmit(data?.[0] || reportData);
      }

      // 제보 목록 새로고침
      loadRecentReports(selectedRegion.region);

    } catch (error) {
      console.error('제보 제출 실패:', error);
      alert('제보 제출에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${Math.floor(diffHours / 24)}일 전`;
  };

  if (!selectedRegion) return null;

  return (
    <div className="user-report-panel">
      {/* 토글 버튼 */}
      <button
        className={`report-toggle-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="toggle-icon">📢</span>
        <span>체감 짤 대항전</span>
        {recentReports.length > 0 && (
          <span className="report-count">{recentReports.length}</span>
        )}
      </button>

      {/* 패널 내용 */}
      {isOpen && (
        <div className="report-panel-content">
          <div className="panel-header">
            <h3>🌡️ {selectedRegion.region} 체감 제보</h3>
            <p>기상청 데이터와 다르게 느껴지나요?</p>
          </div>

          {/* 감정 선택 */}
          <div className="feeling-selector">
            <label>지금 느끼는 날씨는?</label>
            <div className="feeling-grid">
              {FEELING_OPTIONS.map((option) => (
                <button
                  key={option.emoji}
                  className={`feeling-btn ${selectedFeeling?.emoji === option.emoji ? 'selected' : ''}`}
                  onClick={() => setSelectedFeeling(option)}
                >
                  <span className="feeling-emoji">{option.emoji}</span>
                  <span className="feeling-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 밈 코멘트 */}
          <div className="meme-section">
            <label>한마디 (선택)</label>
            <div className="meme-presets">
              {MEME_PRESETS.slice(0, 6).map((meme) => (
                <button
                  key={meme}
                  className={`meme-btn ${comment === meme ? 'selected' : ''}`}
                  onClick={() => setComment(meme)}
                >
                  {meme}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="comment-input"
              placeholder="직접 입력하기..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* 제출 버튼 */}
          <button
            className={`submit-report-btn ${showSuccess ? 'success' : ''}`}
            onClick={handleSubmit}
            disabled={!selectedFeeling || isSubmitting}
          >
            {showSuccess ? '✓ 제보 완료!' : isSubmitting ? '제출 중...' : '🚀 제보하기'}
          </button>

          {/* 저장 안내 */}
          <div className="login-prompt">
            <span>💡</span>
            <span>제보는 서버에 저장되어 모두에게 공유됩니다</span>
          </div>

          {/* 최근 제보 목록 */}
          {recentReports.length > 0 && (
            <div className="recent-reports">
              <h4>📍 최근 24시간 제보</h4>
              <div className="report-list">
                {recentReports.map((report, idx) => (
                  <div key={idx} className="report-item">
                    <span className="report-emoji">{report.emoji}</span>
                    <div className="report-content">
                      <span className="report-comment">{report.comment}</span>
                      {report.nickname && (
                        <span className="report-author">by {report.nickname}</span>
                      )}
                    </div>
                    <span className="report-time">{formatTimeAgo(report.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserReportPanel;
