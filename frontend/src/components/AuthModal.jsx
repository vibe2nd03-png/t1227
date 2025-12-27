import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ isOpen, onClose }) {
  const { signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, signInWithEmail, authError } = useAuth();
  const [authMode, setAuthMode] = useState('select'); // select, phone, email
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleSendPhoneOtp = async () => {
    if (!phone || phone.length < 10) {
      setMessage('올바른 전화번호를 입력해주세요');
      return;
    }

    setLoading(true);
    const result = await sendPhoneOtp(phone);
    setLoading(false);

    if (result.success) {
      setOtpSent(true);
      setMessage('인증번호가 발송되었습니다');
    } else {
      setMessage(result.error || '인증번호 발송에 실패했습니다');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setMessage('6자리 인증번호를 입력해주세요');
      return;
    }

    setLoading(true);
    const result = await verifyPhoneOtp(phone, otpCode);
    setLoading(false);

    if (result.success) {
      setMessage('로그인 성공!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      setMessage(result.error || '인증에 실패했습니다');
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !email.includes('@')) {
      setMessage('올바른 이메일을 입력해주세요');
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email);
    setLoading(false);

    if (result.success) {
      setMessage('로그인 링크가 이메일로 발송되었습니다. 이메일을 확인해주세요.');
    } else {
      setMessage(result.error || '이메일 발송에 실패했습니다');
    }
  };

  const resetForm = () => {
    setAuthMode('select');
    setPhone('');
    setEmail('');
    setOtpCode('');
    setOtpSent(false);
    setMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="auth-modal-header">
          <h2>
            {authMode === 'select' && '로그인 / 회원가입'}
            {authMode === 'phone' && '📱 전화번호 로그인'}
            {authMode === 'email' && '✉️ 이메일 로그인'}
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* 내용 */}
        <div className="auth-modal-content">
          {authMode === 'select' && (
            <>
              <p className="auth-description">
                로그인하시면 제보 기록이 저장되고<br />
                관심 지역 알림을 받을 수 있습니다.
              </p>

              {/* Google 로그인 */}
              <button
                className="auth-btn google-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google 계정으로 계속하기
              </button>

              {/* 구분선 */}
              <div className="auth-divider">
                <span>또는</span>
              </div>

              {/* 전화번호 로그인 */}
              <button
                className="auth-btn phone-btn"
                onClick={() => setAuthMode('phone')}
              >
                📱 전화번호로 로그인
              </button>

              {/* 이메일 로그인 */}
              <button
                className="auth-btn email-btn"
                onClick={() => setAuthMode('email')}
              >
                ✉️ 이메일로 로그인
              </button>
            </>
          )}

          {authMode === 'phone' && (
            <>
              {!otpSent ? (
                <>
                  <div className="input-group">
                    <label>전화번호</label>
                    <input
                      type="tel"
                      placeholder="010-1234-5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={11}
                    />
                    <span className="input-hint">숫자만 입력해주세요</span>
                  </div>

                  <button
                    className="auth-btn primary-btn"
                    onClick={handleSendPhoneOtp}
                    disabled={loading || phone.length < 10}
                  >
                    {loading ? '발송 중...' : '인증번호 받기'}
                  </button>
                </>
              ) : (
                <>
                  <div className="otp-info">
                    <span className="phone-display">📱 {phone}</span>
                    <button className="change-btn" onClick={() => setOtpSent(false)}>
                      변경
                    </button>
                  </div>

                  <div className="input-group">
                    <label>인증번호</label>
                    <input
                      type="text"
                      placeholder="6자리 인증번호"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={6}
                    />
                  </div>

                  <button
                    className="auth-btn primary-btn"
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length < 6}
                  >
                    {loading ? '확인 중...' : '인증하기'}
                  </button>

                  <button
                    className="resend-btn"
                    onClick={handleSendPhoneOtp}
                    disabled={loading}
                  >
                    인증번호 재발송
                  </button>
                </>
              )}

              <button className="back-btn" onClick={resetForm}>
                ← 다른 방법으로 로그인
              </button>
            </>
          )}

          {authMode === 'email' && (
            <>
              <div className="input-group">
                <label>이메일</label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="input-hint">로그인 링크가 이메일로 발송됩니다</span>
              </div>

              <button
                className="auth-btn primary-btn"
                onClick={handleEmailLogin}
                disabled={loading || !email.includes('@')}
              >
                {loading ? '발송 중...' : '로그인 링크 받기'}
              </button>

              <button className="back-btn" onClick={resetForm}>
                ← 다른 방법으로 로그인
              </button>
            </>
          )}

          {/* 메시지 표시 */}
          {(message || authError) && (
            <div className={`auth-message ${message.includes('성공') || message.includes('발송') ? 'success' : 'error'}`}>
              {message || authError}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="auth-modal-footer">
          <p>로그인 시 서비스 이용약관에 동의하게 됩니다.</p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
