import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ isOpen, onClose }) {
  const { signUpWithEmail, signInWithEmail, sendPhoneOtp, verifyPhoneOtp, authError } = useAuth();
  const [authMode, setAuthMode] = useState('select'); // select, phone, email
  const [emailMode, setEmailMode] = useState('login'); // login, signup
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    if (!password || password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다');
      return;
    }

    setLoading(true);
    const result = await signInWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setMessage('로그인 성공!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      // 계정이 없으면 회원가입 모드로 전환 안내
      if (result.error?.includes('Invalid login')) {
        setMessage('이메일 또는 비밀번호가 잘못되었습니다');
      } else {
        setMessage(result.error || '로그인에 실패했습니다');
      }
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !email.includes('@')) {
      setMessage('올바른 이메일을 입력해주세요');
      return;
    }
    if (!password || password.length < 6) {
      setMessage('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('비밀번호가 일치하지 않습니다');
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(email, password);
    setLoading(false);

    if (result.success) {
      setMessage('회원가입 성공!');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } else {
      setMessage(result.error || '회원가입에 실패했습니다');
    }
  };

  const resetForm = () => {
    setAuthMode('select');
    setEmailMode('login');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
            {authMode === 'email' && (emailMode === 'login' ? '✉️ 이메일 로그인' : '✉️ 이메일 회원가입')}
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

              {/* 이메일 로그인 */}
              <button
                className="auth-btn email-btn"
                onClick={() => setAuthMode('email')}
              >
                ✉️ 이메일로 로그인
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
              {/* 로그인/회원가입 탭 */}
              <div className="email-tabs">
                <button
                  className={`email-tab ${emailMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setEmailMode('login'); setMessage(''); }}
                >
                  로그인
                </button>
                <button
                  className={`email-tab ${emailMode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setEmailMode('signup'); setMessage(''); }}
                >
                  회원가입
                </button>
              </div>

              <div className="input-group">
                <label>이메일</label>
                <input
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>비밀번호</label>
                <input
                  type="password"
                  placeholder="6자 이상 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {emailMode === 'signup' && (
                <div className="input-group">
                  <label>비밀번호 확인</label>
                  <input
                    type="password"
                    placeholder="비밀번호 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              )}

              <button
                className="auth-btn primary-btn"
                onClick={emailMode === 'login' ? handleEmailLogin : handleEmailSignUp}
                disabled={loading || !email.includes('@') || password.length < 6}
              >
                {loading ? '처리 중...' : (emailMode === 'login' ? '로그인' : '회원가입')}
              </button>

              {emailMode === 'signup' && (
                <p className="signup-notice">
                  * 회원가입 즉시 사용 가능합니다
                </p>
              )}

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
