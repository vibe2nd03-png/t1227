import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

function AuthModal({ isOpen, onClose }) {
  const {
    signUpWithEmail,
    signInWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    authError,
  } = useAuth();
  const [authMode, setAuthMode] = useState("select"); // select, phone, email
  const [emailMode, setEmailMode] = useState("login"); // login, signup
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      setMessage("올바른 전화번호를 입력해주세요");
      return;
    }

    setLoading(true);
    const result = await sendPhoneOtp(phone);
    setLoading(false);

    if (result.success) {
      setOtpSent(true);
      setMessage("인증번호가 발송되었습니다");
    } else {
      setMessage(result.error || "인증번호 발송에 실패했습니다");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setMessage("6자리 인증번호를 입력해주세요");
      return;
    }

    setLoading(true);
    const result = await verifyPhoneOtp(phone, otpCode);
    setLoading(false);

    if (result.success) {
      setMessage("로그인 성공!");
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      setMessage(result.error || "인증에 실패했습니다");
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes("@")) {
      setMessage("올바른 이메일을 입력해주세요");
      return;
    }
    if (!password || password.length < 6) {
      setMessage("비밀번호는 6자 이상이어야 합니다");
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setMessage("로그인 성공!");
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      // 에러 메시지 분류
      if (result.error?.includes("Invalid login")) {
        setMessage("이메일 또는 비밀번호가 잘못되었습니다");
      } else if (
        result.error?.includes("시간 초과") ||
        result.error?.includes("timeout")
      ) {
        setMessage("네트워크 연결이 느립니다. 다시 시도해주세요.");
      } else if (
        result.error?.includes("fetch") ||
        result.error?.includes("network")
      ) {
        setMessage("인터넷 연결을 확인해주세요.");
      } else {
        setMessage(result.error || "로그인에 실패했습니다");
      }
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !email.includes("@")) {
      setMessage("올바른 이메일을 입력해주세요");
      return;
    }
    if (!password || password.length < 6) {
      setMessage("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("비밀번호가 일치하지 않습니다");
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setMessage("회원가입 성공!");
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      // 에러 메시지 분류
      if (
        result.error?.includes("시간 초과") ||
        result.error?.includes("timeout")
      ) {
        setMessage("네트워크 연결이 느립니다. 다시 시도해주세요.");
      } else if (
        result.error?.includes("fetch") ||
        result.error?.includes("network")
      ) {
        setMessage("인터넷 연결을 확인해주세요.");
      } else {
        setMessage(result.error || "회원가입에 실패했습니다");
      }
    }
  };

  const resetForm = () => {
    setAuthMode("select");
    setEmailMode("login");
    setPhone("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setOtpCode("");
    setOtpSent(false);
    setMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div
        className="auth-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button className="auth-close-btn" onClick={onClose}>
          <span>✕</span>
        </button>

        {/* 헤더 영역 */}
        <div className="auth-hero">
          <div className="auth-hero-icon">
            {authMode === "select" && "🌤️"}
            {authMode === "phone" && "📱"}
            {authMode === "email" && "✉️"}
          </div>
          <h2 className="auth-title">
            {authMode === "select" && "환영합니다!"}
            {authMode === "phone" && "전화번호 인증"}
            {authMode === "email" &&
              (emailMode === "login" ? "로그인" : "회원가입")}
          </h2>
          <p className="auth-subtitle">
            {authMode === "select" && "경기 기후 체감 맵과 함께하세요"}
            {authMode === "phone" && "빠르고 간편한 인증"}
            {authMode === "email" &&
              (emailMode === "login"
                ? "다시 만나서 반가워요"
                : "1분이면 완료!")}
          </p>
        </div>

        {/* 내용 */}
        <div className="auth-modal-content">
          {authMode === "select" && (
            <div className="auth-select-area">
              <div className="auth-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">📊</span>
                  <span>제보 기록 저장</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">🔔</span>
                  <span>관심 지역 알림</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">⭐</span>
                  <span>맞춤 날씨 정보</span>
                </div>
              </div>

              {/* 이메일 로그인 */}
              <button
                className="auth-method-btn email"
                onClick={() => setAuthMode("email")}
              >
                <span className="method-icon">✉️</span>
                <span className="method-text">이메일로 시작하기</span>
                <span className="method-arrow">→</span>
              </button>
            </div>
          )}

          {authMode === "phone" && (
            <div className="auth-form-area">
              {!otpSent ? (
                <>
                  <div className="auth-input-group">
                    <label htmlFor="auth-phone">전화번호</label>
                    <div className="input-with-icon">
                      <span className="input-icon">📱</span>
                      <input
                        type="tel"
                        id="auth-phone"
                        name="phone"
                        placeholder="01012345678"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        maxLength={11}
                      />
                    </div>
                    <span className="input-hint">'-' 없이 숫자만 입력</span>
                  </div>

                  <button
                    className="auth-submit-btn"
                    onClick={handleSendPhoneOtp}
                    disabled={loading || phone.length < 10}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner"></span> 발송 중...
                      </>
                    ) : (
                      "인증번호 받기"
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="otp-sent-info">
                    <div className="sent-badge">
                      <span className="check-icon">✓</span>
                      <span>인증번호 발송 완료</span>
                    </div>
                    <div className="phone-number">
                      {phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                      <button
                        className="change-link"
                        onClick={() => setOtpSent(false)}
                      >
                        변경
                      </button>
                    </div>
                  </div>

                  <div className="auth-input-group">
                    <label htmlFor="auth-otp">인증번호 6자리</label>
                    <div className="otp-input-container">
                      <input
                        type="text"
                        id="auth-otp"
                        name="otp"
                        className="otp-input"
                        placeholder="● ● ● ● ● ●"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <button
                    className="auth-submit-btn"
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length < 6}
                  >
                    {loading ? (
                      <>
                        <span className="btn-spinner"></span> 확인 중...
                      </>
                    ) : (
                      "인증 완료하기"
                    )}
                  </button>

                  <button
                    className="resend-link"
                    onClick={handleSendPhoneOtp}
                    disabled={loading}
                  >
                    인증번호가 안 왔나요? <span>재발송</span>
                  </button>
                </>
              )}

              <button className="auth-back-btn" onClick={resetForm}>
                <span>←</span> 다른 방법으로
              </button>
            </div>
          )}

          {authMode === "email" && (
            <div className="auth-form-area">
              {/* 로그인/회원가입 탭 */}
              <div className="auth-toggle-tabs">
                <button
                  className={`toggle-tab ${emailMode === "login" ? "active" : ""}`}
                  onClick={() => {
                    setEmailMode("login");
                    setMessage("");
                  }}
                >
                  로그인
                </button>
                <button
                  className={`toggle-tab ${emailMode === "signup" ? "active" : ""}`}
                  onClick={() => {
                    setEmailMode("signup");
                    setMessage("");
                  }}
                >
                  회원가입
                </button>
                <div className={`tab-indicator ${emailMode}`}></div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="auth-email">이메일</label>
                <div className="input-with-icon">
                  <span className="input-icon">✉️</span>
                  <input
                    type="email"
                    id="auth-email"
                    name="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="auth-password">비밀번호</label>
                <div className="input-with-icon">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    id="auth-password"
                    name="password"
                    placeholder="6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {emailMode === "signup" && (
                <div className="auth-input-group">
                  <label htmlFor="auth-confirm-password">비밀번호 확인</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔒</span>
                    <input
                      type="password"
                      id="auth-confirm-password"
                      name="confirmPassword"
                      placeholder="비밀번호 다시 입력"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button
                className="auth-submit-btn"
                onClick={
                  emailMode === "login" ? handleEmailLogin : handleEmailSignUp
                }
                disabled={
                  loading || !email.includes("@") || password.length < 6
                }
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>{" "}
                    {emailMode === "login" ? "로그인 중..." : "가입 중..."}
                  </>
                ) : emailMode === "login" ? (
                  "로그인하기"
                ) : (
                  "가입하기"
                )}
              </button>

              {emailMode === "signup" && (
                <p className="signup-notice">✓ 가입 즉시 모든 기능 사용 가능</p>
              )}

              <button className="auth-back-btn" onClick={resetForm}>
                <span>←</span> 다른 방법으로
              </button>
            </div>
          )}

          {/* 메시지 표시 */}
          {(message || authError) && (
            <div
              className={`auth-toast ${message.includes("성공") || message.includes("발송") ? "success" : "error"}`}
            >
              <span className="toast-icon">
                {message.includes("성공") || message.includes("발송")
                  ? "✓"
                  : "!"}
              </span>
              <span className="toast-text">{message || authError}</span>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="auth-footer">
          <p>
            로그인 시 <span className="link">이용약관</span>에 동의합니다
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
