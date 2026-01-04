import React, { useState, useEffect, useRef } from "react";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "../supabase";
import { useAuth } from "../contexts/AuthContext";

// 익명 닉네임 생성
const generateAnonymousName = () => {
  const adjectives = ["행복한", "따뜻한", "시원한", "쾌적한", "활기찬", "상쾌한", "평화로운", "즐거운"];
  const nouns = ["시민", "주민", "이웃", "친구", "동네사람", "경기도민"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

function RegionComments({ region, isOpen, onClose }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // 댓글 로드
  useEffect(() => {
    if (isOpen && region) {
      loadComments();
      // 실시간 구독
      const subscription = supabase
        .channel(`comments-${region}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "region_comments",
            filter: `region=eq.${region}`,
          },
          (payload) => {
            setComments((prev) => [...prev, payload.new]);
            scrollToBottom();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, region]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // 24시간 이내 댓글
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
        setComments(data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    } finally {
      setLoading(false);
    }
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

    try {
      const commentData = {
        region: region,
        content: commentText,
        nickname: profile?.nickname || generateAnonymousName(),
        user_id: user?.id || null,
        created_at: new Date().toISOString(),
      };

      // Supabase에 저장
      const { error } = await supabase
        .from("region_comments")
        .insert([commentData]);

      if (error) {
        console.error("댓글 저장 실패:", error);
        // 실패해도 로컬에서 표시
        setComments((prev) => [...prev, { ...commentData, id: Date.now() }]);
      }

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("댓글 전송 실패:", error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = Math.floor((now - date) / 60000);

    if (diffMins < 1) return "방금";
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  };

  if (!isOpen) return null;

  return (
    <div className="region-comments-overlay" onClick={onClose}>
      <div className="region-comments-panel" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="comments-header">
          <div className="header-info">
            <span className="header-icon">💬</span>
            <div>
              <h3>{region} 주민 대화방</h3>
              <span className="header-subtitle">24시간 동안 유지됩니다</span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
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
                        <span className="comment-author">{comment.nickname}</span>
                      )}
                      <p className="comment-content">{comment.content}</p>
                      <span className="comment-time">{formatTime(comment.created_at)}</span>
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
