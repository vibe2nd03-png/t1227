import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

export const ADMIN_EMAIL = 'kwpark0047@gmail.com';

function AdminDashboard({ isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    todayReports: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // 관리자 권한 확인
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadDashboardData();
    }
  }, [isOpen, isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadUsers(),
      loadReports()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      // 사용자 수
      const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const usersData = await usersRes.json();

      // 전체 제보 수
      const reportsRes = await fetch(`${SUPABASE_URL}/rest/v1/user_reports?select=id`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const reportsData = await reportsRes.json();

      // 오늘 제보 수
      const today = new Date().toISOString().split('T')[0];
      const todayReportsRes = await fetch(`${SUPABASE_URL}/rest/v1/user_reports?select=id&created_at=gte.${today}`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const todayReportsData = await todayReportsRes.json();

      setStats({
        totalUsers: usersData?.length || 0,
        totalReports: reportsData?.length || 0,
        todayReports: todayReportsData?.length || 0,
        activeUsers: usersData?.filter(u => u.total_reports > 0)?.length || 0
      });
    } catch (error) {
      console.error('통계 로드 실패:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=*&order=created_at.desc&limit=50`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const data = await res.json();
      setUsers(data || []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    }
  };

  const loadReports = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_reports?select=*&order=created_at.desc&limit=100`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });
      const data = await res.json();
      setReports(data || []);
    } catch (error) {
      console.error('제보 목록 로드 실패:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm('이 제보를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_reports?id=eq.${reportId}`, {
        method: 'DELETE',
        headers: { 'apikey': SUPABASE_ANON_KEY }
      });

      if (res.ok) {
        setReports(reports.filter(r => r.id !== reportId));
        alert('삭제되었습니다.');
      }
    } catch (error) {
      console.error('삭제 실패:', error);
      alert('삭제 실패');
    }
  };

  if (!isOpen || !isAdmin) return null;

  const modalContent = (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="admin-header">
          <div className="admin-title">
            <span className="admin-icon">🛡️</span>
            <div>
              <h2>관리자 대시보드</h2>
              <p>시스템 관리 및 모니터링</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* 탭 메뉴 */}
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 개요
          </button>
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 사용자
          </button>
          <button
            className={`admin-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📝 제보 관리
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <span className="loading-spinner"></span>
              <p>데이터 로딩 중...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="admin-overview">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-icon">👥</span>
                      <div className="stat-info">
                        <span className="stat-value">{stats.totalUsers}</span>
                        <span className="stat-label">전체 사용자</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <span className="stat-icon">📝</span>
                      <div className="stat-info">
                        <span className="stat-value">{stats.totalReports}</span>
                        <span className="stat-label">전체 제보</span>
                      </div>
                    </div>
                    <div className="stat-card highlight">
                      <span className="stat-icon">🔥</span>
                      <div className="stat-info">
                        <span className="stat-value">{stats.todayReports}</span>
                        <span className="stat-label">오늘 제보</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <span className="stat-icon">✅</span>
                      <div className="stat-info">
                        <span className="stat-value">{stats.activeUsers}</span>
                        <span className="stat-label">활성 사용자</span>
                      </div>
                    </div>
                  </div>

                  <div className="recent-section">
                    <h3>최근 제보</h3>
                    <div className="recent-list">
                      {reports.slice(0, 5).map((report) => (
                        <div key={report.id} className="recent-item">
                          <span className="recent-emoji">{report.emoji}</span>
                          <div className="recent-info">
                            <span className="recent-region">{report.region}</span>
                            <span className="recent-label">{report.feeling_label}</span>
                          </div>
                          <span className="recent-time">{formatDate(report.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="admin-users">
                  <div className="users-header">
                    <h3>사용자 목록 ({users.length}명)</h3>
                    <button className="refresh-btn" onClick={loadUsers}>🔄 새로고침</button>
                  </div>
                  <div className="users-table">
                    <div className="table-header">
                      <span>닉네임</span>
                      <span>관심지역</span>
                      <span>제보</span>
                      <span>평판</span>
                      <span>가입일</span>
                    </div>
                    {users.map((u) => (
                      <div key={u.id} className="table-row">
                        <span>{u.display_name || '(미설정)'}</span>
                        <span>{u.preferred_region || '-'}</span>
                        <span>{u.total_reports || 0}건</span>
                        <span>{u.reputation_score || 0}점</span>
                        <span>{formatDate(u.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="admin-reports">
                  <div className="reports-header">
                    <h3>제보 관리 ({reports.length}건)</h3>
                    <button className="refresh-btn" onClick={loadReports}>🔄 새로고침</button>
                  </div>
                  <div className="reports-table">
                    <div className="table-header">
                      <span>지역</span>
                      <span>체감</span>
                      <span>코멘트</span>
                      <span>시간</span>
                      <span>관리</span>
                    </div>
                    {reports.map((r) => (
                      <div key={r.id} className="table-row">
                        <span>{r.region}</span>
                        <span>{r.emoji} {r.feeling_label}</span>
                        <span className="comment-cell">{r.comment || '-'}</span>
                        <span>{formatDate(r.created_at)}</span>
                        <span>
                          <button
                            className="delete-btn-small"
                            onClick={() => deleteReport(r.id)}
                          >
                            🗑️
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default AdminDashboard;
