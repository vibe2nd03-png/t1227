import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { useAuth } from "../contexts/AuthContext";

// 로컬 스토리지 키
const COMMENTS_STORAGE_KEY = "region_comments";

// 익명 닉네임 생성
const generateAnonymousName = () => {
  const adjectives = [
    "행복한",
    "따뜻한",
    "시원한",
    "쾌적한",
    "활기찬",
    "상쾌한",
    "평화로운",
    "즐거운",
  ];
  const nouns = ["시민", "주민", "이웃", "친구", "동네사람", "경기도민"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

// 로컬 스토리지에서 댓글 가져오기
const getLocalComments = (region) => {
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : [];
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    // 24시간 이내 해당 지역 댓글만 필터링
    return all.filter(
      (c) => c.region === region && new Date(c.created_at).getTime() > dayAgo,
    );
  } catch {
    return [];
  }
};

// 로컬 스토리지에 댓글 저장
const saveLocalComment = (comment) => {
  try {
    const stored = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : [];
    all.push(comment);
    // 최대 500개, 24시간 이내만 유지
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = all
      .filter((c) => new Date(c.created_at).getTime() > dayAgo)
      .slice(-500);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("로컬 저장 실패:", e);
  }
};

function RegionComments({ region, isOpen, onClose }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [useLocalOnly, setUseLocalOnly] = useState(false);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // 댓글 로드
  useEffect(() => {
    if (isOpen && region) {
      loadComments();
    }
  }, [isOpen, region]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // 먼저 Supabase 시도
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const url = `${SUPABASE_URL}/rest/v1/region_comments?region=eq.${encodeURIComponent(region)}&created_at=gte.${since}&order=created_at.asc&limit=100`;

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // 로컬 댓글과 병합
        const localComments = getLocalComments(region);
        const merged = mergeComments(data, localComments);
        setComments(merged);
        setUseLocalOnly(false);
      } else {
        // Supabase 실패 시 로컬만 사용
        console.warn("Supabase 로드 실패, 로컬 사용");
        setComments(getLocalComments(region));
        setUseLocalOnly(true);
      }
    } catch (error) {
      console.error("댓글 로드 실패:", error);
      setComments(getLocalComments(region));
      setUseLocalOnly(true);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // 댓글 병합 (중복 제거)
  const mergeComments = (serverComments, localComments) => {
    const serverIds = new Set(serverComments.map((c) => c.id));
    const uniqueLocal = localComments.filter((c) => !serverIds.has(c.id));
    return [...serverComments, ...uniqueLocal].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    const commentText = newComment.trim();
    setNewComment("");

    const commentData = {
      id: Date.now(),
      region: region,
      content: commentText,
      nickname: profile?.nickname || generateAnonymousName(),
      user_id: user?.id || null,
      created_at: new Date().toISOString(),
    };

    // 즉시 로컬에 표시
    setComments((prev) => [...prev, commentData]);
    saveLocalComment(commentData);
    setTimeout(scrollToBottom, 100);

    // 백그라운드에서 Supabase 저장 시도
    if (!useLocalOnly) {
      try {
        const { error } = await supabase.from("region_comments").insert([
          {
            region: commentData.region,
            content: commentData.content,
            nickname: commentData.nickname,
            user_id: commentData.user_id,
          },
        ]);

        if (error) {
          console.warn("Supabase 저장 실패:", error.message);
        }
      } catch (error) {
        console.warn("Supabase 전송 실패:", error);
      }
    }

    setSending(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return "방금";
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="region-comments-overlay" onClick={onClose}>
      <div
        className="region-comments-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="comments-header">
          <div className="header-info">
            <span className="header-icon">💬</span>
            <div>
              <h3>{region} 주민 대화방</h3>
              <span className="header-subtitle">
                {useLocalOnly ? "로컬 저장 모드" : "24시간 동안 유지됩니다"}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 댓글 목록 */}
        <div className="comments-list">
          {loading ? (
            <div className="comments-loading">
              <span className="spinner-small"></span>
              <span>불러오는 중...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="comments-empty">
              <span className="empty-icon">🌤️</span>
              <p>아직 대화가 없어요</p>
              <p className="empty-hint">첫 번째 메시지를 남겨보세요!</p>
            </div>
          ) : (
            <>
              {comments.map((comment, index) => {
                const isOwn = user?.id && comment.user_id === user.id;
                return (
                  <div
                    key={comment.id || index}
                    className={`comment-item ${isOwn ? "own" : ""}`}
                  >
                    <div className="comment-bubble">
                      {!isOwn && (
                        <span className="comment-author">
                          {comment.nickname}
                        </span>
                      )}
                      <p className="comment-content">{comment.content}</p>
                      <span className="comment-time">
                        {formatTime(comment.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </>
          )}
        </div>

        {/* 입력 영역 */}
        <form className="comment-input-area" onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={`${region} 날씨 어때요?`}
              maxLength={200}
              disabled={sending}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!newComment.trim() || sending}
            >
              {sending ? "..." : "전송"}
            </button>
          </div>
          <div className="input-hint">
            {user ? (
              <span>✓ {profile?.nickname || "로그인됨"}으로 작성</span>
            ) : (
              <span>익명으로 작성됩니다</span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegionComments;
