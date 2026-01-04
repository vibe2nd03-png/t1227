import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { createLogger } from '../utils/logger';

const log = createLogger('Auth');
const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // 타임아웃 헬퍼 함수 (모바일 네트워크 고려하여 30초로 증가)
  const withTimeout = (promise, ms = 30000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('요청 시간 초과 - 네트워크 연결을 확인해주세요')), ms)
      )
    ]);
  };

  // 초기 세션 확인
  useEffect(() => {
    // 현재 세션 가져오기
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAccessToken(session?.access_token ?? null);
      if (session?.user) {
        // 세션의 access_token을 직접 전달
        fetchProfile(session.user.id, session.access_token);
      }
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setAccessToken(session?.access_token ?? null);
        if (session?.user) {
          // 세션의 access_token을 직접 전달
          await fetchProfile(session.user.id, session.access_token);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 프로필 조회 (직접 fetch) - 사용자 토큰 사용
  const fetchProfile = async (userId, token = null) => {
    try {
      const authToken = token || accessToken;
      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_profiles?id=eq.${userId}&select=*`;
      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${authToken || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setProfile(data[0]);
          console.log('프로필 조회 성공:', data[0]);
          // 로그인 시 제보 통계 동기화
          await syncReportStats(userId, authToken);
        } else {
          setProfile(null);
        }
      }
    } catch (error) {
      log.error('프로필 조회 실패', error);
    }
  };

  // 제보 통계 동기화 (userId와 token을 직접 받음)
  const syncReportStats = async (userId, token) => {
    if (!userId || !token) return;

    try {
      // 1. 실제 제보 건수 조회
      const countUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?user_id=eq.${userId}&select=id`;
      const countRes = await fetch(countUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!countRes.ok) return;
      const countData = await countRes.json();
      const totalReports = countData?.length || 0;

      // 2. 총 좋아요 수 조회
      const likesUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?user_id=eq.${userId}&select=likes`;
      const likesRes = await fetch(likesUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`
        }
      });

      let totalLikes = 0;
      if (likesRes.ok) {
        const likesData = await likesRes.json();
        totalLikes = likesData?.reduce((sum, r) => sum + (r.likes || 0), 0) || 0;
      }

      // 3. 평판 점수 계산: 제보 1건 = 1점, 좋아요 1개 = 2점
      const reputationScore = totalReports + (totalLikes * 2);

      console.log('제보 통계 동기화:', { totalReports, totalLikes, reputationScore });

      // 4. 프로필 업데이트
      const patchUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_profiles?id=eq.${userId}`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          total_reports: totalReports,
          reputation_score: reputationScore,
          updated_at: new Date().toISOString()
        })
      });

      if (patchRes.ok) {
        const data = await patchRes.json();
        if (data && data.length > 0) {
          setProfile(data[0]);
          console.log('프로필 통계 동기화 완료:', data[0]);
        }
      }
    } catch (error) {
      console.error('제보 통계 동기화 오류:', error);
    }
  };

  // 이메일+비밀번호 회원가입 (이메일 인증 없이 즉시 가입)
  const signUpWithEmail = async (email, password) => {
    setAuthError(null);
    console.log('회원가입 시도:', email);

    try {
      console.log('Supabase 회원가입 호출 시작');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            email_confirmed: true,
          },
        },
      });

      console.log('Supabase 회원가입 응답:', { data, error });

      if (error) throw error;

      // 이미 가입된 이메일인 경우
      if (data?.user?.identities?.length === 0) {
        return { success: false, error: '이미 가입된 이메일입니다. 로그인해주세요.' };
      }

      // 세션이 있으면 즉시 로그인 성공
      if (data.session) {
        return { success: true, needsConfirmation: false };
      }

      // 세션이 없으면 자동 로그인 시도
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        return { success: true, needsConfirmation: false };
      }

      return { success: true, needsConfirmation: false };
    } catch (error) {
      console.error('회원가입 오류:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 이메일+비밀번호 로그인
  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    console.log('로그인 시도:', email);

    try {
      console.log('Supabase 로그인 호출 시작');
      console.log('Supabase URL:', 'https://pcdmrofcfqtyywtzyrfo.supabase.co');

      // 타임아웃 추가 (15초)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('로그인 시간 초과 (15초) - 네트워크를 확인해주세요'));
        }, 15000);
      });

      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await Promise.race([authPromise, timeoutPromise]);

      console.log('Supabase 로그인 응답:', { data, error });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthError(error.message);
      return { success: false, error: error.message };
    }
  };

  // 전화번호 OTP 발송
  const sendPhoneOtp = async (phone) => {
    setAuthError(null);
    try {
      // 한국 전화번호 포맷팅 (+82)
      const formattedPhone = phone.startsWith('+82')
        ? phone
        : `+82${phone.replace(/^0/, '')}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      setAuthError(error.message);
      log.error('OTP 발송 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 전화번호 OTP 인증
  const verifyPhoneOtp = async (phone, token) => {
    setAuthError(null);
    try {
      const formattedPhone = phone.startsWith('+82')
        ? phone
        : `+82${phone.replace(/^0/, '')}`;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      setAuthError(error.message);
      log.error('OTP 인증 오류', error);
      return { success: false, error: error.message };
    }
  };

  // 로그아웃 (로컬 상태 초기화)
  const signOut = async () => {
    console.log('로그아웃 시도');
    // 로컬 상태 즉시 초기화
    setUser(null);
    setProfile(null);
    setAccessToken(null);

    // localStorage에서 supabase 세션 제거
    try {
      localStorage.removeItem('sb-pcdmrofcfqtyywtzyrfo-auth-token');
    } catch (e) {
      console.log('localStorage 정리 실패:', e);
    }

    // 백그라운드에서 서버 로그아웃 시도 (응답 기다리지 않음)
    supabase.auth.signOut().catch(() => {});

    console.log('로그아웃 완료');
  };

  // 사용자 토큰 가져오기 (저장된 토큰 사용)
  const getUserToken = () => {
    return accessToken;
  };

  // 프로필 업데이트 (없으면 생성) - 직접 fetch
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    console.log('프로필 업데이트 시도:', updates);

    try {
      const token = getUserToken();
      console.log('토큰 확인:', token ? '있음' : '없음');
      if (!token) return { success: false, error: '인증 토큰이 없습니다' };

      const profileData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // 먼저 PATCH로 업데이트 시도
      const patchUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_profiles?id=eq.${user.id}`;
      console.log('PATCH 시도:', patchUrl);

      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(profileData)
      });

      console.log('PATCH 응답:', patchResponse.status);

      if (patchResponse.ok) {
        const data = await patchResponse.json();
        console.log('PATCH 결과:', data);

        // PATCH가 성공했지만 데이터가 없으면 INSERT 필요
        if (Array.isArray(data) && data.length === 0) {
          console.log('프로필 없음, INSERT 시도');
          return await createProfile(token, updates);
        }

        const updatedProfile = Array.isArray(data) ? data[0] : data;
        setProfile(updatedProfile);
        console.log('프로필 업데이트 성공:', updatedProfile);
        return { success: true, data: updatedProfile };
      }

      // PATCH 실패시 INSERT 시도
      console.log('PATCH 실패, INSERT 시도');
      return await createProfile(token, updates);
    } catch (error) {
      console.error('프로필 업데이트 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 프로필 생성 헬퍼
  const createProfile = async (token, updates) => {
    const profileData = {
      id: user.id,
      ...updates,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const postResponse = await fetch('https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_profiles', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileData)
    });

    console.log('POST 응답:', postResponse.status);

    if (postResponse.ok) {
      const data = await postResponse.json();
      const newProfile = Array.isArray(data) ? data[0] : data;
      setProfile(newProfile);
      console.log('프로필 생성 성공:', newProfile);
      return { success: true, data: newProfile };
    }

    const errorText = await postResponse.text();
    console.error('프로필 생성 실패:', postResponse.status, errorText);
    throw new Error(errorText || '프로필 생성 실패');
  };

  // 즐겨찾기 지역 추가 (직접 fetch)
  const addFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    console.log('즐겨찾기 추가 시도:', region);

    try {
      const token = getUserToken();
      if (!token) return { success: false, error: '인증 토큰이 없습니다' };

      const response = await fetch('https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_favorite_regions', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ user_id: user.id, region })
      });

      if (response.ok) {
        console.log('즐겨찾기 추가 성공');
        return { success: true };
      }
      const errorData = await response.json();
      console.error('즐겨찾기 추가 실패:', errorData);
      throw new Error(errorData.message || '추가 실패');
    } catch (error) {
      console.error('즐겨찾기 추가 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 지역 삭제 (직접 fetch)
  const removeFavoriteRegion = async (region) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    console.log('즐겨찾기 삭제 시도:', region);

    try {
      const token = getUserToken();
      if (!token) return { success: false, error: '인증 토큰이 없습니다' };

      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_favorite_regions?user_id=eq.${user.id}&region=eq.${encodeURIComponent(region)}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok || response.status === 204) {
        console.log('즐겨찾기 삭제 성공');
        return { success: true };
      }
      throw new Error('삭제 실패');
    } catch (error) {
      console.error('즐겨찾기 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 즐겨찾기 목록 조회 (직접 fetch)
  const getFavoriteRegions = async () => {
    if (!user) return [];

    console.log('즐겨찾기 조회 시도:', user.id);

    try {
      const token = getUserToken();
      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_favorite_regions?user_id=eq.${user.id}&select=region`;
      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('즐겨찾기 조회 성공:', data.length, '개');
        return data?.map((r) => r.region) || [];
      }
      return [];
    } catch (error) {
      console.error('즐겨찾기 조회 오류:', error);
      return [];
    }
  };

  // 내 제보 목록 조회 (직접 fetch)
  const getMyReports = async () => {
    if (!user) return [];

    console.log('내 제보 조회 시도:', user.id);

    try {
      const token = getUserToken();
      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?user_id=eq.${user.id}&order=created_at.desc&limit=20`;
      const response = await fetch(url, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('내 제보 조회 성공:', data.length, '개');
        return data || [];
      }
      return [];
    } catch (error) {
      console.error('내 제보 조회 오류:', error);
      return [];
    }
  };

  // 제보 삭제 (직접 fetch)
  const deleteMyReport = async (reportId) => {
    if (!user) return { success: false, error: '로그인이 필요합니다' };

    console.log('제보 삭제 시도:', reportId);

    try {
      const token = getUserToken();
      if (!token) return { success: false, error: '인증 토큰이 없습니다' };

      const url = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?id=eq.${reportId}&user_id=eq.${user.id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok || response.status === 204) {
        console.log('제보 삭제 성공');
        // 제보 삭제 후 프로필 통계 업데이트
        await refreshReportStats();
        return { success: true };
      }
      throw new Error('삭제 실패');
    } catch (error) {
      console.error('제보 삭제 오류:', error);
      return { success: false, error: error.message };
    }
  };

  // 제보 통계 갱신 (DB에서 실제 값 조회)
  const refreshReportStats = async () => {
    if (!user) return;

    try {
      const token = getUserToken();

      // 1. 실제 제보 건수 조회
      const countUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?user_id=eq.${user.id}&select=id`;
      const countRes = await fetch(countUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'}`
        }
      });

      if (!countRes.ok) return;
      const countData = await countRes.json();
      const totalReports = countData?.length || 0;

      // 2. 총 좋아요 수 조회
      const likesUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_reports?user_id=eq.${user.id}&select=likes`;
      const likesRes = await fetch(likesUrl, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
          'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q'}`
        }
      });

      let totalLikes = 0;
      if (likesRes.ok) {
        const likesData = await likesRes.json();
        totalLikes = likesData?.reduce((sum, r) => sum + (r.likes || 0), 0) || 0;
      }

      // 3. 평판 점수 계산: 제보 1건 = 1점, 좋아요 1개 = 2점
      const reputationScore = totalReports + (totalLikes * 2);

      console.log('제보 통계:', { totalReports, totalLikes, reputationScore });

      // 4. 프로필 업데이트
      if (token) {
        const patchUrl = `https://pcdmrofcfqtyywtzyrfo.supabase.co/rest/v1/user_profiles?id=eq.${user.id}`;
        const patchRes = await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZG1yb2ZjZnF0eXl3dHp5cmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MDk1NTMsImV4cCI6MjA4MjM4NTU1M30.8Fzw28TSZMmT1bJabUaHDcuB7QtivV-KxFBNbP1wh9Q',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            total_reports: totalReports,
            reputation_score: reputationScore,
            updated_at: new Date().toISOString()
          })
        });

        if (patchRes.ok) {
          const data = await patchRes.json();
          if (data && data.length > 0) {
            setProfile(data[0]);
            console.log('프로필 통계 업데이트 완료:', data[0]);
          }
        }
      }
    } catch (error) {
      console.error('제보 통계 갱신 오류:', error);
    }
  };

  const value = {
    user,
    profile,
    loading,
    authError,
    signUpWithEmail,
    signInWithEmail,
    sendPhoneOtp,
    verifyPhoneOtp,
    signOut,
    updateProfile,
    addFavoriteRegion,
    removeFavoriteRegion,
    getFavoriteRegions,
    getMyReports,
    deleteMyReport,
    refreshReportStats,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
